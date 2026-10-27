#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 ToolKnit 批次的工具页面。

用法：python3 scripts/build_toolknit.py
定义：tk_defs_calc.py（声明式，复用 DTC 计算器引擎）+ tk_defs_text/image/media/
create/play/time.py（自定义界面）。产物为每工具一个 <slug>/（index.html +
card.part + app.js），页面本身是最终交付物。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dtc_icons import ICONS as DTC_ICONS  # noqa: E402
from build_batch_tools import SHELL, CSP, LOGO  # noqa: E402
import build_dtc_tools  # noqa: E402  （复用 GENERIC_BODY / build_generic / DTC_CSS）
import tk_defs_calc  # noqa: E402
import tk_defs_text  # noqa: E402
import tk_defs_image  # noqa: E402
import tk_defs_media  # noqa: E402
import tk_defs_create  # noqa: E402
import tk_defs_play  # noqa: E402
import tk_defs_time  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ICONS = dict(DTC_ICONS)
ICONS.update({
    "scissors": ('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.1 7.6 20 19M8.1 16.4 20 5"/>'),
    "circle": ('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>'),
    "flip": ('<path d="M8 3 4 7l4 4M4 7h9a6 6 0 0 1 6 6"/><path d="m16 21 4-4-4-4"/><path d="M20 17h-9a6 6 0 0 1-6-6"/>'),
    "grid": ('<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>'),
    "pixel": ('<path d="M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5zM9.5 9.5h5v5h-5z"/>'),
    "halftone": ('<circle cx="7" cy="7" r="3"/><circle cx="16.5" cy="8.5" r="2"/><circle cx="9" cy="16" r="2.2"/><circle cx="17" cy="17" r="1.3"/>'),
    "info": ('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'),
    "palette": ('<path d="M12 3a9 9 0 1 0 0 18h1.8a2.2 2.2 0 0 0 1.6-3.7c-.9-1 .0-2.3 1.3-2.3H19a2.5 2.5 0 0 0 2.5-2.5C21.5 7 17.3 3 12 3Z"/><path d="M7.5 10.5h.01M12 7h.01M16.5 10.5h.01"/>'),
    "invoice": ('<path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
    "pen": ('<path d="m14.5 4.5 5 5L8 21H3v-5L14.5 4.5Z"/><path d="m12.5 6.5 5 5"/>'),
    "board": ('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m7 12 3-3 3 3 4-5"/><path d="M12 17v4M8 21h8"/>'),
    "music": ('<path d="M9 18V6l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>'),
    "wave": ('<path d="M2 12h2l2-6 3 12 3-16 3 14 2.5-8L19 12h3"/>'),
    "bpm": ('<path d="M2 12h4l2-5 3 10 3-7 2 2h6"/>'),
    "metronome": ('<path d="m9.5 3 5 0L18 17a2 2 0 0 1-2 2.5H8A2 2 0 0 1 6 17L9.5 3Z"/><path d="M12 14 19 5"/><circle cx="12" cy="16" r="1"/>'),
    "piano": ('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v9M12 4v9M16 4v9M7 13h2M11 13h2M15 13h2"/>'),
    "gamepad": ('<path d="M6 9h4M8 7v4"/><circle cx="16" cy="8.5" r="1"/><circle cx="18.5" cy="11" r="1"/>'
                '<path d="M7 5h10a5 5 0 0 1 5 5.5l-.6 4.6A3.4 3.4 0 0 1 15.5 17l-1.5-2h-4l-1.5 2a3.4 3.4 0 0 1-5.9-1.9L2 10.5A5 5 0 0 1 7 5Z"/>'),
    "keyboard": ('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9"/>'),
    "lungs": ('<path d="M12 4v7"/><path d="M12 11c-1.5-2-3.5-3-5-3-2 0-3.5 1.7-3.5 4.5S4.5 20 6.5 20c2.5 0 5.5-2 5.5-5V11Z"/>'
              '<path d="M12 11c1.5-2 3.5-3 5-3 2 0 3.5 1.7 3.5 4.5S19.5 20 17.5 20c-2.5 0-5.5-2-5.5-5"/>'),
    "timer": ('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'),
    "stopwatch": ('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v4M10 2.5h4M12 2.5V6M18.5 7.5 20 6"/>'),
    "globe2": ('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M12 3.5c2.3 2.6 3.4 5.5 3.4 8.5s-1.1 5.9-3.4 8.5c-2.3-2.6-3.4-5.5-3.4-8.5s1.1-5.9 3.4-8.5Z"/>'),
    "cards": ('<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M6 7h12M10 12h4"/><path d="M3 7v13"/>'),
    "mic": ('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M9 21.5h6"/>'),
    "sparkle": ('<path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/><path d="M19 15.5 19.8 18l2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.5Z"/>'),
})

NEW_CATS = {
    "creative-design": "创作与设计",
    "time-focus": "时间与专注",
    "test-fun": "测试与解压",
}


def tool_list():
    tools = []
    for mod in (tk_defs_calc, tk_defs_text, tk_defs_image, tk_defs_media,
                tk_defs_create, tk_defs_play, tk_defs_time):
        for tool in mod.TOOLS:
            tool.setdefault("cat", "quick")
            tools.append(tool)
    slugs = [t["slug"] for t in tools]
    assert len(slugs) == len(set(slugs)), "slug 重复"
    return tools


def build():
    tools = tool_list()
    written = []
    for tool in tools:
        slug = tool["slug"]
        directory = os.path.join(ROOT, slug)
        os.makedirs(directory, exist_ok=True)

        if "fields" in tool:
            body, js = build_dtc_tools.build_generic(tool)
        else:
            body, js = tool["body"].strip(), tool["js"].strip()

        html = (SHELL
                .replace("@@NAME@@", tool["name"])
                .replace("@@SLUG@@", slug)
                .replace("@@CSP@@", CSP)
                .replace("@@LOGO@@", LOGO)
                .replace("@@SHORT@@", tool["desc"])
                .replace("@@LONG@@", tool["long"])
                .replace('<link rel="stylesheet" href="../toolkit.css">',
                         '<link rel="stylesheet" href="../toolkit.css">\n'
                         '<link rel="stylesheet" href="../dtc.css">')
                .replace("@@BODY@@", body))
        with open(os.path.join(directory, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)
        with open(os.path.join(directory, "app.js"), "w", encoding="utf-8") as f:
            f.write(js + "\n")

        icon = ICONS[tool["icon"]]
        card = (
            f'<li data-slug="{slug}" data-cat="{tool["cat"]}" data-key="{tool["name"]} {tool["desc"]} {tool["keys"]} {tool["cat"]} {slug}">'
            f'<a class="card" href="./{slug}/"><span class="ico">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{icon}</svg></span>'
            f'<span class="copy"><span class="name">{tool["name"]}</span><span class="desc">{tool["desc"]}</span></span></a>'
            f'<button class="star" type="button" data-star="{slug}" aria-pressed="false" aria-label="收藏：{tool["name"]}" title="收藏">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
            f'<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8Z"/></svg></button></li>'
        )
        with open(os.path.join(directory, "card.part"), "w", encoding="utf-8") as f:
            f.write(card)
        written.append(slug)

    print("生成 %d 个 ToolKnit 工具页:" % len(written))
    by_cat = {}
    for slug in written:
        t = next(x for x in tools if x["slug"] == slug)
        by_cat.setdefault(t["cat"], []).append(slug)
    for cat, slugs in by_cat.items():
        print("  [%s] %d 个" % (cat, len(slugs)))
        for s in slugs:
            print("    -", s)


if __name__ == "__main__":
    build()
