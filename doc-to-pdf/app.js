import { readDocx, readPptx, readXlsx, parseDelimited, guessDelimiter, readHtml, readText } from '../js/office-kit.js';
import { stem, fmtSize, wireDrop } from '../js/tool-ui.js';

const $ = (id) => document.getElementById(id);
let loaded = null;
const urls = [];

const say = (text) => {
  $('status').textContent = text;
};

const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function extOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || '');
  return (match ? match[1] : '').toLowerCase();
}

async function load(file) {
  const ext = extOf(file.name);
  const buffer = await file.arrayBuffer();
  if (['docx', 'pptx', 'xlsx'].includes(ext)) {
    if (ext === 'docx') return { kind: 'blocks', blocks: await readDocx(buffer) };
    if (ext === 'pptx') return { kind: 'slides', slides: await readPptx(buffer) };
    return { kind: 'sheets', sheets: await readXlsx(buffer) };
  }
  if (['doc', 'ppt', 'xls'].includes(ext)) throw new Error('legacy');
  if (['csv', 'tsv'].includes(ext)) {
    const text = new TextDecoder().decode(buffer);
    const rows = parseDelimited(text, ext === 'tsv' ? '\t' : guessDelimiter(text));
    return { kind: 'sheets', sheets: [{ name: stem(file.name), rows }] };
  }
  if (['html', 'htm'].includes(ext)) return { kind: 'blocks', blocks: readHtml(new TextDecoder().decode(buffer)) };
  return { kind: 'blocks', blocks: readText(new TextDecoder().decode(buffer)) };
}

function tableHtml(rows) {
  if (!rows.length) return '';
  const head = `<thead><tr>${rows[0].map((cell) => `<th>${esc(cell)}</th>`).join('')}</tr></thead>`;
  const body = rows
    .slice(1)
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

function blocksHtml(blocks) {
  const parts = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      parts.push('</ul>');
      listOpen = false;
    }
  };
  for (const block of blocks) {
    if (block.type !== 'li') closeList();
    if (block.type === 'title') parts.push(`<h1>${esc(block.text)}</h1>`);
    else if (/^h[1-3]$/.test(block.type)) parts.push(`<${block.type}>${esc(block.text)}</${block.type}>`);
    else if (block.type === 'li') {
      if (!listOpen) {
        parts.push('<ul>');
        listOpen = true;
      }
      parts.push(`<li>${esc(block.text)}</li>`);
    } else if (block.type === 'table') parts.push(tableHtml(block.rows || []));
    else if (block.type === 'img') {
      if (block.src) parts.push(`<p><img src="${block.src}" alt=""></p>`);
      else if (block.data) {
        const url = URL.createObjectURL(new Blob([block.data], { type: 'image/png' }));
        urls.push(url);
        parts.push(`<p><img src="${url}" alt=""></p>`);
      }
    } else if (block.type === 'pagebreak') parts.push('<div style="break-after:page;height:0"></div>');
    else if (block.text) parts.push(`<p>${esc(block.text)}</p>`);
  }
  closeList();
  return parts.join('\n');
}

function sheetsHtml(sheets) {
  return sheets
    .map((sheet) => `<h2>${esc(sheet.name)}</h2>${tableHtml(sheet.rows)}`)
    .join('\n');
}

function slidesHtml(slides) {
  return slides
    .map(
      (slide) =>
        `<div class="slide"><h2>${esc(slide.lines[0] || '')}</h2>${slide.lines
          .slice(1)
          .map((line) => `<p>${esc(line)}</p>`)
          .join('')}</div>`,
    )
    .join('\n');
}

async function pick(file) {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
  $('preview').hidden = true;
  $('print').hidden = true;
  say('正在读取…');
  try {
    const data = await load(file);
    const count =
      data.kind === 'blocks' ? data.blocks.length : data.kind === 'sheets' ? data.sheets.length : data.slides.length;
    if (!count) throw new Error('empty');
    loaded = { file, ...data };
  } catch (error) {
    loaded = null;
    if (error?.message === 'legacy') {
      say('这是 97-2003 的老格式（.doc/.ppt/.xls），浏览器读不了。请先另存为 .docx/.pptx/.xlsx 再试。');
    } else {
      say('这个文件读不了，检查一下是不是损坏或者加密了。');
    }
    return;
  }
  $('opts').hidden = false;
  $('meta').innerHTML = `<span>文件 <b>${fmtSize(file.size)}</b></span><span>类型 <b>${extOf(file.name)}</b></span>`;
  say('读好了，点「生成预览」。');
  build();
}

function build() {
  if (!loaded) return;
  const sheet = $('sheet');
  if (loaded.kind === 'slides') sheet.innerHTML = slidesHtml(loaded.slides);
  else if (loaded.kind === 'sheets') sheet.innerHTML = sheetsHtml(loaded.sheets);
  else sheet.innerHTML = blocksHtml(loaded.blocks);

  sheet.style.fontSize = $('size').value + 'px';
  const landscape = $('paper').value === 'a4-land';
  document.getElementById('paperStyle')?.remove();
  const style = document.createElement('style');
  style.id = 'paperStyle';
  style.textContent = `@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 14mm; }`;
  document.head.appendChild(style);

  $('preview').hidden = false;
  $('print').hidden = false;
  const pagesHint = loaded.kind === 'slides' ? `${loaded.slides.length} 页幻灯片` : loaded.kind === 'sheets' ? `${loaded.sheets.length} 个工作表` : `${loaded.blocks.length} 个段落`;
  $('sum').textContent = `共 ${pagesHint} · 用浏览器打印存成 PDF`;
  say('预览好了，点「打印 / 存为 PDF」。');
}

wireDrop(
  $('drop'),
  $('file'),
  (item) => /\.(docx?|pptx?|xlsx?|csv|tsv|txt|md|markdown|html?)$/i.test(item.name),
  pick,
);
$('go').addEventListener('click', build);
$('size').addEventListener('change', build);
$('paper').addEventListener('change', build);
$('print').addEventListener('click', () => window.print());
$('reset').addEventListener('click', () => {
  loaded = null;
  $('preview').hidden = true;
  $('opts').hidden = true;
  $('print').hidden = true;
  $('file').value = '';
  $('sheet').innerHTML = '';
  say('');
});
