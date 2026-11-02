#!/usr/bin/env python3
"""检查站点的本地引用是否都存在。

用法：
  python3 scripts/check_links.py            # 默认检查本脚本所在的仓库根目录
  python3 scripts/check_links.py <目标目录>

退出码：0 全部存在 / 1 有缺失 / 2 参数或扫描范围有问题（不扫到任何文件）
"""
import os
import re
import sys
from urllib.parse import urlparse, unquote

# 不传参数时检查仓库根目录（scripts/ 的上一级），而不是写死的相对名字：
# 早先默认值是 "tool"，目录改名后 os.walk 扫到 0 个文件却照样打印「没有缺失」，
# 这个检查等于永远通过。现在扫不到东西会直接报错。
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 \
    else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCAN_EXT = {".html", ".htm", ".svg", ".css", ".js", ".mjs", ".json", ".md", ".webmanifest"}
# i18n 下的词典是纯数据（"原文": "译文"），不含 src=/href=，读它只是白扫；
# .git 与 node_modules 同理。
SKIP_DIRS = {".git", "node_modules", "i18n"}

# 视为「本站」的域名 -> 该域名下站点根对应的本地前缀。
# 这些页面里的 canonical / 互链是绝对地址，去掉域名和前缀后仍应落在本地文件上。
SELF_HOSTS = {
    "139t.cn": "",
    "xhtools.pages.dev": "",
    "httcup.github.io": "/tools",
}

ATTR = re.compile(r'''(?:src|href)\s*=\s*["']([^"']+)["']''', re.I)
CSS_URL = re.compile(r'''url\(\s*["']?([^)"']+)''', re.I)
JS_IMPORT = re.compile(r'''(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']''', re.M)
JS_DYNAMIC = re.compile(r'''import\(\s*["']([^"']+)["']\s*\)''')

# 这些开头的不是文件引用，直接放过
SKIP_PREFIX = ("#", "data:", "mailto:", "javascript:", "tel:", "blob:", "about:")

# 页面上给用户看的示例代码（<code>/<pre>/<textarea>）里的 src=、url() 不是真引用。
# 例如 image-to-data-uri 里演示 <img src="logo.png">，那不是站点资源。
# 注意别把 <script> 也算进来：内联脚本里的 import 是真实模块引用，必须查。
CODE_BLOCK = re.compile(r"<(code|pre|textarea)\b[^>]*>[\s\S]*?</\1\s*>", re.I)
# 非 JS 的 script 装的是数据（JSON-LD 结构化数据、页面模板），
# 里面的 "url(\"logo.png\")" 是 JSON 字符串内容，同样不是引用。
DATA_SCRIPT = re.compile(
    r"""<script\b[^>]*type\s*=\s*["'](?:application/(?:ld\+)?json|text/(?:template|plain))["'][^>]*>[\s\S]*?</script\s*>""",
    re.I)


def code_spans(text):
    """返回所有「不是真引用」的文本区间。"""
    spans = [(m.start(), m.end()) for m in CODE_BLOCK.finditer(text)]
    spans += [(m.start(), m.end()) for m in DATA_SCRIPT.finditer(text)]
    spans.sort()
    return spans


def in_spans(pos, spans):
    for start, end in spans:
        if start <= pos < end:
            return True
        if start > pos:
            break
    return False


missing = {}
checked = 0
skipped = 0
scanned = 0


def resolve(base_dir, ref):
    """把一条引用解析成本地绝对路径；不是本地引用时返回 None。"""
    ref = ref.strip()
    if not ref or ref.startswith(SKIP_PREFIX):
        return None

    parsed = urlparse(ref)
    if parsed.scheme in ("http", "https"):
        prefix = SELF_HOSTS.get(parsed.netloc)
        if prefix is None:
            return None                      # 真正的外链，不归这里管
        path = parsed.path
        if prefix and path.startswith(prefix):
            path = path[len(prefix):]
        elif prefix:
            return None
        return os.path.normpath(os.path.join(ROOT, path.lstrip("/")))

    if parsed.scheme:
        return None                          # ftp: 之类

    path = ref.split("#")[0].split("?")[0]
    if not path:
        return None
    path = unquote(path)
    if path.startswith("/"):
        return os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
    # 相对路径统一交给 normpath：这样 a/b/index.html 里的 ../x 会落到 a/x。
    # 早先的写法把 ../ 一律拼到 ROOT 下，只会在「恰好只退一级」时碰巧对。
    return os.path.normpath(os.path.join(base_dir, path))


def note(target, src):
    # 目录式链接（about/ 或 /about）对应 about/index.html
    if os.path.exists(target) or os.path.exists(os.path.join(target, "index.html")):
        return
    missing.setdefault(target, set()).add(src)


def main():
    global checked, skipped, scanned
    if not os.path.isdir(ROOT):
        print("目标目录不存在：%s" % ROOT, file=sys.stderr)
        return 2

    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in SCAN_EXT:
                continue
            path = os.path.join(dirpath, name)
            try:
                text = open(path, encoding="utf-8", errors="ignore").read()
            except OSError as error:
                print("读不了 %s：%s" % (path, error), file=sys.stderr)
                continue
            scanned += 1

            ext = os.path.splitext(name)[1].lower()
            found = []                       # (引用, 在文件中的位置)
            if ext in (".html", ".htm", ".svg"):
                found += [(m.group(1), m.start()) for m in ATTR.finditer(text)]
            if ext in (".css", ".html", ".htm"):
                found += [(m.group(1), m.start()) for m in CSS_URL.finditer(text)]
            if ext in (".js", ".mjs", ".html", ".htm"):
                found += [(m.group(1), m.start()) for m in JS_IMPORT.finditer(text)]
                found += [(m.group(1), m.start()) for m in JS_DYNAMIC.finditer(text)]

            spans = code_spans(text) if ext in (".html", ".htm", ".svg") else []
            for ref, pos in found:
                if ref.startswith("<"):      # 模板占位符
                    skipped += 1
                    continue
                if spans and in_spans(pos, spans):
                    skipped += 1             # 示例代码，不是真引用
                    continue
                target = resolve(dirpath, ref)
                if target is None:
                    skipped += 1
                    continue
                checked += 1
                note(target, os.path.relpath(path, ROOT))

    if scanned == 0:
        # 目录写错、或 SCAN_EXT 与站点结构对不上时，绝不能报「没有缺失」。
        print("在 %s 下没有扫到任何可检查的文件，检查没有真正执行" % ROOT, file=sys.stderr)
        return 2

    print("扫描 %d 个文件，检查 %d 条本地引用（跳过外链/锚点 %d 条）"
          % (scanned, checked, skipped))
    if not missing:
        print("没有缺失的本地资源")
        return 0

    print("缺失 %d 个目标：" % len(missing))
    for target, srcs in sorted(missing.items()):
        where = ", ".join(sorted(srcs)[:3])
        more = "" if len(srcs) <= 3 else " 等 %d 处" % len(srcs)
        print(" - %s <- %s%s" % (os.path.relpath(target, ROOT), where, more))
    return 1


if __name__ == "__main__":
    sys.exit(main())
