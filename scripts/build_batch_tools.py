#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 scripts/batch_tools_defs.py 里登记的批量工具页面。

用法：python3 scripts/build_batch_tools.py
产物：每个工具一个 <slug>/ 目录（index.html + app.js），以及共享的
toolkit.css / toolkit.js。页面本身是最终交付物，脚本只负责按模板组装。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from batch_tools_defs import TOOLS, ICONS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CSP = ("default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; "
       "form-action 'none'; base-uri 'none'; frame-ancestors 'none'")

LOGO = """<svg class="site-logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <path class="logo-handle" d="M25 16.5 A7 7 0 0 1 39 16.5"/>
  <rect class="logo-lid" x="12" y="16.5" width="40" height="9" rx="4.5"/>
  <rect class="logo-box" x="16" y="25.5" width="32" height="27" rx="6"/>
  <rect class="logo-latch" x="28.4" y="35" width="7.2" height="7.2" rx="1.6" transform="rotate(45 32 38.6)"/>
</svg>"""

SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>@@NAME@@：@@SHORT@@ | 本地工具箱</title>
<meta name="description" content="@@LONG@@">
<link rel="canonical" href="https://httcup.github.io/tools/@@SLUG@@/">
<meta name="theme-color" content="#f6f7f9">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧰</text></svg>">
<meta http-equiv="Content-Security-Policy" content="@@CSP@@">
<meta property="og:type" content="website">
<meta property="og:site_name" content="本地工具箱">
<meta property="og:url" content="https://httcup.github.io/tools/@@SLUG@@/">
<meta property="og:title" content="@@NAME@@ — 全程本地处理">
<meta property="og:description" content="@@LONG@@">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="../site.css">
<link rel="stylesheet" href="../toolkit.css">
</head>
<body>
<a class="skip-link" href="#main">跳到主要内容</a>

<header class="hub-head">
  <div class="head-row">
    <p class="brand"><a class="brand-home" href="../">@@LOGO@@Tools</a></p>
  </div>
  <nav class="crumbs" aria-label="位置">
    <a href="../">全部工具</a><span aria-hidden="true">›</span><span aria-current="page">@@NAME@@</span>
  </nav>
  <h1>@@NAME@@</h1>
  <p class="lede">@@LONG@@</p>
</header>

<main id="main" class="tool-main">
@@BODY@@
<section class="facts" aria-label="处理方式">
  <article class="fact"><h2>全程本地</h2><p>所有计算都在这个页面里完成，过程不发起任何网络请求，输入的内容不会离开这台设备。</p></article>
  <article class="fact"><h2>不用注册</h2><p>没有账号、没有上传、没有水印。打开就用，关掉页面数据就没了，也不保存任何草稿。</p></article>
</section>
</main>

<footer>
  <p><a class="home-link" href="../">小胡的工具箱</a> · 所有文件都在你的浏览器内本地处理，不上传服务器 · <a href="../privacy/">隐私</a></p>
</footer>

<script src="../toolkit.js"></script>
<script src="app.js"></script>
</body>
</html>
"""

TOOLKIT_CSS = """/* 批量工具页共享样式。变量与版式沿用 site.css。 */

.tool-main { max-width: 860px; }
.crumbs { padding-top: 0.6rem; }

.tool-card {
  margin: 1.1rem 0 0;
  padding: 1rem 1.1rem 1.15rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.tool-card h2 { margin: 0 0 0.7rem; font-size: 0.95rem; }

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.9rem;
  margin: 0 0 0.7rem;
}

.card-head h2 { margin: 0; }
.card-head .stats { margin-inline-start: 0; }
.card-sub { margin: 0 0 0.55rem; padding: 0; }

.checks { display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; }

.check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.83rem;
  color: var(--text-dim);
  cursor: pointer;
}

.check input { accent-color: var(--accent); width: 0.95rem; height: 0.95rem; }
.check-mid { align-self: center; min-height: 38px; }

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.7rem 0.9rem;
  margin-top: 0.7rem;
}

.row > .field { margin: 0; }

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--text-dim);
}

.field > span { letter-spacing: 0.02em; }

.field input[type="number"],
.field input[type="date"],
.field input[type="datetime-local"],
.field input[type="text"],
.field select,
.sel {
  min-height: 38px;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.88rem;
}

.field input[type="color"] {
  width: 3.2rem;
  height: 38px;
  padding: 0.15rem;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
}

.field input[type="range"] { width: 10rem; accent-color: var(--accent); }

textarea.in, textarea.out {
  width: 100%;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: 0.87rem/1.65 ui-monospace, SFMono-Regular, "Cascadia Mono", Consolas, "PingFang SC", monospace;
  resize: vertical;
}

textarea.in:focus-visible, textarea.out:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
textarea.out { background: var(--surface-2); }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.12s, color 0.12s;
}

.btn:hover { border-color: var(--accent); color: var(--accent); }

.btn-primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.btn-primary:hover { background: var(--accent-deep); color: var(--accent-text); }

.btn-ghost { min-height: 32px; padding: 0.22rem 0.6rem; font-size: 0.8rem; color: var(--text-dim); }

.stats { margin-inline-start: auto; font-size: 0.78rem; color: var(--text-dim); font-variant-numeric: tabular-nums; }
.acts { display: flex; gap: 0.35rem; }

.kv {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.45rem 1.2rem;
  margin: 0;
}

.kv dt { color: var(--text-dim); font-size: 0.86rem; }
.kv dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.kv dd.pos { color: var(--ok); }
.kv dd.neg { color: #c2554d; }

.big { font-size: 1.9rem; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.dim { color: var(--text-dim); font-size: 0.8rem; }
.dim2 { display: block; color: var(--text-dim); font-size: 0.72rem; font-weight: 400; }
.mono { font-variant-numeric: tabular-nums; }

.note { margin: 0.85rem 0 0; font-size: 0.78rem; color: var(--text-dim); line-height: 1.6; }

.out-inline { font-size: 1.05rem; min-width: 5ch; font-variant-numeric: tabular-nums; }
.out-inline.neg { color: #c2554d; }
.mid { color: var(--text-dim); }

.scroll-x { overflow-x: auto; margin-top: 0.8rem; }

.tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.tbl th, .tbl td { padding: 0.42rem 0.6rem; border-bottom: 1px solid var(--border); text-align: start; }
.tbl thead th { color: var(--text-dim); font-size: 0.76rem; font-weight: 600; }
.tbl tbody tr:last-child td { border-bottom: 0; }

.result-list { margin: 0; padding-inline-start: 0; list-style: none; font-size: 1rem; }
.result-list li { padding: 0.35rem 0; border-bottom: 1px dashed var(--border); }
.result-list li:last-child { border-bottom: 0; }

.bmi-top { display: flex; gap: 2rem; align-items: baseline; }
.tag {
  display: inline-block;
  padding: 0.15rem 0.7rem;
  border-radius: 99px;
  font-size: 0.9rem;
  font-weight: 700;
}
.tag.c-ok { color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); }
.tag.c-low { color: #2b6cb0; background: color-mix(in srgb, #2b6cb0 12%, transparent); }
.tag.c-warn { color: #a15c07; background: color-mix(in srgb, #a15c07 14%, transparent); }
.tag.c-bad { color: #c2554d; background: color-mix(in srgb, #c2554d 14%, transparent); }

.meter {
  position: relative;
  height: 8px;
  margin: 1rem 0 0.4rem;
  border-radius: 99px;
  background: linear-gradient(to right, #7db4e8 0%, #6cc79b 23%, #6cc79b 45%, #e8b45a 52%, #e07b72 72%, #c2554d 100%);
}

.meter i {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: var(--text);
  transform: translateX(-2px);
}

.drop {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 1.6rem 1rem;
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
}

.drop.over { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--surface)); }
.drop p { margin: 0; color: var(--text-dim); font-size: 0.88rem; }

.files { list-style: none; margin: 0; padding: 0; }
.files li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.86rem;
}
.files li:last-child { border-bottom: 0; }
.fname { font-weight: 600; overflow-wrap: anywhere; }
.files .btn { margin-inline-start: auto; }
.pos { color: var(--ok); }
.neg { color: #c2554d; }

audio { width: 100%; margin-bottom: 0.7rem; }

@media (max-width: 620px) {
  .kv { grid-template-columns: 1fr; gap: 0.1rem 0; }
  .kv dt { margin-top: 0.4rem; }
  .bmi-top { gap: 1.2rem; }
}
"""

TOOLKIT_JS = """/* 批量工具页共享小工具：选择器、格式化、复制、下载。无网络请求。 */
window.TK = (function () {
  'use strict';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(n, digits) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('zh-CN', { maximumFractionDigits: digits == null ? 2 : digits });
  }
  function copyBtn(btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.copyTarget ? document.querySelector(btn.dataset.copyTarget) : null;
      if (!target) return;
      var text = target.value != null ? target.value : target.textContent;
      navigator.clipboard.writeText(text || '').then(function () {
        var old = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = old; }, 1200);
      });
    });
  }
  function downloadBlob(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function download(name, text) {
    downloadBlob(name, new Blob(['\\ufeff' + text], { type: 'text/plain;charset=utf-8' }));
  }
  return { $: $, all: all, esc: esc, fmt: fmt, bindCopy: copyBtn, download: download, downloadBlob: downloadBlob };
})();
"""


def build():
    written = []
    for tool in TOOLS:
        slug = tool["slug"]
        directory = os.path.join(ROOT, slug)
        os.makedirs(directory, exist_ok=True)

        html = (SHELL
                .replace("@@NAME@@", tool["name"])
                .replace("@@SLUG@@", slug)
                .replace("@@CSP@@", CSP)
                .replace("@@LOGO@@", LOGO)
                .replace("@@SHORT@@", tool["desc"])
                .replace("@@LONG@@", tool["long"])
                .replace("@@BODY@@", tool["body"].strip()))
        with open(os.path.join(directory, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)

        icon = ICONS[tool["slug"]]
        card = (
            f'<li data-slug="{slug}" data-cat="{tool["cat"]}" data-key="{tool["name"]} {tool["desc"]} {tool["keys"]} {tool["cat"]} {slug}">'
            f'<a class="card" href="./{slug}/"><span class="ico">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{icon}</svg></span>'
            f'<span class="copy"><span class="name">{tool["name"]}</span><span class="desc">{tool["desc"]}</span></span></a>'
            f'<button class="star" type="button" data-star="{slug}" aria-pressed="false" aria-label="收藏：{tool["name"]}" title="收藏">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
            f'<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z"/></svg></button></li>'
        )
        with open(os.path.join(directory, "card.part"), "w", encoding="utf-8") as f:
            f.write(card)

        with open(os.path.join(directory, "app.js"), "w", encoding="utf-8") as f:
            f.write(tool["js"].strip() + "\n")
        written.append(slug)

    with open(os.path.join(ROOT, "toolkit.css"), "w", encoding="utf-8") as f:
        f.write(TOOLKIT_CSS)
    with open(os.path.join(ROOT, "toolkit.js"), "w", encoding="utf-8") as f:
        f.write(TOOLKIT_JS)

    print("生成 %d 个工具页:" % len(written))
    for slug in written:
        print("  -", slug)
    print("共享文件: toolkit.css toolkit.js")


if __name__ == "__main__":
    build()
