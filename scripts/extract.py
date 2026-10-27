#!/usr/bin/env python3
"""从 tools 站点首页提取工具清单（名称、描述、搜索词、图标）。"""
import html
import json
import re

SRC = "/tmp/tools-dist/site-root/index.html"
OUT = "/Users/mlx/Desktop/workbuddy/2026-10-27-10-45-12/port/tools.json"

CATS = [
    ("images", "图片", "压缩、改尺寸、抹掉照片里悄悄记下的信息，全都不出这台机器。"),
    ("video-and-animation", "视频与动画", "剪辑、转码、拆帧、拼 GIF，画面一帧都不上传。"),
    ("documents-and-audio", "文档与音频", "PDF 合并压缩、涂黑水印、音频剪辑，文档留在本机。"),
    ("text-codes-and-passwords", "文本、编码与密码", "格式化、比对、编解码、生成密码，纯本地计算。"),
    ("connect-devices", "连接设备", "两台设备之间直连，可加密、可逐一批准，不经过服务器。"),
]

text = open(SRC, encoding="utf-8").read()

tools = []
for cat_id, cat_name, cat_desc in CATS:
    start = text.find('id="%s"' % cat_id)
    if start < 0:
        raise SystemExit("缺少分类 " + cat_id)
    nxt = [text.find('id="%s"' % c[0], start + 5) for c in CATS]
    nxt = [n for n in nxt if n > 0]
    end = min(nxt) if nxt else len(text)
    chunk = text[start:end]

    for m in re.finditer(r'<a class="tool-card"[^>]*?href="([a-z0-9-]+)/"[^>]*?>', chunk):
        slug = m.group(1)
        tag = m.group(0)
        search_attr = re.search(r'data-search="([^"]*)"', tag)
        svg = re.search(r"(<svg class=\"tool-icon\".*?</svg>)", chunk[m.end():], re.S)
        name = re.search(r'<span class="tool-name">(.*?)</span>', chunk[m.end():], re.S)
        desc = re.search(r'<span class="tool-desc">(.*?)</span>', chunk[m.end():], re.S)
        if not (svg and name and desc):
            raise SystemExit("解析失败: " + slug)
        tools.append({
            "slug": slug,
            "name": html.unescape(re.sub(r"<[^>]+>", "", name.group(1))).strip(),
            "desc": html.unescape(re.sub(r"<[^>]+>", "", desc.group(1))).strip(),
            "search": html.unescape(search_attr.group(1)).strip() if search_attr else "",
            "icon": re.sub(r"\s+", " ", svg.group(1)).strip(),
            "cat": cat_id,
            "catName": cat_name,
            "catDesc": cat_desc,
        })

seen = set()
uniq = []
for t in tools:
    if t["slug"] in seen:
        continue
    seen.add(t["slug"])
    uniq.append(t)

json.dump(uniq, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("tools:", len(uniq))
for c in CATS:
    print(" -", c[1], sum(1 for t in uniq if t["cat"] == c[0]))
