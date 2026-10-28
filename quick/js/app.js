/* 小胡的工具箱 Local Web Tools —— 所有逻辑均在浏览器本地执行，数据不上传 */
(function () {
  'use strict';

  /* ================= 通用辅助 ================= */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  function bindCopy(btn, getText) {
    btn.addEventListener('click', () => {
      copyToClipboard(getText()).then((ok) => {
        if (ok) {
          const hint = btn.parentElement.querySelector('.copy-hint');
          if (hint) { hint.textContent = '已复制到剪贴板'; setTimeout(() => { hint.textContent = ''; }, 1500); }
        }
      });
    });
  }
  function showError(panel, msg) {
    let el = panel.querySelector('.error-msg');
    if (!el) { el = document.createElement('div'); el.className = 'error-msg'; panel.appendChild(el); }
    el.textContent = msg;
  }
  function clearError(panel) { const el = panel.querySelector('.error-msg'); if (el) el.remove(); }

  /* ================= 字节与编码工具 ================= */
  function utf8ToBytes(str) {
    const bytes = [];
    for (const ch of str) {
      const code = ch.codePointAt(0);
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
    return bytes;
  }
  function bytesToUtf8(bytes) {
    const out = [];
    for (let i = 0; i < bytes.length;) {
      const b = bytes[i];
      if (b < 0x80) { out.push(String.fromCharCode(b)); i++; }
      else if (b < 0xe0) { out.push(String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f))); i += 2; }
      else if (b < 0xf0) { out.push(String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f))); i += 3; }
      else { const cp = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f); out.push(String.fromCodePoint(cp)); i += 4; }
    }
    return out.join('');
  }
  function bytesToHex(bytes) { return bytes.map((b) => b.toString(16).padStart(2, '0')).join(''); }
  function hexToBytes(hex) {
    const clean = hex.replace(/[^0-9a-fA-F]/g, '');
    if (!clean) return [];
    if (clean.length % 2) throw new Error('十六进制字符串长度必须为偶数');
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.substr(i, 2), 16));
    return bytes;
  }
  function bytesToBase64(bytes) {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
      out += CHARS[b0 >> 2];
      out += CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
      out += b1 === undefined ? '=' : CHARS[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
      out += b2 === undefined ? '=' : CHARS[b2 & 63];
    }
    return out;
  }
  function base64ToBytes(b64) {
    const clean = b64.replace(/\s+/g, '');
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) throw new Error('无效的 Base64 输入');
    const bytes = [];
    let buffer = 0, bits = 0;
    for (const ch of clean) {
      if (ch === '=') break;
      buffer = (buffer << 6) | CHARS.indexOf(ch);
      bits += 6;
      if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 0xff); }
    }
    return bytes;
  }

  /* ================= MD5（标准实现，UTF-8 输入） ================= */
  function md5(str) {
    function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }
    function cmn(q, a, b, x, s, t) { return rotl(((a + q) | 0) + x + t, s) + b; }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    const S = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];
    const K = [];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    const bytes = utf8ToBytes(str);
    const bitLen = bytes.length * 8;
    const padded = bytes.slice();
    padded.push(0x80);
    while (padded.length % 64 !== 56) padded.push(0);
    const lenLow = bitLen >>> 0;
    const lenHigh = Math.floor(bitLen / 4294967296) >>> 0;
    for (let i = 0; i < 4; i++) padded.push((lenLow >>> (i * 8)) & 0xff);
    for (let i = 0; i < 4; i++) padded.push((lenHigh >>> (i * 8)) & 0xff);
    const words = [];
    for (let i = 0; i < padded.length / 4; i++) {
      words[i] = (padded[i * 4]) | (padded[i * 4 + 1] << 8) | (padded[i * 4 + 2] << 16) | (padded[i * 4 + 3] << 24);
    }
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let k = 0; k < words.length; k += 16) {
      const X = words.slice(k, k + 16);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const tmp = D;
        D = C; C = B;
        B = (B + rotl(A + F + K[i] + X[g], S[i])) | 0;
        A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    return [a0, b0, c0, d0].map((v) => {
      let out = '';
      for (let i = 0; i < 4; i++) out += ((v >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
      return out;
    }).join('');
  }

  async function shaHex(alg, str) {
    const buf = await crypto.subtle.digest(alg, new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /* ================= 工具注册 ================= */
  const tools = [];
  function addTool(group, id, name, keywords, render) {
    tools.push({ group, id, name, keywords, render });
  }

  /* --- 1. Base64 --- */
  addTool('编解码', 'base64', 'Base64 编解码', 'base64 encode decode 编码 解码', (panel) => {
    panel.innerHTML = `
      <h2>Base64 编解码</h2><p class="desc">将文本编码为 Base64，或从 Base64 解码为原文（UTF-8 安全）。</p>
      <div class="field"><label>输入</label><textarea id="b64-in" placeholder="输入文本或 Base64 字符串"></textarea></div>
      <div class="btn-group">
        <button class="primary" id="b64-enc">编码为 Base64</button>
        <button id="b64-dec">解码为文本</button>
        <button id="b64-swap">交换输入输出</button>
      </div>
      <div class="field"><label>输出</label><textarea id="b64-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="b64-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const input = $('#b64-in', panel), output = $('#b64-out', panel);
    $('#b64-enc', panel).onclick = () => { try { clearError(panel); output.value = bytesToBase64(utf8ToBytes(input.value)); } catch (e) { showError(panel, e.message); } };
    $('#b64-dec', panel).onclick = () => { try { clearError(panel); output.value = bytesToUtf8(base64ToBytes(input.value)); } catch (e) { showError(panel, e.message); } };
    $('#b64-swap', panel).onclick = () => { const t = input.value; input.value = output.value; output.value = t; };
    bindCopy($('#b64-copy', panel), () => output.value);
  });

  /* --- 2. URL --- */
  addTool('编解码', 'url', 'URL 编解码', 'url encode decode percent 百分号 编码 解码 网址', (panel) => {
    panel.innerHTML = `
      <h2>URL 编解码</h2><p class="desc">对 URL 进行百分号编码或解码，可选编码模式。</p>
      <div class="field"><label>输入</label><textarea id="url-in" placeholder="输入网址或文本"></textarea></div>
      <div class="check-row" style="margin-bottom:12px">
        <label><input type="radio" name="url-mode" value="component" checked> 完整组件编码 (encodeURIComponent)</label>
        <label><input type="radio" name="url-mode" value="uri"> URI 编码 (encodeURI)</label>
      </div>
      <div class="btn-group">
        <button class="primary" id="url-enc">编码</button>
        <button id="url-dec">解码</button>
      </div>
      <div class="field"><label>输出</label><textarea id="url-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="url-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const input = $('#url-in', panel), output = $('#url-out', panel);
    const mode = () => $('input[name="url-mode"]:checked', panel).value;
    $('#url-enc', panel).onclick = () => { try { clearError(panel); output.value = mode() === 'component' ? encodeURIComponent(input.value) : encodeURI(input.value); } catch (e) { showError(panel, e.message); } };
    $('#url-dec', panel).onclick = () => { try { clearError(panel); output.value = decodeURIComponent(input.value); } catch (e) { showError(panel, '无效的编码：' + e.message); } };
    bindCopy($('#url-copy', panel), () => output.value);
  });

  /* --- 3. HTML 实体 --- */
  addTool('编解码', 'html', 'HTML 实体编解码', 'html entity escape unescape 实体 转义', (panel) => {
    panel.innerHTML = `
      <h2>HTML 实体编解码</h2><p class="desc">将文本转义为 HTML 实体，或从实体解码回原文。</p>
      <div class="field"><label>输入</label><textarea id="html-in" placeholder="输入 HTML 文本或实体串"></textarea></div>
      <div class="btn-group">
        <button class="primary" id="html-enc">转义为实体</button>
        <button id="html-dec">解码实体</button>
      </div>
      <div class="field"><label>输出</label><textarea id="html-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="html-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const input = $('#html-in', panel), output = $('#html-out', panel);
    const decodeEntities = (s) => { const el = document.createElement('textarea'); el.innerHTML = s; return el.value; };
    $('#html-enc', panel).onclick = () => { clearError(panel); output.value = esc(input.value); };
    $('#html-dec', panel).onclick = () => { try { clearError(panel); output.value = decodeEntities(input.value); } catch (e) { showError(panel, e.message); } };
    bindCopy($('#html-copy', panel), () => output.value);
  });

  /* --- 4. Hex --- */
  addTool('编解码', 'hex', 'Hex 编解码', 'hex hexadecimal utf8 十六进制 字节 编码 解码', (panel) => {
    panel.innerHTML = `
      <h2>Hex 编解码</h2><p class="desc">文本与十六进制字符串互转（UTF-8）。</p>
      <div class="field"><label>输入</label><textarea id="hex-in" placeholder="输入文本或十六进制串"></textarea></div>
      <div class="btn-group">
        <button class="primary" id="hex-enc">文本 → Hex</button>
        <button id="hex-dec">Hex → 文本</button>
      </div>
      <div class="field"><label>输出</label><textarea id="hex-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="hex-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const input = $('#hex-in', panel), output = $('#hex-out', panel);
    $('#hex-enc', panel).onclick = () => { clearError(panel); output.value = bytesToHex(utf8ToBytes(input.value)); };
    $('#hex-dec', panel).onclick = () => { try { clearError(panel); output.value = bytesToUtf8(hexToBytes(input.value)); } catch (e) { showError(panel, e.message); } };
    bindCopy($('#hex-copy', panel), () => output.value);
  });

  /* --- 5. 哈希 --- */
  addTool('哈希', 'hash', '哈希计算器', 'hash md5 sha1 sha256 sha512 哈希 摘要 校验', (panel) => {
    panel.innerHTML = `
      <h2>哈希计算器</h2><p class="desc">计算文本的 MD5 / SHA-1 / SHA-256 / SHA-512 摘要，全部在本地完成。</p>
      <div class="field"><label>输入文本</label><textarea id="hash-in" placeholder="输入要计算哈希的文本"></textarea></div>
      <div class="btn-group"><button class="primary" id="hash-run">计算哈希</button></div>
      <div class="result-block"><div class="result-title">结果</div><div class="hash-lines" id="hash-out"><span class="muted">点击上方按钮开始计算。</span></div></div>`;
    const input = $('#hash-in', panel), out = $('#hash-out', panel);
    $('#hash-run', panel).onclick = async () => {
      clearError(panel);
      const text = input.value;
      if (!text) { out.innerHTML = '<span class="muted">请先输入文本。</span>'; return; }
      const items = [
        ['MD5', md5(text)],
        ['SHA-1', await shaHex('SHA-1', text)],
        ['SHA-256', await shaHex('SHA-256', text)],
        ['SHA-512', await shaHex('SHA-512', text)]
      ];
      out.innerHTML = items.map(([a, v]) =>
        `<div class="hash-row"><span class="algo">${a}</span><span class="val">${v}</span><button data-hash="${esc(v)}">复制</button></div>`
      ).join('');
      $$('button[data-hash]', out).forEach((b) => { bindCopy(b, () => b.dataset.hash); });
    };
  });

  /* --- 6. UUID --- */
  addTool('开发工具', 'uuid', 'UUID 生成器', 'uuid guid ulid nanoid id 随机 标识 生成', (panel) => {
    panel.innerHTML = `
      <h2>UUID 生成器</h2><p class="desc">生成 UUID v4（基于加密安全随机数）。</p>
      <div class="row">
        <div class="field" style="max-width:160px"><label>生成数量</label><input type="number" id="uuid-count" value="1" min="1" max="100"></div>
        <div class="field" style="max-width:160px"><label>格式</label>
          <select id="uuid-case"><option value="lower">小写</option><option value="upper">大写</option></select>
        </div>
      </div>
      <div class="btn-group"><button class="primary" id="uuid-gen">生成</button><button id="uuid-copy">复制全部</button></div>
      <div class="field"><label>结果</label><textarea id="uuid-out" class="output" readonly></textarea></div>
      <div class="copy-hint"></div>`;
    const count = $('#uuid-count', panel), out = $('#uuid-out', panel);
    const gen = () => {
      const n = Math.max(1, Math.min(100, parseInt(count.value, 10) || 1));
      const lines = [];
      for (let i = 0; i < n; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytesToHex(bytes);
        let uuid = hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
        if ($('#uuid-case', panel).value === 'upper') uuid = uuid.toUpperCase();
        lines.push(uuid);
      }
      out.value = lines.join('\n');
    };
    $('#uuid-gen', panel).onclick = gen;
    gen();
    bindCopy($('#uuid-copy', panel), () => out.value);
  });

  /* --- 7. 随机密码 --- */
  addTool('开发工具', 'password', '随机密码生成', 'password token 密码 随机 口令 token 生成', (panel) => {
    panel.innerHTML = `
      <h2>随机密码生成</h2><p class="desc">按自定义规则生成高强度随机密码（加密安全随机源）。</p>
      <div class="row">
        <div class="field" style="max-width:160px"><label>长度</label><input type="number" id="pwd-len" value="16" min="4" max="128"></div>
        <div class="field" style="max-width:160px"><label>生成数量</label><input type="number" id="pwd-count" value="1" min="1" max="50"></div>
      </div>
      <div class="check-row" style="margin-bottom:12px">
        <label><input type="checkbox" id="pwd-lower" checked> 小写字母</label>
        <label><input type="checkbox" id="pwd-upper" checked> 大写字母</label>
        <label><input type="checkbox" id="pwd-digit" checked> 数字</label>
        <label><input type="checkbox" id="pwd-symbol"> 符号</label>
        <label><input type="checkbox" id="pwd-ambiguous"> 排除易混淆字符</label>
      </div>
      <div class="btn-group"><button class="primary" id="pwd-gen">生成</button><button id="pwd-copy">复制全部</button></div>
      <div class="field"><label>结果</label><textarea id="pwd-out" class="output" readonly></textarea></div>
      <div class="copy-hint"></div>`;
    const lenIn = $('#pwd-len', panel), countIn = $('#pwd-count', panel), out = $('#pwd-out', panel);
    const CH = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      digit: '0123456789',
      symbol: '!@#$%^&*()-_=+[]{};:,.?/'
    };
    const AMB = /[0O1lI|]/g;
    const gen = () => {
      const len = Math.max(4, Math.min(128, parseInt(lenIn.value, 10) || 16));
      const n = Math.max(1, Math.min(50, parseInt(countIn.value, 10) || 1));
      let pool = '';
      ['lower', 'upper', 'digit', 'symbol'].forEach((k) => { if ($('#pwd-' + k, panel).checked) pool += CH[k]; });
      if ($('#pwd-ambiguous', panel).checked) pool = pool.replace(AMB, '');
      if (!pool) { out.value = '请至少选择一种字符集'; return; }
      const rnd = new Uint32Array(len * n);
      crypto.getRandomValues(rnd);
      const lines = [];
      let idx = 0;
      for (let i = 0; i < n; i++) {
        let pwd = '';
        for (let j = 0; j < len; j++) pwd += pool[rnd[idx++] % pool.length];
        lines.push(pwd);
      }
      out.value = lines.join('\n');
    };
    $('#pwd-gen', panel).onclick = gen;
    gen();
    bindCopy($('#pwd-copy', panel), () => out.value);
  });

  /* --- 8. 时间戳转换 --- */
  addTool('开发工具', 'timestamp', '时间戳转换', 'timestamp unix 时间戳 日期 时间 转换', (panel) => {
    panel.innerHTML = `
      <h2>时间戳转换</h2><p class="desc">Unix 时间戳与日期时间互转，本地时区显示。</p>
      <div class="field"><label>当前时间戳（秒）</label><input type="text" id="ts-now" readonly></div>
      <div class="field"><label>时间戳 → 日期</label><input type="text" id="ts-in" placeholder="输入秒级或毫秒级时间戳"></div>
      <div class="btn-group"><button class="primary" id="ts-to-date">转换为日期</button></div>
      <div class="field"><label>日期 → 时间戳</label><input type="datetime-local" id="dt-in"></div>
      <div class="btn-group"><button id="dt-to-ts">转换为时间戳</button></div>
      <div class="field"><label>结果</label><textarea id="ts-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="ts-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const nowIn = $('#ts-now', panel), inIn = $('#ts-in', panel), dtIn = $('#dt-in', panel), out = $('#ts-out', panel);
    const refreshNow = () => { nowIn.value = String(Math.floor(Date.now() / 1000)); };
    refreshNow();
    setInterval(refreshNow, 1000);
    $('#ts-to-date', panel).onclick = () => {
      clearError(panel);
      const raw = inIn.value.trim();
      if (!raw) { showError(panel, '请输入时间戳'); return; }
      let ms = parseInt(raw, 10);
      if (isNaN(ms)) { showError(panel, '无效的时间戳'); return; }
      if (ms < 1e12) ms *= 1000;
      out.value = new Date(ms).toLocaleString('zh-CN', { hour12: false });
    };
    $('#dt-to-ts', panel).onclick = () => {
      clearError(panel);
      const v = dtIn.value;
      if (!v) { showError(panel, '请选择日期时间'); return; }
      const ms = new Date(v).getTime();
      if (isNaN(ms)) { showError(panel, '无效的日期时间'); return; }
      out.value = '秒: ' + Math.floor(ms / 1000) + '\n毫秒: ' + ms;
    };
    bindCopy($('#ts-copy', panel), () => out.value);
  });

  /* --- 9. JSON 工具 --- */
  addTool('开发工具', 'json', 'JSON 格式化', 'json format beautify minify validate 格式化 压缩 校验 美化', (panel) => {
    panel.innerHTML = `
      <h2>JSON 工具</h2><p class="desc">格式化、压缩与校验 JSON 数据。</p>
      <div class="field"><label>输入 JSON</label><textarea id="json-in" placeholder='{"name":"test","list":[1,2,3]}'></textarea></div>
      <div class="btn-group">
        <button class="primary" id="json-format">格式化（2 空格缩进）</button>
        <button id="json-minify">压缩为单行</button>
      </div>
      <div class="field"><label>输出</label><textarea id="json-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="json-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const input = $('#json-in', panel), output = $('#json-out', panel);
    const parse = () => {
      clearError(panel);
      try { return JSON.parse(input.value); }
      catch (e) { showError(panel, 'JSON 解析失败：' + e.message); return null; }
    };
    $('#json-format', panel).onclick = () => { const o = parse(); if (o !== null) output.value = JSON.stringify(o, null, 2); };
    $('#json-minify', panel).onclick = () => { const o = parse(); if (o !== null) output.value = JSON.stringify(o); };
    bindCopy($('#json-copy', panel), () => output.value);
  });

  /* --- 10. 文本统计 --- */
  addTool('开发工具', 'textstats', '文本统计', 'text stats count 统计 字数 字符 单词 行数', (panel) => {
    panel.innerHTML = `
      <h2>文本统计</h2><p class="desc">统计字符数、字数、行数与段落数。</p>
      <div class="field"><label>输入文本</label><textarea id="ts-in" placeholder="粘贴要统计的文本"></textarea></div>
      <div class="btn-group"><button class="primary" id="ts-run">统计</button></div>
      <div class="result-block"><div class="result-title">结果</div><div id="ts-out" class="muted">点击按钮查看统计结果。</div></div>`;
    const input = $('#ts-in', panel), out = $('#ts-out', panel);
    $('#ts-run', panel).onclick = () => {
      const t = input.value;
      const chars = t.length;
      const charsNoSpace = t.replace(/\s/g, '').length;
      const words = t.trim() ? t.trim().split(/\s+/).length : 0;
      const lines = t ? t.split(/\r\n|\r|\n/).length : 0;
      const paras = t.trim() ? t.trim().split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
      out.innerHTML = [
        ['字符数（含空白）', chars], ['字符数（不含空白）', charsNoSpace],
        ['单词数', words], ['行数', lines], ['段落数', paras]
      ].map(([k, v]) => `<div class="hash-row"><span class="algo">${k}</span><span class="val">${v}</span></div>`).join('');
    };
  });

  /* --- 11. 大小写转换 --- */
  addTool('开发工具', 'case', '大小写转换', 'case upper lower camel 大小写 转换 大写 小写 驼峰', (panel) => {
    panel.innerHTML = `
      <h2>大小写转换</h2><p class="desc">文本大小写与命名风格转换。</p>
      <div class="field"><label>输入文本</label><textarea id="case-in" placeholder="输入文本"></textarea></div>
      <div class="btn-group">
        <button class="primary" id="case-upper">全部大写</button>
        <button id="case-lower">全部小写</button>
        <button id="case-title">每个单词首字母大写</button>
        <button id="case-camel">转驼峰 camelCase</button>
        <button id="case-kebab">转 kebab-case</button>
        <button id="case-snake">转 snake_case</button>
      </div>
      <div class="field"><label>输出</label><textarea id="case-out" class="output" readonly></textarea></div>
      <div class="btn-group"><button id="case-copy">复制结果</button><span class="copy-hint"></span></div>`;
    const input = $('#case-in', panel), output = $('#case-out', panel);
    const words = () => input.value.trim().split(/[^A-Za-z0-9\u4e00-\u9fa5]+/).filter(Boolean);
    $('#case-upper', panel).onclick = () => { output.value = input.value.toUpperCase(); };
    $('#case-lower', panel).onclick = () => { output.value = input.value.toLowerCase(); };
    $('#case-title', panel).onclick = () => { output.value = words().map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };
    $('#case-camel', panel).onclick = () => { output.value = words().map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''); };
    $('#case-kebab', panel).onclick = () => { output.value = words().map((w) => w.toLowerCase()).join('-'); };
    $('#case-snake', panel).onclick = () => { output.value = words().map((w) => w.toLowerCase()).join('_'); };
    bindCopy($('#case-copy', panel), () => output.value);
  });

  /* ================= 导航与渲染 ================= */
  const groups = [];
  tools.forEach((t) => { if (!groups.includes(t.group)) groups.push(t.group); });

  const nav = $('#tool-nav');
  const panels = $('#panels');

  groups.forEach((g, gi) => {
    const gt = document.createElement('div');
    gt.className = 'nav-group';
    gt.textContent = g;
    nav.appendChild(gt);
    tools.filter((t) => t.group === g).forEach((t) => {
      const a = document.createElement('a');
      a.href = '#';
      a.dataset.tool = t.id;
      a.dataset.group = g;
      a.dataset.name = t.name;
      a.dataset.keywords = t.keywords;
      a.textContent = t.name;
      a.addEventListener('click', (e) => { e.preventDefault(); activate(t.id); });
      nav.appendChild(a);
    });
  });

  tools.forEach((t) => {
    const div = document.createElement('div');
    div.className = 'panel';
    div.id = 'panel-' + t.id;
    t.render(div);
    panels.appendChild(div);
  });

  function activate(id, push) {
    $$('.panel', panels).forEach((p) => p.classList.remove('active'));
    $$('.tool-nav a', nav).forEach((a) => a.classList.toggle('active', a.dataset.tool === id));
    const p = $('#panel-' + id);
    if (p) p.classList.add('active');
    if (push !== false) {
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* 忽略 */ }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* 深链接：/quick/#base64 */
  function fromHash() {
    const id = (location.hash || '').replace(/^#/, '');
    if (id && tools.some((t) => t.id === id)) return activate(id, false);
    return false;
  }
  window.addEventListener('hashchange', fromHash);

  /* 搜索过滤 */
  const search = $('#search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    $$('.tool-nav a', nav).forEach((a) => {
      const hay = (a.dataset.group + ' ' + a.dataset.name + ' ' + a.dataset.keywords).toLowerCase();
      a.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
    $$('.nav-group', nav).forEach((g) => {
      let any = false;
      let sib = g.nextElementSibling;
      while (sib && sib.classList.contains('tool-nav')) { if (sib.style.display !== 'none') any = true; sib = sib.nextElementSibling; }
      if (!any) { let sib2 = g.nextElementSibling; while (sib2 && sib2.classList.contains('tool-nav')) { sib2.style.display = ''; sib2 = sib2.nextElementSibling; } }
    });
  });

  /* 主题切换 */
  const themeBtn = $('#theme');
  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = cur;
    localStorage.setItem('theme', cur);
  });

  /* 按 / 聚焦搜索框 */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
  });

  /* 默认激活：优先跟随 hash，其次第一个工具 */
  if (!fromHash() && tools.length) activate(tools[0].id, false);
})();
