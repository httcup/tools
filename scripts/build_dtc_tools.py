#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 Shopify/DTC 电商工具页面（定义见 dtc_defs_calc_a/b 与 dtc_defs_custom）。

用法：python3 scripts/build_dtc_tools.py
产物：每个工具一个 <slug>/（index.html + card.part + app.js）与共享 dtc.css。
页面模板复用 build_batch_tools 的 SHELL，页面本身是最终交付物。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dtc_icons import ICONS  # noqa: E402
from dtc_defs_calc_a import TOOLS as CALC_A  # noqa: E402
from dtc_defs_calc_b import TOOLS as CALC_B  # noqa: E402
from dtc_defs_custom import TOOLS as CUSTOM  # noqa: E402
from build_batch_tools import SHELL, CSP, LOGO  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DTC_CSS = """/* DTC 电商工具页补充样式（配合 toolkit.css 使用）。 */
.res-h {
  margin: 0.9rem 0 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.02em;
}

#out dl.kv + dl.kv, #out dl.kv + .scroll-x, #out .scroll-x + dl.kv { margin-top: 0.6rem; }

#out table.tbl td, #out table.tbl th { font-variant-numeric: tabular-nums; }

textarea#ldOut, textarea#uOut { font-size: 0.82rem; }
"""

GENERIC_BODY = """<section class="tool-card">
  <h2>输入</h2>
  <div class="row">
@@FIELDS@@
  </div>
</section>
<section class="tool-card">
  <div class="card-head"><h2>结果</h2><span class="stats">输入即算，实时更新</span></div>
  <div id="out"></div>
@@NOTE@@</section>
"""

GENERIC_JS = """(function () {
  'use strict';
  var CALC = @@CALC@@;
  var ids = @@IDS@@;
  function val(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var s = String(el.value).replace(/[,\\s，]/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : s;
  }
  function kindOf(x, kind) {
    if (kind === 'money') return '¥' + TK.fmt(x, 2);
    if (kind === 'pct') return TK.fmt(x, 2) + '%';
    if (kind === 'int') return TK.fmt(x, 0);
    if (kind === 'num') return TK.fmt(x, 2);
    if (kind === 'num4') return TK.fmt(x, 4);
    return TK.esc(String(x == null ? '' : x));
  }
  function render() {
    var v = {};
    ids.forEach(function (id) { v[id] = val(id); });
    var out = document.getElementById('out');
    out.innerHTML = '';
    var dl = document.createElement('dl');
    dl.className = 'kv';
    out.appendChild(dl);
    CALC(v).forEach(function (r) {
      var kind = r[2];
      if (kind === 'head') {
        if (dl.childNodes.length) { dl = document.createElement('dl'); dl.className = 'kv'; out.appendChild(dl); }
        var h = document.createElement('h3');
        h.className = 'res-h';
        h.textContent = r[1];
        out.appendChild(h);
      } else if (kind === 'table') {
        if (dl.childNodes.length) { dl = document.createElement('dl'); dl.className = 'kv'; out.appendChild(dl); }
        var wrap = document.createElement('div');
        wrap.className = 'scroll-x';
        var table = document.createElement('table');
        table.className = 'tbl';
        var trh = document.createElement('tr');
        r[1].head.forEach(function (c) { var th = document.createElement('th'); th.textContent = c; trh.appendChild(th); });
        table.appendChild(trh);
        r[1].rows.forEach(function (row) {
          var tr = document.createElement('tr');
          row.forEach(function (c) { var td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
          table.appendChild(tr);
        });
        wrap.appendChild(table);
        out.appendChild(wrap);
      } else {
        var dt = document.createElement('dt');
        dt.textContent = r[0];
        var dd = document.createElement('dd');
        dd.innerHTML = kindOf(r[1], kind);
        if (typeof r[1] === 'number' && r[1] < 0 && (kind === 'money' || kind === 'num' || kind === 'int')) dd.className = 'neg';
        dl.appendChild(dt);
        dl.appendChild(dd);
      }
    });
  }
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', render);
  });
  render();
})();
"""


def field_html(f):
    fid, label = f[0], f[1]
    default = f[2] if len(f) > 2 else ""
    if len(f) > 3 and isinstance(f[3], dict) and "opts" in f[3]:
        opts = "".join(
            '<option value="%s"%s>%s</option>' % (k, ' selected' if str(default) == k else '', v)
            for k, v in f[3]["opts"].items())
        return ('    <label class="field"><span>%s</span><select id="%s">%s</select></label>'
                % (label, fid, opts))
    return ('    <label class="field"><span>%s</span>'
            '<input type="number" id="%s" value="%s" step="any" inputmode="decimal"></label>'
            % (label, fid, default))


def build_generic(tool):
    fields = "\n".join(field_html(f) for f in tool["fields"])
    ids = [f[0] for f in tool["fields"]]
    note = ('  <p class="note">%s</p>\n' % tool["note"]) if tool.get("note") else ""
    body = (GENERIC_BODY
            .replace("@@FIELDS@@", fields)
            .replace("@@NOTE@@", note))
    js = (GENERIC_JS
          .replace("@@CALC@@", tool["calc"].strip())
          .replace("@@IDS@@", repr(ids).replace("'", '"')))
    return body, js


def build():
    tools = list(CALC_A) + list(CALC_B) + list(CUSTOM)
    slugs = [t["slug"] for t in tools]
    assert len(slugs) == len(set(slugs)), "slug 重复"
    written = []
    for tool in tools:
        slug = tool["slug"]
        directory = os.path.join(ROOT, slug)
        os.makedirs(directory, exist_ok=True)

        if "body" in tool:
            body, js = tool["body"].strip(), tool["js"].strip()
        else:
            body, js = build_generic(tool)

        html = (SHELL
                .replace("@@NAME@@", tool["name"])
                .replace("@@SLUG@@", slug)
                .replace("@@CSP@@", CSP)
                .replace("@@LOGO@@", LOGO)
                .replace("@@SHORT@@", tool["desc"])
                .replace("@@LONG@@", tool["long"])
                .replace('<link rel="stylesheet" href="../toolkit.css">',
                         '<link rel="stylesheet" href="../toolkit.css">\n'
                         '<link rel="stylesheet" href="../dtc.css">')
                .replace("@@BODY@@", body))
        with open(os.path.join(directory, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        with open(os.path.join(directory, "app.js"), "w", encoding="utf-8") as f:
            f.write(js + "\n")

        icon = ICONS[tool["icon"]]
        card = (
            f'<li data-slug="{slug}" data-cat="dtc-ecommerce" data-key="{tool["name"]} {tool["desc"]} {tool["keys"]} Shopify DTC 电商 {slug}">'
            f'<a class="card" href="./{slug}/"><span class="ico">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{icon}</svg></span>'
            f'<span class="copy"><span class="name">{tool["name"]}</span><span class="desc">{tool["desc"]}</span></span></a>'
            f'<button class="star" type="button" data-star="{slug}" aria-pressed="false" aria-label="收藏：{tool["name"]}" title="收藏">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
            f'<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z"/></svg></button></li>'
        )
        with open(os.path.join(directory, "card.part"), "w", encoding="utf-8") as f:
            f.write(card)
        written.append(slug)

    with open(os.path.join(ROOT, "dtc.css"), "w", encoding="utf-8") as f:
        f.write(DTC_CSS)

    print("生成 %d 个 DTC 工具页:" % len(written))
    for slug in written:
        print("  -", slug)
    print("共享文件: dtc.css")


if __name__ == "__main__":
    build()
