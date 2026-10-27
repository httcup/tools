#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DTC 电商工具共用的 SVG 图标（24x24 描边风格，stroke 由模板统一着色）。"""

ICONS = {
    "calc": ('<rect x="5" y="3" width="14" height="18" rx="2"/>'
             '<rect x="8" y="6" width="8" height="3.4" rx="0.8"/>'
             '<path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>'),
    "chart": ('<path d="M4 4v16h16"/><path d="M8 16v-5M12.5 16V8M17 16v-8"/>'),
    "coins": ('<circle cx="9" cy="9" r="5.5"/><path d="M14.2 6.3a5.5 5.5 0 1 1-7.9 7.9"/>'
              '<path d="M7 9h4M9 7v4"/>'),
    "cart": ('<circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>'
             '<path d="M3 4h2l2.6 11.4a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6"/>'),
    "truck": ('<path d="M2 6h12v11H2z"/><path d="M14 10h4l3 3v4h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>'),
    "box": ('<path d="M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
    "tag": ('<path d="M3.5 12.5 11 20a1.8 1.8 0 0 0 2.5 0l6.4-6.4a1.8 1.8 0 0 0 .5-1.3l-.3-8.2-8.2-.3a1.8 1.8 0 0 0-1.3.5L3.5 10a1.8 1.8 0 0 0 0 2.5Z"/><circle cx="15.5" cy="8.5" r="1.4"/>'),
    "refresh": ('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v4h-4"/>'),
    "code": ('<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13 4l-2.5 16"/>'),
    "search": ('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
    "link": ('<path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.24 4.24 0 1 0-6-6l-1.2 1.2"/>'
             '<path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.24 4.24 0 1 0 6 6l1.2-1.2"/>'),
    "doc": ('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>'
            '<path d="M9 13h6M9 17h4"/>'),
    "globe": ('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.4 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.4-3.8-8.5s1.2-6.1 3.8-8.5Z"/>'),
    "percent": ('<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>'),
    "target": ('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'),
    "mail": ('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
    "scale": ('<path d="M12 4v16M6 8l-3.5 7a3.8 3.8 0 0 0 7 0L6 8ZM18 8l-3.5 7a3.8 3.8 0 0 0 7 0L18 8Z"/>'
              '<path d="M5 8h14M9 20h6"/>'),
    "clock": ('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>'),
}
