#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 ToolKnit 批次（42 个工具）接入首页与站点元数据。

用法：python3 scripts/integrate_tk.py
- index.html：把卡片插入现有 4 个分类，新增「创作与设计 / 时间与专注 /
  测试与解压」3 个分类区块与 chip，全部计数 140 → 182
- sitemap.xml / llms.txt / feed.xml / README.md：登记新页面
每个 slug 只会插入一次，可重复执行。
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_toolknit import ROOT, NEW_CATS, tool_list  # noqa: E402

BASE = "https://139t.cn/"
TODAY = date.today().isoformat()
TOOLS = tool_list()

CAT_NOTES = {
    "creative-design": ("创作与设计", "取色、渐变、图表、签名与白板，即开即画的轻量创作工具。"),
    "time-focus": ("时间与专注", "番茄钟、秒表、倒计时、世界时钟与闪卡，帮你把注意力收回来。"),
    "test-fun": ("测试与解压", "反应、手速、打字与设备自检，累了就来点两下。"),
}

# 现有分类的计数变化（chip 与区块头两处）
COUNT_FIXES = {
    '图片 <b>19</b>': '图片 <b>27</b>',
    '>图片</h2><span class="num">19 个': '>图片</h2><span class="num">27 个',
    '文档与音频 <b>14</b>': '文档与音频 <b>20</b>',
    '>文档与音频</h2><span class="num">14 个': '>文档与音频</h2><span class="num">20 个',
    '文本、编码与密码 <b>13</b>': '文本、编码与密码 <b>20</b>',
    '>文本、编码与密码</h2><span class="num">13 个': '>文本、编码与密码</h2><span class="num">20 个',
    '计算与实用 <b>11</b>': '计算与实用 <b>13</b>',
    '>计算与实用</h2><span class="num">11 个': '>计算与实用</h2><span class="num">13 个',
    '全部 <b>140</b>': '全部 <b>182</b>',
    '本地工具箱 · 140 个在浏览器本地运行的工具': '本地工具箱 · 182 个在浏览器本地运行的工具',
    '140 个工具，': '182 个工具，',
    '等 140 个工具，全部在你的浏览器里完成': '等 182 个工具，全部在你的浏览器里完成',
    '搜索 140 个工具': '搜索 182 个工具',
    '<b id="count">140</b> / 140': '<b id="count">182</b> / 182',
}


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
    import re
    changed = False
    by_cat = {}
    for t in TOOLS:
        by_cat.setdefault(t["cat"], []).append(t)

    # 1) 现有分类追加卡片
    for cat in ("images", "documents-and-audio", "text-codes-and-passwords", "calc-utility"):
        m = re.search(r'<section class="cat" data-cat="%s".*?</section>' % cat, html, re.S)
        if not m:
            continue
        sec = m.group(0)
        existing = set(re.findall(r'data-slug="([^"]+)"', sec))
        new_cards = [card_li(t) for t in by_cat.get(cat, []) if t["slug"] not in existing]
        if new_cards:
            html = html[:m.start()] + sec.replace('</ul></section>', ''.join(new_cards) + '</ul></section>') + html[m.end():]
            changed = True

    # 2) 新分类区块
    new_sections = ""
    for cat in ("creative-design", "time-focus", "test-fun"):
        if 'data-cat="%s"' % cat in html:
            continue
        title, note = CAT_NOTES[cat]
        cards = "".join(card_li(t) for t in by_cat.get(cat, []))
        new_sections += (
            '<section class="cat" data-cat="%s" id="cat-%s">'
            '<div class="cat-head"><h2>%s</h2><span class="num">%d 个</span></div>'
            '<p class="cat-note">%s</p>'
            '<ul class="grid">%s</ul></section>' % (cat, cat, title, len(by_cat[cat]), note, cards)
        )
    if new_sections:
        html = html.replace('<section class="cat" data-cat="quick"', new_sections + '<section class="cat" data-cat="quick"')
        changed = True

    # 3) 新分类 chip
    chips = ""
    for cat in ("creative-design", "time-focus", "test-fun"):
        if 'data-cat="%s" aria-pressed="false"' % cat in html:
            continue
        title = CAT_NOTES[cat][0]
        chips += ('<button class="chip" type="button" data-cat="%s" aria-pressed="false">%s <b>%d</b></button>\n            '
                  % (cat, title, len(by_cat[cat])))
    if chips:
        html = html.replace('<button class="chip" type="button" data-cat="quick"', chips + '<button class="chip" type="button" data-cat="quick"')
        changed = True

    # 4) 计数
    for old, new in COUNT_FIXES.items():
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
    if "182 个单用途浏览器工具" not in txt:
        txt = txt.replace("140 个单用途浏览器工具", "182 个单用途浏览器工具")
    lines = []
    for t in TOOLS:
        line = "- [%s](%s%s/): %s" % (t["name"], BASE, t["slug"], t["desc"])
        if line not in txt:
            lines.append(line)
    header = "### 创作与设计"
    if lines and header not in txt:
        block = header + "\n" + "\n".join(lines) + "\n\n"
        if "## 本地快用" in txt:
            txt = txt.replace("## 本地快用", block + "## 本地快用")
        else:
            txt = txt.rstrip("\n") + "\n\n" + block
    write("llms.txt", txt)


def update_feed():
    xml = read("feed.xml")
    if "182 个工具" not in xml:
        xml = xml.replace("在浏览器本地运行的 140 个工具", "在浏览器本地运行的 182 个工具")
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
    if "共收录 **182 个工具**" not in md:
        md = md.replace("共收录 **140 个工具**", "共收录 **182 个工具**")
        changed = True
    rows = ("| 创作与设计 | 6 | 本仓库新增（`scripts/build_toolknit.py` 生成） |\n"
            "| 时间与专注 | 6 | 同上 |\n"
            "| 测试与解压 | 7 | 同上 |")
    if "| 创作与设计 | 6 |" not in md:
        md = md.replace(
            "| Shopify/DTC电商工具 | 53 | 本仓库新增（`scripts/build_dtc_tools.py` 生成） |",
            "| Shopify/DTC电商工具 | 53 | 本仓库新增（`scripts/build_dtc_tools.py` 生成） |\n" + rows,
        )
        changed = True
    extra = ("- **ToolKnit 批次**（42 个）：图片裁剪/圆形头像/轮播切图/九宫格/像素画/丝网印刷滤镜/"
             "AI 图片元数据、取色器/渐变/图表/收据/签名/白板、摩斯电码/花体字/占位文本/emoji 搜索/"
             "字幕修复/ASCII 横幅/Markdown 编辑器、MP3 转 WAV/白噪音/BPM 检测/节拍器/LRC 歌词/"
             "虚拟钢琴、番茄钟/秒表/倒计时/世界时钟/闪卡/时间戳、小费/会议成本、反应/打靶/手速/"
             "键盘/打字测试/呼吸放松/麦克风摄像头自检，参考 toolknit.com 清单去重后自研实现。\n")
    if "ToolKnit 批次**（42 个）" not in md:
        md = md.replace("- **Shopify/DTC电商工具**", extra + "- **Shopify/DTC电商工具**")
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
