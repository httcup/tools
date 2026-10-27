/* Markdown → 块树解析。纯函数，不碰 DOM，浏览器与 Node 测试共用。
 * 覆盖 AI 回答里最常见的写法：多级标题、嵌套列表、管道表格、引用、围栏代码块、
 * 行内粗斜体/行内代码/链接/删除线，以及 $...$、$$...$$、\(...\)、\[...\] 公式。 */
(function (global) {
  'use strict';
  var AITW = (global.AITW = global.AITW || {});

  var CJK = /[\u2e80-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/;

  function isCJKChar(ch) {
    return !!ch && CJK.test(ch);
  }

  function joinSoft(prevLine, nextLine) {
    var a = prevLine.slice(-1);
    var b = nextLine.charAt(0);
    if (isCJKChar(a) || isCJKChar(b)) return '';
    return ' ';
  }

  /* ---------- 行内解析 ---------- */

  function pushText(out, v) {
    if (!v) return;
    var last = out[out.length - 1];
    if (last && last.t === 'text') last.v += v;
    else out.push({ t: 'text', v: v });
  }

  function findUnescaped(text, from, needle) {
    var i = from;
    while (i < text.length) {
      if (text.startsWith(needle, i) && text[i - 1] !== '\\') return i;
      i++;
    }
    return -1;
  }

  function makeMath(tex, display) {
    var node = { t: 'math', tex: tex, display: !!display, ast: null, error: false };
    if (typeof AITW.parseMath === 'function') {
      try {
        node.ast = AITW.parseMath(tex);
        if (!node.ast || !node.ast.items || !node.ast.items.length) throw new Error('empty');
      } catch (err) {
        node.error = true;
        node.ast = null;
      }
    }
    return node;
  }

  function parseInline(text) {
    var out = [];
    var i = 0;

    while (i < text.length) {
      var ch = text[i];

      /* 反斜杠转义与 \( \) \[ \] 公式 */
      if (ch === '\\') {
        var nx = text[i + 1];
        if (nx === '(') {
          var pEnd = findUnescaped(text, i + 2, '\\)');
          if (pEnd > 0) {
            out.push(makeMath(text.slice(i + 2, pEnd), false));
            i = pEnd + 2;
            continue;
          }
        }
        if (nx === '[') {
          var bEnd = findUnescaped(text, i + 2, '\\]');
          if (bEnd > 0) {
            out.push(makeMath(text.slice(i + 2, bEnd), true));
            i = bEnd + 2;
            continue;
          }
        }
        if (nx === '\n') { out.push({ t: 'br' }); i += 2; continue; }
        if (nx && /[\\`*_{}\[\]()#+\-.!$>~|<]/.test(nx)) { pushText(out, nx); i += 2; continue; }
        pushText(out, ch);
        i++;
        continue;
      }

      /* 行内代码 */
      if (ch === '`') {
        var tickCount = 1;
        while (text[i + tickCount] === '`') tickCount++;
        var fence = '`'.repeat(tickCount);
        var tickEnd = text.indexOf(fence, i + tickCount);
        if (tickEnd > 0) {
          var code = text.slice(i + tickCount, tickEnd);
          if (code.length > 1 && code.charAt(0) === ' ' && code.slice(-1) === ' ') code = code.slice(1, -1);
          out.push({ t: 'code', v: code });
          i = tickEnd + tickCount;
          continue;
        }
        pushText(out, fence);
        i += tickCount;
        continue;
      }

      /* 公式 */
      if (ch === '$') {
        if (text[i + 1] === '$') {
          var dd = findUnescaped(text, i + 2, '$$');
          if (dd > 0) {
            out.push(makeMath(text.slice(i + 2, dd).trim(), true));
            i = dd + 2;
            continue;
          }
        } else {
          var single = findInlineDollar(text, i + 1);
          if (single > 0) {
            out.push(makeMath(text.slice(i + 1, single), false));
            i = single + 1;
            continue;
          }
        }
        pushText(out, ch);
        i++;
        continue;
      }

      /* 图片 ![alt](src) */
      if (ch === '!' && text[i + 1] === '[') {
        var img = matchLink(text, i + 1);
        if (img) {
          out.push({ t: 'image', alt: parseInline(img.label), src: img.href });
          i = img.end;
          continue;
        }
      }

      /* 链接 [text](href) */
      if (ch === '[') {
        var link = matchLink(text, i);
        if (link) {
          out.push({ t: 'link', href: link.href, children: parseInline(link.label) });
          i = link.end;
          continue;
        }
      }

      /* 自动链接 <https://…> 与 <br> */
      if (ch === '<') {
        var auto = /^<((?:https?:\/\/|mailto:)[^>\s]+)>/.exec(text.slice(i));
        if (auto) {
          out.push({ t: 'link', href: auto[1], children: [{ t: 'text', v: auto[1] }] });
          i += auto[0].length;
          continue;
        }
        if (/^<br\s*\/?>/i.test(text.slice(i))) {
          out.push({ t: 'br' });
          i += /^<br\s*\/?>/i.exec(text.slice(i))[0].length;
          continue;
        }
      }

      /* 删除线 */
      if (ch === '~' && text[i + 1] === '~') {
        var dsEnd = findUnescaped(text, i + 2, '~~');
        if (dsEnd > 0) {
          out.push({ t: 'del', children: parseInline(text.slice(i + 2, dsEnd)) });
          i = dsEnd + 2;
          continue;
        }
      }

      /* 粗体 / 斜体 */
      if (ch === '*' || ch === '_') {
        var prevCh = i > 0 ? text[i - 1] : '';
        var nextCh = text[i + 1] || '';
        var wordBoundaryOK = ch === '*' || !/[A-Za-z0-9]/.test(prevCh);
        if (nextCh && nextCh !== ' ' && wordBoundaryOK) {
          if (text[i + 1] === ch) {
            var tripleEnd = findUnescaped(text, i + 3, ch + ch + ch);
            if (tripleEnd > 0) {
              out.push({
                t: 'strong',
                children: [{ t: 'em', children: parseInline(text.slice(i + 3, tripleEnd)) }]
              });
              i = tripleEnd + 3;
              continue;
            }
            var boldEnd = findUnescaped(text, i + 2, ch + ch);
            if (boldEnd > 0) {
              out.push({ t: 'strong', children: parseInline(text.slice(i + 2, boldEnd)) });
              i = boldEnd + 2;
              continue;
            }
          } else {
            var emEnd = findUnescaped(text, i + 1, ch);
            if (emEnd > 0 && text[emEnd - 1] !== ' ') {
              out.push({ t: 'em', children: parseInline(text.slice(i + 1, emEnd)) });
              i = emEnd + 1;
              continue;
            }
          }
        }
      }

      pushText(out, ch);
      i++;
    }

    return mergeText(out);
  }

  function mergeText(nodes) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.t === 'text' && out.length && out[out.length - 1].t === 'text') {
        out[out.length - 1].v += n.v;
      } else if (!(n.t === 'text' && n.v === '')) {
        out.push(n);
      }
    }
    return out;
  }

  function findInlineDollar(text, from) {
    var i = from;
    if (text[i] === ' ') return -1;
    while (i < text.length) {
      var c = text[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '$') {
        var prev = text[i - 1];
        var next = text[i + 1] || '';
        if (prev !== ' ' && !/[0-9]/.test(next)) return i;
        return -1;
      }
      if (c === '\n') return -1;
      i++;
    }
    return -1;
  }

  function matchLink(text, start) {
    /* start 指向 '[' */
    var depth = 0;
    var i = start;
    var label = null;
    while (i < text.length) {
      var c = text[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) { label = text.slice(start + 1, i); i++; break; }
      }
      i++;
    }
    if (label === null) return null;
    if (text[i] !== '(') return null;
    var depthParen = 0;
    var j = i;
    for (; j < text.length; j++) {
      var c2 = text[j];
      if (c2 === '(') depthParen++;
      else if (c2 === ')') {
        depthParen--;
        if (depthParen === 0) break;
      }
    }
    if (j >= text.length) return null;
    var target = text.slice(i + 1, j).trim();
    var href = target;
    var titleMatch = /^(\S+)\s+["'(].*["')]$/.exec(target);
    if (titleMatch) href = titleMatch[1];
    return { label: label, href: href.replace(/^<|>$/g, ''), end: j + 1 };
  }

  /* ---------- 块解析 ---------- */

  var RE_HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
  var RE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^`]*)$/;
  var RE_HR = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
  var RE_BULLET = /^(\s*)([-*+])\s+(.*)$/;
  var RE_ORDERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
  var RE_QUOTE = /^ {0,3}>\s?(.*)$/;
  var RE_TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

  function isBlank(line) {
    return /^\s*$/.test(line);
  }

  function startsBlock(line) {
    return RE_HEADING.test(line) || RE_FENCE.test(line) || RE_HR.test(line) ||
      RE_QUOTE.test(line) || RE_BULLET.test(line) || RE_ORDERED.test(line) ||
      /^\s*\$\$/.test(line) || /^\s*\\\[/.test(line) || isTableStart(line, null);
  }

  function isTableStart(line, nextLine) {
    if (line.indexOf('|') < 0) return false;
    if (nextLine == null) return /\|/.test(line);
    return RE_TABLE_SEP.test(nextLine) && nextLine.indexOf('-') >= 0;
  }

  function splitRow(line) {
    var s = line.trim();
    if (s.charAt(0) === '|') s = s.slice(1);
    if (s.slice(-1) === '|' && s.slice(-2) !== '\\|') s = s.slice(0, -1);
    var cells = [];
    var buf = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '\\' && s[i + 1] === '|') { buf += '|'; i++; continue; }
      if (c === '|') { cells.push(buf.trim()); buf = ''; continue; }
      buf += c;
    }
    cells.push(buf.trim());
    return cells;
  }

  function parseTableAlign(line) {
    return splitRow(line).map(function (cell) {
      var left = cell.charAt(0) === ':';
      var right = cell.slice(-1) === ':';
      if (left && right) return 'center';
      if (right) return 'right';
      if (left) return 'left';
      return null;
    });
  }

  function matchItem(line) {
    var m = RE_BULLET.exec(line);
    if (m) return { indent: m[1].replace(/\t/g, '    ').length, ordered: false, num: 1, text: m[3] };
    m = RE_ORDERED.exec(line);
    if (m) return { indent: m[1].replace(/\t/g, '    ').length, ordered: true, num: parseInt(m[2], 10), text: m[3] };
    return null;
  }

  function dedent(lines, amount) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/\t/g, '    ');
      var strip = 0;
      while (strip < amount && line.charAt(strip) === ' ') strip++;
      out.push(line.slice(strip));
    }
    return out;
  }

  function parseBlocks(lines) {
    var blocks = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (isBlank(line)) { i++; continue; }

      /* 围栏代码块 */
      var fence = RE_FENCE.exec(line);
      if (fence) {
        var marker = fence[1];
        var lang = fence[2].trim();
        var body = [];
        i++;
        while (i < lines.length) {
          var closeRe = new RegExp('^ {0,3}' + marker.charAt(0) + '{' + marker.length + ',}\\s*$');
          if (closeRe.test(lines[i])) { i++; break; }
          body.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'code', lang: lang, text: body.join('\n') });
        continue;
      }

      /* 独占一行的块级公式 */
      if (/^\s*\$\$/.test(line)) {
        var rest = line.replace(/^\s*\$\$/, '');
        var closeIdx = rest.indexOf('$$');
        if (closeIdx >= 0) {
          blocks.push({ type: 'math', tex: rest.slice(0, closeIdx).trim() });
          i++;
          continue;
        }
        var mathLines = [];
        if (rest.trim()) mathLines.push(rest);
        i++;
        var closed = false;
        while (i < lines.length) {
          var idx = lines[i].indexOf('$$');
          if (idx >= 0) {
            if (lines[i].slice(0, idx).trim()) mathLines.push(lines[i].slice(0, idx));
            closed = true;
            i++;
            break;
          }
          mathLines.push(lines[i]);
          i++;
        }
        blocks.push({ type: 'math', tex: mathLines.join('\n').trim(), unterminated: !closed });
        continue;
      }

      if (/^\s*\\\[\s*$/.test(line) || /^\s*\\\[/.test(line)) {
        var inner = [];
        var start = line.replace(/^\s*\\\[/, '');
        var done = false;
        if (start.indexOf('\\]') >= 0) {
          inner.push(start.slice(0, start.indexOf('\\]')));
          i++;
          done = true;
        } else {
          if (start.trim()) inner.push(start);
          i++;
          while (i < lines.length) {
            var e = lines[i].indexOf('\\]');
            if (e >= 0) {
              if (lines[i].slice(0, e).trim()) inner.push(lines[i].slice(0, e));
              i++;
              done = true;
              break;
            }
            inner.push(lines[i]);
            i++;
          }
        }
        blocks.push({ type: 'math', tex: inner.join('\n').trim(), unterminated: !done });
        continue;
      }

      /* 标题 */
      var heading = RE_HEADING.exec(line);
      if (heading) {
        blocks.push({ type: 'heading', level: heading[1].length, inline: parseInline(heading[2]) });
        i++;
        continue;
      }

      /* 分割线 */
      if (RE_HR.test(line)) {
        blocks.push({ type: 'hr' });
        i++;
        continue;
      }

      /* 引用 */
      if (RE_QUOTE.test(line)) {
        var quoted = [];
        while (i < lines.length && RE_QUOTE.test(lines[i])) {
          quoted.push(RE_QUOTE.exec(lines[i])[1]);
          i++;
        }
        blocks.push({ type: 'quote', children: parseBlocks(quoted) });
        continue;
      }

      /* 表格 */
      if (i + 1 < lines.length && isTableStart(line, lines[i + 1]) && line.indexOf('|') >= 0) {
        var aligns = parseTableAlign(lines[i + 1]);
        var header = splitRow(line).map(parseInline);
        var rows = [];
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') >= 0 && !isBlank(lines[i])) {
          var cells = splitRow(lines[i]);
          while (cells.length < header.length) cells.push('');
          rows.push(cells.slice(0, header.length).map(parseInline));
          i++;
        }
        blocks.push({ type: 'table', aligns: aligns, header: header, rows: rows });
        continue;
      }

      /* 列表 */
      var item = matchItem(line);
      if (item) {
        var listResult = parseList(lines, i, item.indent);
        blocks.push(listResult.list);
        i = listResult.next;
        continue;
      }

      /* 段落（含 setext 标题） */
      var paraLines = [];
      while (i < lines.length) {
        if (isBlank(lines[i])) break;
        if (paraLines.length && startsBlock(lines[i])) break;
        if (paraLines.length && i + 1 < lines.length && isTableStart(lines[i], lines[i + 1])) break;
        paraLines.push(lines[i]);
        i++;
        /* setext：下一行是 === 或 --- */
        if (i < lines.length && paraLines.length === 1) {
          if (/^\s*=+\s*$/.test(lines[i])) {
            blocks.push({ type: 'heading', level: 1, inline: parseInline(paraLines[0].trim()) });
            paraLines = [];
            i++;
            break;
          }
          if (/^\s*-{2,}\s*$/.test(lines[i]) && !RE_HR.test(lines[i] + ' ')) {
            blocks.push({ type: 'heading', level: 2, inline: parseInline(paraLines[0].trim()) });
            paraLines = [];
            i++;
            break;
          }
        }
      }
      if (paraLines.length) {
        blocks.push(buildParagraph(paraLines));
      }
    }

    return blocks;
  }

  function buildParagraph(lines) {
    var inline = [];
    for (var k = 0; k < lines.length; k++) {
      var raw = lines[k];
      var hardBreak = /( {2,}|\\)$/.test(raw);
      var text = raw.replace(/( {2,}|\\)$/, '');
      if (k > 0) {
        var prev = inline.length ? inline[inline.length - 1] : null;
        if (!(prev && prev.t === 'br')) {
          var joiner = joinSoft(lines[k - 1].replace(/( {2,}|\\)$/, ''), text);
          if (joiner === ' ') pushText(inline, ' ');
        }
      }
      var nodes = parseInline(text);
      if (hardBreak) nodes.push({ t: 'br' });
      for (var n = 0; n < nodes.length; n++) inline.push(nodes[n]);
    }
    /* 单个独占段落的图片，按块处理 */
    var meaningful = inline.filter(function (node) {
      return !(node.t === 'text' && /^\s*$/.test(node.v));
    });
    if (meaningful.length === 1 && meaningful[0].t === 'image') {
      return { type: 'image', alt: meaningful[0].alt, src: meaningful[0].src };
    }
    return { type: 'paragraph', inline: inline };
  }

  function parseList(lines, start, baseIndent) {
    var first = matchItem(lines[start]);
    var ordered = first.ordered;
    var startNum = first.num;
    var items = [];
    var i = start;

    while (i < lines.length) {
      var item = matchItem(lines[i]);
      if (!item || item.indent !== baseIndent || item.ordered !== ordered) break;

      var contentLines = [item.text];
      var childRaw = [];
      i++;

      while (i < lines.length) {
        if (isBlank(lines[i])) {
          /* 空行：后面若还有缩进内容，继续算进本项 */
          var lookahead = i + 1;
          while (lookahead < lines.length && isBlank(lines[lookahead])) lookahead++;
          if (lookahead >= lines.length) break;
          var nextItem = matchItem(lines[lookahead]);
          var nextIndent = lines[lookahead].replace(/\t/g, '    ').match(/^ */)[0].length;
          if ((nextItem && nextItem.indent <= baseIndent) || nextIndent <= baseIndent) break;
          childRaw.push('');
          i++;
          continue;
        }
        var rawIndent = lines[i].replace(/\t/g, '    ').match(/^ */)[0].length;
        var next = matchItem(lines[i]);
        if (next && next.indent <= baseIndent) break;
        if (!next && rawIndent <= baseIndent && !isBlank(lines[i])) {
          /* 懒续行：当作本项第一段的续写 */
          contentLines.push(lines[i].trim());
          i++;
          continue;
        }
        childRaw.push(lines[i]);
        i++;
      }

      var itemNode = { inline: parseInline(contentLines.join('\n').replace(/\n/g, ' ')), children: [] };
      if (childRaw.length) {
        var minIndent = Infinity;
        childRaw.forEach(function (l) {
          if (!isBlank(l)) {
            var ind = l.replace(/\t/g, '    ').match(/^ */)[0].length;
            minIndent = Math.min(minIndent, ind);
          }
        });
        if (!isFinite(minIndent)) minIndent = baseIndent + 2;
        var dedented = dedent(childRaw, Math.max(minIndent, baseIndent + 1));
        itemNode.children = parseBlocks(dedented);
      }
      items.push(itemNode);
    }

    return {
      list: { type: 'list', ordered: ordered, start: startNum, items: items },
      next: i
    };
  }

  function walk(blocks, stats) {
    blocks.forEach(function (block) {
      switch (block.type) {
        case 'paragraph':
        case 'heading':
          walkInline(block.inline, stats);
          break;
        case 'list':
          block.items.forEach(function (item) {
            walkInline(item.inline, stats);
            walk(item.children, stats);
          });
          break;
        case 'quote':
          walk(block.children, stats);
          break;
        case 'table':
          block.header.forEach(function (cell) { walkInline(cell, stats); });
          block.rows.forEach(function (row) {
            row.forEach(function (cell) { walkInline(cell, stats); });
          });
          stats.tables++;
          break;
        case 'math':
          stats.formulas++;
          stats.displayFormulas++;
          break;
        case 'code':
          stats.codeBlocks++;
          stats.chars += block.text.length;
          break;
        case 'image':
          stats.images++;
          break;
        case 'hr':
          break;
      }
    });
  }

  function walkInline(nodes, stats) {
    nodes.forEach(function (node) {
      switch (node.t) {
        case 'text':
          stats.chars += node.v.replace(/\s/g, '').length;
          break;
        case 'code':
          stats.chars += node.v.length;
          break;
        case 'math':
          stats.formulas++;
          if (node.display) stats.displayFormulas++;
          if (node.error) stats.formulaErrors++;
          break;
        case 'image':
          stats.images++;
          break;
        case 'link':
        case 'em':
        case 'strong':
        case 'del':
          walkInline(node.children || [], stats);
          if (node.t === 'link') stats.links++;
          break;
      }
    });
  }

  function parseMarkdown(src) {
    var text = String(src == null ? '' : src).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
    /* 去掉零宽字符与 BOM，AI 复制常见 */
    text = text.replace(/[\u200b-\u200d\ufeff]/g, '');
    var blocks = parseBlocks(text.split('\n'));
    var stats = {
      chars: 0, formulas: 0, displayFormulas: 0, formulaErrors: 0,
      tables: 0, images: 0, links: 0, codeBlocks: 0, blocks: blocks.length
    };
    walk(blocks, stats);
    return { blocks: blocks, stats: stats };
  }

  AITW.parseMarkdown = parseMarkdown;
  AITW.parseInline = parseInline;
  AITW.isCJKChar = isCJKChar;
})(typeof globalThis !== 'undefined' ? globalThis : this);
