#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从首页卡片区重新生成 js/sidebar-data.js（全站左侧分类导航数据）。

用法：python3 scripts/gen_sidebar_data.py
在首页 index.html 的分类区块或工具卡片变动后执行一次即可。
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    cats = []
    for m in re.finditer(r'<section class="cat" data-cat="([^"]+)"[^>]*>.*?</section>', s, re.S):
        cat, sec = m.group(1), m.group(0)
        if cat == "favs":
            continue
        h2 = re.search(r"<h2>([^<]*)</h2>", sec)
        tools = []
        seen = set()
        for lm in re.finditer(r'<li data-slug="([a-z0-9-]+)"[^>]*>\s*<a class="card" href="([^"]+)"', sec):
            slug, href = lm.group(1), lm.group(2)
            if slug in seen:
                continue
            seen.add(slug)
            nm = re.search(r'<span class="name">([^<]*)</span>', sec[lm.start():lm.start() + 2500])
            tools.append({"slug": slug, "name": nm.group(1) if nm else slug, "href": href})
        cats.append({"cat": cat, "name": h2.group(1) if h2 else cat, "tools": tools})

    total = sum(len(c["tools"]) for c in cats)
    print("分类数:", len(cats), "工具数:", total)
    for c in cats:
        print("  %s: %d" % (c["cat"], len(c["tools"])))

    data = "/* 自动生成：全站左侧分类导航数据。来源：index.html 卡片区。 */\n"
    data += "window.SIDEBAR_CATS = " + json.dumps(cats, ensure_ascii=False, indent=1) + ";\n"
    with open(os.path.join(ROOT, "js", "sidebar-data.js"), "w", encoding="utf-8") as f:
        f.write(data)
    print("已写入 js/sidebar-data.js")


if __name__ == "__main__":
    main()
