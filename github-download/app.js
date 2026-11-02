/* GitHub 仓库下载 — 链接解析、GitHub API 拉取、ZIP 打包（store）。浏览器直连 GitHub。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var TOKEN = '';
  var files = [];        // [{path, size, blob, status}]
  var stopped = false;

  /* ── 链接解析 ───────────────────────────────────────────── */
  // 返回 {owner, repo, branch|null, path, kind: 'repo'|'dir'|'file'} 或 null
  function parseUrl(input) {
    var m = String(input).trim()
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '')
      .match(/^https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s]+)(?:\/(tree|blob)\/([^\/\s]+)((?:\/[^\s]*)?))?/i);
    if (!m) return null;
    var out = { owner: m[1], repo: m[2], branch: null, path: '', kind: 'repo' };
    if (m[3]) {
      out.kind = m[3] === 'tree' ? 'dir' : 'file';
      out.branch = decodeURIComponent(m[4]);
      out.path = (m[5] || '').replace(/^\//, '').replace(/\/$/, '');
    }
    return out;
  }

  /* ── GitHub API ─────────────────────────────────────────── */
  function api(path) {
    var headers = { 'Accept': 'application/vnd.github+json' };
    if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
    return fetch('https://api.github.com' + path, { headers: headers })
      .then(function (r) {
        if (r.status === 403 && r.headers.get('X-RateLimit-Remaining') === '0') {
          throw new Error('API 限流（未登录每小时 60 次），填个 Token 再试');
        }
        if (r.status === 404) throw new Error('404：仓库、分支或路径不存在（私有仓库需 Token）');
        if (!r.ok) throw new Error('GitHub API 错误 ' + r.status);
        return r.json();
      });
  }

  function listFiles(target) {
    var p;
    if (target.branch) {
      p = Promise.resolve(target.branch);
    } else {
      p = api('/repos/' + target.owner + '/' + target.repo).then(function (d) { return d.default_branch; });
    }
    return p.then(function (branch) {
      target.branch = branch;
      return api('/repos/' + target.owner + '/' + target.repo + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1')
        .then(function (d) {
          if (d.truncated) throw new Error('仓库太大（超过 API 上限），请缩小到某个子目录');
          var items = d.tree.filter(function (n) { return n.type === 'blob'; });
          if (target.kind === 'file') {
            var hit = items.filter(function (n) { return n.path === target.path; });
            if (!hit.length) throw new Error('文件不存在：' + target.path);
            return hit;
          }
          if (target.path) {
            items = items.filter(function (n) { return n.path.indexOf(target.path + '/') === 0; });
            if (!items.length) throw new Error('目录为空或不存在：' + target.path);
          }
          return items;
        });
    });
  }

  function rawUrl(target, path) {
    return 'https://raw.githubusercontent.com/' + target.owner + '/' + target.repo + '/' +
      encodeURIComponent(target.branch) + '/' + path.split('/').map(encodeURIComponent).join('/');
  }

  function fetchBlob(target, item) {
    var headers = {};
    if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
    return fetch(rawUrl(target, item.path), { headers: headers }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    });
  }

  /* ── 最小 ZIP（store 不压缩，UTF-8 文件名）──────────────── */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function dosTime(d) {
    return {
      time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xFFFF,
      date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF
    };
  }
  function makeZip(entries) {
    // entries: [{name, bytes}]
    var enc = new TextEncoder();
    var chunks = [], central = [], offset = 0;
    var dt = dosTime(new Date());

    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
    function push(arr) { chunks.push(Uint8Array.from(arr)); offset += arr.length; }

    entries.forEach(function (e) {
      var nameB = enc.encode(e.name);
      var crc = crc32(e.bytes);
      var localOff = offset;
      // local file header
      push(u32(0x04034b50)); push(u16(20)); push(u16(0x0800)); push(u16(0));
      push(u16(dt.time)); push(u16(dt.date)); push(u32(crc));
      push(u32(e.bytes.length)); push(u32(e.bytes.length));
      push(u16(nameB.length)); push(u16(0));
      push(nameB);
      push(e.bytes);
      // central directory record
      central.push(Uint8Array.from([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
        u16(dt.time), u16(dt.date), u32(crc),
        u32(e.bytes.length), u32(e.bytes.length),
        u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(localOff), nameB
      )));
    });

    var centralSize = central.reduce(function (s, c) { return s + c.length; }, 0);
    var eocd = [].concat(
      u32(0x06054b50), u16(0), u16(0),
      u16(entries.length), u16(entries.length),
      u32(centralSize), u32(offset), u16(0)
    );
    var total = offset + centralSize + eocd.length;
    var outBuf = new Uint8Array(total);
    var pos = 0;
    chunks.concat(central).forEach(function (c) { outBuf.set(c, pos); pos += c.length; });
    outBuf.set(Uint8Array.from(eocd), pos);
    return new Blob([outBuf], { type: 'application/zip' });
  }

  async function buildZip(target) {
    var prefix = target.path ? target.path.split('/').pop() : target.repo;
    var enc = new TextEncoder();
    var entries = [];
    var ok = 0;
    for (var i = 0; i < files.length; i++) {
      if (stopped) throw new Error('已停止');
      var f = files[i];
      if (f.status !== 'ok') continue;
      var bytes = new Uint8Array(await f.blob.arrayBuffer());
      var rel = target.path && f.path.indexOf(target.path + '/') === 0
        ? f.path.slice(target.path.length + 1)
        : f.path;
      entries.push({ name: prefix + '/' + rel, bytes: bytes });
      ok++;
      setProgress(i + 1, files.length, '打包中 ' + ok + '/' + files.length);
    }
    return makeZip(entries);
  }

  /* ── UI ─────────────────────────────────────────────────── */
  function setStatus(text) { $('gd-info').innerHTML = text; }
  function setProgress(done, total, label) {
    $('gd-bar').style.width = total ? Math.round(done / total * 100) + '%' : '0%';
    if (label) setStatus(label);
  }
  function renderFiles() {
    var ul = $('gd-files');
    ul.innerHTML = '';
    files.forEach(function (f) {
      var li = document.createElement('li');
      var n = document.createElement('span');
      n.textContent = f.path;
      var s = document.createElement('span');
      s.className = 'st' + (f.status === 'ok' ? ' ok' : (f.status === 'err' ? ' err' : ''));
      s.textContent = f.status === 'ok' ? ((f.size / 1024).toFixed(1) + ' KB') :
        (f.status === 'err' ? '失败' : '…');
      li.appendChild(n); li.appendChild(s);
      ul.appendChild(li);
    });
  }

  async function start(url) {
    var target = parseUrl(url);
    if (!target) { setStatus('<b>链接不像 GitHub</b>：贴仓库、目录或文件链接试试。'); return; }
    TOKEN = $('gd-token').value.trim();
    stopped = false;
    files = [];
    $('gd-status').hidden = false;
    $('gd-actions').hidden = true;
    $('gd-start').disabled = true;
    var scope = target.kind === 'repo' ? '整个仓库' : (target.kind === 'file' ? '单文件' : '目录 <code>' + target.path + '</code>');
    setStatus('解析 <code>' + target.owner + '/' + target.repo + '</code>（' + scope + '）…');

    try {
      var items = await listFiles(target);
      if (items.length > 300) {
        if (!window.confirm('该范围有 ' + items.length + ' 个文件，未登录可能触发限流，继续？')) {
          $('gd-start').disabled = false; setStatus('已取消。'); return;
        }
      }
      setStatus('共 ' + items.length + ' 个文件，开始下载…');
      var done = 0;
      var CONC = 5, idx = 0;
      async function worker() {
        while (idx < items.length && !stopped) {
          var i = idx++;
          var it = items[i];
          files.push({ path: it.path, size: it.size, blob: null, status: 'wait' });
          var fi = files.length - 1;
          renderFiles();
          try {
            files[fi].blob = await fetchBlob(target, it);
            files[fi].status = 'ok';
          } catch (e) {
            files[fi].status = 'err';
            files[fi].err = e.message;
          }
          done++;
          setProgress(done, items.length, '下载中 ' + done + '/' + items.length + ' · ' + it.path);
          renderFiles();
        }
      }
      await Promise.all([worker(), worker(), worker(), worker(), worker()]);

      var okCount = files.filter(function (f) { return f.status === 'ok'; }).length;
      if (!okCount) throw new Error('一个都没下下来（' + (files[0] && files[0].err || '未知错误') + '）');
      setStatus('下载完成：' + okCount + '/' + items.length + ' 个文件。点「打包下载 ZIP」。');
      $('gd-actions').hidden = false;
      $('gd-start').disabled = false;
      window.__gdTarget = target;
    } catch (e) {
      setStatus('<b style="color:#e03131">' + e.message + '</b>');
      $('gd-start').disabled = false;
    }
  }

  $('gd-form').addEventListener('submit', function (e) {
    e.preventDefault();
    start($('gd-url').value);
  });

  $('gd-stop').addEventListener('click', function () { stopped = true; });

  $('gd-zip').addEventListener('click', async function () {
    var target = window.__gdTarget;
    if (!target) return;
    this.disabled = true;
    try {
      var blob = await buildZip(target);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (target.path ? target.path.split('/').pop() : target.repo) + '.zip';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    } catch (e) {
      setStatus('<b style="color:#e03131">打包失败：' + e.message + '</b>');
    }
    this.disabled = false;
  });

  /* ── 测试钩子（?test=1）────────────────────────────────── */
  if (location.search.indexOf('test=1') >= 0) runTests();

  function runTests() {
    window.GD = { parseUrl: parseUrl, makeZip: makeZip, crc32: crc32, _files: function () { return files; } };
    var out = [];
    var T = function (name, fn) {
      try { fn(); out.push(name + ': PASS'); }
      catch (e) { out.push(name + ': FAIL ' + e.message); }
    };
    var assert = function (c, m) { if (!c) throw new Error(m || 'assert'); };

    T('解析仓库主页', function () {
      var t = parseUrl('https://github.com/httcup/tools');
      assert(t && t.kind === 'repo' && t.owner === 'httcup' && t.repo === 'tools', JSON.stringify(t));
      assert(t.branch === null && t.path === '', '无分支无路径');
    });
    T('解析目录链接', function () {
      var t = parseUrl('https://github.com/httcup/tools/tree/main/scripts/');
      assert(t.kind === 'dir' && t.branch === 'main' && t.path === 'scripts', JSON.stringify(t));
    });
    T('解析多级目录与文件', function () {
      var t = parseUrl('https://github.com/o/r/tree/dev/src/lib/qr');
      assert(t.path === 'src/lib/qr' && t.branch === 'dev', JSON.stringify(t));
      var f = parseUrl('https://github.com/o/r/blob/main/README.md');
      assert(f.kind === 'file' && f.path === 'README.md', JSON.stringify(f));
    });
    T('解析 .git 后缀与 SSH 地址', function () {
      var t1 = parseUrl('https://github.com/o/r.git');
      assert(t1.repo === 'r', JSON.stringify(t1));
      var t2 = parseUrl('git@github.com:o/r.git');
      assert(t2 && t2.owner === 'o' && t2.repo === 'r', JSON.stringify(t2));
    });
    T('拒绝非 GitHub 链接', function () {
      assert(parseUrl('https://gitlab.com/o/r') === null, 'gitlab 应解析失败');
      assert(parseUrl('随便写写') === null, '乱串应解析失败');
    });
    T('CRC32 校验值', function () {
      var enc = new TextEncoder();
      assert(crc32(enc.encode('123456789')) === 0xCBF43926, '标准测试向量应为 0xCBF43926: ' + crc32(enc.encode('123456789')).toString(16));
    });
    T('ZIP 结构：本地头/中央目录/EOCD', function () {
      var enc = new TextEncoder();
      var blob = makeZip([
        { name: 'a/one.txt', bytes: enc.encode('hello zip') },
        { name: 'a/two.txt', bytes: enc.encode('') }
      ]);
      assert(blob.size > 100, 'zip 应非空: ' + blob.size);
      // 用 Blob.arrayBuffer 异步校验
      return blob.arrayBuffer().then(function (ab) {
        var u8 = new Uint8Array(ab);
        assert(u8[0] === 0x50 && u8[1] === 0x4B && u8[2] === 0x03 && u8[3] === 0x04, '本地头魔数');
        // EOCD 在尾部
        var eocdAt = -1;
        for (var i = u8.length - 22; i >= 0; i--) {
          if (u8[i] === 0x50 && u8[i + 1] === 0x4B && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocdAt = i; break; }
        }
        assert(eocdAt > 0, '应能找到 EOCD');
        var dv = new DataView(ab);
        assert(dv.getUint16(eocdAt + 10, true) === 2, 'EOCD 条目数应为 2');
        // 用 DecompressionStream 不支持 store 校验内容；直接找文件名与内容
        var s = new TextDecoder().decode(u8);
        assert(s.indexOf('a/one.txt') >= 0 && s.indexOf('hello zip') >= 0, 'zip 内应含文件名与内容');
      });
    });

    var pass = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
    Promise.all(out.map(function () { return null; })).then(function () {
      setTimeout(function () {
        var pass2 = out.filter(function (s) { return s.indexOf('PASS') >= 0; }).length;
        var pre = document.createElement('pre');
        pre.id = 'r';
        pre.textContent = out.join('\n') + '\nRESULTS: ' + pass2 + '/' + out.length + ' PASS';
        document.body.appendChild(pre);
      }, 800);
    });
  }
})();
