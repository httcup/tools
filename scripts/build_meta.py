#!/usr/bin/env python3
"""生成 sitemap / robots / llms.txt / feed.xml / manifest.json / 404.html。"""
import json
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOL = os.path.join(ROOT, "tool")
BASE = "https://httcup.github.io/tools/"
DATA = json.load(open(os.path.join(ROOT, "port", "tools.json"), encoding="utf-8"))

FIX = {
    "image-layout": ("图片拼版", "把图片拼成拼贴、联系表或长条，留在本机。"),
    "walkie-talkie": ("本地对讲机", "建个频道，按住说话或免提；局域网直连或走云中转。"),
    "voice-oncall": ("语音寻呼台", "打开寻呼机就听到实时语音，可设密码、单独静音或移除。"),
    "remote-camera": ("远程摄像头", "一台设备开摄像头，另一台浏览器观看，可要求批准。"),
    "share-tab": ("分享浏览器标签页", "把一个标签页分享给一位批准者，无需扩展、不传声音。"),
}
for t in DATA:
    if t["slug"] in FIX:
        t["name"], t["desc"] = FIX[t["slug"]]

NATIVE = [
    ("base64", "Base64 编解码", "文本与 Base64 互转，UTF-8 安全。"),
    ("url", "URL 编解码", "百分号编码与解码，可选组件或整条 URI 模式。"),
    ("html", "HTML 实体编解码", "把 &lt; &amp; 之类转义，或还原回来。"),
    ("hex", "Hex 编解码", "文本与十六进制互转，逐字节可核对。"),
    ("hash", "哈希计算器", "MD5、SHA-1、SHA-256、SHA-512 一次算完。"),
    ("uuid", "UUID 生成器", "UUID v4 批量生成，随机数来自加密源。"),
    ("password", "随机密码生成", "长度、字符集自选，可排除易混淆字符。"),
    ("timestamp", "时间戳转换", "Unix 秒、毫秒与标准时间互转。"),
    ("json", "JSON 格式化", "格式化、压缩、校验，错误定位到位置。"),
    ("textstats", "文本统计", "字符、单词、行、段落，一眼看清。"),
    ("case", "大小写转换", "大写、小写、标题、驼峰、kebab、snake。"),
]

NOW = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

pages = [("", "本地工具箱", "在浏览器本地运行的 %d 个工具，文件不上传。" % (len(DATA) + len(NATIVE)))]
pages += [(t["slug"] + "/", t["name"], t["desc"]) for t in DATA]
pages += [("quick/", "本地快用", "编解码、哈希、时间戳等常用小工具。")]
pages += [(g + "/", "", "") for g in ("about", "privacy", "terms", "contact", "roadmap", "guides")]

# ---------- sitemap ----------
lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for path, _, _ in pages:
    loc = BASE + path
    pri = "1.0" if path == "" else ("0.7" if path.endswith("/") and path.count("/") == 1 else "0.8")
    lines.append("  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>"
                 % (escape(loc), NOW[:10], pri))
lines.append("</urlset>\n")
open(os.path.join(TOOL, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(lines))

# ---------- robots.txt ----------
open(os.path.join(TOOL, "robots.txt"), "w", encoding="utf-8").write(
    "User-agent: *\nAllow: /\n\nSitemap: %ssitemap.xml\n" % BASE)

# ---------- llms.txt ----------
llms = ["# 本地工具箱 Local Web Tools",
        "",
        "> %d 个单用途浏览器工具：图片压缩与转换、PDF 处理、视频音频编辑、文本编码、密码生成、"
        "双设备直连。所有处理在浏览器本地完成，文件不上传、无需注册。" % (len(DATA) + len(NATIVE)),
        "",
        "页面地址以 %s 为前缀。" % BASE,
        "",
        "## 工具"]
cat_titles = {"images": "### 图片", "video-and-animation": "### 视频与动画",
              "documents-and-audio": "### 文档与音频",
              "text-codes-and-passwords": "### 文本、编码与密码",
              "connect-devices": "### 连接设备"}
current = None
for t in DATA:
    if t["cat"] != current:
        current = t["cat"]
        llms += ["", cat_titles[current]]
    llms.append("- [%s](%s%s/): %s" % (t["name"], BASE, t["slug"], t["desc"]))
llms += ["", "## 本地快用", "- [本地快用](%squick/): 编解码、哈希、时间戳等小工具合集。" % BASE]
open(os.path.join(TOOL, "llms.txt"), "w", encoding="utf-8").write("\n".join(llms) + "\n")

# ---------- feed.xml ----------
feed = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<feed xmlns="http://www.w3.org/2005/Atom">',
        '  <title>本地工具箱</title>',
        '  <subtitle>在浏览器本地运行的工具集</subtitle>',
        '  <link href="%sfeed.xml" rel="self"/>' % BASE,
        '  <link href="%s"/>' % BASE,
        '  <id>%s</id>' % BASE,
        '  <updated>%s</updated>' % NOW,
        '  <author><name>httcup</name></author>']
for path, title, desc in pages:
    if not path or path.endswith("/") and path.count("/") == 1:
        feed += ['  <entry>',
                 '    <title type="text">%s</title>' % escape(title),
                 '    <link href="%s%s"/>' % (BASE, path),
                 '    <id>%s%s</id>' % (BASE, path),
                 '    <updated>%s</updated>' % NOW,
                 '    <summary type="text">%s</summary>' % escape(desc),
                 '  </entry>']
feed.append('</feed>\n')
open(os.path.join(TOOL, "feed.xml"), "w", encoding="utf-8").write("\n".join(feed))

# ---------- manifest.json ----------
manifest = {
    "id": "../",
    "name": "本地工具箱",
    "short_name": "本地工具箱",
    "description": "在浏览器本地运行的工具集：图片、PDF、视频音频、文本编码与设备直连。文件不上传。",
    "lang": "zh-CN",
    "dir": "ltr",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "background_color": "#f6f7f9",
    "theme_color": "#f6f7f9",
    "icons": [
        {"src": "../icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "../icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "../icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
json.dump(manifest, open(os.path.join(TOOL, "manifest.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)

print("meta files written")
