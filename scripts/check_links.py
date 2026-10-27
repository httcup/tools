#!/usr/bin/env python3
"""检查移植后站点的本地引用是否都存在。"""
import os
import re
import sys
from urllib.parse import urlparse, unquote

ROOT = sys.argv[1] if len(sys.argv) > 1 else "tool"

ATTR = re.compile(r'(?:src|href)\s*=\s*"([^"]+)"', re.I)
CSS_URL = re.compile(r'url\(\s*["\']?([^)"\']+)', re.I)
JS_IMPORT = re.compile(r'(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+["\']([^"\']+)["\']', re.M)
JS_DYNAMIC = re.compile(r'import\(\s*["\']([^"\']+)["\']\s*\)')

missing = {}
checked = 0


def resolve(base_dir, ref):
    ref = ref.strip()
    if not ref or ref.startswith(("#", "data:", "mailto:", "javascript:", "tel:")):
        return None
    parsed = urlparse(ref)
    if parsed.scheme in ("http", "https"):
        if parsed.netloc == "httcup.github.io":
            path = parsed.path
        else:
            return None
    else:
        path = ref.split("#")[0].split("?")[0]
        if not path:
            return None
    path = unquote(path)
    if path.startswith("../"):
        target = os.path.join(ROOT, path[len("../"):])
    elif path.startswith("/"):
        target = os.path.join(ROOT, path.lstrip("/"))
    else:
        target = os.path.join(base_dir, path)
    return os.path.normpath(target)


def note(target, src):
    exists = os.path.exists(target) or os.path.exists(os.path.join(target, "index.html"))
    if not exists:
        missing.setdefault(target, set()).add(src)


for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d != ".git"]
    for name in filenames:
        path = os.path.join(dirpath, name)
        ext = os.path.splitext(name)[1].lower()
        if ext not in (".html", ".css", ".js", ".mjs", ".json", ".md", ".svg", ".webmanifest"):
            continue
        try:
            text = open(path, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        refs = []
        if ext in (".html", ".svg"):
            refs += ATTR.findall(text)
        if ext == ".css" or ext == ".html":
            refs += CSS_URL.findall(text)
        if ext in (".js", ".mjs", ".html"):
            refs += JS_IMPORT.findall(text)
            refs += JS_DYNAMIC.findall(text)
        for ref in refs:
            if ref.startswith("<"):
                continue
            target = resolve(dirpath, ref)
            if not target:
                continue
            checked += 1
            note(target, os.path.relpath(path, ROOT))

print("checked refs:", checked)
if not missing:
    print("没有缺失的本地资源")
else:
    print("缺失", len(missing), "个目标：")
    for target, srcs in sorted(missing.items()):
        print(" -", os.path.relpath(target, ROOT), "<-", ", ".join(sorted(srcs)[:3]))
