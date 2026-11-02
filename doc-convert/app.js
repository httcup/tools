import {
  readDocx, readPptx, readXlsx, parseDelimited, guessDelimiter, toCsv,
  readHtml, readText, blocksToHtml, blocksToText, blocksToMarkdown, rowsToBlocks,
} from '../js/office-kit.js';
import { buildDocx } from '../js/docx-kit.js';
import { buildXlsx } from '../js/xlsx-kit.js';
import { stem, fmtSize, wireDrop } from '../js/tool-ui.js';

const $ = (id) => document.getElementById(id);
let loaded = null;

const say = (text) => {
  $('status').textContent = text;
};

function extOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || '');
  return (match ? match[1] : '').toLowerCase();
}

async function toBlocks(block, name) {
  const ext = extOf(name);
  const buffer = await block.arrayBuffer();

  if (['docx', 'doc'].includes(ext)) {
    if (ext === 'doc') throw new Error('legacy-doc');
    return { blocks: await readDocx(buffer), sheets: [] };
  }
  if (['pptx', 'ppt'].includes(ext)) {
    if (ext === 'ppt') throw new Error('legacy-ppt');
    const slides = await readPptx(buffer);
    const blocks = [];
    slides.forEach((slide) => {
      const [first, ...rest] = slide.lines;
      if (first) blocks.push({ type: 'h2', text: first });
      rest.forEach((line) => blocks.push({ type: 'p', text: line }));
    });
    return { blocks, sheets: slides.map((slide) => ({ name: `Slide ${slide.index}`, rows: slide.lines.map((line) => [line]) })) };
  }
  if (['xlsx', 'xls'].includes(ext)) {
    if (ext === 'xls') throw new Error('legacy-xls');
    const sheets = await readXlsx(buffer);
    return { blocks: [], sheets };
  }
  if (['csv', 'tsv'].includes(ext)) {
    const text = new TextDecoder().decode(buffer);
    const rows = parseDelimited(text, ext === 'tsv' ? '\t' : guessDelimiter(text));
    return { blocks: rowsToBlocks(rows), sheets: [{ name: 'Sheet1', rows }] };
  }
  if (['html', 'htm'].includes(ext)) {
    const blocks = readHtml(new TextDecoder().decode(buffer));
    return { blocks, sheets: [] };
  }
  const text = new TextDecoder().decode(buffer);
  return { blocks: readText(text), sheets: [] };
}

async function pick(file) {
  $('out').hidden = true;
  say('正在读取…');
  try {
    const data = await toBlocks(file, file.name);
    if (!data.blocks.length && !data.sheets.length) throw new Error('empty');
    loaded = { file, ...data };
  } catch (error) {
    loaded = null;
    const code = error?.message;
    if (code === 'legacy-doc' || code === 'legacy-ppt' || code === 'legacy-xls') {
      say('这是 97-2003 的老格式（.doc/.ppt/.xls），浏览器里读不了。请先用 Office 或 WPS 另存为新格式（.docx/.pptx/.xlsx），再拖进来。');
    } else {
      say('这个文件读不了，检查一下是不是损坏或者加密了。');
    }
    return;
  }
  $('opts').hidden = false;
  const stats = [];
  if (loaded.blocks.length) stats.push(`<span>段落 <b>${loaded.blocks.length}</b></span>`);
  if (loaded.sheets.length) {
    const rows = loaded.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
    stats.push(`<span>工作表 <b>${loaded.sheets.length}</b></span><span>数据行 <b>${rows}</b></span>`);
  }
  stats.push(`<span>文件 <b>${fmtSize(file.size)}</b></span>`);
  $('meta').innerHTML = stats.join('');
  say('读好了，选一个目标格式。');
}

function tableOf(data, { header = true } = {}) {
  if (data.sheets.length) return data.sheets[0].rows;
  const table = data.blocks.find((block) => block.type === 'table');
  if (table) return table.rows;
  /* 没有表格就把每段当一行 */
  return data.blocks.filter((block) => block.text).map((block) => [block.text]);
}

async function run() {
  if (!loaded) return;
  const target = $('target').value;
  const data = loaded;
  $('go').disabled = true;
  try {
    let blob;
    let ext = target;
    let preview = '';
    const title = stem(data.file.name);

    if (target === 'csv' || target === 'tsv') {
      const sep = target === 'tsv' ? '\t' : $('delim').value === '\\t' ? '\t' : $('delim').value;
      const csv = toCsv(tableOf(data), sep);
      blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      preview = csv.slice(0, 4000);
    } else if (target === 'xlsx') {
      const sheets = data.sheets.length
        ? data.sheets
        : [{ name: 'Sheet1', rows: tableOf(data, { header: $('headrow').checked }) }];
      blob = await buildXlsx(sheets);
      preview = `工作表：${sheets.map((sheet) => `${sheet.name}（${sheet.rows.length} 行）`).join('、')}`;
    } else if (target === 'docx') {
      const blocks = data.sheets.length ? data.sheets.flatMap((sheet, i) => [
        ...(i > 0 ? [{ type: 'pagebreak' }] : []),
        { type: 'h2', text: sheet.name },
        { type: 'table', rows: sheet.rows },
      ]) : data.blocks;
      blob = await buildDocx(blocks, { title });
      preview = blocksToText(blocks).slice(0, 4000);
    } else if (target === 'html') {
      const blocks = data.sheets.length ? data.sheets.flatMap((sheet) => [
        { type: 'h2', text: sheet.name },
        { type: 'table', rows: sheet.rows },
      ]) : data.blocks;
      /* docx 里的图片先转成 data URL，网页单独拿走也能显示 */
      const withImages = blocks.map((block) => {
        if (block.type !== 'img' || block.src || !block.data) return block;
        let binary = '';
        const bytes = new Uint8Array(block.data);
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        return { type: 'img', src: `data:image/png;base64,${btoa(binary)}` };
      });
      const html = blocksToHtml(withImages, { title });
      blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      preview = html.slice(0, 4000);
    } else if (target === 'md') {
      const blocks = data.sheets.length ? data.sheets.flatMap((sheet) => [
        { type: 'h2', text: sheet.name },
        { type: 'table', rows: sheet.rows },
      ]) : data.blocks;
      const md = blocksToMarkdown(blocks);
      blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      preview = md.slice(0, 4000);
    } else {
      const blocks = data.sheets.length ? data.sheets.flatMap((sheet) => [
        { type: 'h2', text: sheet.name },
        { type: 'table', rows: sheet.rows },
      ]) : data.blocks;
      const text = blocksToText(blocks);
      blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      preview = text.slice(0, 4000);
    }

    const name = `${title}.${ext}`;
    const url = URL.createObjectURL(blob);
    $('dl').href = url;
    $('dl').download = name;
    $('dl').textContent = `下载 ${name}`;
    $('preview').value = preview;
    $('sum').textContent = `${name} · ${fmtSize(blob.size)}`;
    $('out').hidden = false;
    say('好了。');
  } catch (error) {
    say('转换失败：' + (error?.message || '未知错误'));
  } finally {
    $('go').disabled = false;
  }
}

wireDrop(
  $('drop'),
  $('file'),
  (item) => /\.(docx?|pptx?|xlsx?|csv|tsv|txt|md|markdown|html?)$/i.test(item.name),
  pick,
);
$('go').addEventListener('click', run);
$('reset').addEventListener('click', () => {
  loaded = null;
  $('out').hidden = true;
  $('opts').hidden = true;
  $('file').value = '';
  $('preview').value = '';
  say('');
});
