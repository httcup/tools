/* 读 Office 与文本格式，统一成 blocks / rows 两种中间结构。
   docx、pptx、xlsx 都是 zip + XML，用 DOMParser 直接读，不需要任何第三方库。 */

import { unzip, xmlEscape } from './zip-kit.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('这个文件的结构看不懂，可能已经损坏。');
  return doc;
}

function textOf(node) {
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

function relsOf(files, part) {
  const dir = part.includes('/') ? part.slice(0, part.lastIndexOf('/')) : '';
  const relPath = `${dir}/_rels/${part.slice(part.lastIndexOf('/') + 1)}.rels`;
  const xml = files.get(relPath);
  const map = new Map();
  if (!xml) return map;
  const doc = parseXml(new TextDecoder().decode(xml));
  for (const rel of doc.getElementsByTagName('Relationship')) {
    map.set(rel.getAttribute('Id'), rel.getAttribute('Target'));
  }
  return map;
}

function resolvePath(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const piece of target.split('/')) {
    if (piece === '..') parts.pop();
    else if (piece !== '.') parts.push(piece);
  }
  return parts.join('/');
}

/* ---------------- DOCX ---------------- */

function paragraphText(node) {
  let out = '';
  const walk = (el) => {
    for (const child of el.childNodes) {
      if (child.nodeType !== 1) continue;
      const name = child.localName;
      if (child.namespaceURI === W) {
        if (name === 't') out += child.textContent;
        else if (name === 'tab') out += '\t';
        else if (name === 'br') out += '\n';
        else if (name === 'delText') continue;
        else walk(child);
      } else {
        walk(child);
      }
    }
  };
  walk(node);
  return out.trim();
}

function headingLevel(node) {
  const style = node.getElementsByTagNameNS(W, 'pStyle')[0];
  const value = style?.getAttributeNS(W, 'val') || '';
  const named = /^Heading(\d)$/i.exec(value) || /^heading (\d)$/i.exec(value);
  if (named) return Math.min(3, Number(named[1]));
  if (/^Title$/i.test(value)) return 0;
  const outline = node.getElementsByTagNameNS(W, 'outlineLvl')[0];
  if (outline) {
    const lvl = Number(outline.getAttributeNS(W, 'val'));
    if (Number.isFinite(lvl) && lvl < 3) return lvl + 1;
  }
  return -1;
}

export async function readDocx(buffer) {
  const files = await unzip(buffer);
  const main = files.get('word/document.xml');
  if (!main) throw new Error('压缩包里没找到正文，可能不是 Word 文档。');
  const doc = parseXml(new TextDecoder().decode(main));
  const rels = relsOf(files, 'word/document.xml');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  const blocks = [];

  for (const node of body.childNodes) {
    if (node.nodeType !== 1) continue;
    if (node.localName === 'p') {
      const text = paragraphText(node);
      const level = headingLevel(node);
      const styleEl = node.getElementsByTagNameNS(W, 'pStyle')[0];
      const styleVal = styleEl?.getAttributeNS(W, 'val') || '';
      const isList =
        node.getElementsByTagNameNS(W, 'numPr').length > 0 ||
        /^List|Bullet|Number/i.test(styleVal) ||
        /^列表|项目符号|编号/.test(styleVal);
      const drawings = node.getElementsByTagNameNS(A, 'blip');
      if (drawings.length && !text) {
        for (const blip of drawings) {
          const target = rels.get(blip.getAttributeNS(R, 'embed'));
          if (!target) continue;
          const path = resolvePath('word/document.xml', target);
          const data = files.get(path);
          if (data) blocks.push({ type: 'img', data, ext: 'png' });
        }
        continue;
      }
      if (!text) continue;
      if (level === 0) blocks.push({ type: 'title', text });
      else if (level > 0) blocks.push({ type: 'h' + level, text });
      else if (isList) blocks.push({ type: 'li', text });
      else blocks.push({ type: 'p', text });
    } else if (node.localName === 'tbl') {
      const rows = [];
      for (const tr of node.getElementsByTagNameNS(W, 'tr')) {
        const cells = [];
        for (const tc of tr.getElementsByTagNameNS(W, 'tc')) {
          cells.push(textOf(tc));
        }
        if (cells.some((cell) => cell)) rows.push(cells);
      }
      if (rows.length) blocks.push({ type: 'table', rows });
    }
  }
  return blocks;
}

/* ---------------- PPTX ---------------- */

export async function readPptx(buffer) {
  const files = await unzip(buffer);
  const names = [...files.keys()]
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  const slides = [];
  for (const name of names) {
    const doc = parseXml(new TextDecoder().decode(files.get(name)));
    const paras = [...doc.getElementsByTagNameNS(A, 'p')]
      .map((node) => {
        const runs = [...node.getElementsByTagNameNS(A, 't')].map((t) => t.textContent);
        return runs.join('');
      })
      .map((line) => line.trim())
      .filter(Boolean);
    slides.push({ index: slides.length + 1, lines: paras });
  }
  return slides;
}

/* ---------------- XLSX ---------------- */

function colIndex(ref) {
  const letters = /^([A-Z]+)/.exec(ref || 'A')[1];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsx(buffer, { maxRows = 2000, maxCols = 60 } = {}) {
  const files = await unzip(buffer);
  const shared = [];
  const sharedXml = files.get('xl/sharedStrings.xml');
  if (sharedXml) {
    const doc = parseXml(new TextDecoder().decode(sharedXml));
    for (const si of doc.getElementsByTagNameNS('*', 'si')) {
      shared.push(
        [...si.getElementsByTagNameNS('*', 't')].map((t) => t.textContent).join(''),
      );
    }
  }

  const workbookXml = files.get('xl/workbook.xml');
  if (!workbookXml) throw new Error('这个表里没有工作簿，读不出数据。');
  const wb = parseXml(new TextDecoder().decode(workbookXml));
  const rels = relsOf(files, 'xl/workbook.xml');
  const sheets = [];

  for (const sheet of wb.getElementsByTagNameNS('*', 'sheet')) {
    const name = sheet.getAttribute('name') || `Sheet${sheets.length + 1}`;
    const relId = sheet.getAttributeNS(R, 'id');
    const target = rels.get(relId);
    if (!target) continue;
    const path = resolvePath('xl/workbook.xml', target);
    const sheetXml = files.get(path);
    if (!sheetXml) continue;

    const doc = parseXml(new TextDecoder().decode(sheetXml));
    const rows = [];
    for (const row of doc.getElementsByTagNameNS('*', 'row')) {
      if (rows.length >= maxRows) break;
      const out = [];
      for (const cell of row.getElementsByTagNameNS('*', 'c')) {
        const at = colIndex(cell.getAttribute('r'));
        if (at >= maxCols) continue;
        const type = cell.getAttribute('t');
        let value = '';
        if (type === 'inlineStr') {
          value = textOf(cell);
        } else {
          const v = cell.getElementsByTagNameNS('*', 'v')[0];
          if (v) value = type === 's' ? shared[Number(v.textContent)] ?? '' : v.textContent;
        }
        out[at] = String(value ?? '').trim();
      }
      if (out.some((item) => item)) rows.push(out.map((item) => item ?? ''));
    }
    sheets.push({ name, rows });
  }
  return sheets;
}

/* ---------------- CSV / TSV ---------------- */

export function parseDelimited(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((line) => line.some((cell) => cell.trim()));
}

export function guessDelimiter(text, fallback = ',') {
  const head = text.slice(0, 4000);
  const commas = (head.match(/,/g) || []).length;
  const tabs = (head.match(/\t/g) || []).length;
  const semis = (head.match(/;/g) || []).length;
  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas) return ';';
  return fallback;
}

export function toCsv(rows, delimiter = ',') {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return new RegExp(`["\\n${delimiter === '\t' ? '\\t' : delimiter}]`).test(value)
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(delimiter),
    )
    .join('\r\n');
}

/* ---------------- HTML / TXT / MD ---------------- */

export function readHtml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const blocks = [];
  const visit = (node) => {
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        blocks.push({ type: 'h' + Math.min(3, Number(tag[1])), text: textOf(child) });
      } else if (tag === 'p') {
        const text2 = textOf(child);
        if (text2) blocks.push({ type: 'p', text: text2 });
      } else if (tag === 'li') {
        const text2 = textOf(child);
        if (text2) blocks.push({ type: 'li', text: text2 });
      } else if (tag === 'table') {
        const rows = [...child.querySelectorAll('tr')].map((tr) =>
          [...tr.children].map((cell) => textOf(cell)),
        );
        if (rows.length) blocks.push({ type: 'table', rows });
      } else if (tag === 'img') {
        const src = child.getAttribute('src') || '';
        if (src.startsWith('data:image/')) blocks.push({ type: 'img', src });
      } else if (tag === 'br') {
        blocks.push({ type: 'p', text: '' });
      } else if (!['script', 'style', 'head', 'title', 'meta', 'link'].includes(tag)) {
        visit(child);
      }
    }
  };
  visit(doc.body || doc.documentElement);
  if (!blocks.length) {
    const plain = textOf(doc.body || doc.documentElement);
    if (plain) blocks.push({ type: 'p', text: plain });
  }
  return blocks;
}

export function readText(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    const joined = buffer.join(' ').trim();
    if (joined) blocks.push({ type: 'p', text: joined });
    buffer = [];
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flush();
      blocks.push({ type: 'h' + heading[1].length, text: heading[2].trim() });
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed)) {
      flush();
      blocks.push({ type: 'li', text: trimmed.replace(/^[-*+]\s+/, '') });
      continue;
    }
    buffer.push(trimmed);
  }
  flush();
  return blocks;
}

/* ---------------- 输出 ---------------- */

export function blocksToHtml(blocks, { title = '' } = {}) {
  const parts = [];
  for (const block of blocks) {
    if (block.type === 'title') parts.push(`<h1>${xmlEscape(block.text)}</h1>`);
    else if (/^h[1-3]$/.test(block.type)) parts.push(`<${block.type}>${xmlEscape(block.text)}</${block.type}>`);
    else if (block.type === 'li') parts.push(`<li>${xmlEscape(block.text)}</li>`);
    else if (block.type === 'table') {
      const rows = block.rows
        .map(
          (row, i) =>
            `<tr>${row
              .map((cell) => (i === 0 ? `<th>${xmlEscape(cell)}</th>` : `<td>${xmlEscape(cell)}</td>`))
              .join('')}</tr>`,
        )
        .join('');
      parts.push(`<table>${rows}</table>`);
    } else if (block.type === 'img' && block.src) {
      parts.push(`<p><img src="${block.src}" alt=""></p>`);
    } else if (block.text) parts.push(`<p>${xmlEscape(block.text)}</p>`);
  }
  /* 把连续的 li 包进 ul */
  let html = parts.join('\n').replace(/(?:^|\n)(<li>[\s\S]*?<\/li>)(?=\n|$)/g, '\n<ul>$1</ul>');
  html = html.replace(/<\/li>\n<ul><li>/g, '</li><li>');
  const head = title
    ? `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${xmlEscape(title)}</title><style>body{font:16px/1.7 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a202c}h1{font-size:1.9em}h2{font-size:1.45em;margin-top:1.6em}h3{font-size:1.2em}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #d8dde5;padding:6px 10px;text-align:left}img{max-width:100%}</style></head><body>`
    : '';
  const tail = title ? '</body></html>' : '';
  return head + html + tail;
}

export function blocksToText(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === 'table') block.rows.forEach((row) => lines.push(row.join('\t')));
    else if (block.type === 'li') lines.push('• ' + block.text);
    else if (block.text !== undefined) lines.push(block.text);
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    if (block.type === 'title') lines.push('# ' + block.text, '');
    else if (block.type === 'h1') lines.push('## ' + block.text, '');
    else if (block.type === 'h2') lines.push('### ' + block.text, '');
    else if (block.type === 'h3') lines.push('#### ' + block.text, '');
    else if (block.type === 'li') lines.push('- ' + block.text);
    else if (block.type === 'table') {
      const rows = block.rows;
      if (rows.length) {
        lines.push('| ' + rows[0].join(' | ') + ' |');
        lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
        rows.slice(1).forEach((row) => lines.push('| ' + row.join(' | ') + ' |'));
        lines.push('');
      }
    } else if (block.text) lines.push(block.text, '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function rowsToBlocks(rows) {
  if (!rows.length) return [];
  const width = Math.max(...rows.map((row) => row.length));
  const clean = rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ''));
  return [{ type: 'table', rows: clean }];
}
