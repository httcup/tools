import { openPdf, readPage, PdfPasswordError } from '../js/pdf-kit.js';
import { parsePages, stem, fmtSize, wireDrop, download, sayFail } from '../js/tool-ui.js';
import { documentBlocks, findRepeatedMargins, pagesToMarkdown } from './md.js';

const $ = (id) => document.getElementById(id);

let file = null;
let doc = null;
let pageCount = 0;
let lastMd = '';
let lastName = '';

const say = (text) => {
  $('status').textContent = text;
};

/** 打开文件；带密码的返回 false，由界面问密码。 */
async function pick(next) {
  file = next;
  doc = null;
  pageCount = 0;
  $('out').hidden = true;
  $('pw-row').hidden = true;
  say('正在打开 PDF…');

  try {
    doc = await openPdf(next);
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      file = next;
      $('pw-row').hidden = false;
      say('这份 PDF 有密码，输入密码后再点转换。');
      return;
    }
    say('这个文件打不开，可能已经损坏或者不是 PDF。');
    return;
  }

  pageCount = doc.numPages;
  $('opts').hidden = false;
  $('sum').textContent = '';
  $('meta').innerHTML = `<span>页数 <b>${pageCount}</b></span><span>文件 <b>${fmtSize(next.size)}</b></span><span>名字 <b>${stem(next.name)}.md</b></span>`;
  say(`已打开 ${pageCount} 页，点「转换」开始。`);
}

async function ensureDoc() {
  if (doc) return doc;
  say('正在用密码打开…');
  doc = await openPdf(file, $('pw').value || '');
  pageCount = doc.numPages;
  $('opts').hidden = false;
  $('meta').innerHTML = `<span>页数 <b>${pageCount}</b></span><span>文件 <b>${fmtSize(file.size)}</b></span><span>名字 <b>${stem(file.name)}.md</b></span>`;
  return doc;
}

async function run() {
  if (!file) return;
  const started = Date.now();
  $('go').disabled = true;
  $('out').hidden = true;

  try {
    await ensureDoc();

    const pages = parsePages($('pages').value, pageCount);
    if (!pages.length) {
      say('页码没解析出来，试试 1-3,7,9-10 这种写法。');
      return;
    }

    const headings = $('headings').checked;
    const models = [];
    for (let i = 0; i < pages.length; i += 1) {
      say(`正在读第 ${i + 1} / ${pages.length} 页…`);
      const page = await readPage(doc, pages[i]);
      models.push({ height: page.height, paragraphs: page.paragraphs, lines: page.lines, blocks: [] });
    }

    /* 字号基准和标题层级按整篇算，跨页的标题才不会一页 h1 一页 h3 */
    const blockPages = documentBlocks(models, { headings });
    blockPages.forEach((blocks, i) => { models[i].blocks = blocks; });

    const drop = $('dropmargins').checked ? findRepeatedMargins(models) : new Set();
    const md = pagesToMarkdown(models, {
      pageBreak: $('pagebreak').value,
      headings,
      escapeMd: $('escape').checked,
      dehyphen: $('dehyphen').checked,
      collapseCjk: $('cjk').checked,
      drop,
    });

    const words = md.replace(/\s/g, '').length;
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    lastMd = md;
    lastName = `${stem(file.name)}.md`;
    $('preview').value = md;
    $('sum').textContent = `${pages.length} 页 · ${words} 字 · ${fmtSize(new Blob([md]).size)} · ${seconds}s`;
    $('out').hidden = false;

    const blank = models.every((model) => model.blocks.length === 0);
    if (blank) say('这些页面里没有可提取的文字，大概是扫描件——需要先做 OCR。');
    else if (words < 40) say('提取到的字很少，可能是扫描件或者以图片为主的 PDF。');
    else say('好了，下面就是 Markdown。');
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      $('pw-row').hidden = false;
      say('密码不对，再试一次。');
    } else {
      sayFail($('status'), '转换中断了：', error);
    }
  } finally {
    $('go').disabled = false;
  }
}

async function copy() {
  if (!lastMd) return;
  try {
    await navigator.clipboard.writeText(lastMd);
    say('已经复制到剪贴板。');
  } catch {
    $('preview').select();
    document.execCommand('copy');
    say('已经复制到剪贴板。');
  }
}

wireDrop($('drop'), $('file'), (item) => /\.pdf$/i.test(item.name) || item.type === 'application/pdf', pick);

$('go').addEventListener('click', run);
$('copy').addEventListener('click', copy);
$('dl').addEventListener('click', () => {
  if (lastMd) download(new Blob([lastMd], { type: 'text/markdown;charset=utf-8' }), lastName);
});
$('reset').addEventListener('click', () => {
  file = null;
  doc = null;
  pageCount = 0;
  lastMd = '';
  $('file').value = '';
  $('preview').value = '';
  $('out').hidden = true;
  $('opts').hidden = true;
  $('pw-row').hidden = true;
  $('sum').textContent = '';
  say('');
});
$('pages').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') run();
});
