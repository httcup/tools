#!/usr/bin/env python3
"""把工具页面里残留的英文界面短语换成中文（frame-phrases 块与固定标签）。"""
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "tool"

PHRASES = {
    "approval.limit": "此会话记不住第二位批准对象。想批准另一台设备，请结束会话后重新开始。",
    "card.waiting": "选好上面的文件，这里就会开始。",
    "error.broke": "出了点问题：{detail}。刷新页面重新开始。",
    "example.busy": "正在生成示例…",
    "example.failed": "此浏览器无法生成示例，请直接选择文件。",
    "example.load": "试试示例",
    "net.clean": "你的文件没有去任何地方。共加载 {total} 个文件，全部是本页自己的。{platform}",
    "net.dirty": "有来源联系了 {hosts}，而这个工具从不这么做。值得查一查。{platform}",
    "net.platform.many": "本页自己的广告、统计和捐赠按钮脚本来自 {hosts} 个主机，它们没有拿到任何一个文件或字节。",
    "net.platform.one": "本页自己的广告、统计和捐赠按钮脚本来自 {hosts} 个主机，它没有拿到任何一个文件或字节。",
    "offline.failed": "此处无法缓存，但同样不会上传任何内容。",
    "offline.insecure": "需要 https:// 或 localhost 才能缓存供离线使用。",
    "offline.none": "此浏览器不支持（其他功能照常可用）。",
    "offline.ready@page": "页面已保存。配对或重连设备仍需联网。",
    "offline.ready": "已就绪 —— 断开网络也能继续用。",
    "reading.many": "正在读取 {count} 个文件…",
    "reading.one": "正在读取 {count} 个文件…",
    "transport.failed": "云中转无法连接这两台设备。请检查网络和所在网络的 WebRTC 限制。",
    "transport.forbidden": "此会话不允许使用云中转。请打开主机当前的邀请。",
    "transport.invalid": "不支持这种连接方式。请让主机发起新邀请。",
    "transport.limited": "云中转的会话数已达上限。请稍后再让主机开新会话。",
    "transport.mismatch": "你选择的连接方式与主机不一致。请打开对方当前的邀请，核对其连接方式。",
    "transport.note.direct": "内容直接在两台设备之间传输，不会自动切换到中转。",
    "transport.note.relay": "加密内容经 Cloudflare 的中转传递，两台设备都要联网。直连不通时选这个。",
    "transport.route.direct": "已直连",
    "transport.route.relay": "已通过云中转连接",
    "transport.route.unknown": "正在检查连接方式。",
    "transport.stopped": "连接已结束。",
    "transport.timeout": "云中转未及时响应。请重新连接。",
    "transport.unavailable": "云中转暂不可用。请稍后再试，或让主机重新发起直连会话。",
}

PLEDGE = [
    (re.compile(r"Your (.+?) are <strong>processed in your browser</strong>\. No processing upload\.", re.S),
     r"你的\1在<strong>你自己的浏览器里处理</strong>，不做任何上传。"),
    (re.compile(r"Direct voice by default\. Choose Cloud relay when needed\. No recording\.", re.S),
     "默认直连语音，需要时可选云中转。不录音。"),
    (re.compile(r"Camera video is encrypted for accepted viewers\. Direct is the default; Cloud relay is optional\. You choose whether approval is required\.", re.S),
     "摄像头画面为获批准的观看者加密传输；默认直连，可选云中转。是否需要批准由你决定。"),
    (re.compile(r"Tab video is encrypted for one approved viewer\. No extension, sound or remote control\.", re.S),
     "标签页画面为一位获批准的观看者加密传输。无需扩展，不传声音，不能远程控制。"),
]

STATIC = [
    ("View source", "查看源码"),
    ("How this is verified", "如何核实这些说法"),
    ("<strong>Live check:</strong>", "<strong>实时检查：</strong>"),
    ("<strong>Offline:</strong>", "<strong>离线：</strong>"),
    (">checking&hellip;<", ">核对中&hellip;<"),
    ("<strong>This page's code did not start.</strong>", "<strong>页面代码没有启动。</strong>"),
    ("<strong>JavaScript is disabled.</strong>", "<strong>JavaScript 已被禁用。</strong>"),
    ("This app does all of its work in your browser, so it cannot run without it.",
     "本应用的所有工作都在你的浏览器内完成，没有它就无法运行。"),
    ("Serve the folder over http instead:", "请改用 http 方式提供此目录："),
    (">Join</", ">加入</"),
    (">Resume microphone<", ">恢复麦克风<"),
    (">End session<", ">结束会话</"),
    (">Leave<", ">离开</"),
]

RE_OPEN = re.compile(r"Opening <code>index\.html</code> directly from a folder blocks JavaScript modules, "
                     r"so nothing will happen when you choose (.+?)\.", re.S)
RE_BOOT_OPEN = ('直接从文件夹打开 <code>index.html</code> 会阻止 JavaScript 模块加载，'
                '所以选择\\1后不会有任何反应。')

FRAME_BLOCK = re.compile(r'(<div id="frame-phrases"[^>]*>)([\s\S]*?)(</div>)', re.I)
FRAME_SPAN = re.compile(r'<span data-phrase="([^"]+)">([\s\S]*?)</span>')


def fix_frame(m):
    head, body, tail = m.groups()

    def one(sm):
        key = sm.group(1)
        if key in PHRASES:
            return '<span data-phrase="%s">%s</span>' % (key, PHRASES[key])
        if key == "offline.ready" and "Page saved" in sm.group(2):
            return '<span data-phrase="%s">%s</span>' % (key, PHRASES["offline.ready@page"])
        return sm.group(0)
    return head + FRAME_SPAN.sub(one, body) + tail


changed = 0
leftover = {}
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d != ".git"]
    for name in filenames:
        if not name.endswith(".html"):
            continue
        path = os.path.join(dirpath, name)
        s = open(path, encoding="utf-8", errors="surrogateescape").read()
        orig = s
        s = FRAME_BLOCK.sub(fix_frame, s)
        for pat, rep in PLEDGE:
            s = pat.sub(rep, s)
        s = RE_OPEN.sub(RE_BOOT_OPEN, s)
        for a, b in STATIC:
            s = s.replace(a, b)
        if s != orig:
            changed += 1
            open(path, "w", encoding="utf-8", errors="surrogateescape").write(s)
            for pm in re.finditer(r'<span class="pledge-title">([\s\S]*?)</span>', s):
                t = re.sub(r"<[^>]+>", "", pm.group(1))
                if re.search(r"[A-Za-z]{4}", t) and not re.search(r"[\u4e00-\u9fff]", t):
                    leftover[os.path.relpath(path, ROOT)] = " ".join(t.split())[:120]

print("updated pages:", changed)
if leftover:
    print("仍未翻译的 pledge:")
    for p, t in leftover.items():
        print(" -", p, "|", t)
