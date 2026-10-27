/* 块树 → 预览 HTML。只用于页面展示，不参与 docx 生成。 */
(function (global) {
  'use strict';
  var AITW = (global.AITW = global.AITW || {});

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(nodes) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      switch (n.t) {
        case 'text': out += esc(n.v); break;
        case 'strong': out += '<strong>' + inline(n.children) + '</strong>'; break;
        case 'em': out += '<em>' + inline(n.children) + '</em>'; break;
        case 'del': out += '<del>' + inline(n.children) + '</del>'; break;
        case 'code': out += '<code>' + esc(n.v) + '</code>'; break;
        case 'br': out += '<br>'; break;
        case 'link':
          out += '<a href="' + esc(n.href) + '" target="_blank" rel="noopener noreferrer">' +
            inline(n.children) + '</a>';
          break;
        case 'image':
          out += '<span class="pv-img">［图片：' + esc(plain(n.alt)) + '］</span>';
          break;
        case 'math':
          out += mathHtml(n);
          break;
      }
    }
    return out;
  }

  function plain(nodes) {
    if (!nodes) return '';
    return nodes.map(function (n) {
      if (n.t === 'text' || n.t === 'code') return n.v;
      if (n.children) return plain(n.children);
      return '';
    }).join('');
  }

  function mathHtml(node) {
    if (node.ast && typeof AITW.mathToHtml === 'function') {
      var inner = '';
      try { inner = AITW.mathToHtml(node.ast); } catch (err) { inner = ''; }
      if (inner) {
        return '<span class="pv-math' + (node.display ? ' pv-math-block' : '') + '">' + inner + '</span>';
      }
    }
    return '<code class="pv-tex">' + esc(node.tex) + '</code>';
  }

  function blockHtml(block) {
    switch (block.type) {
      case 'heading':
        return '<h' + block.level + '>' + inline(block.inline) + '</h' + block.level + '>';
      case 'paragraph':
        return '<p>' + inline(block.inline) + '</p>';
      case 'math':
        return '<div class="pv-math-row">' + mathHtml({
          tex: block.tex, ast: safeParse(block.tex), display: true
        }) + '</div>';
      case 'code':
        return '<pre class="pv-code"><code>' + esc(block.text) + '</code></pre>';
      case 'quote':
        return '<blockquote>' + block.children.map(blockHtml).join('') + '</blockquote>';
      case 'list': {
        var tag = block.ordered ? 'ol' : 'ul';
        var startAttr = block.ordered && block.start !== 1 ? ' start="' + block.start + '"' : '';
        var items = block.items.map(function (item) {
          return '<li>' + inline(item.inline) + (item.children.length ? item.children.map(blockHtml).join('') : '') + '</li>';
        }).join('');
        return '<' + tag + startAttr + '>' + items + '</' + tag + '>';
      }
      case 'table': {
        var head = '<tr>' + block.header.map(function (cell, i) {
          var align = block.aligns[i];
          return '<th' + (align ? ' style="text-align:' + align + '"' : '') + '>' + inline(cell) + '</th>';
        }).join('') + '</tr>';
        var body = block.rows.map(function (row) {
          return '<tr>' + row.map(function (cell, i) {
            var align = block.aligns[i];
            return '<td' + (align ? ' style="text-align:' + align + '"' : '') + '>' + inline(cell) + '</td>';
          }).join('') + '</tr>';
        }).join('');
        return '<div class="pv-table-wrap"><table><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
      }
      case 'image':
        return '<p class="pv-img-row">［图片：' + esc(plain(block.alt)) + '］</p>';
      case 'hr':
        return '<hr>';
      default:
        return '';
    }
  }

  function safeParse(tex) {
    try { return AITW.parseMath(tex); } catch (err) { return null; }
  }

  function renderPreview(blocks) {
    if (!blocks || !blocks.length) {
      return '<p class="pv-empty">左边粘贴内容，这里会实时显示排版效果。</p>';
    }
    return blocks.map(blockHtml).join('');
  }

  AITW.renderPreview = renderPreview;
})(typeof globalThis !== 'undefined' ? globalThis : this);
