/* 无依赖 .docx 生成：手写 OOXML 部件，自己打 ZIP（CRC32 + deflate-raw，失败退回 store）。
 * 产物是标准 WordprocessingML，标题、多级列表、表格、引用、代码块、公式都是 Word 原生结构。 */
(function (global) {
  'use strict';
  var AITW = (global.AITW = global.AITW || {});

  var NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  var NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  var W_NS_DECL = 'xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '" xmlns:m="' + NS_M + '"';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  /* ---------- 样式与常量 ---------- */

  var FONTS = {
    '微软雅黑': { ascii: 'Segoe UI', eastAsia: '微软雅黑', cs: 'Segoe UI' },
    '宋体': { ascii: 'Times New Roman', eastAsia: '宋体', cs: 'Times New Roman' },
    '黑体': { ascii: 'Arial', eastAsia: '黑体', cs: 'Arial' },
    '等线': { ascii: 'Calibri', eastAsia: '等线', cs: 'Calibri' },
    '楷体': { ascii: 'Times New Roman', eastAsia: '楷体', cs: 'Times New Roman' }
  };

  function fontFor(name) {
    return FONTS[name] || FONTS['微软雅黑'];
  }

  function roundHalf(n) {
    return Math.max(2, Math.round(n * 2) / 2);
  }

  function headingSizes(baseSize) {
    return {
      1: roundHalf(baseSize * 1.75),
      2: roundHalf(baseSize * 1.45),
      3: roundHalf(baseSize * 1.25),
      4: roundHalf(baseSize * 1.1),
      5: roundHalf(baseSize * 1.0),
      6: roundHalf(baseSize * 1.0)
    };
  }

  /* ---------- 关系与链接 ---------- */

  function Ctx(opts) {
    this.opts = opts;
    this.links = [];
    this.linkIndex = {};
    this.nextNumId = 3;
    this.lists = [];       /* {numId, ordered, start} */
    this.images = 0;
  }

  Ctx.prototype.link = function (href) {
    if (this.linkIndex[href] != null) return this.linkIndex[href];
    var id = 'rIdLink' + (this.links.length + 1);
    this.links.push({ id: id, href: href });
    this.linkIndex[href] = id;
    return id;
  };

  Ctx.prototype.newNumbering = function (ordered, start) {
    var numId = this.nextNumId++;
    this.lists.push({ numId: numId, ordered: !!ordered, start: start || 1 });
    return numId;
  };

  /* ---------- 段落部件 ---------- */

  function rPr(flags, ctx) {
    var o = '';
    var f = fontFor(ctx.opts.font);
    if (flags.code) {
      o += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="' + esc(f.eastAsia) + '" w:cs="Consolas"/>';
    } else if (flags.math) {
      o += '<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>';
    } else if (flags.fontOverride) {
      var fo = fontFor(flags.fontOverride);
      o += '<w:rFonts w:ascii="' + esc(fo.ascii) + '" w:hAnsi="' + esc(fo.ascii) +
        '" w:eastAsia="' + esc(fo.eastAsia) + '" w:cs="' + esc(fo.cs) + '"/>';
    } else {
      o += '<w:rFonts w:ascii="' + esc(f.ascii) + '" w:hAnsi="' + esc(f.ascii) +
        '" w:eastAsia="' + esc(f.eastAsia) + '" w:cs="' + esc(f.cs) + '"/>';
    }
    if (flags.b) o += '<w:b/><w:bCs/>';
    if (flags.i) o += '<w:i/><w:iCs/>';
    if (flags.strike) o += '<w:strike/>';
    if (flags.color) o += '<w:color w:val="' + flags.color + '"/>';
    if (flags.size) o += '<w:sz w:val="' + Math.round(flags.size * 2) + '"/><w:szCs w:val="' + Math.round(flags.size * 2) + '"/>';
    if (flags.u) o += '<w:u w:val="single"/>';
    if (flags.shd) o += '<w:shd w:val="clear" w:color="auto" w:fill="' + flags.shd + '"/>';
    return '<w:rPr>' + o + '</w:rPr>';
  }

  function textRun(text, flags, ctx) {
    if (text === '') return '';
    var pieces = String(text).split('\n');
    var out = '';
    for (var i = 0; i < pieces.length; i++) {
      if (i > 0) out += '<w:br/>';
      out += '<w:t xml:space="preserve">' + esc(pieces[i]) + '</w:t>';
    }
    return out;
  }

  function run(text, flags, ctx) {
    if (text === '') return '';
    return '<w:r>' + rPr(flags, ctx) + textRun(text, flags, ctx) + '</w:r>';
  }

  function inlineNodes(nodes, flags, ctx) {
    var out = '';
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      switch (node.t) {
        case 'text':
          out += run(node.v, flags, ctx);
          break;
        case 'strong':
          out += inlineNodes(node.children, Object.assign({}, flags, { b: true }), ctx);
          break;
        case 'em':
          out += inlineNodes(node.children, Object.assign({}, flags, { i: true }), ctx);
          break;
        case 'del':
          out += inlineNodes(node.children, Object.assign({}, flags, { strike: true }), ctx);
          break;
        case 'code':
          out += run(node.v, Object.assign({}, flags, { code: true, shd: 'F1F3F5' }), ctx);
          break;
        case 'br':
          out += '<w:r><w:br/></w:r>';
          break;
        case 'link':
          var rid = ctx.link(node.href);
          out += '<w:hyperlink r:id="' + rid + '">' +
            inlineNodes(node.children, Object.assign({}, flags, { color: '0563C1', u: true }), ctx) +
            '</w:hyperlink>';
          break;
        case 'math':
          out += mathXml(node, ctx);
          break;
        case 'image':
          out += run('［图片：' + plainText(node.alt) + '］', Object.assign({}, flags, { i: true, color: '8A94A6' }), ctx);
          break;
      }
    }
    return out;
  }

  function plainText(nodes) {
    if (!nodes) return '';
    return nodes.map(function (n) {
      if (n.t === 'text' || n.t === 'code') return n.v;
      if (n.children) return plainText(n.children);
      return '';
    }).join('');
  }

  function mathXml(node, ctx) {
    if (!node.ast || typeof AITW.mathToOmml !== 'function') {
      return run(node.tex, { fontOverride: '宋体' }, ctx);
    }
    try {
      var body = AITW.mathToOmml(node.ast);
      if (!body) return run(node.tex, { fontOverride: '宋体' }, ctx);
      return '<m:oMath>' + body + '</m:oMath>';
    } catch (err) {
      return run(node.tex, { fontOverride: '宋体' }, ctx);
    }
  }

  function pPr(ctx, o) {
    o = o || {};
    /* 子元素顺序按 CT_PPr 定义来，Word 对顺序敏感 */
    var x = '';
    if (o.style) x += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.keepNext) x += '<w:keepNext/>';
    if (o.pageBreakBefore) x += '<w:pageBreakBefore/>';
    if (o.numId) {
      x += '<w:numPr><w:ilvl w:val="' + (o.ilvl || 0) + '"/><w:numId w:val="' + o.numId + '"/></w:numPr>';
    }
    if (o.border) {
      x += '<w:pBdr>' +
        '<w:top w:val="single" w:sz="4" w:space="4" w:color="DDE1E6"/>' +
        '<w:left w:val="single" w:sz="12" w:space="8" w:color="C9D0D9"/>' +
        '<w:bottom w:val="single" w:sz="4" w:space="4" w:color="DDE1E6"/>' +
        '<w:right w:val="single" w:sz="4" w:space="4" w:color="DDE1E6"/>' +
        '</w:pBdr>';
    }
    if (o.shd) x += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shd + '"/>';
    x += '<w:spacing';
    if (o.before != null) x += ' w:before="' + o.before + '"';
    if (o.after != null) x += ' w:after="' + o.after + '"';
    if (o.line != null) x += ' w:line="' + o.line + '" w:lineRule="auto"';
    x += '/>';
    if (o.indentLeft != null || o.firstLine != null || o.hanging != null) {
      x += '<w:ind';
      if (o.indentLeft != null) x += ' w:left="' + o.indentLeft + '"';
      if (o.firstLine != null) x += ' w:firstLineChars="' + (o.firstLine * 100) + '" w:firstLine="' + Math.round(o.firstLine * ctx.opts.size * 20) + '"';
      if (o.hanging != null) x += ' w:hanging="' + o.hanging + '"';
      x += '/>';
    }
    if (o.jc) x += '<w:jc w:val="' + o.jc + '"/>';
    if (o.outline != null) x += '<w:outlineLvl w:val="' + o.outline + '"/>';
    if (!x) return '';
    return '<w:pPr>' + x + '</w:pPr>';
  }

  function para(content, ctx, o) {
    return '<w:p>' + pPr(ctx, o) + content + '</w:p>';
  }

  /* ---------- 块渲染 ---------- */

  function renderBlock(block, ctx, env) {
    env = env || {};
    var opts = ctx.opts;
    var line = Math.round(opts.lineSpacing * 240);

    switch (block.type) {
      case 'heading': {
        var level = Math.min(6, Math.max(1, block.level));
        return para(inlineNodes(block.inline, {}, ctx), ctx, {
          style: 'Heading' + level,
          keepNext: true,
          outline: level - 1
        });
      }
      case 'paragraph': {
        var first = env.quote ? null : (opts.indent ? 2 : null);
        return para(inlineNodes(block.inline, {}, ctx), ctx, {
          style: env.quote ? 'Quote' : 'Normal',
          firstLine: first,
          line: line
        });
      }
      case 'math': {
        var node = { t: 'math', tex: block.tex, display: true, ast: null, error: false };
        if (typeof AITW.parseMath === 'function') {
          try { node.ast = AITW.parseMath(block.tex); } catch (e) { node.ast = null; }
        }
        var mathBody = node.ast ? AITW.mathToOmml(node.ast) : '';
        if (!mathBody) return para(run(block.tex, { fontOverride: '宋体', i: true }, ctx), ctx, { jc: 'center', line: line });
        return '<w:p>' + pPr(ctx, { jc: 'center', line: line, before: 120, after: 120 }) +
          '<m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr><m:oMath>' +
          mathBody + '</m:oMath></m:oMathPara></w:p>';
      }
      case 'code': {
        var lines = String(block.text).split('\n');
        var content = '';
        for (var i = 0; i < lines.length; i++) {
          if (i > 0) content += '<w:br/>';
          content += run(lines[i] === '' ? ' ' : lines[i], { code: true, size: opts.size - 1.5, color: '24292F' }, ctx);
        }
        return para(content, ctx, {
          style: 'CodeBlock',
          border: true,
          shd: 'F6F8FA',
          line: 240
        });
      }
      case 'quote': {
        return block.children.map(function (child) {
          return renderBlock(child, ctx, { quote: true });
        }).join('');
      }
      case 'list':
        return renderList(block, ctx, 0, env);
      case 'table':
        return renderTable(block, ctx);
      case 'image':
        return para(run('［图片未嵌入：' + plainText(block.alt) + '］', { i: true, color: '8A94A6' }, ctx), ctx, { line: line });
      case 'hr':
        return '<w:p>' + pPr(ctx, { border: true, shd: 'F6F7F9' }) + '</w:p>';
      default:
        return '';
    }
  }

  function renderList(block, ctx, level, env) {
    var start = block.ordered ? (block.start || 1) : 1;
    var numId = ctx.newNumbering(block.ordered, start);
    var out = '';
    block.items.forEach(function (item) {
      out += para(inlineNodes(item.inline, {}, ctx), ctx, {
        style: 'ListParagraph',
        numId: numId,
        ilvl: Math.min(8, level),
        line: Math.round(ctx.opts.lineSpacing * 240)
      });
      item.children.forEach(function (child) {
        if (child.type === 'list') {
          out += renderList(child, ctx, level + 1, env);
        } else if (child.type === 'paragraph') {
          out += para(inlineNodes(child.inline, {}, ctx), ctx, {
            style: 'ListParagraph',
            indentLeft: 420 * (level + 1),
            line: Math.round(ctx.opts.lineSpacing * 240)
          });
        } else {
          out += renderBlock(child, ctx, env);
        }
      });
    });
    return out;
  }

  function cellWidth(contentWidth, cols, index) {
    return Math.round(contentWidth / cols);
  }

  function renderTable(block, ctx) {
    var cols = block.header.length || 1;
    var contentWidth = 11906 - ctx.opts.marginTwips * 2;
    var grid = '';
    for (var c = 0; c < cols; c++) {
      grid += '<w:gridCol w:w="' + cellWidth(contentWidth, cols, c) + '"/>';
    }
    var borders = '<w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (side) {
        return '<w:' + side + ' w:val="single" w:sz="4" w:space="0" w:color="D5DAE0"/>';
      }).join('') + '</w:tblBorders>';

    function cell(content, isHeader, aligns) {
      var shading = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>' : '';
      return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>' + shading +
        '<w:vAlign w:val="center"/></w:tcPr>' +
        para(inlineNodes(content, isHeader ? { b: true } : {}, ctx), ctx, {
          style: 'TableText',
          jc: aligns && aligns === 'center' ? 'center' : (aligns === 'right' ? 'right' : null),
          line: 268
        }) + '</w:tc>';
    }

    var rows = '';
    rows += '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' +
      block.header.map(function (h, i) { return cell(h, true, block.aligns[i]); }).join('') + '</w:tr>';
    block.rows.forEach(function (row) {
      rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' +
        row.map(function (d, i) { return cell(d, false, block.aligns[i]); }).join('') + '</w:tr>';
    });

    return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
      borders + '<w:tblLayout w:type="autofit"/>' +
      '<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>' +
      '<w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>' +
      '</w:tblPr><w:tblGrid>' + grid + '</w:tblGrid>' + rows + '</w:tbl>' +
      para('', ctx, { line: 120 });
  }

  /* ---------- 各 XML 部件 ---------- */

  function documentXml(blocks, ctx) {
    var body = blocks.map(function (b) { return renderBlock(b, ctx, {}); }).join('');
    if (!body) body = para(run('（空文档）', { color: '8A94A6', i: true }, ctx), ctx, {});
    var o = ctx.opts;
    var sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="' + o.marginTwips + '" w:right="' + o.marginTwips + '" w:bottom="' + o.marginTwips +
      '" w:left="' + o.marginTwips + '" w:header="851" w:footer="992" w:gutter="0"/>' +
      '<w:cols w:space="425"/><w:docGrid w:type="lines" w:linePitch="312"/></w:sectPr>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<w:document ' + W_NS_DECL + '><w:body>' + body + sect + '</w:body></w:document>';
  }

  function stylesXml(ctx) {
    var o = ctx.opts;
    var f = fontFor(o.font);
    var sizes = headingSizes(o.size);
    var rFonts = '<w:rFonts w:ascii="' + esc(f.ascii) + '" w:hAnsi="' + esc(f.ascii) +
      '" w:eastAsia="' + esc(f.eastAsia) + '" w:cs="' + esc(f.cs) + '"/>';

    var headingStyles = '';
    for (var level = 1; level <= 6; level++) {
      var sz = Math.round(sizes[level] * 2);
      headingStyles += '<w:style w:type="paragraph" w:styleId="Heading' + level + '">' +
        '<w:name w:val="heading ' + level + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>' +
        '<w:uiPriority w:val="9"/><w:qFormat/>' +
        '<w:pPr><w:keepNext/><w:keepLines/>' +
        '<w:spacing w:before="' + (level === 1 ? 360 : 280) + '" w:after="' + (level === 1 ? 200 : 140) + '"' +
        ' w:line="' + Math.round(o.lineSpacing * 240) + '" w:lineRule="auto"/>' +
        '<w:outlineLvl w:val="' + (level - 1) + '"/></w:pPr>' +
        '<w:rPr>' + rFonts + '<w:b/><w:bCs/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/>' +
        '<w:color w:val="16191D"/></w:rPr></w:style>';
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<w:styles xmlns:w="' + NS_W + '">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' + rFonts +
      '<w:sz w:val="' + Math.round(o.size * 2) + '"/><w:szCs w:val="' + Math.round(o.size * 2) + '"/>' +
      '<w:lang w:val="zh-CN" w:eastAsia="zh-CN" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:line="' + Math.round(o.lineSpacing * 240) +
      '" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:line="' + Math.round(o.lineSpacing * 240) + '" w:lineRule="auto"/></w:pPr>' +
      '<w:rPr>' + rFonts + '</w:rPr></w:style>' +
      headingStyles +
      '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/>' +
      '<w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/>' +
      '<w:pPr><w:spacing w:before="40" w:after="40" w:line="' + Math.round(o.lineSpacing * 240) +
      '" w:lineRule="auto"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>' +
      '<w:next w:val="Normal"/><w:qFormat/>' +
      '<w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="10" w:color="C9D0D9"/></w:pBdr>' +
      '<w:ind w:left="420"/><w:spacing w:before="120" w:after="120"/></w:pPr>' +
      '<w:rPr><w:color w:val="4A5260"/><w:i/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="CodeBlock"><w:name w:val="Code Block"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:spacing w:before="120" w:after="160" w:line="240" w:lineRule="auto"/>' +
      '<w:ind w:left="120" w:right="120"/></w:pPr>' +
      '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="' + esc(f.eastAsia) +
      '"/><w:sz w:val="' + Math.round((o.size - 1.5) * 2) + '"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/>' +
      '<w:pPr><w:spacing w:before="40" w:after="40" w:line="268" w:lineRule="auto"/></w:pPr>' +
      '<w:rPr><w:sz w:val="' + Math.round((o.size - 1) * 2) + '"/></w:rPr></w:style>' +
      '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/>' +
      '<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
      '</w:styles>';
  }

  function numberingXml(ctx) {
    var bulletChars = ['•', '○', '▪', '•', '○', '▪', '•', '○', '▪'];
    var bulletLvls = '';
    var decimalLvls = '';
    for (var i = 0; i < 9; i++) {
      var left = 420 + i * 420;
      bulletLvls += '<w:lvl w:ilvl="' + i + '"><w:start w:val="1"/><w:numFmt w:val="bullet"/>' +
        '<w:lvlText w:val="' + bulletChars[i] + '"/><w:lvlJc w:val="left"/>' +
        '<w:pPr><w:ind w:left="' + left + '" w:hanging="420"/></w:pPr>' +
        '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr></w:lvl>';
      decimalLvls += '<w:lvl w:ilvl="' + i + '"><w:start w:val="1"/><w:numFmt w:val="decimal"/>' +
        '<w:lvlText w:val="%' + (i + 1) + '."/><w:lvlJc w:val="left"/>' +
        '<w:pPr><w:ind w:left="' + left + '" w:hanging="420"/></w:pPr></w:lvl>';
    }

    var nums = '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
      '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>';
    ctx.lists.forEach(function (list) {
      nums += '<w:num w:numId="' + list.numId + '"><w:abstractNumId w:val="' + (list.ordered ? 1 : 0) + '"/>';
      if (list.ordered && list.start !== 1) {
        nums += '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="' + list.start + '"/></w:lvlOverride>';
      }
      nums += '</w:num>';
    });

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<w:numbering xmlns:w="' + NS_W + '">' +
      '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + bulletLvls + '</w:abstractNum>' +
      '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + decimalLvls + '</w:abstractNum>' +
      nums + '</w:numbering>';
  }

  function settingsXml(ctx) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<w:settings xmlns:w="' + NS_W + '">' +
      '<w:zoom w:percent="100"/><w:defaultTabStop w:val="420"/>' +
      '<w:characterSpacingControl w:val="compressPunctuation"/>' +
      '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
      '<w:themeFontLang w:val="zh-CN" w:eastAsia="zh-CN"/>' +
      '</w:settings>';
  }

  function fontTableXml(ctx) {
    var f = fontFor(ctx.opts.font);
    var names = [f.ascii, f.eastAsia, 'Consolas', 'Cambria Math'];
    var seen = {};
    var entries = '';
    names.forEach(function (name) {
      if (!name || seen[name]) return;
      seen[name] = 1;
      entries += '<w:font w:name="' + esc(name) + '"><w:charset w:val="86"/><w:family w:val="auto"/><w:pitch w:val="variable"/></w:font>';
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<w:fonts xmlns:w="' + NS_W + '">' + entries + '</w:fonts>';
  }

  function documentRelsXml(ctx) {
    var rels = '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
      '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
      '<Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>';
    ctx.links.forEach(function (l) {
      rels += '<Relationship Id="' + l.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' +
        esc(l.href) + '" TargetMode="External"/>';
    });
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>';
  }

  function rootRelsXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>';
  }

  function contentTypesXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>';
  }

  function coreXml(title) {
    var now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + esc(title) + '</dc:title>' +
      '<dc:creator>小胡的工具箱</dc:creator>' +
      '<cp:lastModifiedBy>小胡的工具箱</cp:lastModifiedBy>' +
      '<cp:revision>1</cp:revision>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
      '<cp:keywords>Markdown, Word, 本地转换</cp:keywords>' +
      '</cp:coreProperties>';
  }

  function appXml() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
      'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      '<Application>小胡的工具箱 · Markdown 转 Word</Application>' +
      '<DocSecurity>0</DocSecurity><AppVersion>1.0</AppVersion>' +
      '</Properties>';
  }

  /* ---------- ZIP ---------- */

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date) {
    var year = Math.max(1980, date.getFullYear());
    return {
      time: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xffff,
      date: (((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff
    };
  }

  async function deflateRaw(bytes) {
    if (typeof CompressionStream === 'undefined' || typeof Response === 'undefined') return null;
    try {
      var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      var buffered = await new Response(stream).arrayBuffer();
      return new Uint8Array(buffered);
    } catch (err) {
      return null;
    }
  }

  async function makeZip(files) {
    var stamp = dosDateTime(new Date());
    var chunks = [];
    var central = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var nameBytes = utf8(file.name);
      var data = file.data;
      var crc = crc32(data);
      var compressed = await deflateRaw(data);
      var method = 0;
      var payload = data;
      if (compressed && compressed.length < data.length) {
        method = 8;
        payload = compressed;
      }

      var local = new Uint8Array(30 + nameBytes.length + payload.length);
      var view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, method, true);
      view.setUint16(10, stamp.time, true);
      view.setUint16(12, stamp.date, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, payload.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      local.set(payload, 30 + nameBytes.length);
      chunks.push(local);

      var cd = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, method, true);
      cv.setUint16(12, stamp.time, true);
      cv.setUint16(14, stamp.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, payload.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      central.push(cd);

      offset += local.length;
    }

    var centralSize = central.reduce(function (sum, c) { return sum + c.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    var total = offset + centralSize + 22;
    var out = new Uint8Array(total);
    var pos = 0;
    chunks.forEach(function (chunk) { out.set(chunk, pos); pos += chunk.length; });
    central.forEach(function (chunk) { out.set(chunk, pos); pos += chunk.length; });
    out.set(end, pos);
    return out;
  }

  /* ---------- 对外接口 ---------- */

  function normalizeOptions(options) {
    options = options || {};
    var size = parseFloat(options.size) || 12;
    var lineSpacing = parseFloat(options.lineSpacing) || 1.5;
    var marginCm = parseFloat(options.marginCm) || 2.54;
    return {
      font: options.font || '微软雅黑',
      size: Math.min(24, Math.max(8, size)),
      lineSpacing: Math.min(3, Math.max(1, lineSpacing)),
      marginCm: Math.min(5, Math.max(0.5, marginCm)),
      marginTwips: Math.round(marginCm * 567),
      indent: options.indent === true,
      title: options.title || '文档'
    };
  }

  async function buildDocxBytes(parsed, options) {
    var opts = normalizeOptions(options);
    var blocks = parsed && parsed.blocks ? parsed.blocks : [];
    var ctx = new Ctx(opts);

    /* 两遍：先渲染一遍收集超链接与编号，再渲染最终 XML */
    var docXml = documentXml(blocks, ctx);

    var files = [
      { name: '[Content_Types].xml', data: utf8(contentTypesXml()) },
      { name: '_rels/.rels', data: utf8(rootRelsXml()) },
      { name: 'docProps/core.xml', data: utf8(coreXml(opts.title)) },
      { name: 'docProps/app.xml', data: utf8(appXml()) },
      { name: 'word/document.xml', data: utf8(docXml) },
      { name: 'word/styles.xml', data: utf8(stylesXml(ctx)) },
      { name: 'word/numbering.xml', data: utf8(numberingXml(ctx)) },
      { name: 'word/settings.xml', data: utf8(settingsXml(ctx)) },
      { name: 'word/fontTable.xml', data: utf8(fontTableXml(ctx)) },
      { name: 'word/_rels/document.xml.rels', data: utf8(documentRelsXml(ctx)) }
    ];

    return makeZip(files);
  }

  async function buildDocx(parsed, options) {
    var bytes = await buildDocxBytes(parsed, options);
    var blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    return { blob: blob, bytes: bytes };
  }

  function safeFileName(name) {
    var base = String(name || '文档').replace(/[\\/:*?"<>|\r\n\t]/g, ' ').trim();
    base = base.replace(/\s+/g, ' ').slice(0, 80) || '文档';
    return /\.docx$/i.test(base) ? base : base + '.docx';
  }

  AITW.buildDocx = buildDocx;
  AITW.buildDocxBytes = buildDocxBytes;
  AITW.safeFileName = safeFileName;
  AITW.docxXml = { document: documentXml, styles: stylesXml, numbering: numberingXml };
})(typeof globalThis !== 'undefined' ? globalThis : this);
