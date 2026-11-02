/* 把 pdf-kit 的行结构整理成「标题 / 正文 / 列表」的段落块，
   PDF 转 Word、转 PPT、转 HTML 三个工具共用这一份判断。 */

function weightedMedian(paragraphs) {
  const weights = new Map();
  for (const para of paragraphs) {
    const key = Math.round(para.size * 10) / 10;
    weights.set(key, (weights.get(key) || 0) + Math.max(1, para.text.length));
  }
  const sorted = [...weights.entries()].sort((a, b) => a[0] - b[0]);
  const total = sorted.reduce((sum, [, w]) => sum + w, 0);
  let acc = 0;
  for (const [size, w] of sorted) {
    acc += w;
    if (acc >= total / 2) return size;
  }
  return 11;
}

const SENTENCE_END = /[。．.！!？?；;：:，,、”"』】]\s*$/;

/** 一整页 → 带层级的块。 */
export function pageToBlocks(page) {
  const paragraphs = page.paragraphs || [];
  if (!paragraphs.length) return [];
  const body = weightedMedian(paragraphs);
  const blocks = [];

  for (const para of paragraphs) {
    const text = para.text.trim();
    if (!text) continue;
    const ratio = para.size / body;
    const short = text.length <= 80;
    const looksTitle = ratio >= 1.32 && short && !SENTENCE_END.test(text);
    const looksSub = ratio >= 1.12 && short && !SENTENCE_END.test(text) && text.length <= 60;

    /* PDF 里一条列表常常是一个项目符号加一行字，这里认出来 */
    const bullet = /^[•·▪◦‣∙·\-–—*]\s+/.test(text) || /^[（(]?\d{1,2}[)）.、]\s?/.test(text);

    if (looksTitle) blocks.push({ type: 'h1', text });
    else if (looksSub) blocks.push({ type: 'h2', text });
    else if (bullet) blocks.push({ type: 'li', text: text.replace(/^[•·▪◦‣∙·\-–—*]\s+/, '') });
    else blocks.push({ type: 'p', text });
  }

  /* 一页里全是「标题」通常说明这份 PDF 没有字号层次，降级成正文更安全 */
  const heads = blocks.filter((b) => b.type === 'h1' || b.type === 'h2').length;
  if (heads > blocks.length * 0.6) {
    return blocks.map((block) => (block.type.startsWith('h') ? { type: 'p', text: block.text } : block));
  }
  return blocks;
}

/** 整本 → 块，按需插入分页符。 */
export function docToBlocks(info, { pageBreaks = true } = {}) {
  const out = [];
  info.pages.forEach((page, index) => {
    if (pageBreaks && index > 0) out.push({ type: 'pagebreak' });
    out.push(...pageToBlocks(page));
  });
  return out;
}

/** 段落按行还原：给 PPT 用，一段一行，太长就断开。 */
export function slimLines(page, maxChars = 90) {
  const lines = [];
  for (const para of page.paragraphs || []) {
    let text = para.text.trim();
    while (text.length > maxChars) {
      const cut = Math.max(text.lastIndexOf('，', maxChars), text.lastIndexOf(',', maxChars), text.lastIndexOf(' ', maxChars));
      const at = cut > maxChars * 0.5 ? cut + 1 : maxChars;
      lines.push(text.slice(0, at).trim());
      text = text.slice(at).trim();
    }
    if (text) lines.push(text);
  }
  return lines;
}
