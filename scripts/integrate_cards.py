#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 md-to-word 与批量工具接入首页导航和站点元数据。

用法：python3 scripts/integrate_cards.py
- index.html：插入卡片、新增「计算与实用」分类、更新全部计数
- sitemap.xml / llms.txt / feed.xml / README.md：登记新页面
每个 slug 只会插入一次（按 data-slug 判断），可重复执行。
"""
import os
import re
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from batch_tools_defs import TOOLS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://139t.cn/"
TODAY = date.today().isoformat()

MD_TO_WORD = dict(
    slug="md-to-word", name="Markdown 转 Word",
    desc="把 AI 回答或 Markdown 下载成可编辑的 .docx，公式表格保留。",
    keys="markdown word docx ai回答 latex 公式 文档 转换",
    icon=('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/>'
          '<path d="M14 3v5h5"/><path d="m9 13 2 5 1-3 1 3 2-5"/>'),
    cat="documents-and-audio",
)

CALC_NOTE = "算钱、算日期、换算单位、朗读与录音，日常小算术都在本机完成。"
CALC_TITLE = "计算与实用"


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


def write(name, text):
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as f:
        f.write(text)


def card_li(t):
    return (
        f'<li data-slug="{t["slug"]}" data-cat="{t["cat"]}" data-key="{t["name"]} {t["desc"]} {t["keys"]} {t["cat"]} {t["slug"]}">'
        f'<a class="card" href="./{t["slug"]}/"><span class="ico">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{t["icon"]}</svg></span>'
        f'<span class="copy"><span class="name">{t["name"]}</span><span class="desc">{t["desc"]}</span></span></a>'
        f'<button class="star" type="button" data-star="{t["slug"]}" aria-pressed="false" '
        f'aria-label="收藏：{t["name"]}" title="收藏">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        f'<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z"/></svg></button></li>'
    )


def section_of(html, cat):
    m = re.search(r'<section class="cat" data-cat="%s".*?</section>' % cat, html, re.S)
    return m


def insert_into_section(html, cat, cards):
    """把卡片插进某个分类的 <ul class="grid"> 末尾；按 data-slug 去重。"""
    m = section_of(html, cat)
    if not m:
        raise SystemExit("找不到分类: " + cat)
    sec = m.group(0)
    existing = set(re.findall(r'data-slug="([^"]+)"', sec))
    new_cards = [card_li(t) for t in cards if t["slug"] not in existing]
    if not new_cards:
        return html, 0
    new_sec = sec.replace('</ul></section>', ''.join(new_cards) + '</ul></section>')
    return html[:m.start()] + new_sec + html[m.end():], len(new_cards)


def update_index():
    html = read("index.html")
    added = {}

    tools = list(TOOLS)
    by_cat = {}
    for t in tools:
        by_cat.setdefault(t["cat"], []).append(t)

    html, n = insert_into_section(html, "documents-and-audio", [MD_TO_WORD])
    added["md-to-word"] = n
    for cat in ("images", "text-codes-and-passwords"):
        html, n = insert_into_section(html, cat, by_cat.get(cat, []))
        added[cat] = n

    if 'data-cat="calc-utility"' not in html:
        calc_cards = ''.join(card_li(t) for t in by_cat.get("calc-utility", []))
        section = (
            '<section class="cat" data-cat="calc-utility" id="cat-calc-utility">'
            f'<div class="cat-head"><h2>{CALC_TITLE}</h2><span class="num">{len(by_cat["calc-utility"])} 个</span></div>'
            f'<p class="cat-note">{CALC_NOTE}</p>'
            f'<ul class="grid">{calc_cards}</ul></section>'
        )
        html = html.replace('<section class="cat" data-cat="quick"', section + '<section class="cat" data-cat="quick"')

    if 'data-cat="calc-utility" aria-pressed="false"' not in html:
        html = html.replace(
            '<button class="chip" type="button" data-cat="quick"',
            f'<button class="chip" type="button" data-cat="calc-utility" aria-pressed="false">{CALC_TITLE} <b>{len(by_cat["calc-utility"])}</b></button>'
            '<button class="chip" type="button" data-cat="quick"',
        )

    counts = {
        '全部 <b>70</b>': '全部 <b>87</b>',
        '图片 <b>18</b>': '图片 <b>19</b>',
        '文本、编码与密码 <b>9</b>': '文本、编码与密码 <b>13</b>',
        '文档与音频 <b>13</b>': '文档与音频 <b>14</b>',
        '>图片</h2><span class="num">18 个': '>图片</h2><span class="num">19 个',
        '>文本、编码与密码</h2><span class="num">9 个': '>文本、编码与密码</h2><span class="num">13 个',
        '>文档与音频</h2><span class="num">13 个': '>文档与音频</h2><span class="num">14 个',
        '本地工具箱 · 70 个在浏览器本地运行的工具': '本地工具箱 · 87 个在浏览器本地运行的工具',
        '70 个工具，': '87 个工具，',
        '等 70 个工具，全部在你的浏览器里完成': '等 87 个工具，全部在你的浏览器里完成',
        '搜索 70 个工具': '搜索 87 个工具',
        '<b id="count">70</b> / 70': '<b id="count">87</b> / 87',
    }
    for old, new in counts.items():
        if old in html:
            html = html.replace(old, new)
    write("index.html", html)
    return added


def slug_names():
    pairs = [(t["slug"], t["name"], t["desc"]) for t in TOOLS]
    pairs.insert(0, (MD_TO_WORD["slug"], MD_TO_WORD["name"], MD_TO_WORD["desc"]))
    return pairs


def update_sitemap():
    xml = read("sitemap.xml")
    block = []
    for slug, _, _ in slug_names():
        if slug + '/' in xml:
            continue
        block.append(f'  <url><loc>{BASE}{slug}/</loc><lastmod>{TODAY}</lastmod><priority>0.7</priority></url>')
    if block:
        xml = xml.replace('</urlset>', '\n'.join(block) + '\n</urlset>')
        write("sitemap.xml", xml)
    return len(block)


def update_llms():
    txt = read("llms.txt")
    txt = txt.replace("70 个单用途浏览器工具", "87 个单用途浏览器工具")
    lines = []
    for slug, name, desc in slug_names():
        line = f"- [{name}]({BASE}{slug}/): {desc}"
        if line in txt:
            continue
        lines.append((slug, line))

    def append_to_section(txt, header, lines):
        lines = [l for l in lines if l]
        if not lines:
            return txt
        idx = txt.find(header)
        if idx < 0:
            return txt
        end = txt.find("\n###", idx + 1)
        end = end if end >= 0 else len(txt)
        return txt[:end].rstrip("\n") + "\n" + "\n".join(lines) + "\n\n" + txt[end:]

    def line_of(slug):
        for s, l in lines:
            if s == slug:
                return l
        return None

    text_adds = [line_of(s) for s in ("dedupe-lines", "remove-line-breaks", "sort-lines", "random-picker")]
    txt = append_to_section(txt, "### 文本、编码与密码", [l for l in text_adds if l])
    txt = append_to_section(txt, "### 图片", [line_of("image-format-converter")])
    txt = append_to_section(txt, "### 文档与音频", [line_of("md-to-word")])

    calc_slugs = ["bmi", "loan", "percentage", "compound-interest", "date-diff", "age",
                  "discount", "unit-converter", "timezone-converter", "text-to-speech", "voice-recorder"]
    calc_lines = [line_of(s) for s in calc_slugs]
    if "### 计算与实用" not in txt:
        calc_lines = [l for l in calc_lines if l]
        block = "### 计算与实用\n" + "\n".join(calc_lines) + "\n\n"
        if "## 本地快用" in txt:
            txt = txt.replace("## 本地快用", block + "## 本地快用")
        else:
            txt = txt.rstrip("\n") + "\n\n" + block
    write("llms.txt", txt)


def update_feed():
    xml = read("feed.xml")
    xml = xml.replace("在浏览器本地运行的 70 个工具", "在浏览器本地运行的 87 个工具")
    entries = []
    for slug, name, desc in slug_names():
        if f"tools/{slug}/" in xml:
            continue
        entries.append(
            f'  <entry>\n    <title type="text">{name}</title>\n    <link href="{BASE}{slug}/"/>\n'
            f'    <id>{BASE}{slug}/</id>\n    <updated>{TODAY}T00:00:00Z</updated>\n'
            f'    <summary type="text">{desc}</summary>\n  </entry>\n'
        )
    if entries:
        marker = xml.find('<entry>')
        end = xml.find('</entry>', marker) + len('</entry>')
        xml = xml[:end] + '\n' + '\n'.join(entries).rstrip('\n') + xml[end:]
        write("feed.xml", xml)


def update_readme():
    md = read("README.md")
    md = md.replace("共收录 **70 个工具**", "共收录 **87 个工具**")
    md = md.replace("| 图片 | 18 |", "| 图片 | 19 |")
    md = md.replace("| 视频与动画 | 14 |", "| 视频与动画 | 14 |")
    md = md.replace("| 文档与音频 | 13 |", "| 文档与音频 | 14 |")
    md = md.replace("| 文本、编码与密码 | 9 |", "| 文本、编码与密码 | 13 |")
    md = md.replace(
        "| 连接设备 | 5 | 同上 |",
        "| 连接设备 | 5 | 同上 |\n| 计算与实用 | 11 | 本仓库新增（`scripts/build_batch_tools.py` 生成） |",
    )
    extra = (
        "- **Markdown 转 Word**（`md-to-word/`）：粘贴 AI 回答或 Markdown，本地生成可编辑 .docx，"
        "LaTeX 公式转 Word 公式对象，无需任何依赖。\n"
        "- **计算与实用**（11 个）：BMI、房贷、百分比、复利、日期天数、年龄、打折、单位换算、时区换算、"
        "文字转语音、在线录音；另有删除重复行、删除换行、文本排序、随机抽签（文本类）与图片格式转换（图片类）。\n"
    )
    if "Markdown 转 Word**（`md-to-word/`）" not in md:
        md = md.replace("- **本地快用**", extra + "- **本地快用**")
    md = md.replace("`<slug>/`           # 59 个移植工具", "`<slug>/`           # 移植工具与新增工具")
    write("README.md", md)


if __name__ == "__main__":
    added = update_index()
    print("index.html 插入:", added)
    print("sitemap 新增:", update_sitemap(), "条")
    update_llms()
    update_feed()
    update_readme()
    print("llms.txt / feed.xml / README.md 已更新")
