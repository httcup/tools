import { openPdf, readPage, renderPage, canvasToBlob } from '../js/pdf-kit.js';
import { buildPptx } from '../js/pptx-kit.js';
import { slimLines } from '../js/pdf-blocks.js';
import { parsePages, stem, fmtSize, wireDrop, sayFail } from '../js/tool-ui.js';

const $ = (id) => document.getElementById(id);
const W = 960;
const H = 540;
const PAD = 56;

let file = null;
let doc = null;
let pageCount = 0;

const say = (text) => {
  $('status').textContent = text;
};

async function pick(next) {
  file = next;
  $('out').hidden = true;
  say('正在打开 PDF…');
  try {
    doc = await openPdf(next);
  } catch {
    doc = null;
    say('这个文件打不开。带密码的 PDF 请先解密，再拖进来。');
    return;
  }
  pageCount = doc.numPages;
  const first = await doc.getPage(1);
  const view = first.getViewport({ scale: 1 });
  $('meta').innerHTML = `<span>页数 <b>${pageCount}</b></span><span>页面尺寸 <b>${Math.round(view.width)} × ${Math.round(view.height)} pt</b></span><span>文件 <b>${fmtSize(next.size)}</b></span>`;
  $('opts').hidden = false;
  say(`已打开 ${pageCount} 页。`);
}

function splitTitle(page) {
  const paragraphs = page.paragraphs || [];
  if (!paragraphs.length) return { title: '', body: [] };
  const sizes = paragraphs.map((p) => p.size);
  const body = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)] || 11;
  const index = paragraphs.findIndex((p) => p.size >= body * 1.15 && p.text.trim().length <= 70);
  if (index < 0) return { title: '', body: paragraphs.map((p) => p.text) };
  return {
    title: paragraphs[index].text.trim(),
    body: paragraphs.filter((_, i) => i !== index).map((p) => p.text),
  };
}

async function slideFor(pageNumber, mode, baseSize) {
  const page = await readPage(doc, pageNumber);
  const { title, body } = splitTitle(page);

  const shapes = [];
  let image = null;

  if (mode !== 'image') {
    let top = PAD;
    if (title) {
      shapes.push({ box: { x: PAD, y: top, w: W - PAD * 2, h: 66 }, paragraphs: [title], size: 30, bold: true });
      top += 82;
    }
    const lines = slimLines({ paragraphs: body.map((text) => ({ text })) }, 76);
    const available = H - top - PAD;
    if (lines.length) {
      const lineHeight = 1.4;
      let size = baseSize;
      if (lines.length * size * lineHeight > available) {
        size = Math.max(9, Math.floor(available / (lines.length * lineHeight)));
      }
      shapes.push({ box: { x: PAD, y: top, w: W - PAD * 2, h: available }, paragraphs: lines, size });
    }
  }

  if (mode === 'image') {
    shapes.length = 0;
    const canvas = await renderPage(doc, pageNumber, 150 / 72);
    const blob = await canvasToBlob(canvas, 'image/png');
    /* 等比放进 16:9 的版面，居中，不拉变形 */
    const ratio = canvas.width / canvas.height;
    let w = W;
    let h = W / ratio;
    if (h > H) {
      h = H;
      w = H * ratio;
    }
    image = {
      data: new Uint8Array(await blob.arrayBuffer()),
      box: { x: (W - w) / 2, y: (H - h) / 2, w, h },
    };
    canvas.width = canvas.height = 0;
  }

  return {
    page: pageNumber,
    title: title || `第 ${pageNumber} 页`,
    lines: body,
    slide: { shapes, image },
  };
}

async function run() {
  if (!doc) return;
  const mode = $('mode').value;
  const baseSize = Number($('size').value);
  const pages = parsePages($('pages').value, pageCount);
  if (!pages.length) {
    say('页码没解析出来，试试 1-3,7,9-10 这种写法。');
    return;
  }

  $('go').disabled = true;
  $('out').hidden = true;
  $('slides').textContent = '';

  try {
    const made = [];
    for (let i = 0; i < pages.length; i += 1) {
      say('正在排版…');
      made.push(await slideFor(pages[i], mode, baseSize));
    }
    say('正在打包…');
    const blob = await buildPptx(made.map((item) => item.slide), { width: W, height: H, title: stem(file.name) });
    const name = `${stem(file.name)}.pptx`;
    const url = URL.createObjectURL(blob);
    $('dl').href = url;
    $('dl').download = name;
    $('sum').textContent = `${pages.length} 页幻灯片 · ${fmtSize(blob.size)} · ${name}`;

    for (const item of made.slice(0, 24)) {
      const figure = document.createElement('figure');
      figure.className = 'slide-prev';
      const head = document.createElement('figcaption');
      head.className = 'head';
      head.textContent = item.title;
      const body = document.createElement('div');
      body.className = 'body';
      body.textContent = item.lines.slice(0, 6).join('\n');
      figure.append(head, body);
      $('slides').appendChild(figure);
    }
    $('out').hidden = false;
    say('好了。');
  } catch (error) {
    sayFail($('status'), '转换中断了：', error);
  } finally {
    $('go').disabled = false;
  }
}

wireDrop($('drop'), $('file'), (item) => /\.pdf$/i.test(item.name) || item.type === 'application/pdf', pick);
$('go').addEventListener('click', run);
$('reset').addEventListener('click', () => {
  file = null;
  doc = null;
  $('out').hidden = true;
  $('opts').hidden = true;
  $('file').value = '';
  $('slides').textContent = '';
  say('');
});
$('pages').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') run();
});
