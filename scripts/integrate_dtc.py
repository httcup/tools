#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 Shopify/DTC 电商工具接入首页导航与站点元数据。

用法：python3 scripts/integrate_dtc.py
- index.html：新增「Shopify/DTC电商工具」分类区块与 chip，全部计数 87 → 140
- sitemap.xml / llms.txt / feed.xml / README.md：登记新页面
每个 slug 只会插入一次（按 data-slug / URL 判断），可重复执行。
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_dtc_tools import ROOT  # noqa: E402  （同时确保工具已生成）
import build_dtc_tools  # noqa: E402
from dtc_defs_calc_a import TOOLS as CALC_A  # noqa: E402
from dtc_defs_calc_b import TOOLS as CALC_B  # noqa: E402
from dtc_defs_custom import TOOLS as CUSTOM  # noqa: E402

BASE = "https://139t.cn/"
TODAY = date.today().isoformat()

CAT = "dtc-ecommerce"
TITLE = "Shopify/DTC电商工具"
NOTE = "利润、广告、库存、平台费与 SEO 的电商专用计算器，输入即算，数据不上传。"

TOOLS = list(CALC_A) + list(CALC_B) + list(CUSTOM)


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def write(name, text):
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(text)


def card_li(t):
    with open(os.path.join(ROOT, t["slug"], "card.part"), encoding="utf-8") as f:
        return f.read().strip()


def update_index():
    html = read("index.html")
    changed = False

    if 'data-cat="%s"' % CAT not in html:
        cards = "".join(card_li(t) for t in TOOLS)
        section = (
            '<section class="cat" data-cat="%s" id="cat-%s">'
            '<div class="cat-head"><h2>%s</h2><span class="num">%d 个</span></div>'
            '<p class="cat-note">%s</p>'
            '<ul class="grid">%s</ul></section>'
            % (CAT, CAT, TITLE, len(TOOLS), NOTE, cards)
        )
        html = html.replace('<section class="cat" data-cat="quick"', section + '<section class="cat" data-cat="quick"')
        changed = True

    if 'data-cat="%s" aria-pressed="false"' % CAT not in html:
        html = html.replace(
            '<button class="chip" type="button" data-cat="quick"',
            '<button class="chip" type="button" data-cat="%s" aria-pressed="false">%s <b>%d</b></button>\n            '
            '<button class="chip" type="button" data-cat="quick"' % (CAT, TITLE, len(TOOLS)),
        )
        changed = True

    n = len(TOOLS)
    counts = {
        '全部 <b>87</b>': '全部 <b>140</b>',
        '本地工具箱 · 87 个在浏览器本地运行的工具': '本地工具箱 · 140 个在浏览器本地运行的工具',
        '87 个工具，': '140 个工具，',
        '等 87 个工具，全部在你的浏览器里完成': '等 140 个工具，全部在你的浏览器里完成',
        '搜索 87 个工具': '搜索 140 个工具',
        '<b id="count">87</b> / 87': '<b id="count">140</b> / 140',
    }
    for old, new in counts.items():
        if old in html:
            html = html.replace(old, new)
            changed = True
    if changed:
        write("index.html", html)
    return changed


def update_sitemap():
    xml = read("sitemap.xml")
    block = []
    for t in TOOLS:
        if t["slug"] + '/' in xml:
            continue
        block.append('  <url><loc>%s%s/</loc><lastmod>%s</lastmod><priority>0.7</priority></url>'
                     % (BASE, t["slug"], TODAY))
    if block:
        xml = xml.replace('</urlset>', '\n'.join(block) + '\n</urlset>')
        write("sitemap.xml", xml)
    return len(block)


def update_llms():
    txt = read("llms.txt")
    if "140 个单用途浏览器工具" not in txt:
        txt = txt.replace("87 个单用途浏览器工具", "140 个单用途浏览器工具")
    lines = []
    for t in TOOLS:
        line = "- [%s](%s%s/): %s" % (t["name"], BASE, t["slug"], t["desc"])
        if line not in txt:
            lines.append(line)
    header = "### " + TITLE
    if lines and header not in txt:
        block = header + "\n" + "\n".join(lines) + "\n\n"
        if "## 本地快用" in txt:
            txt = txt.replace("## 本地快用", block + "## 本地快用")
        else:
            txt = txt.rstrip("\n") + "\n\n" + block
    write("llms.txt", txt)


def update_feed():
    xml = read("feed.xml")
    if "140 个工具" not in xml:
        xml = xml.replace("在浏览器本地运行的 87 个工具", "在浏览器本地运行的 140 个工具")
    entries = []
    for t in TOOLS:
        if "tools/%s/" % t["slug"] in xml:
            continue
        entries.append(
            '  <entry>\n    <title type="text">%s</title>\n    <link href="%s%s/"/>\n'
            '    <id>%s%s/</id>\n    <updated>%sT00:00:00Z</updated>\n'
            '    <summary type="text">%s</summary>\n  </entry>\n'
            % (t["name"], BASE, t["slug"], BASE, t["slug"], TODAY, t["desc"])
        )
    if entries:
        marker = xml.find('<entry>')
        end = xml.find('</entry>', marker) + len('</entry>')
        xml = xml[:end] + '\n' + '\n'.join(entries).rstrip('\n') + xml[end:]
        write("feed.xml", xml)


def update_readme():
    md = read("README.md")
    changed = False
    if "共收录 **140 个工具**" not in md:
        md = md.replace("共收录 **87 个工具**", "共收录 **140 个工具**")
        changed = True
    row = "| Shopify/DTC电商工具 | 53 | 本仓库新增（`scripts/build_dtc_tools.py` 生成） |"
    if row not in md:
        md = md.replace(
            "| 计算与实用 | 11 | 本仓库新增（`scripts/build_batch_tools.py` 生成） |",
            "| 计算与实用 | 11 | 本仓库新增（`scripts/build_batch_tools.py` 生成） |\n" + row,
        )
        changed = True
    extra = ("- **Shopify/DTC电商工具**（53 个）：订单利润率、盈亏平衡 ROAS、到岸成本、"
             "退货与退款损失、库存补货/EOQ/安全库存、LTV/CAC/MER、Etsy/TikTok/Amazon/"
             "WooCommerce 平台费对比、JSON-LD 生成器、商品 CSV 与 Google Feed 检查器等，"
             "参考 dtcstackhq 工具清单自研实现，未复制第三方代码。\n")
    if "Shopify/DTC电商工具**（53 个）" not in md:
        md = md.replace("- **Markdown 转 Word**", extra + "- **Markdown 转 Word**") if "- **Markdown 转 Word**" in md \
            else md.replace("- **本地快用**", extra + "- **本地快用**")
        changed = True
    if changed:
        write("README.md", md)


if __name__ == "__main__":
    print("index.html 更新:", update_index())
    print("sitemap 新增:", update_sitemap(), "条")
    update_llms()
    update_feed()
    update_readme()
    print("llms.txt / feed.xml / README.md 已更新")
