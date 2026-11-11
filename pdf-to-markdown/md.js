/* PDF → Markdown 的纯函数部分：不碰 DOM，方便单独测。
   自己按「行 → 段落块」重建结构（不用 pdf-blocks 的那一套），
   因为行距很紧的 PDF 会把正文和下一行标题并成一块，标题就被吞掉了。
   这里分块时要求字号一致，标题永远不会和正文粘在一起。 */

/** 页边（页眉页脚常驻的地方）——比例按页面高度算。 */
const MARGIN_BAND = 0.14;

/** 句子收尾的标点：这么结尾的多半是正文，不像标题。 */
const SENTENCE_END = /[。．.；;，,、]$/;

const normalize = (text) => String(text || '').replace(/\s+/g, '').toLowerCase();

/** 跨页重复、且贴着上下页边的那几行：多半是页眉页脚，返回要去掉的文本集合。 */
export function findRepeatedMargins(pages, { band = MARGIN_BAND, minPages = 3 } = {}) {
  const drop = new Set();
  if (!Array.isArray(pages) || pages.length < minPages) return drop;

  const counts = new Map();
  for (const page of pages) {
    const seen = new Set();
    for (const para of page.paragraphs || []) {
      const nearTop = para.top > page.height * (1 - band);
      const nearBottom = para.bottom < page.height * band;
      if (!nearTop && !nearBottom) continue;
      const key = normalize(para.text);
      if (key.length < 2 || key.length > 80) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  const need = Math.max(minPages - 1, Math.ceil(pages.length * 0.5));
  for (const [key, n] of counts) {
    if (n >= need) drop.add(key);
  }
  return drop;
}

const isLatin = (ch) => /[A-Za-z0-9]/.test(ch || '');

/** 同一段里的两行接起来：中文直接连，英文补空格，行尾连字符不补（留给后面合并）。 */
function joinLines(lines) {
  let text = '';
  for (const line of lines) {
    if (!text) {
      text = line.text;
      continue;
    }
    if (/-$/.test(text) && /^[a-z]/.test(line.text)) text += line.text;
    else if (isLatin(text.slice(-1)) && isLatin(line.text[0])) text += ' ' + line.text;
    else text += line.text;
  }
  return text;
}

/** 页里的行 → 段落块。字号不同、行距变大、或者缩进跳变，都算新的一块。 */
export function groupBlocks(page) {
  const lines = [...(page.lines || [])]
    .filter((line) => line.text)
    .sort((a, b) => (Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x));

  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (!current) {
      current = { lines: [line], top: line.y, bottom: line.y, left: line.x, size: line.size };
      blocks.push(current);
      continue;
    }
    const size = Math.max(line.size, current.size);
    const gap = current.bottom - line.y;
    const sameSize = Math.abs(line.size - current.size) <= Math.max(0.6, size * 0.06);
    const tight = gap <= size * 1.75;
    const sameColumn = Math.abs(line.x - current.left) <= Math.max(6, size * 2.2);

    if (sameSize && tight && sameColumn) {
      current.lines.push(line);
      current.bottom = Math.min(current.bottom, line.y);
    } else {
      current = { lines: [line], top: line.y, bottom: line.y, left: line.x, size: line.size };
      blocks.push(current);
    }
  }

  return blocks.map((block) => ({
    text: joinLines(block.lines).replace(/\s+/g, ' ').trim(),
    size: block.size,
    left: block.left,
    top: block.top,
    bottom: block.bottom,
  })).filter((block) => block.text);
}

/** 正文字号：按字数找「字数累计过半」的那一档。
    多看一眼紧挨着的更小字号——正文往往比标题小，太容易被长标题抢走。 */
function bodySize(blocks) {
  const weights = new Map();
  for (const block of blocks) {
    const key = Math.round(block.size * 10) / 10;
    weights.set(key, (weights.get(key) || 0) + Math.max(1, block.text.length));
  }
  const sorted = [...weights.entries()].sort((a, b) => a[0] - b[0]);
  const total = sorted.reduce((sum, [, w]) => sum + w, 0);

  let acc = 0;
  let pick = sorted.length ? sorted[sorted.length - 1][0] : 11;
  for (let i = 0; i < sorted.length; i += 1) {
    acc += sorted[i][1];
    if (acc >= total / 2) {
      pick = sorted[i][0];
      if (i > 0 && sorted[i - 1][1] >= sorted[i][1] * 0.6) pick = sorted[i - 1][0];
      break;
    }
  }
  return pick;
}

/** 认出列表项，返回 { ordered, marker, body }；认不出返回 null。 */
export function listParts(text) {
  const raw = String(text || '').trim();

  const ordered = /^(\d{1,3})\s*[.))、]\s*(.+)$/.exec(raw);
  if (ordered) return { ordered: true, marker: `${Number(ordered[1])}. `, body: ordered[2] };

  const bullet = /^[•·▪◦‣∙●○■□◆◇※\-\u2013\u2014*]\s*(.+)$/.exec(raw);
  if (bullet) return { ordered: false, marker: '- ', body: bullet[1] };

  return null;
}

/** 标题层级的候选字号：比正文大的那几档，从大到小最多三档。 */
function headingLevels(blocks, body) {
  return [...new Set(blocks
    .map((block) => Math.round(block.size * 2) / 2)
    .filter((size) => size >= body * 1.08))]
    .sort((a, b) => b - a)
    .slice(0, 3);
}

function classify(blocks, body, levels) {
  const levelOf = (size) => {
    if (!levels.length) return 0;
    const hit = levels.findIndex((level) => size >= level - 0.6);
    return hit >= 0 ? hit + 1 : 0;
  };

  const out = blocks.map((block) => {
    const text = block.text;
    const ratio = block.size / body;
    const level = levelOf(block.size);
    const sentence = SENTENCE_END.test(text);

    /* 像一整句话的不当标题：除非字号明显大得多 */
    if (level && text.length <= 90 && !(sentence && ratio < 1.5)) {
      return { type: `h${level}`, text };
    }

    const list = listParts(text);
    if (list) return { type: 'li', text: list.ordered ? `${list.marker}${list.body}` : list.body };

    return { type: 'p', text };
  });

  /* 整页几乎每一块都像标题（比如目录页、或者根本没有字号层次），降级成正文更安全。
     短页面不套这个规则：一页就几行标题的扉页本来就是这样。 */
  const heads = out.filter((block) => block.type[0] === 'h').length;
  if (out.length >= 8 && heads > out.length * 0.85) {
    return out.map((block) => (block.type[0] === 'h' ? { type: 'p', text: block.text } : block));
  }
  return out;
}

/** 一页 → 带层级的块（h1 / h2 / h3 / li / p）。单独用一页时层级就以这一页为准。 */
export function pageBlocks(page) {
  const blocks = groupBlocks(page);
  if (!blocks.length) return [];
  const body = bodySize(blocks);
  return classify(blocks, body, headingLevels(blocks, body));
}

/** 整篇 → 每页的块。字号基准和标题层级在全篇范围内算，
    否则第二页只有一个标题时会被单独判成 h1，跟第一页对不上。 */
export function documentBlocks(pages, { headings = true } = {}) {
  const grouped = pages.map((page) => groupBlocks(page));
  const all = grouped.flat();
  if (!all.length) return grouped;

  const body = bodySize(all);
  const levels = headingLevels(all, body);

  return grouped.map((blocks) => {
    const out = classify(blocks, body, levels);
    return headings ? out : out.map((block) => (block.type === 'li' ? block : { type: 'p', text: block.text }));
  });
}

/** 行内整理：去掉被行宽硬折断的英文连字符、按需清掉中文字缝里的空格。 */
export function tidyText(text, { dehyphen = true, collapseCjk = false } = {}) {
  let out = String(text || '').replace(/\s+/g, ' ').trim();
  if (dehyphen) out = out.replace(/([A-Za-z])[-\u2010\u2011]\s+([a-z])/g, '$1$2');
  if (collapseCjk) out = out.replace(/([\u3400-\u9fff\u3040-\u30ff])[ \t]+(?=[\u3400-\u9fff\u3040-\u30ff])/g, '$1');
  return out;
}

/** 行首的 Markdown 标记要转义，否则正文会被误当成标题 / 列表 / 引用。 */
export function escapeLine(text) {
  return String(text || '').replace(/^(\s*)([#>*+\-=|]|\d{1,9}[.)](?=\s))/, (m, pad, mark) => `${pad}\\${mark}`);
}

/** 块 → Markdown 行。 */
export function blocksToMarkdown(blocks, opts = {}) {
  const {
    headings = true, escapeMd = true, dehyphen = true, collapseCjk = false, drop = new Set(),
  } = opts;

  const lines = [];
  for (const block of blocks) {
    if (!block || !block.text) continue;
    if (drop.size && drop.has(normalize(block.text))) continue;

    const text = tidyText(block.text, { dehyphen, collapseCjk });
    if (!text) continue;

    const level = block.type === 'h1' ? 1 : block.type === 'h2' ? 2 : block.type === 'h3' ? 3 : 0;
    if (headings && level) {
      lines.push(`${'#'.repeat(level)} ${text}`);
      continue;
    }

    /* li 块在 pageBlocks 里已经去掉项目符号，这里补回去；
       带数字编号的保留成有序列表 */
    if (block.type === 'li') {
      const list = listParts(text);
      const marker = list ? list.marker : '- ';
      const body = list ? list.body : text;
      lines.push(marker + (escapeMd ? escapeLine(body) : body));
      continue;
    }

    lines.push(escapeMd ? escapeLine(text) : text);
  }
  return lines;
}

/** 整本 → Markdown；pageBreak 决定页与页之间留什么。 */
export function pagesToMarkdown(pages, opts = {}) {
  const { pageBreak = 'rule', drop = new Set() } = opts;
  const out = [];

  pages.forEach((page, index) => {
    if (index > 0) {
      if (pageBreak === 'rule') out.push('', '---', '');
      else if (pageBreak === 'comment') out.push('', `<!-- 第 ${index + 1} 页 -->`, '');
    }
    const lines = blocksToMarkdown(page.blocks || [], { ...opts, drop });
    if (lines.length) out.push(...lines, '');
  });

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
