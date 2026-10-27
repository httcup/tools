#!/usr/bin/env python3
"""生成 tool/index.html —— 全中文工具箱导航首页。"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOL = os.path.join(ROOT, "tool")
DATA = json.load(open(os.path.join(ROOT, "port", "tools.json"), encoding="utf-8"))

# 原站未翻译的条目，这里给出中文名与描述
FIX = {
    "image-layout": ("图片拼版", "把图片拼成拼贴、联系表或长条，留在本机。"),
    "walkie-talkie": ("本地对讲机", "建个频道，按住说话或免提；局域网直连或走云中转。"),
    "voice-oncall": ("语音寻呼台", "打开寻呼机就听到实时语音，可设密码、单独静音或移除。"),
    "remote-camera": ("远程摄像头", "一台设备开摄像头，另一台浏览器观看，可要求批准。"),
    "share-tab": ("分享浏览器标签页", "把一个标签页分享给一位批准者，无需扩展、不传声音。"),
}
EXTRA_KEY = {
    "image-layout": "拼图 拼贴 联系表 长图 collage contact sheet strip",
    "walkie-talkie": "对讲机 语音 频道 局域网 walkie talkie ptt",
    "voice-oncall": "寻呼 语音 广播 直播 oncall pager",
    "remote-camera": "摄像头 监控 远程相机 camera ip cam",
    "share-tab": "标签页 分享 屏幕 share tab screen",
}

for t in DATA:
    if t["slug"] in FIX:
        t["name"], t["desc"] = FIX[t["slug"]]
    if t["slug"] in EXTRA_KEY:
        t["search"] = (t["search"] + " " + EXTRA_KEY[t["slug"]]).strip()

CATS = [
    ("images", "图片", "压缩、改尺寸、抹掉照片里悄悄记下的信息，全都不出这台机器。"),
    ("video-and-animation", "视频与动画", "剪辑、转码、拆帧、拼 GIF，画面一帧都不上传。"),
    ("documents-and-audio", "文档与音频", "PDF 合并压缩、涂黑水印、音频剪辑，文档留在本机。"),
    ("text-codes-and-passwords", "文本、编码与密码", "格式化、比对、编解码、生成密码，纯本地计算。"),
    ("connect-devices", "连接设备", "两台设备之间直连，可加密、可逐一批准，文件不经服务器。"),
]

NATIVE = [
    ("base64", "Base64 编解码", "文本与 Base64 互转，UTF-8 安全。",
     "base64 编码 解码 encode decode",
     '<path d="M9 8 5 12l4 4"/><path d="m15 8 4 4-4 4"/>'),
    ("url", "URL 编解码", "百分号编码与解码，可选组件或整条 URI 模式。",
     "url encode decode 百分号 网址 链接",
     '<path d="M10.6 13.4a4.5 4.5 0 0 0 6.4 0l2.1-2.1a4.5 4.5 0 0 0-6.4-6.4L11.3 6.3"/>'
     '<path d="M13.4 10.6a4.5 4.5 0 0 0-6.4 0l-2.1 2.1a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3"/>'),
    ("html", "HTML 实体编解码", "把 &lt; &amp; 之类转义，或还原回来。",
     "html entity 实体 转义 escape",
     '<path d="M8 6 3 12l5 6"/><path d="m16 6 5 6-5 6"/>'),
    ("hex", "Hex 编解码", "文本与十六进制互转，逐字节可核对。",
     "hex 十六进制 进制 编码",
     '<path d="M9 4 7 20"/><path d="M17 4l-2 16"/><path d="M4 9h16"/><path d="M3 15h16"/>'),
    ("hash", "哈希计算器", "MD5、SHA-1、SHA-256、SHA-512 一次算完。",
     "hash md5 sha1 sha256 sha512 校验 摘要 指纹",
     '<path d="M12 3a4 4 0 0 0-4 4v2a3 3 0 0 0 0 6v2a4 4 0 0 0 8 0v-2a3 3 0 0 0 0-6V7a4 4 0 0 0-4-4Z"/>'
     '<path d="M12 8v8"/>'),
    ("uuid", "UUID 生成器", "UUID v4 批量生成，随机数来自加密源。",
     "uuid guid 唯一 随机 id",
     '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4"/><path d="M7 13h2"/>'
     '<circle cx="16" cy="12" r="2.2"/>'),
    ("password", "随机密码生成", "长度、字符集自选，可排除易混淆字符。",
     "密码 password 随机 强密码 生成",
     '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m17 4 3 3"/><path d="m14 7 3 3"/>'),
    ("timestamp", "时间戳转换", "Unix 秒、毫秒与标准时间互转。",
     "时间戳 timestamp unix 时间 日期 转换",
     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    ("json", "JSON 格式化", "格式化、压缩、校验，错误定位到位置。",
     "json 格式化 美化 压缩 校验 format",
     '<path d="M10 4H8a2 2 0 0 0-2 2v3a3 3 0 0 1-3 3 3 3 0 0 1 3 3v3a2 2 0 0 0 2 2h2"/>'
     '<path d="M14 4h2a2 2 0 0 1 2 2v3a3 3 0 0 0 3 3 3 3 0 0 0-3 3v3a2 2 0 0 1-2 2h-2"/>'),
    ("textstats", "文本统计", "字符、单词、行、段落，一眼看清。",
     "文本 统计 字数 字符 行数 单词 count",
     '<path d="M4 20V9"/><path d="M10 20V4"/><path d="M16 20v-6"/><path d="M22 20h-2"/>'),
    ("case", "大小写转换", "大写、小写、标题、驼峰、kebab、snake。",
     "大小写 转换 case upper lower camel kebab snake",
     '<path d="M4 18 8.5 7l4.5 11"/><path d="M5.8 14.5h5.4"/><path d="M16 18V9"/>'
     '<path d="M16 13a2.5 2.5 0 1 1 3.5 2.3c-2 .9-3.5 1.4-3.5 2.7h4"/>'),
]

ICON_STAR = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
             '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z"/>'
             '</svg>')

TOTAL = len(DATA) + len(NATIVE)


def esc(s):
    return html.escape(s, quote=True)


def card(slug, name, desc, href, icon_svg, cat, key):
    return (
        '<li data-slug="{slug}" data-cat="{cat}" data-key="{key}">'
        '<a class="card" href="{href}">'
        '<span class="ico">{icon}</span>'
        '<span class="copy"><span class="name">{name}</span><span class="desc">{desc}</span></span>'
        '</a>'
        '<button class="star" type="button" data-star="{slug}" aria-pressed="false" aria-label="收藏：{name}" title="收藏">{star}</button>'
        '</li>'
    ).format(
        slug=esc(slug), cat=cat, key=esc(key).lower(), href=href,
        icon=icon_svg, name=esc(name), desc=esc(desc), star=ICON_STAR,
    )


def build():
    by_cat = {}
    for t in DATA:
        by_cat.setdefault(t["cat"], []).append(t)

    chips = [
        '<button class="chip" type="button" data-cat="all" aria-pressed="true">全部 <b>%d</b></button>' % TOTAL
    ]
    for cid, cname, _ in CATS:
        chips.append('<button class="chip" type="button" data-cat="%s" aria-pressed="false">%s <b>%d</b></button>'
                     % (cid, cname, len(by_cat.get(cid, []))))
    chips.append('<button class="chip" type="button" data-cat="quick" aria-pressed="false">本地快用 <b>%d</b></button>'
                 % len(NATIVE))

    sections = []
    for cid, cname, cdesc in CATS:
        cards = []
        for t in by_cat.get(cid, []):
            key = " ".join([t["name"], t["desc"], t["search"], cname, t["slug"]])
            cards.append(card(t["slug"], t["name"], t["desc"], "./%s/" % t["slug"],
                              t["icon"].replace(' class="tool-icon"', ""), cid, key))
        sections.append(
            '<section class="cat" data-cat="{cid}" id="cat-{cid}">'
            '<div class="cat-head"><h2>{name}</h2><span class="num">{n} 个</span></div>'
            '<p class="cat-note">{desc}</p>'
            '<ul class="grid">{cards}</ul>'
            '</section>'.format(cid=cid, name=cname, n=len(cards), desc=cdesc,
                                cards="".join(cards))
        )

    quick_cards = []
    for slug, name, desc, keys, paths in NATIVE:
        icon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">%s</svg>' % paths
        key = " ".join([name, desc, keys, "本地快用 quick"])
        quick_cards.append(card(slug, name, desc, "./quick/#%s" % slug, icon, "quick", key))
    sections.append(
        '<section class="cat" data-cat="quick" id="cat-quick">'
        '<div class="cat-head"><h2>本地快用</h2><span class="num">%d 个</span></div>'
        '<p class="cat-note">编解码、哈希、时间戳这类小计算，在同一个页面直接算完，不必跳转。</p>'
        '<ul class="grid">%s</ul>'
        '</section>' % (len(NATIVE), "".join(quick_cards))
    )

    head_nav = ('<nav class="head-nav" aria-label="主导航">'
                '<a href="./" aria-current="page">全部工具</a>'
                '<a href="./quick/">本地快用</a>'
                '<a href="./guides/">使用指南</a>'
                '</nav>')

    doc = """<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>本地工具箱 · {total} 个在浏览器本地运行的工具</title>
<meta name="description" content="图片压缩、PDF 编辑、视频转码、文本编码、双设备直连等 {total} 个工具，全部在你的浏览器里完成，文件不上传、无需注册、断网可用。">
<meta name="theme-color" content="#f6f7f9">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧰</text></svg>">
<link rel="stylesheet" href="css/style.css">
<script>try{{document.documentElement.dataset.theme=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}}catch(e){{}}</script>
</head>
<body>
<a class="skip" href="#main">跳到主要内容</a>

<header class="head">
  <div class="wrap head-inner">
    <a class="brand" href="./">
      <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg></span>
      本地工具箱 <small>Local Web Tools</small>
    </a>
    {nav}
    <div class="head-tools">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" placeholder="搜索 {total} 个工具" autocomplete="off" aria-label="搜索工具">
        <span class="kbd">/</span>
      </div>
      <button class="icon-btn" id="theme" type="button" aria-label="切换深浅色" title="切换深浅色">
        <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>
        <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>
      </button>
    </div>
  </div>
</header>

<div class="wrap">
  <section class="hero">
    <h1>{total} 个工具，<em>全在你自己机器上跑</em></h1>
    <p>图片压缩、PDF 编辑、视频转码、文本编码、两台设备直连——日常要用的那点小事，打开就能办。文件不离开浏览器，不注册、不限次、不加水印。</p>
    <div class="hero-points">
      <span class="point"><i>✓</i> 本地处理，不上传</span>
      <span class="point"><i>✓</i> 无需注册登录</span>
      <span class="point"><i>✓</i> 断网也能用</span>
      <span class="point"><i>✓</i> 开源可核对</span>
    </div>
  </section>
</div>

<div class="filters">
  <div class="wrap">
    <div class="chips" role="group" aria-label="按分类筛选">
      {chips}
    </div>
  </div>
</div>

<main id="main">
  <div class="wrap">
    <section class="cat" id="favs" hidden>
      <div class="cat-head"><h2>我的收藏</h2><span class="num" id="fav-count"></span></div>
      <p class="cat-note">收藏只保存在这台设备的浏览器里。</p>
      <ul class="grid" id="fav-grid"></ul>
    </section>

    {sections}

    <div class="empty" id="empty">
      <strong>没有匹配的工具</strong>
      <span>换个关键词试试，或者看看全部分类。</span>
      <br><button type="button" id="reset">清除筛选</button>
    </div>

    <section class="about">
      <div>
        <h3>文件不出这台机器</h3>
        <p>压缩、转码、识别都在浏览器的本地能力上完成，没有服务器可收你的文件。打开开发者工具的「网络」面板就能自己核对。</p>
      </div>
      <div>
        <h3>断网也照用</h3>
        <p>页面加载后即可离线使用；少数需要联网的功能（例如双设备云中转）会在使用时明确说明。</p>
      </div>
      <div>
        <h3>来源与许可</h3>
        <p>工具页面移植自 <a href="https://github.com/httcup/tools" target="_blank" rel="noopener">httcup/tools</a>（代码 MIT、文字 CC BY 4.0），本仓库保留原许可。</p>
      </div>
    </section>
  </div>
</main>

<footer class="foot">
  <div class="wrap foot-inner">
    <span>本地工具箱 · Local Web Tools</span>
    <a href="./quick/">本地快用</a>
    <a href="./guides/">使用指南</a>
    <a href="./about/">关于</a>
    <a href="./privacy/">隐私</a>
    <span class="spacer">全部处理在你的浏览器内完成 · 当前显示 <b id="count">{total}</b> / {total}</span>
  </div>
</footer>

<script src="js/app.js" defer></script>
</body>
</html>
"""

    out = doc.format(total=TOTAL, nav=head_nav, chips="".join(chips), sections="".join(sections))
    path = os.path.join(TOOL, "index.html")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(out)
    print("written:", path, len(out), "bytes,", TOTAL, "tools")


if __name__ == "__main__":
    build()
