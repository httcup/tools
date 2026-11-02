#!/usr/bin/env python3
"""把批量翻译缓存合并进 i18n/<lang>.json，并为带占位符的句子生成匹配模板。

用法：python3 scripts/merge_dict.py ja [fr es en ...]

- 已有词条优先保留（原站人工译文 / 手工校对过的界面文案）
- {name} 这类占位符在运行时会被替换成实际值，所以额外生成 __patterns：
  形如 ["^第 (.+?) 帧，共 (.+?) 帧（(.+?)%）$", "{{1}} フレーム中 {{2}} フレーム（{{3}}%）"]
"""
import json
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = '/tmp/tm/cache_%s.json'
PH = re.compile(r'\{([a-zA-Z_]\w*)\}')
PUNCT = set('\\^$.|?*+()[]{}')


def literal(part):
    return ''.join('\\' + c if c in PUNCT else c for c in part)


def make_pattern(src, dst):
    names = PH.findall(src)
    if not names or len(names) > 4:
        return None
    if any(n not in names for n in PH.findall(dst)):
        return None
    parts = PH.split(src)
    # re.split 保留分隔符：字面量、名字、字面量……
    rx, lit = '^', ''
    for i in range(0, len(parts), 2):
        text = parts[i]
        rx += literal(text)
        lit += text
        if i + 1 < len(parts):
            name = parts[i + 1]
            rx += '(.+?)'
    rx += '$'
    rep = PH.sub(lambda m: '{{%d}}' % (names.index(m.group(1)) + 1), dst)
    return rx, rep, len(lit)


def build(lang):
    path = os.path.join(ROOT, 'i18n', '%s.json' % lang)
    old = {}
    if os.path.exists(path):
        old = json.load(open(path, encoding='utf-8'))
    patterns = old.get('__patterns', [])
    words = {k: v for k, v in old.items() if not k.startswith('__') and isinstance(v, str)}

    cache = {}
    for cp in sorted(glob.glob('/tmp/tm/cache_%s*.json' % lang)):
        try:
            cache.update(json.load(open(cp, encoding='utf-8')))
        except Exception:
            pass
    added = 0
    for src, dst in cache.items():
        if not dst or src in words:
            continue
        words[src] = dst
        added += 1

    # 人工校对覆盖（分类名、导航、品牌等高频可见文案）
    ov_path = os.path.join(ROOT, 'i18n', 'overrides', '%s.json' % lang)
    ov_n = 0
    if os.path.exists(ov_path):
        ov = json.load(open(ov_path, encoding='utf-8'))
        for k, v in ov.items():
            if isinstance(v, str) and v:
                words[k] = v
                ov_n += 1

    # 由带占位符的词条生成模板（更长的字面量优先匹配）
    existing_rx = {p[0] for p in patterns}
    cand = []
    for src, dst in words.items():
        if '{' in src and '{' in dst:
            p = make_pattern(src, dst)
            if p and p[0] not in existing_rx:
                cand.append(p)
    cand.sort(key=lambda x: -x[2])
    patterns += [[rx, rep] for rx, rep, _ in cand]

    out = dict(sorted(words.items(), key=lambda kv: -len(kv[0])))
    out['__patterns'] = patterns
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    size = os.path.getsize(path) / 1024
    print('[%s] 新增 %d，校对覆盖 %d，总计 %d 条，模板 %d 条，%.0f KB'
          % (lang, added, ov_n, len(words), len(patterns), size))


if __name__ == '__main__':
    for lang in (sys.argv[1:] or ['ja']):
        build(lang)
