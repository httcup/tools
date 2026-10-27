#!/usr/bin/env python3
"""把 tools 站点（/tmp/tools-dist/site-root）移植进 tool 仓库。

- 只保留中文页面，丢弃 de/es/fr/ja/pt 语言副本
- /tools/ 绝对路径改写为 ../
- 移除多语言切换器与 hreflang 备选版本
"""
import os
import re
import shutil
import sys

SRC = "/tmp/tools-dist/site-root"
DST = sys.argv[1] if len(sys.argv) > 1 else "."

SKIP_DIRS = {
    "de", "es", "fr", "ja", "pt",  # 语言副本
    ".git",
}
SKIP_FILES = {
    "index.html", "index.md",           # 首页重写
    "feed.xml", "llms.txt", "llms-guides.txt",
    "sitemap.xml", "robots.txt", "404.html",
    "offline-generations.json", "_headers",
    "site.css", "sw.js", "hub-filter.js",  # 首页专用，替换为新首页
}

TEXT_EXT = {
    ".html", ".htm", ".js", ".mjs", ".css", ".json", ".md", ".markdown",
    ".xml", ".txt", ".svg", ".webmanifest",
}

# 指向已删除语言版本的链接
LOCALE = r"(?:de|es|fr|ja|pt)"

RE_HREFLANG_LOCALE = re.compile(
    r'<link[^>]+rel="alternate"[^>]+hreflang="' + LOCALE + r'(?:-[A-Za-z]{2,4})?"[^>]*>\s*',
    re.I)
RE_HREFLANG_LOCALE_ALT = re.compile(
    r'<link[^>]+hreflang="' + LOCALE + r'(?:-[A-Za-z]{2,4})?"[^>]+rel="alternate"[^>]*>\s*',
    re.I)
RE_LANG_PICK = re.compile(r'<details class="lang-pick">.*?</details>\s*', re.S)
RE_LOCALE_ANCHOR = re.compile(
    r'<li>\s*<a [^>]*href="[^"]*/(?:' + LOCALE + r')/[^"]*"[^>]*>[^<]*</a>\s*</li>\s*', re.I)
RE_LOCALE_HREF = re.compile(r'href="(?:\.\./)?/?(' + LOCALE + r')/', re.I)


def rewrite_text(text, path):
    text = text.replace("/tools/", "../")
    text = text.replace("https://httcup.github.io/toolss", "https://httcup.github.io/tools")
    if path.endswith((".html", ".htm")):
        text = RE_HREFLANG_LOCALE.sub("", text)
        text = RE_HREFLANG_LOCALE_ALT.sub("", text)
        text = RE_LANG_PICK.sub("", text)
        text = RE_LOCALE_ANCHOR.sub("", text)
        # 兜底：仍指向语言副本的链接改回首页
        text = RE_LOCALE_HREF.sub('href="../"', text)
    return text


def main():
    copied = 0
    for root, dirs, files in os.walk(SRC):
        rel_root = os.path.relpath(root, SRC)
        if rel_root == ".":
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and d != ".git"]
        for name in files:
            if rel_root == "." and name in SKIP_FILES:
                continue
            if name.startswith("."):
                continue
            src_path = os.path.join(root, name)
            rel = os.path.relpath(src_path, SRC)
            dst_path = os.path.join(DST, rel)
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
            ext = os.path.splitext(name)[1].lower()
            if ext in TEXT_EXT:
                with open(src_path, "r", encoding="utf-8", errors="surrogateescape") as fh:
                    raw = fh.read()
                new = rewrite_text(raw, name)
                with open(dst_path, "w", encoding="utf-8", errors="surrogateescape") as fh:
                    fh.write(new)
            else:
                shutil.copy2(src_path, dst_path)
            copied += 1
    print("copied files:", copied)


if __name__ == "__main__":
    main()
