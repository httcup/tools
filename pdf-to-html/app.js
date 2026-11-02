import { openPdf, readPage, renderPage, canvasToBlob } from '../js/pdf-kit.js';
import { pageToBlocks } from '../js/pdf-blocks.js';
import { blocksToHtml } from '../js/office-kit.js';
import { parsePages, stem, fmtSize, wireDrop, sayFail } from '../js/tool-ui.js';

const $ = (id) => document.getElementById(id);
let file = null;
let doc = null;
let pageCount = 0;
let lastUrl = null;

const say = (text) => {
  $('status').textContent = text;
};

async function pick(next) {
  file = next;
  $('out').hidden = true;
  $('open').hidden = true;
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

const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(title, body, extraCss = '') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root { color-scheme: light dark; }
body { margin: 0; padding: 2rem 1.2rem 4rem; font: 16px/1.8 -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #1a202c; background: #fff; }
main { max-width: 720px; margin: 0 auto; }
h1 { font-size: 1.9em; line-height: 1.3; margin: 0 0 0.6em; }
h2 { font-size: 1.4em; margin: 1.8em 0 0.5em; }
h3 { font-size: 1.15em; margin: 1.4em 0 0.4em; }
p { margin: 0 0 0.9em; }
ul { padding-left: 1.3em; margin: 0 0 1em; }
li { margin: 0 0 0.35em; }
hr { border: 0; border-top: 1px solid #e3e7ee; margin: 2.4rem 0; }
img { max-width: 100%; height: auto; display: block; margin: 0 auto 1.5rem; }
.page { position: relative; margin: 0 auto 2rem; background: #fff; border: 1px solid #e3e7ee; overflow: hidden; }
.page span { position: absolute; white-space: pre; color: #1a202c; }
${extraCss}
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}

async function buildFlow(pages) {
  const parts = [];
  pages.forEach((page, index) => {
    if (index > 0 && $('breakpage').checked) parts.push('<hr>');
    for (const block of pageToBlocks(page)) {
      if (block.type === 'h1') parts.push(`<h1>${esc(block.text)}</h1>`);
      else if (block.type === 'h2') parts.push(`<h2>${esc(block.text)}</h2>`);
      else if (block.type === 'li') parts.push(`<li>${esc(block.text)}</li>`);
      else parts.push(`<p>${esc(block.text)}</p>`);
    }
  });
  let html = parts.join('\n');
  html = html.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, (chunk) => `<ul>\n${chunk.trim()}\n</ul>`);
  return wrap(stem(file.name), html);
}

async function buildLayout(pages) {
  const parts = [];
  const scale = 0.96;
  for (const page of pages) {
    if (!page.lines.length) continue;
    const width = Math.round(page.width * scale);
    const height = Math.round(page.height * scale);
    const spans = page.lines
      .map((line) => {
        const left = (line.x * scale).toFixed(1);
        const top = ((page.height - line.y - line.size) * scale).toFixed(1);
        const size = Math.max(6, line.size * scale).toFixed(1);
        return `<span style="left:${left}px;top:${top}px;font-size:${size}px">${esc(line.text)}</span>`;
      })
      .join('');
    parts.push(`<div class="page" style="width:${width}px;height:${height}px">${spans}</div>`);
  }
  return wrap(stem(file.name), parts.join('\n'), '.page{transform-origin:top left} @media (max-width:760px){.page{zoom:0.92}}');
}

async function buildImages(pages) {
  const parts = [];
  for (let i = 0; i < pages.length; i += 1) {
    say('正在渲染…');
    const canvas = await renderPage(doc, pages[i], 2);
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    canvas.width = canvas.height = 0;
    parts.push(`<img src="${dataUrl}" alt="">`);
  }
  return wrap(stem(file.name), parts.join('\n'));
}

async function run() {
  if (!doc) return;
  const mode = $('mode').value;
  const pages = parsePages($('pages').value, pageCount);
  if (!pages.length) {
    say('页码没解析出来，试试 1-3,7,9-10 这种写法。');
    return;
  }
  $('go').disabled = true;
  $('out').hidden = true;
  try {
    let html = '';
    if (mode === 'image') {
      html = await buildImages(pages);
    } else {
      const models = [];
      for (let i = 0; i < pages.length; i += 1) {
        say('正在读文档…');
        models.push(await readPage(doc, pages[i]));
      }
      html = mode === 'layout' ? await buildLayout(models) : await buildFlow(models);
    }

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    const name = `${stem(file.name)}.html`;
    $('dl').href = lastUrl;
    $('dl').download = name;
    $('preview').value = html.slice(0, 6000);
    $('sum').textContent = `${pages.length} 页 · ${fmtSize(blob.size)} · ${name}`;
    $('out').hidden = false;
    $('open').hidden = false;
    say('好了。');
  } catch (error) {
    sayFail($('status'), '转换中断了：', error);
  } finally {
    $('go').disabled = false;
  }
}

wireDrop($('drop'), $('file'), (item) => /\.pdf$/i.test(item.name) || item.type === 'application/pdf', pick);
$('go').addEventListener('click', run);
$('open').addEventListener('click', () => {
  if (lastUrl) window.open(lastUrl, '_blank', 'noopener');
});
$('reset').addEventListener('click', () => {
  file = null;
  doc = null;
  $('out').hidden = true;
  $('opts').hidden = true;
  $('open').hidden = true;
  $('file').value = '';
  say('');
});
$('pages').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') run();
});
