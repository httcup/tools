#!/usr/bin/env python3
"""批量翻译站点文案，生成 i18n/<lang>.json 词条。

用法：
  python3 scripts/translate_bulk.py ja --limit 200     # 先翻 200 条
  python3 scripts/translate_bulk.py all                # 全部语言、全部文案

设计要点：
- 只翻译「中文原文」，按页面上出现的频率排序，先翻译高频和短句；
- 占位符 {name} 先替换成哨兵串，翻译后还原，避免被翻译破坏；
- 增量缓存到 /tmp/tm/cache_<lang>.json，可断点续跑；
- 已有词条（原站人工译文 + 手工校对）优先保留，不覆盖。
"""
import json
import os
import re
import sys
import time
import random
import html
import urllib.parse
import urllib.request
import collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = '/tmp/tm'
CJK = re.compile(r'[\u4e00-\u9fff]')
SKIP = re.compile(r'<(script|style|pre|code|textarea)\b[\s\S]*?</\1>', re.I)
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')
LANGS = {'ja': 'ja', 'fr': 'fr', 'es': 'es', 'en': 'en'}


def strings_of(path):
    s = SKIP.sub(' ', open(path, encoding='utf-8', errors='ignore').read())
    out = set()
    for m in re.finditer(r'>([^<>]{1,800})<', s):
        t = ' '.join(html.unescape(m.group(1)).split())
        if t and CJK.search(t):
            out.add(t)
    for m in re.finditer(r'(?:placeholder|aria-label|title|alt)="([^"]{1,300})"', s):
        t = ' '.join(html.unescape(m.group(1)).split())
        if t and CJK.search(t):
            out.add(t)
    return out


def collect():
    """返回 (按优先级排序的文案列表, 文案->出现页数)"""
    pages = []
    for dp, dn, fn in os.walk(ROOT):
        if '.git' in dp or '/i18n' in dp or dp.endswith('/scripts'):
            continue
        for f in fn:
            if f.endswith('.html'):
                pages.append(os.path.normpath(os.path.join(dp, f)))

    def kind(p):
        rel = os.path.relpath(p, ROOT).replace('\\', '/')
        if rel.startswith('guides/'):
            return 3
        if rel in ('index.html', '404.html'):
            return 0
        if rel.startswith('quick/'):
            return 2
        return 1

    weight = collections.Counter()
    rank = {}
    for p in pages:
        k = kind(p)
        for t in strings_of(p):
            weight[t] += 1
            rank[t] = min(rank.get(t, 9), k)
    ordered = sorted(weight, key=lambda t: (rank[t], -weight[t], len(t)))
    return ordered, weight


PH = re.compile(r'\{[a-zA-Z_][\w]*\}')


def protect(text):
    slots = []

    def sub(m):
        slots.append(m.group(0))
        return '\u27e6%d\u27e7' % (len(slots) - 1)

    return PH.sub(sub, text), slots


def restore(text, slots):
    def sub(m):
        i = int(m.group(1))
        return slots[i] if i < len(slots) else m.group(0)

    return re.sub('\u27e6(\\d+)\u27e7', sub, text)


def request(batch, tl):
    qs = [('q', s) for s in batch]
    url = ('https://clients5.google.com/translate_a/t?' + urllib.parse.urlencode(
        [('client', 'dict-chrome-ex'), ('sl', 'zh-CN'), ('tl', tl)] + qs))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = json.loads(r.read().decode('utf-8'))
    if isinstance(data, str):
        data = [data]
    if isinstance(data, list):
        out = []
        for item in data:
            if isinstance(item, str):
                out.append(item)
            elif isinstance(item, list) and item:
                out.append(item[0] if isinstance(item[0], str) else ''.join(map(str, item)))
        return out
    return []


def translate_batch(batch, tl, tries=4):
    for i in range(tries):
        try:
            res = request(batch, tl)
            if len(res) == len(batch):
                return res
            # 数量不齐：逐条重试
            if len(batch) == 1:
                return res
            out = []
            for s in batch:
                r = translate_batch([s], tl, tries=2)
                out.append(r[0] if r else s)
            return out
        except Exception as e:
            wait = 3 * (i + 1) + random.random() * 2
            print('    retry %d: %s' % (i + 1, e), flush=True)
            time.sleep(wait)
    return None


def chunks(items, max_items=18, max_chars=3500):
    buf, size = [], 0
    for it in items:
        if buf and (len(buf) >= max_items or size + len(it) > max_chars):
            yield buf
            buf, size = [], 0
        buf.append(it)
        size += len(it) + 1
    if buf:
        yield buf


def load_cache(lang):
    p = os.path.join(CACHE_DIR, 'cache_%s.json' % lang)
    if os.path.exists(p):
        try:
            return json.load(open(p, encoding='utf-8'))
        except Exception:
            pass
    return {}


def save_cache(lang, data):
    os.makedirs(CACHE_DIR, exist_ok=True)
    p = os.path.join(CACHE_DIR, 'cache_%s.json' % lang)
    tmp = p + '.tmp'
    json.dump(data, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False)
    os.replace(tmp, p)


def bad(src, dst, lang):
    if not dst or not dst.strip():
        return True
    if lang != 'ja' and CJK.search(dst):
        return True
    if PH.findall(src) and len(PH.findall(src)) != len(re.findall('\u27e6\\d+\u27e7', dst)):
        return True
    if len(dst) > max(80, len(src) * 6):
        return True
    return False


def main():
    lang_arg = sys.argv[1] if len(sys.argv) > 1 else 'all'
    limit = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])
    langs = list(LANGS) if lang_arg == 'all' else [lang_arg]
    ordered, weight = collect()
    print('待处理文案: %d 条' % len(ordered), flush=True)

    for lang in langs:
        existing = {}
        p = os.path.join(ROOT, 'i18n', '%s.json' % lang)
        if os.path.exists(p):
            existing = {k: v for k, v in json.load(open(p, encoding='utf-8')).items()
                        if not k.startswith('__')}
        cache = load_cache(lang)
        todo = [t for t in ordered if t not in existing and t not in cache]
        if limit:
            todo = todo[:limit]
        print('[%s] 已有 %d，待翻 %d' % (lang, len(existing), len(todo)), flush=True)

        done = 0
        t0 = time.time()
        for batch in chunks(todo):
            prepared, slots = [], []
            for s in batch:
                q, sl = protect(s)
                prepared.append(q)
                slots.append(sl)
            res = translate_batch(prepared, LANGS[lang])
            if not res:
                print('  批量失败，跳过 %d 条' % len(batch), flush=True)
                continue
            for src, dst, sl in zip(batch, res, slots):
                dst = restore(' '.join(dst.split()), sl)
                if bad(src, dst, lang):
                    cache[src] = None
                else:
                    cache[src] = dst
            done += len(batch)
            if done % 180 < len(batch):
                save_cache(lang, cache)
                rate = done / max(1e-6, time.time() - t0)
                print('  %d/%d  %.1f 条/秒' % (done, len(todo), rate), flush=True)
            time.sleep(0.35 + random.random() * 0.35)
        save_cache(lang, cache)
        ok = sum(1 for v in cache.values() if v)
        print('[%s] 完成：成功 %d / 失败 %d' % (lang, ok, len(cache) - ok), flush=True)


if __name__ == '__main__':
    main()
