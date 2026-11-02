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
SKIP = re.compile(r'<(script|style|pre|textarea)\b[\s\S]*?</\1>', re.I)
INLINE_CODE = re.compile(r'<code\b[\s\S]*?</code>', re.I)
SEP = '\x00'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')
LANGS = {'ja': 'ja', 'fr': 'fr', 'es': 'es', 'en': 'en'}


def strings_of(path):
    raw = open(path, encoding='utf-8', errors='ignore').read()
    out = set()

    def add(t):
        for part in t.split(SEP):
            part = ' '.join(part.split())
            if part and CJK.search(part):
                out.add(part)

    # 属性先在原文上抓：整块删 <textarea> 时，它自己的 placeholder 会跟着没掉
    for m in re.finditer(r'(?:placeholder|aria-label|title|alt)="([^"]{1,300})"', raw):
        add(html.unescape(m.group(1)))
    # 与 i18n.js 的 ATTRS 保持一致：这些 data-* 是纯展示文案（复制提示、强度档位）
    for m in re.finditer(
            r'data-(?:copied|failed|copy-failed|very-weak|weak|fair|strong|very-strong'
            r'|instant|minutes|hours|days|months|years|centuries|ages)="([^"]{1,300})"', raw):
        add(html.unescape(m.group(1)))

    # 整块丢掉：脚本、样式、预排版块——这些内容在页面上从不作为正文出现
    s = SKIP.sub(' ', raw)
    # 行内 <code> 不能整块删掉，否则两侧正文会被粘成一条页面上根本不存在的
    # 长句（运行时它们是被 <code> 隔开的两个文本节点），译文永远匹配不上。
    # 这里把它换成占位分隔符，提取后再拆开。
    s = INLINE_CODE.sub(SEP, s)
    for m in re.finditer(r'>([^<>]{1,800})<', s):
        add(html.unescape(m.group(1)))
    return out


# 脚本里硬编码的中文：工具运行时才写进 DOM（单位名、状态提示、按钮态词等），
# 静态 HTML 里根本没有，只能从字符串字面量里抓。
LIT = re.compile(r"""(['"`])((?:\\.|(?!\1)[^\\]){1,300})\1""")
NO_TRANSLATE = re.compile(
    r'^(微软雅黑|宋体|黑体|楷体|苹方|思源|华文|方正|PingFang|Microsoft YaHei)'
    r'|font-family|rgba?\(|var\(--|^\.|^#')


def js_strings(text):
    out = set()
    for m in LIT.finditer(text):
        t = ' '.join(m.group(2).split())
        if len(t) < 2 or not CJK.search(t):
            continue
        if NO_TRANSLATE.search(t) or '://' in t or t.startswith('data:'):
            continue
        if not re.search(r'[\u4e00-\u9fff]{2,}', t):
            continue
        out.add(t)
    return out


def collect_js():
    """抓 .js 文件与内联 <script> 里的中文字符串"""
    out = set()
    for dp, dn, fn in os.walk(ROOT):
        if '.git' in dp or '/i18n' in dp or dp.endswith('/scripts'):
            continue
        for f in fn:
            p = os.path.join(dp, f)
            if f.endswith('.js'):
                out |= js_strings(open(p, encoding='utf-8', errors='ignore').read())
            elif f.endswith('.html'):
                s = open(p, encoding='utf-8', errors='ignore').read()
                for sm in re.finditer(r'<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', s):
                    out |= js_strings(sm.group(1))
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
    for t in collect_js():
        weight[t] += 1
        rank.setdefault(t, 1)
    ordered = sorted(weight, key=lambda t: (rank[t], -weight[t], len(t)))
    return ordered, weight


PH = re.compile(r'\{[a-zA-Z_][\w]*\}')

# 沙箱里的默认代理经常返回 503（Tunnel connection failed），直连反而稳定，
# 所以先走直连，失败再退回带代理的默认 opener。
DIRECT = urllib.request.build_opener(urllib.request.ProxyHandler({}))
DEFAULT = urllib.request.build_opener()


def open_url(req, timeout=45):
    try:
        return DIRECT.open(req, timeout=timeout)
    except Exception:
        return DEFAULT.open(req, timeout=timeout)


def protect(text):
    slots = []

    def sub(m):
        slots.append(m.group(0))
        return 'QZQ%dZQZ' % (len(slots) - 1)

    return PH.sub(sub, text), slots


def restore(text, slots):
    def sub(m):
        i = int(m.group(1))
        return slots[i] if i < len(slots) else m.group(0)

    return re.sub(r'QZQ(\d+)ZQZ', sub, text)


def request(batch, tl):
    qs = [('q', s) for s in batch]
    url = ('https://clients5.google.com/translate_a/t?' + urllib.parse.urlencode(
        [('client', 'dict-chrome-ex'), ('sl', 'zh-CN'), ('tl', tl)] + qs))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with open_url(req) as r:
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


def request_gtx(text, tl):
    url = ('https://translate.google.com/translate_a/single?' + urllib.parse.urlencode(
        {'client': 'gtx', 'sl': 'zh-CN', 'tl': tl, 'dt': 't', 'q': text}))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with open_url(req) as r:
        data = json.loads(r.read().decode('utf-8'))
    return ''.join(seg[0] for seg in data[0] if seg and seg[0])


def translate_batch(batch, tl, tries=3):
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
                one = None
                for _ in range(2):
                    try:
                        one = request_gtx(s, tl)
                        break
                    except Exception:
                        time.sleep(2)
                if one is None:
                    rr = translate_batch([s], tl, tries=1)
                    one = rr[0] if rr else None
                if one is None:
                    return None
                out.append(one)
            return out
        except Exception as e:
            wait = 3 * (i + 1) + random.random() * 2
            print('    retry %d: %s' % (i + 1, e), flush=True)
            time.sleep(wait)
    return None


def chunks(items, max_items=20, max_chars=1200):
    buf, size = [], 0
    for it in items:
        if buf and (len(buf) >= max_items or size + len(it) > max_chars):
            yield buf
            buf, size = [], 0
        buf.append(it)
        size += len(it) + 1
    if buf:
        yield buf


def cache_path(lang, suffix=''):
    return os.path.join(CACHE_DIR, 'cache_%s%s.json' % (lang, suffix))


def load_cache(lang, suffix=''):
    p = cache_path(lang, suffix)
    if os.path.exists(p):
        try:
            return json.load(open(p, encoding='utf-8'))
        except Exception:
            pass
    return {}


def save_cache(lang, data, suffix=''):
    os.makedirs(CACHE_DIR, exist_ok=True)
    p = cache_path(lang, suffix)
    tmp = p + '.tmp'
    json.dump(data, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False)
    os.replace(tmp, p)


def bad(src, dst, lang):
    if not dst or not dst.strip():
        return True
    if lang != 'ja' and CJK.search(dst):
        return True
    if PH.findall(src) and len(PH.findall(src)) != len(PH.findall(dst)):
        return True
    # 中文一个汉字对应一个音节，逐字比长度天然偏长（fr/es 实测中位数 3.5~3.8，
    # p99 约 7.5），所以阈值要按比例放宽，只拦截明显跑偏的译文。
    if len(dst) > max(160, len(src) * 10):
        return True
    return False


def main():
    lang_arg = sys.argv[1] if len(sys.argv) > 1 else 'all'
    limit = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])
    langs = list(LANGS) if lang_arg == 'all' else [lang_arg]
    shard = None
    if '--shard' in sys.argv:
        a, b = sys.argv[sys.argv.index('--shard') + 1].split('/')
        shard = (int(a) - 1, int(b))
    suffix = '_s%d' % (shard[0] + 1) if shard else ''
    ordered, weight = collect()
    print('待处理文案: %d 条' % len(ordered), flush=True)

    for lang in langs:
        existing = {}
        p = os.path.join(ROOT, 'i18n', '%s.json' % lang)
        if os.path.exists(p):
            existing = {k: v for k, v in json.load(open(p, encoding='utf-8')).items()
                        if not k.startswith('__')}
        cache = load_cache(lang, suffix)
        retry_failed = '--retry-failed' in sys.argv
        if retry_failed:
            for k in [k for k, v in cache.items() if not v]:
                del cache[k]
        todo = [t for t in ordered if t not in existing and t not in cache]
        if shard:
            todo = todo[shard[0]::shard[1]]
        if limit:
            todo = todo[:limit]
        print('[%s] 已有 %d，待翻 %d' % (lang, len(existing), len(todo)), flush=True)

        done = 0
        fail_streak = 0
        t0 = time.time()
        pace = float(os.environ.get('SLEEP', '0.35'))
        for batch in chunks(todo):
            prepared, slots = [], []
            for s in batch:
                q, sl = protect(s)
                prepared.append(q)
                slots.append(sl)
            res = translate_batch(prepared, LANGS[lang])
            if res and len(res) == len(prepared):
                fail_streak = 0
            else:
                # 整批失败常见原因是 URL 过长（HTTP 400），对半拆开再试一次，
                # 免得一条超长文案连累同批其他条目全部丢掉。
                res = None
                if len(prepared) > 1:
                    mid = len(prepared) // 2
                    h1 = translate_batch(prepared[:mid], LANGS[lang])
                    h2 = translate_batch(prepared[mid:], LANGS[lang])
                    if h1 and h2 and len(h1) + len(h2) == len(prepared):
                        res = h1 + h2
                if res:
                    fail_streak = 0
                else:
                    fail_streak += 1
                    print('  批量失败，跳过 %d 条（连续 %d 次）' % (len(prepared), fail_streak), flush=True)
                    if fail_streak % 3 == 0:
                        pause = 10 if fail_streak < 9 else 30
                        print('  接口限流，暂停 %d 秒' % pause, flush=True)
                        time.sleep(pause)
                    continue
            for src, dst, sl in zip(batch, res, slots):
                dst = restore(' '.join(dst.split()), sl)
                if bad(src, dst, lang):
                    cache[src] = None
                else:
                    cache[src] = dst
            done += len(batch)
            if done % 180 < len(batch):
                save_cache(lang, cache, suffix)
                rate = done / max(1e-6, time.time() - t0)
                print('  %d/%d  %.1f 条/秒' % (done, len(todo), rate), flush=True)
            time.sleep(pace + random.random() * pace)
        save_cache(lang, cache, suffix)
        ok = sum(1 for v in cache.values() if v)
        print('[%s] 完成：成功 %d / 失败 %d' % (lang, ok, len(cache) - ok), flush=True)


if __name__ == '__main__':
    main()
