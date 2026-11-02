import { openPdf, canvasToBlob } from '../js/pdf-kit.js';
import { sayFail } from '../js/tool-ui.js';
import { zip } from '../js/zip-kit.js';

const $ = (id) => document.getElementById(id);
const drop = $('drop');
const fileInput = $('file');
const opts = $('opts');
const out = $('out');
const statusEl = $('status');
const metaEl = $('meta');
const shots = $('shots');
const sumEl = $('sum');
const dl = $('dl');

let currentFile = null;
let currentDoc = null;
let currentPages = [];
let madeUrls = [];

function say(text) {
  statusEl.textContent = text;
}

function clearUrls() {
  for (const url of madeUrls) URL.revokeObjectURL(url);
  madeUrls = [];
}

/** 把 "1-3,7,9-" 解析成页码数组 */
function parsePages(text, total) {
  const input = String(text || '').trim().toLowerCase();
  if (!input || input === 'all' || input === '全部') {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const picked = new Set();
  for (const piece of input.split(/[,;、\s]+/)) {
    if (!piece) continue;
    if (piece === 'odd' || piece === 'even') {
      for (let n = piece === 'odd' ? 1 : 2; n <= total; n += 2) picked.add(n);
      continue;
    }
    const range = /^(\d*)-(\d*)$/.exec(piece);
    if (range) {
      const from = range[1] ? Number(range[1]) : 1;
      const to = range[2] ? Number(range[2]) : total;
      for (let n = Math.max(1, from); n <= Math.min(total, to); n += 1) picked.add(n);
      continue;
    }
    const single = Number(piece);
    if (Number.isInteger(single) && single >= 1 && single <= total) picked.add(single);
  }
  return [...picked].sort((a, b) => a - b);
}

function baseName(name) {
  return String(name || 'document.pdf').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '-');
}

async function pickFile(file) {
  if (!file) return;
  clearUrls();
  out.hidden = true;
  opts.hidden = true;
  shots.textContent = '';
  currentFile = file;
  say('正在打开 PDF…');
  try {
    currentDoc = await openPdf(file);
  } catch (error) {
    currentDoc = null;
    say('这个文件打不开。带密码的 PDF 请先解密，再把文件拖进来。');
    return;
  }
  const first = await currentDoc.getPage(1);
  const view = first.getViewport({ scale: 1 });
  metaEl.innerHTML = `<span>页数 <b>${currentDoc.numPages}</b></span><span>页面尺寸 <b>${Math.round(view.width)} × ${Math.round(view.height)} pt</b></span><span>文件 <b>${(file.size / 1048576).toFixed(1)} MB</b></span>`;
  opts.hidden = false;
  say(`已打开 ${currentDoc.numPages} 页。`);
}

function pickSize(view, dpi) {
  let scale = dpi / 72;
  /* 一张图最多 4000 万像素，超出就降采样，免得浏览器直接崩 */
  const area = view.width * scale * view.height * scale;
  if (area > 40e6) scale *= Math.sqrt(40e6 / area);
  return scale;
}

async function renderOne(pageNumber, dpi, type) {
  const doc = currentDoc;
  const page = await doc.getPage(pageNumber);
  const view = page.getViewport({ scale: pickSize(page.getViewport({ scale: 1 }), dpi) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(view.width));
  canvas.height = Math.max(1, Math.round(view.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: view, background: '#ffffff' }).promise;
  page.cleanup();
  return { canvas, width: canvas.width, height: canvas.height };
}

function stitch(pages) {
  const gap = 0;
  const width = Math.max(...pages.map((page) => page.width));
  const height = pages.reduce((sum, page) => sum + page.height + gap, 0);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const page of pages) {
    ctx.drawImage(page.canvas, Math.round((width - page.width) / 2), y);
    y += page.height + gap;
  }
  return canvas;
}

async function run() {
  if (!currentDoc) return;
  const dpi = Number($('dpi').value);
  const type = $('fmt').value === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = type === 'image/jpeg' ? 'jpg' : 'png';
  const mode = $('mode').value;
  const list = parsePages($('pages').value, currentDoc.numPages);

  if (!list.length) {
    say('页码没解析出来，检查一下写法，比如 1-3,7,9-10。');
    return;
  }

  $('go').disabled = true;
  clearUrls();
  shots.textContent = '';
  out.hidden = true;

  try {
    if (mode === 'long') {
      say('正在渲染…');
      const rendered = [];
      for (const n of list) {
        const page = await renderOne(n, dpi, type);
        rendered.push(page);
        say('正在渲染…');
      }
      /* 浏览器一张画布最高 3 万多像素，太高就切成几张长图 */
      const limit = 28000;
      const chunks = [];
      let bucket = [];
      let height = 0;
      for (const page of rendered) {
        if (bucket.length && height + page.height > limit) {
          chunks.push(bucket);
          bucket = [];
          height = 0;
        }
        bucket.push(page);
        height += page.height;
      }
      if (bucket.length) chunks.push(bucket);

      const files = [];
      const stem = baseName(currentFile.name);
      for (let i = 0; i < chunks.length; i += 1) {
        const canvas = stitch(chunks[i]);
        const blob = await canvasToBlob(canvas, type, 0.92);
        files.push({ name: chunks.length > 1 ? `${stem}-long-${i + 1}.${ext}` : `${stem}-long.${ext}`, blob, w: canvas.width, h: canvas.height });
        canvas.width = canvas.height = 0;
      }
      await deliver(files, `${list.length} 页拼成 ${files.length} 张长图`, true);
    } else {
      const files = [];
      const stem = baseName(currentFile.name);
      for (let i = 0; i < list.length; i += 1) {
        say('正在渲染…');
        const { canvas } = await renderOne(list[i], dpi, type);
        const blob = await canvasToBlob(canvas, type, 0.92);
        files.push({ name: `${stem}-p${String(list[i]).padStart(2, '0')}.${ext}`, blob, w: canvas.width, h: canvas.height });
        canvas.width = canvas.height = 0;
      }
      await deliver(files, `${files.length} 张图片，${dpi} DPI`, files.length > 1);
    }
    say('好了。');
  } catch (error) {
    sayFail(statusEl, '转换中断了：', error);
  } finally {
    $('go').disabled = false;
  }
}

async function deliver(files, summary, asZip) {
  out.hidden = false;
  sumEl.textContent = summary;

  for (const file of files.slice(0, 12)) {
    const url = URL.createObjectURL(file.blob);
    madeUrls.push(url);
    const figure = document.createElement('figure');
    figure.className = 'shot';
    const img = document.createElement('img');
    img.src = url;
    img.alt = file.name;
    img.loading = 'lazy';
    const cap = document.createElement('figcaption');
    cap.textContent = `${file.w} × ${file.h}`;
    figure.append(img, cap);
    shots.appendChild(figure);
  }

  let blob = files[0].blob;
  let name = files[0].name;
  if (asZip && files.length > 1) {
    const entries = [];
    for (const file of files) {
      entries.push({ name: file.name, data: new Uint8Array(await file.blob.arrayBuffer()) });
    }
    blob = await zip(entries);
    name = `${baseName(currentFile.name)}-images.zip`;
  }
  const url = URL.createObjectURL(blob);
  madeUrls.push(url);
  dl.href = url;
  dl.download = name;
  dl.textContent = asZip && files.length > 1 ? `下载 ${files.length} 张（zip）` : `下载 ${name}`;
}

drop.addEventListener('click', (event) => {
  if (event.target !== fileInput) fileInput.click();
});
fileInput.addEventListener('change', () => pickFile(fileInput.files?.[0]));

for (const type of ['dragenter', 'dragover']) {
  drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.classList.add('hot');
  });
}
for (const type of ['dragleave', 'drop']) {
  drop.addEventListener(type, (event) => {
    event.preventDefault();
    drop.classList.remove('hot');
  });
}
drop.addEventListener('drop', (event) => {
  const file = [...(event.dataTransfer?.files || [])].find((item) => /\.pdf$/i.test(item.name) || item.type === 'application/pdf');
  if (file) pickFile(file);
});

$('go').addEventListener('click', run);
$('reset').addEventListener('click', () => {
  currentFile = null;
  currentDoc = null;
  clearUrls();
  out.hidden = true;
  opts.hidden = true;
  fileInput.value = '';
  shots.textContent = '';
  say('');
});
$('mode').addEventListener('change', () => {
  const long = $('mode').value === 'long';
  $('pages').placeholder = long ? '全部，或挑几页拼起来' : '全部，或 1-3,7,9-';
});
$('pages').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') run();
});
