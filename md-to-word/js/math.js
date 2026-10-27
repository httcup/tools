/* LaTeX 子集 → AST → 两路渲染：
 *   mathToOmml()  Office Math（Word 里是可继续编辑的公式）
 *   mathToHtml()  预览用的近似排版，不依赖任何外部库
 * 只认常见结构；认不出来的命令按原文保留，不丢内容。 */
(function (global) {
  'use strict';
  var AITW = (global.AITW = global.AITW || {});

  var SYMBOLS = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ',
    mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ',
    sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ',
    psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
    Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', ast: '∗', star: '⋆', bullet: '•',
    leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡',
    sim: '∼', simeq: '≃', cong: '≅', propto: '∝', ll: '≪', gg: '≫',
    infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃', nexists: '∄',
    emptyset: '∅', varnothing: '∅', in: '∈', notin: '∉', ni: '∋',
    subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩',
    setminus: '∖', wedge: '∧', vee: '∨', neg: '¬', lnot: '¬',
    to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
    Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', implies: '⟹', iff: '⟺',
    mapsto: '↦', uparrow: '↑', downarrow: '↓', longrightarrow: '⟶',
    angle: '∠', perp: '⊥', parallel: '∥', circ: '∘', degree: '°', prime: '′',
    ldots: '…', cdots: '⋯', dots: '…', vdots: '⋮', ddots: '⋱',
    lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩',
    therefore: '∴', because: '∵', oplus: '⊕', otimes: '⊗', odot: '⊙',
    sum: '∑', prod: '∏', int: '∫', oint: '∮', bigcup: '⋃', bigcap: '⋂',
    ell: 'ℓ', hbar: 'ℏ', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ',
    quad: '\u2003', qquad: '\u2003\u2003', ',': '\u2009', ';': '\u2005', ':': '\u2005',
    '!': '', ' ': ' ', '\\': '\n', '%': '%', '$': '$', '&': '&', '#': '#', '_': '_',
    '{': '{', '}': '}', '|': '∥'
  };

  var NARY = {
    sum: { chr: '∑', limLoc: 'undOvr' },
    prod: { chr: '∏', limLoc: 'undOvr' },
    coprod: { chr: '∐', limLoc: 'undOvr' },
    bigcup: { chr: '⋃', limLoc: 'undOvr' },
    bigcap: { chr: '⋂', limLoc: 'undOvr' },
    int: { chr: '∫', limLoc: 'subSup' },
    iint: { chr: '∬', limLoc: 'subSup' },
    iiint: { chr: '∭', limLoc: 'subSup' },
    oint: { chr: '∮', limLoc: 'subSup' }
  };

  var FUNCS = {
    sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
    arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
    log: 'log', ln: 'ln', lg: 'lg', exp: 'exp', det: 'det', dim: 'dim',
    ker: 'ker', deg: 'deg', gcd: 'gcd', hom: 'hom', arg: 'arg',
    lim: 'lim', max: 'max', min: 'min', sup: 'sup', inf: 'inf',
    limsup: 'lim sup', liminf: 'lim inf'
  };

  var ACCENTS = {
    hat: '\u0302', widehat: '\u0302', vec: '\u20d7', tilde: '\u0303',
    widetilde: '\u0303', dot: '\u0307', ddot: '\u0308', acute: '\u0301',
    grave: '\u0300', check: '\u030c', breve: '\u0306'
  };

  var DELIMS = {
    '(': '(', ')': ')', '[': '[', ']': ']', '\\{': '{', '\\}': '}',
    '|': '|', '\\|': '‖', '.': '', '/': '/', '\\langle': '⟨', '\\rangle': '⟩',
    '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉'
  };

  /* ---------- 词法 ---------- */

  function tokenize(src) {
    var toks = [];
    var i = 0;
    while (i < src.length) {
      var c = src[i];
      if (c === '\\') {
        var m = /^\\([A-Za-z]+|[\s\S])/.exec(src.slice(i));
        if (!m) { i++; continue; }
        var name = m[1];
        i += m[0].length;
        if (name === '\\') toks.push({ k: 'nl' });
        else if (name === ' ' || name === '\t' || name === '\n') toks.push({ k: 'sp', v: ' ' });
        else toks.push({ k: 'cmd', v: name });
        continue;
      }
      if (c === ' ' || c === '\t' || c === '\n') { toks.push({ k: 'sp', v: ' ' }); i++; continue; }
      if (c === '{') { toks.push({ k: 'open' }); i++; continue; }
      if (c === '}') { toks.push({ k: 'close' }); i++; continue; }
      if (c === '^') { toks.push({ k: 'sup' }); i++; continue; }
      if (c === '_') { toks.push({ k: 'sub' }); i++; continue; }
      if (c === '&') { toks.push({ k: 'amp' }); i++; continue; }
      if (c === '~') { toks.push({ k: 'sp', v: '\u00a0' }); i++; continue; }
      toks.push({ k: 'ch', v: c });
      i++;
    }
    return toks;
  }

  /* ---------- 语法 ---------- */

  function Parser(toks) {
    this.toks = toks;
    this.i = 0;
  }

  Parser.prototype.peek = function () { return this.toks[this.i]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };

  Parser.prototype.skipSpaces = function () {
    while (this.peek() && this.peek().k === 'sp') this.i++;
  };

  function row(items) {
    return { type: 'row', items: items || [] };
  }

  Parser.prototype.parseRow = function (stops) {
    stops = stops || {};
    var items = [];
    while (this.i < this.toks.length) {
      var t = this.peek();
      if (t.k === 'close' && stops.close) break;
      if (t.k === 'amp' && stops.amp) break;
      if (t.k === 'nl' && stops.nl) break;
      if (t.k === 'cmd' && stops.right && (t.v === 'right' || t.v === 'end')) break;
      if (t.k === 'close' && !stops.close) { this.i++; continue; }
      if (t.k === 'amp' && !stops.amp) { this.i++; continue; }
      if (t.k === 'nl' && !stops.nl) { this.i++; continue; }
      var node = this.parseScripted();
      if (node) items.push(node);
    }
    return row(items);
  };

  Parser.prototype.parseScripted = function () {
    var base = this.parseAtom();
    var sub = null;
    var sup = null;
    this.skipSpaces();
    while (this.i < this.toks.length) {
      var t = this.peek();
      if (t.k === 'sub' && !sub) { this.next(); sub = this.parseArg(); }
      else if (t.k === 'sup' && !sup) { this.next(); sup = this.parseArg(); }
      else break;
      this.skipSpaces();
    }
    if (!sub && !sup) return base;
    if (base && base.type === 'nary') {
      base.sub = sub;
      base.sup = sup;
      return base;
    }
    if (base && base.type === 'op' && base.limits) {
      return { type: 'op', name: base.name, limits: true, sub: sub, sup: sup };
    }
    return { type: 'script', base: base, sub: sub, sup: sup };
  };

  Parser.prototype.parseArg = function () {
    this.skipSpaces();
    var t = this.peek();
    if (!t) return row([]);
    if (t.k === 'open') { this.next(); var r = this.parseRow({ close: true }); if (this.peek() && this.peek().k === 'close') this.next(); return r; }
    var atom = this.parseAtom();
    return atom ? row([atom]) : row([]);
  };

  Parser.prototype.readRawGroup = function () {
    this.skipSpaces();
    if (!this.peek() || this.peek().k !== 'open') return '';
    this.next();
    var depth = 1;
    var out = '';
    while (this.i < this.toks.length) {
      var t = this.next();
      if (t.k === 'open') { depth++; out += '{'; continue; }
      if (t.k === 'close') { depth--; if (depth === 0) break; out += '}'; continue; }
      if (t.k === 'ch') { out += t.v; continue; }
      if (t.k === 'sp') { out += t.v; continue; }
      if (t.k === 'cmd') { out += SYMBOLS[t.v] != null ? SYMBOLS[t.v] : '\\' + t.v; continue; }
      if (t.k === 'amp') { out += '&'; continue; }
      if (t.k === 'nl') { out += ' '; continue; }
      if (t.k === 'sup') { out += '^'; continue; }
      if (t.k === 'sub') { out += '_'; continue; }
    }
    return out;
  };

  Parser.prototype.readDelim = function () {
    this.skipSpaces();
    var t = this.peek();
    if (!t) return '';
    if (t.k === 'ch') {
      this.next();
      if (t.v === '.') return '';
      return DELIMS[t.v] != null ? DELIMS[t.v] : t.v;
    }
    if (t.k === 'cmd') {
      this.next();
      if (t.v === '{') return '{';
      if (t.v === '}') return '}';
      if (t.v === '|') return '‖';
      if (t.v === 'langle') return '⟨';
      if (t.v === 'rangle') return '⟩';
      if (t.v === 'lfloor') return '⌊';
      if (t.v === 'rfloor') return '⌋';
      if (t.v === 'lceil') return '⌈';
      if (t.v === 'rceil') return '⌉';
      return SYMBOLS[t.v] || '';
    }
    if (t.k === 'open') return '{';
    return '';
  };

  Parser.prototype.parseEnv = function (name) {
    var rows = [];
    var cells = [];
    var rowCells = [];
    while (this.i < this.toks.length) {
      var t = this.peek();
      if (t.k === 'cmd' && t.v === 'end') {
        this.next();
        this.readRawGroup();
        break;
      }
      if (t.k === 'cmd' && t.v === '\\') {
        this.next();
        rowCells.push(this.parseRow({ amp: true, nl: true }));
        if (rowCells.length > 1 || rowCells[0].items.length) rows.push(rowCells);
        rowCells = [];
        continue;
      }
      if (t.k === 'amp') { this.next(); rowCells.push(this.parseRow({ amp: true, nl: true })); continue; }
      if (t.k === 'nl') { this.next(); continue; }
      if (t.k === 'close') { this.next(); continue; }
      var node = this.parseScripted();
      if (node) cells.push(node);
      if (cells.length) {
        /* 单元格内容并进当前行 */
        var merged = cells.reduce(function (acc, n) { acc.items.push(n); return acc; }, row([]));
        cells = [];
        if (!rowCells.length) rowCells.push(row([]));
        rowCells[rowCells.length - 1] = merged;
      }
    }
    if (rowCells.length) rows.push(rowCells);
    var width = 1;
    rows.forEach(function (r) { width = Math.max(width, r.length); });
    rows.forEach(function (r) { while (r.length < width) r.push(row([])); });

    var env = name.replace(/\*$/, '');
    var open = '';
    var close = '';
    if (env === 'pmatrix') { open = '('; close = ')'; }
    else if (env === 'bmatrix') { open = '['; close = ']'; }
    else if (env === 'vmatrix') { open = '|'; close = '|'; }
    else if (env === 'Vmatrix') { open = '‖'; close = '‖'; }
    else if (env === 'cases') { open = '{'; close = ''; }
    return { type: 'matrix', rows: rows, open: open, close: close, kind: env };
  };

  Parser.prototype.parseAtom = function () {
    var t = this.peek();
    if (!t) return null;

    if (t.k === 'sp') { this.next(); return null; }
    if (t.k === 'open') {
      this.next();
      var inner = this.parseRow({ close: true });
      if (this.peek() && this.peek().k === 'close') this.next();
      return { type: 'delim', open: '(', close: ')', body: inner, bare: true };
    }
    if (t.k === 'ch') {
      this.next();
      if (/[0-9.]/.test(t.v)) {
        var num = t.v;
        while (this.peek() && this.peek().k === 'ch' && /[0-9.]/.test(this.peek().v)) num += this.next().v;
        return { type: 'text', v: num, upright: true, numeric: true };
      }
      return { type: 'text', v: t.v, upright: false };
    }
    if (t.k === 'sup' || t.k === 'sub') {
      this.next();
      var arg = this.parseArg();
      return t.k === 'sup'
        ? { type: 'script', base: row([]), sub: null, sup: arg }
        : { type: 'script', base: row([]), sub: arg, sup: null };
    }
    if (t.k !== 'cmd') { this.next(); return null; }

    var name = t.v;
    this.next();

    if (name === 'frac' || name === 'dfrac' || name === 'tfrac' || name === 'cfrac') {
      return { type: 'frac', num: this.parseArg(), den: this.parseArg() };
    }
    if (name === 'binom' || name === 'dbinom') {
      return {
        type: 'delim', open: '(', close: ')',
        body: row([{ type: 'frac', num: this.parseArg(), den: this.parseArg(), noBar: true }])
      };
    }
    if (name === 'sqrt') {
      var deg = null;
      this.skipSpaces();
      if (this.peek() && this.peek().k === 'ch' && this.peek().v === '[') {
        this.next();
        var degItems = [];
        while (this.peek() && !(this.peek().k === 'ch' && this.peek().v === ']')) {
          var d = this.parseScripted();
          if (d) degItems.push(d);
        }
        if (this.peek()) this.next();
        deg = row(degItems);
      }
      return { type: 'sqrt', deg: deg, body: this.parseArg() };
    }
    if (NARY[name]) {
      return { type: 'nary', chr: NARY[name].chr, limLoc: NARY[name].limLoc, sub: null, sup: null, body: null };
    }
    if (name === 'left') {
      var open = this.readDelim();
      var body = this.parseRow({ right: true });
      var close = '';
      if (this.peek() && this.peek().k === 'cmd' && this.peek().v === 'right') {
        this.next();
        close = this.readDelim();
      }
      return { type: 'delim', open: open, close: close, body: body };
    }
    if (name === 'right') { return null; }
    if (name === 'text' || name === 'mbox' || name === 'textrm' || name === 'textnormal' ||
        name === 'mathrm' || name === 'operatorname' || name === 'mathbf' || name === 'textit' ||
        name === 'textsf' || name === 'mathtt' || name === 'textup') {
      var raw = this.readRawGroup();
      return { type: 'text', v: raw, upright: name !== 'textit', bold: name === 'mathbf' };
    }
    if (ACCENTS[name]) {
      return { type: 'accent', chr: ACCENTS[name], body: this.parseArg() };
    }
    if (name === 'overline' || name === 'bar') {
      return { type: 'bar', pos: 'top', body: this.parseArg() };
    }
    if (name === 'underline') {
      return { type: 'bar', pos: 'bottom', body: this.parseArg() };
    }
    if (name === 'boxed') {
      return { type: 'boxed', body: this.parseArg() };
    }
    if (name === 'begin') {
      var envName = this.readRawGroup().trim();
      return this.parseEnv(envName);
    }
    if (name === 'limits' || name === 'nolimits' || name === 'displaystyle' || name === 'textstyle' ||
        name === 'scriptstyle' || name === 'left.' || name === 'big' || name === 'Big' ||
        name === 'bigg' || name === 'Bigg' || name === 'bigl' || name === 'bigr' ||
        name === 'Bigl' || name === 'Bigr') {
      return null;
    }
    if (FUNCS[name]) {
      var isLimit = /^(lim|max|min|sup|inf|limsup|liminf|det|gcd|arg)$/.test(name);
      return { type: 'op', name: FUNCS[name], limits: isLimit };
    }
    if (SYMBOLS[name] != null) {
      var sym = SYMBOLS[name];
      if (sym === ' ') return { type: 'space', w: 1 };
      if (sym === '') return null;
      return { type: 'text', v: sym, upright: false };
    }
    return { type: 'text', v: '\\' + name, upright: true, unknown: true };
  };

  function parseMath(src) {
    var text = String(src == null ? '' : src).trim();
    text = text.replace(/^\$\$|\$\$$/g, '').replace(/^\\\[|\\\]$/g, '')
      .replace(/^\\\(|\\\)$/g, '').replace(/^\$|\$$/g, '');
    var parser = new Parser(tokenize(text));
    var ast = parser.parseRow({});
    return ast;
  }

  /* ---------- OMML ---------- */

  function xml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ommlRun(text, opts) {
    opts = opts || {};
    var props = '';
    if (opts.upright) props += '<m:sty m:val="p"/>';
    if (opts.bold) props += '<m:sty m:val="b"/>';
    var wrpr = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/>' +
      (opts.color ? '<w:color w:val="' + opts.color + '"/>' : '') + '</w:rPr>';
    return '<m:r>' + (props ? '<m:rPr>' + props + '</m:rPr>' : '') + wrpr +
      '<m:t xml:space="preserve">' + xml(text) + '</m:t></m:r>';
  }

  function ommlNodes(items) {
    var out = '';
    for (var i = 0; i < items.length; i++) out += ommlNode(items[i]);
    return out;
  }

  function ommlBody(node) {
    if (!node) return '';
    return ommlNode(node);
  }

  function ommlNode(node) {
    if (!node) return '';
    switch (node.type) {
      case 'row':
        return ommlNodes(node.items);
      case 'text':
        return ommlRun(node.v, { upright: node.upright && !node.numeric, bold: node.bold });
      case 'space':
        return ommlRun('\u2009', {});
      case 'frac':
        return '<m:f>' + (node.noBar ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : '') +
          '<m:num>' + ommlBody(node.num) + '</m:num>' +
          '<m:den>' + ommlBody(node.den) + '</m:den></m:f>';
      case 'sqrt':
        if (node.deg) {
          return '<m:rad><m:radPr/><m:deg>' + ommlBody(node.deg) + '</m:deg><m:e>' +
            ommlBody(node.body) + '</m:e></m:rad>';
        }
        return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>' +
          ommlBody(node.body) + '</m:e></m:rad>';
      case 'script': {
        var base = ommlBody(node.base);
        if (node.sub && node.sup) {
          return '<m:sSubSup><m:sSubSupPr/><m:e>' + base + '</m:e><m:sub>' + ommlBody(node.sub) +
            '</m:sub><m:sup>' + ommlBody(node.sup) + '</m:sup></m:sSubSup>';
        }
        if (node.sup) {
          return '<m:sSup><m:sSupPr/><m:e>' + base + '</m:e><m:sup>' + ommlBody(node.sup) + '</m:sup></m:sSup>';
        }
        return '<m:sSub><m:sSubPr/><m:e>' + base + '</m:e><m:sub>' + ommlBody(node.sub) + '</m:sub></m:sSub>';
      }
      case 'nary': {
        var sub = node.sub, sup = node.sup;
        var body = node.body || row([]);
        var pr = '<m:naryPr><m:chr m:val="' + node.chr + '"/><m:limLoc m:val="' + node.limLoc + '"/>' +
          (!sub ? '<m:subHide m:val="1"/>' : '') + (!sup ? '<m:supHide m:val="1"/>' : '') + '</m:naryPr>';
        return '<m:nary>' + pr + '<m:sub>' + ommlBody(sub) + '</m:sub><m:sup>' + ommlBody(sup) +
          '</m:sup><m:e>' + ommlBody(body) + '</m:e></m:nary>';
      }
      case 'op': {
        var nameRun = ommlRun(node.name, { upright: true });
        if (!node.sub && !node.sup) return nameRun;
        if (node.sub && node.sup) {
          return '<m:limLow><m:limUpp><m:e>' + nameRun + '</m:e><m:lim>' + ommlBody(node.sup) +
            '</m:lim></m:limUpp><m:lim>' + ommlBody(node.sub) + '</m:lim></m:limLow>';
        }
        if (node.sup) {
          return '<m:limUpp><m:e>' + nameRun + '</m:e><m:lim>' + ommlBody(node.sup) + '</m:lim></m:limUpp>';
        }
        return '<m:limLow><m:e>' + nameRun + '</m:e><m:lim>' + ommlBody(node.sub) + '</m:lim></m:limLow>';
      }
      case 'delim': {
        if (node.bare) {
          return '<m:d><m:dPr><m:begChr m:val=""/><m:endChr m:val=""/></m:dPr><m:e>' +
            ommlBody(node.body) + '</m:e></m:d>';
        }
        var dpr = '<m:dPr>';
        if (node.open) dpr += '<m:begChr m:val="' + xml(node.open) + '"/>';
        if (node.close) dpr += '<m:endChr m:val="' + xml(node.close) + '"/>';
        dpr += '</m:dPr>';
        var inner = ommlBody(node.body);
        if (node.open === '{' && !node.close) {
          /* cases：左花括号 + 无右括号 */
          return '<m:d><m:dPr><m:begChr m:val="{"/><m:endChr m:val=""/></m:dPr><m:e>' + inner + '</m:e></m:d>';
        }
        return '<m:d>' + dpr + '<m:e>' + inner + '</m:e></m:d>';
      }
      case 'matrix': {
        var cols = node.rows.length ? node.rows[0].length : 1;
        var mpr = '<m:mPr><m:mcs><m:mc><m:mcPr><m:count m:val="' + cols +
          '"/><m:mcJc m:val="center"/></m:mcPr></m:mc></m:mcs></m:mPr>';
        var rowsXml = node.rows.map(function (cells) {
          return '<m:mr>' + cells.map(function (cell) {
            return '<m:e>' + ommlBody(cell) + '</m:e>';
          }).join('') + '</m:mr>';
        }).join('');
        var matrix = '<m:m>' + mpr + rowsXml + '</m:m>';
        if (!node.open && !node.close) return matrix;
        return '<m:d><m:dPr>' + (node.open ? '<m:begChr m:val="' + xml(node.open) + '"/>' : '') +
          (node.close ? '<m:endChr m:val="' + xml(node.close) + '"/>' : '') +
          '</m:dPr><m:e>' + matrix + '</m:e></m:d>';
      }
      case 'accent':
        return '<m:acc><m:accPr><m:chr m:val="' + xml(node.chr) + '"/></m:accPr><m:e>' +
          ommlBody(node.body) + '</m:e></m:acc>';
      case 'bar':
        return '<m:bar><m:barPr><m:pos m:val="' + (node.pos === 'bottom' ? 'bot' : 'top') +
          '"/></m:barPr><m:e>' + ommlBody(node.body) + '</m:e></m:bar>';
      case 'boxed':
        return '<m:borderBox><m:e>' + ommlBody(node.body) + '</m:e></m:borderBox>';
      default:
        return '';
    }
  }

  function mathToOmml(node) {
    return ommlNodes(node && node.items ? node.items : []);
  }

  /* ---------- HTML（仅预览） ---------- */

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function htmlNodes(items) {
    return items.map(htmlNode).join('');
  }

  function htmlBody(node) {
    return node ? htmlNode(node) : '';
  }

  function htmlNode(node) {
    if (!node) return '';
    switch (node.type) {
      case 'row':
        return htmlNodes(node.items);
      case 'text': {
        var cls = node.upright ? ' class="m-up"' : '';
        if (node.bold) cls = ' class="m-up m-b"';
        return '<span' + cls + '>' + esc(node.v) + '</span>';
      }
      case 'space':
        return '<span class="m-sp"></span>';
      case 'frac':
        return '<span class="m-frac' + (node.noBar ? ' m-nobar' : '') + '">' +
          '<span class="m-num">' + htmlBody(node.num) + '</span>' +
          '<span class="m-den">' + htmlBody(node.den) + '</span></span>';
      case 'sqrt':
        return '<span class="m-sqrt">' +
          (node.deg ? '<span class="m-deg">' + htmlBody(node.deg) + '</span>' : '') +
          '<span class="m-radic">√</span><span class="m-under">' + htmlBody(node.body) + '</span></span>';
      case 'script': {
        var b = htmlBody(node.base);
        if (node.sub && node.sup) return b + '<span class="m-ss"><sup>' + htmlBody(node.sup) + '</sup><sub>' + htmlBody(node.sub) + '</sub></span>';
        if (node.sup) return b + '<sup>' + htmlBody(node.sup) + '</sup>';
        return b + '<sub>' + htmlBody(node.sub) + '</sub>';
      }
      case 'nary': {
        var lim = node.limLoc === 'undOvr';
        var sub = node.sub ? htmlBody(node.sub) : '';
        var sup = node.sup ? htmlBody(node.sup) : '';
        var sym = '<span class="m-bigop">' + node.chr + '</span>';
        if (lim) {
          return '<span class="m-limits"><span class="m-lim-sup">' + sup + '</span>' + sym +
            '<span class="m-lim-sub">' + sub + '</span></span>' + htmlBody(node.body);
        }
        return '<span class="m-int">' + sym + '<span class="m-int-scripts"><span>' + sup +
          '</span><span>' + sub + '</span></span></span>' + htmlBody(node.body);
      }
      case 'op': {
        var opName = '<span class="m-up">' + esc(node.name) + '</span>';
        if (!node.sub && !node.sup) return opName;
        return '<span class="m-limits"><span class="m-lim-sup">' + (node.sup ? htmlBody(node.sup) : '') +
          '</span>' + opName + '<span class="m-lim-sub">' + (node.sub ? htmlBody(node.sub) : '') + '</span></span>';
      }
      case 'delim': {
        if (node.bare) return htmlBody(node.body);
        return '<span class="m-delim">' + esc(node.open) + htmlBody(node.body) + esc(node.close) + '</span>';
      }
      case 'matrix': {
        var rows = node.rows.map(function (cells) {
          return '<span class="m-mrow">' + cells.map(function (cell) {
            return '<span class="m-mcell">' + htmlBody(cell) + '</span>';
          }).join('') + '</span>';
        }).join('');
        return '<span class="m-delim">' + esc(node.open) +
          '<span class="m-matrix">' + rows + '</span>' + esc(node.close) + '</span>';
      }
      case 'accent':
        return '<span class="m-acc"><span class="m-acc-mark">' + esc(node.chr) + '</span>' +
          '<span class="m-acc-body">' + htmlBody(node.body) + '</span></span>';
      case 'bar':
        return '<span class="m-bar m-bar-' + (node.pos === 'bottom' ? 'bot' : 'top') + '">' +
          htmlBody(node.body) + '</span>';
      case 'boxed':
        return '<span class="m-boxed">' + htmlBody(node.body) + '</span>';
      default:
        return '';
    }
  }

  function mathToHtml(node) {
    return htmlNodes(node && node.items ? node.items : []);
  }

  AITW.parseMath = parseMath;
  AITW.mathToOmml = mathToOmml;
  AITW.mathToHtml = mathToHtml;
})(typeof globalThis !== 'undefined' ? globalThis : this);
