import { openPdf, readPage, renderPage, canvasToBlob } from '../js/pdf-kit.js';
import { pageToBlocks } from '../js/pdf-blocks.js';
import { buildDocx } from '../js/docx-kit.js';
import { parsePages, stem, fmtSize, wireDrop } from '../js/tool-ui.js';

const $ = (id) => document.getElementById(id);
let file = null;
let doc = null;
let pageCount = 0;

const say = (text) => {
  $('status').textContent = text;
};

async function pick(next) {
  file = next;
  $('out').hidden = true;
  $('scanNote').hidden = true;
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

  /* 前几页几乎没有字，基本可以判定是扫描件 */
  const probe = Math.min(3, pageCount);
  let chars = 0;
  for (let n = 1; n <= probe; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    chars += content.items.reduce((sum, item) => sum + (item.str || '').trim().length, 0);
  }
  const scanned = chars < 30;
  $('scanNote').hidden = !scanned;
  if (scanned && $('mode').value === 'text') $('mode').value = 'image';
  say(`已打开 ${pageCount} 页。`);
}

async function runText(pages) {
  const info = { pages: [] };
  for (let i = 0; i < pages.length; i += 1) {
    say('正在读文档…');
    info.pages.push(await readPage(doc, pages[i]));
  }
  return info;
}

async function runImageBlocks(pages, blocks) {
  for (let i = 0; i < pages.length; i += 1) {
    say('正在截图…');
    const canvas = await renderPage(doc, pages[i], 150 / 72);
    const blob = await canvasToBlob(canvas, 'image/png');
    const data = new Uint8Array(await blob.arrayBuffer());
    /* 版心宽约 495pt，按 96dpi 折算成 660px 贴进文档 */
    const width = 660;
    const height = Math.round((canvas.height / canvas.width) * width);
    blocks.push({ type: 'img', data, width, height });
    canvas.width = canvas.height = 0;
  }
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
    const blocks = [];
    let preview = '';

    if (mode !== 'image') {
      const info = await runText(pages);
      preview = info.pages.map((page) => page.lines.map((line) => line.text).join('\n')).join('\n\n').slice(0, 3000);
      info.pages.forEach((page, index) => {
        if ($('breaks').checked && index > 0) blocks.push({ type: 'pagebreak' });
        blocks.push(...pageToBlocks(page));
        if (mode === 'both') blocks.push({ type: 'pagebreak' });
      });
      if (mode === 'both') blocks.pop();
    }

    if (mode !== 'text') {
      if (blocks.length) blocks.push({ type: 'pagebreak' });
      await runImageBlocks(pages, blocks);
    }

    if (!blocks.length) {
      say('这一份里没抽到文字，试试「每页一张截图」。');
      return;
    }

    say('正在生成 .docx…');
    const blob = await buildDocx(blocks, { title: stem(file.name) });
    const name = `${stem(file.name)}.docx`;
    const url = URL.createObjectURL(blob);
    $('dl').href = url;
    $('dl').download = name;
    $('preview').value = preview || '（这份按截图模式输出，没有可编辑文字）';
    $('sum').textContent = `${pages.length} 页 · ${fmtSize(blob.size)} · ${name}`;
    $('out').hidden = false;
    say('好了，检查一下预览再下载。');
  } catch (error) {
    say('转换中断了：' + (error?.message || '未知错误'));
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
  $('preview').value = '';
  say('');
});
$('pages').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') run();
});
