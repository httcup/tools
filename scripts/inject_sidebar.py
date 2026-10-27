#!/usr/bin/env python3
"""向全站 index.html 注入左侧分类导航（sidebar.css/js/sidebar-data.js）。

- 根目录 index.html：data-home="1"（联动首页筛选），base=''
- */index.html：base='../'
- */*/index.html（guides/x、id-photo/x 等）：base='../../'
- 不注入 node_modules；可重复执行（幂等）。
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SNIPPET = (
    '<link rel="stylesheet" href="{base}sidebar.css">\n'
    '<div id="site-sidebar" data-base="{base}"{home}></div>\n'
    '<div id="sidebar-backdrop"></div>\n'
    '<button id="sidebar-toggle" type="button" aria-label="打开分类导航">'
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>'
    '分类</button>\n'
    '<script src="{base}js/sidebar-data.js"></script>\n'
    '<script src="{base}sidebar.js"></script>\n'
)


def normalize(path: Path) -> bool:
    """去掉旧注入里 hidden 属性（部分页面 [hidden]{display:none!important} 会压住它）。"""
    s = path.read_text(encoding='utf-8')
    s2 = re.sub(r'(id="site-sidebar"[^>]*?) hidden', r'\1', s)
    s2 = s2.replace('<div id="sidebar-backdrop" hidden></div>', '<div id="sidebar-backdrop"></div>')
    if s2 != s:
        path.write_text(s2, encoding='utf-8')
        return True
    return False


def inject(path: Path, base: str, home: bool) -> bool:
    if normalize(path):
        return False  # 已注入过，本轮只做修正
    s = path.read_text(encoding='utf-8')
    if 'site-sidebar' in s:
        return False
    snippet = SNIPPET.format(base=base, home=' data-home="1"' if home else '')
    idx = s.rfind('</body>')
    if idx == -1:
        print('  !! 无 </body>:', path)
        return False
    s = s[:idx] + snippet + s[idx:]
    path.write_text(s, encoding='utf-8')
    return True


def main():
    n = 0
    # 根目录首页
    if inject(ROOT / 'index.html', '', True):
        n += 1
    for p in ROOT.rglob('index.html'):
        rel = p.relative_to(ROOT)
        if len(rel.parts) < 2 or 'node_modules' in rel.parts:
            continue
        depth = len(rel.parts) - 1  # 相对站点根的目录层级
        base = '../' * depth
        if inject(p, base, False):
            n += 1
    print(f'已注入 {n} 个页面')


if __name__ == '__main__':
    main()
