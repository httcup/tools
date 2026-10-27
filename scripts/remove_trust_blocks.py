#!/usr/bin/env python3
"""Remove/hide trust & licence blocks site-wide:

1. <section class="pledge">…</section>            隐私承诺大框（含实时检查/离线行）
2. <section id="privacy-panel" …>…</section>      隐藏的“如何核实”面板
3. <a class="source-link">查看源码</a>             header 里的查看源码按钮
4. <button id="privacy-toggle">如何核实这些说法</button>
5. <p class="footer-base"> / <p class="footer-licence">  footer 两句版权说明
6. index.html 的 <section class="about"> 三栏说明

同时给 main.js 里的 privacyToggle 事件绑定加判空保护，避免删掉按钮后 JS 报错。
trust.js / Service Worker 等功能性脚本全部保留。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SEC_OPEN = re.compile(r'<section\b[^>]*>')
SEC_CLOSE = '</section>'


def remove_block(s, start_pat, label, expect_min=0):
    """Remove <start ...> ... </matching-close>, respecting nested same-name opens."""
    rx = re.compile(start_pat)
    out = []
    pos = 0
    n = 0
    while True:
        m = rx.search(s, pos)
        if not m:
            out.append(s[pos:])
            break
        # find matching close accounting for nested <section> opens
        if '<section' in m.group(0):
            depth = 1
            scan = m.end()
            close_idx = -1
            while depth > 0:
                mo = SEC_OPEN.search(s, scan)
                mc = s.find(SEC_CLOSE, scan)
                if mc == -1:
                    break
                if mo and mo.start() < mc:
                    depth += 1
                    scan = mo.end()
                else:
                    depth -= 1
                    scan = mc + len(SEC_CLOSE)
            close_idx = scan if depth == 0 else -1
        else:
            tag = m.group(0)
            if tag.startswith('<a'):
                close_tag = '</a>'
            elif tag.startswith('<button'):
                close_tag = '</button>'
            else:
                close_tag = '</p>'
            mc = s.find(close_tag, m.end())
            close_idx = mc + len(close_tag) if mc != -1 else -1
        if close_idx == -1:
            print(f'  !! {label}: 未找到闭合标签，跳过 @ {m.start()}')
            out.append(s[pos:m.end()])
            pos = m.end()
            continue
        out.append(s[pos:m.start()])
        pos = close_idx
        n += 1
    if n or expect_min:
        pass
    return ''.join(out), n


def clean_html(path):
    s = path.read_text(encoding='utf-8')
    orig = s
    total = 0
    for pat, label in [
        (r'<section class="pledge"[^>]*>', 'pledge'),
        (r'<section id="privacy-panel"[^>]*>', 'privacy-panel'),
        (r'<section class="about"[^>]*>', 'about'),
        (r'<a class="source-link"[^>]*>', 'source-link'),
        (r'<button[^>]*id="privacy-toggle"[^>]*>', 'privacy-toggle'),
        (r'<p class="footer-base"[^>]*>', 'footer-base'),
        (r'<p class="footer-licence"[^>]*>', 'footer-licence'),
    ]:
        s, n = remove_block(s, pat, label)
        total += n
    if s != orig:
        path.write_text(s, encoding='utf-8')
    return total


def patch_js(path):
    s = path.read_text(encoding='utf-8')
    orig = s
    # guard event binding on removed button (covers both el.privacyToggle and bare privacyToggle)
    s2 = re.sub(
        r'\b((?:el\.)?privacyToggle)\.addEventListener',
        r'\1&&\1.addEventListener',
        s,
    )
    if s2 != orig:
        path.write_text(s2, encoding='utf-8')
        return True
    return False


def main():
    n_html = 0
    n_js = 0
    for p in ROOT.rglob('index.html'):
        if 'node_modules' in p.parts:
            continue
        if clean_html(p):
            n_html += 1
    for p in ROOT.rglob('*.js'):
        if 'node_modules' in p.parts:
            continue
        if patch_js(p):
            n_js += 1
    print(f'已修改 HTML: {n_html} 个, JS: {n_js} 个')

    # 残留检查
    leftover = 0
    for pat in ['class="pledge"', 'privacy-panel"', 'footer-base', 'footer-licence',
                'class="source-link"', 'class="about"']:
        for p in ROOT.rglob('index.html'):
            if 'node_modules' in p.parts:
                continue
            if pat in p.read_text(encoding='utf-8'):
                print(f'残留 {pat} @ {p}')
                leftover += 1
    print('残留检查:', '通过' if leftover == 0 else f'{leftover} 处残留')


if __name__ == '__main__':
    main()
