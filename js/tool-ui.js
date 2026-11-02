/* 几个工具页共用的零碎：拖放取文件、页码解析、文件名、体积格式化。 */

/** 把 "1-3,7,9-" 解析成页码数组；空表示全部。 */
export function parsePages(text, total) {
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

/** 去掉扩展名与非法字符，用作输出文件名。 */
export function stem(name, drop = /\.[a-z0-9]{2,5}$/i) {
  return String(name || 'document')
    .replace(drop, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 80) || 'document';
}

export function fmtSize(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** 绑定拖放区域，test(file) 决定收不收。 */
export function wireDrop(dropEl, inputEl, test, onFile) {
  dropEl.addEventListener('click', (event) => {
    if (event.target !== inputEl) {
      event.preventDefault();
      inputEl.click();
    }
  });
  inputEl.addEventListener('change', () => {
    const file = inputEl.files?.[0];
    if (file) onFile(file);
  });
  for (const type of ['dragenter', 'dragover']) {
    dropEl.addEventListener(type, (event) => {
      event.preventDefault();
      dropEl.classList.add('hot');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    dropEl.addEventListener(type, (event) => {
      event.preventDefault();
      dropEl.classList.remove('hot');
    });
  }
  dropEl.addEventListener('drop', (event) => {
    const file = [...(event.dataTransfer?.files || [])].find(test);
    if (file) onFile(file);
  });
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* 失败提示拆成「前缀 + 细节」两个文本节点。
   拼成一整句的话，运行时替换永远匹配不上词典里的任何一条，
   非中文界面就会漏出一句原文。拆开后两半各自可译。 */
export function sayFail(el, head, error) {
  const detail = (error && error.message) || '未知错误';
  el.textContent = '';
  const a = document.createElement('span');
  a.textContent = head;
  const b = document.createElement('span');
  b.textContent = detail;
  el.append(a, b);
}
