#!/usr/bin/env python3
"""Quét tin BĐS mới từ trang chuyên mục các báo -> danh sách ứng viên GỌN (không đưa HTML vào context).
Dùng: python3 scan_news.py [--hours 26] [--seen seen.txt] [--out candidates.tsv]
  --seen: file chứa link (và/hoặc tiêu đề) đã có trong Sheet, mỗi dòng 1 cái -> bỏ qua link trùng.
In ra: bảng TSV  giờ_đăng | báo | tiêu đề | mô tả (≤160 ký tự) | link, sắp mới nhất trước,
và cuối cùng là danh sách domain bị chặn/lỗi. Không vượt chặn: domain lỗi thì chỉ báo lại."""
import re, sys, html, json, argparse, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor

SOURCES = {
    'VnExpress': 'https://vnexpress.net/bat-dong-san',
    'CafeF': 'https://cafef.vn/bat-dong-san.chn',
    'Tuổi Trẻ': 'https://tuoitre.vn/nha-dat.htm',
    'VietNamNet': 'https://vietnamnet.vn/bat-dong-san',
    'VnEconomy': 'https://vneconomy.vn/dia-oc.htm',
    'Thanh Niên': 'https://thanhnien.vn/kinh-te/dia-oc.htm',
    'Dân trí': 'https://dantri.com.vn/bat-dong-san.htm',
    'CafeLand': 'https://cafeland.vn/tin-tuc/',
    'Znews': 'https://znews.vn/bat-dong-san.html',
    'Lao Động': 'https://laodong.vn/bat-dong-san/',
    'Người Lao Động': 'https://nld.com.vn/kinh-te/dia-oc.htm',
    'Tiền Phong': 'https://tienphong.vn/dia-oc/',
    'Báo Xây dựng': 'https://baoxaydung.vn',
    'Reatimes': 'https://reatimes.vn',
}
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}
VN = timezone(timedelta(hours=7))
# link bài: đuôi .html/.htm/.chn hoặc kết thúc bằng mã số dài; bỏ trang chuyên mục, tag, video, tác giả
ART = re.compile(r'(\d{5,}[^/]*\.(?:html?|chn)$|-\d{6,}\.(?:html?|chn)$|-\d{5,}/?$)')
SKIP = re.compile(r'/(tag|tags|chu-de|video|videos|tac-gia|author|event|photo|emagazine|podcast|topic)/|#|\?', re.I)

def get(url, limit=None, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(limit).decode('utf-8', 'ignore')

def links(name, url):
    try: t = get(url)
    except Exception as e: return name, [], f'{type(e).__name__}: {e}'[:80]
    host = urllib.parse.urlparse(url).netloc.replace('www.', '')
    out = []
    for h in re.findall(r'href="([^"]+)"', t):
        u = urllib.parse.urljoin(url, html.unescape(h)).split('#')[0]
        p = urllib.parse.urlparse(u)
        if host not in p.netloc or SKIP.search(u) or not ART.search(p.path): continue
        if u not in out: out.append(u)
    if not out: return name, [], 'không lấy được link bài (trang dùng JavaScript hoặc chặn bot)'
    return name, out[:30], None

def meta(t, *keys):
    for k in keys:
        m = re.search(r'<meta[^>]+(?:property|name|itemprop)=["\']%s["\'][^>]*content=["\']([^"\']*)' % re.escape(k), t, re.I) \
            or re.search(r'<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name|itemprop)=["\']%s["\']' % re.escape(k), t, re.I)
        if m and m.group(1).strip(): return html.unescape(m.group(1)).strip()
    return ''

def parse_time(t):
    s = meta(t, 'article:published_time', 'datePublished', 'pubdate', 'publishdate', 'dc.created', 'og:published_time')
    if not s:
        m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', t)
        s = m.group(1) if m else ''
    if not s: return None
    s = s.strip().replace('Z', '+00:00')
    try: d = datetime.fromisoformat(s)
    except ValueError:
        d = None
        for f in ('%Y/%m/%d %H:%M:%S', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%Y-%m-%d %H:%M'):
            try: d = datetime.strptime(s[:19], f); break
            except ValueError: pass
    if d is None: return None
    return d if d.tzinfo else d.replace(tzinfo=VN)   # không có múi giờ -> coi là giờ VN

def article(item):
    name, u = item
    try: t = get(u, limit=150000, timeout=15)
    except Exception: return None
    title = meta(t, 'og:title') or html.unescape((re.search(r'<title>(.*?)</title>', t, re.S) or [None, ''])[1]).strip()
    desc = re.sub(r'\s+', ' ', meta(t, 'og:description', 'description'))
    return {'site': name, 'url': u, 'title': title, 'desc': desc[:160], 'time': parse_time(t)}

ap = argparse.ArgumentParser(); ap.add_argument('--hours', type=float, default=26); ap.add_argument('--seen'); ap.add_argument('--out')
a = ap.parse_args()
seen = set()
if a.seen:
    for l in open(a.seen, encoding='utf-8'):
        l = l.strip()
        if l: seen.add(l.split('?')[0].rstrip('/'))

with ThreadPoolExecutor(8) as ex: res = list(ex.map(lambda kv: links(*kv), SOURCES.items()))
errors = [(n, e) for n, _, e in res if e]
todo = [(n, u) for n, us, _ in res for u in us if u.split('?')[0].rstrip('/') not in seen]
with ThreadPoolExecutor(12) as ex: arts = [x for x in ex.map(article, todo) if x and x['title']]

now = datetime.now(VN); cut = now - timedelta(hours=a.hours)
fresh = [x for x in arts if x['time'] and x['time'] >= cut]
notime = sum(1 for x in arts if not x['time'])
fresh.sort(key=lambda x: x['time'], reverse=True)
# bỏ trùng tiêu đề (cùng bài xuất hiện ở nhiều chuyên mục)
uniq, titles = [], set()
for x in fresh:
    k = re.sub(r'\W+', '', x['title'].lower())[:60]
    if k in titles or x['title'] in seen: continue
    titles.add(k); uniq.append(x)

rows = ['giờ\tbáo\ttiêu đề\tmô tả\tlink'] + [f"{x['time'].astimezone(VN):%d/%m %H:%M}\t{x['site']}\t{x['title']}\t{x['desc']}\t{x['url']}" for x in uniq]
out = '\n'.join(rows)
if a.out: open(a.out, 'w', encoding='utf-8').write(out + '\n')
print(out)
print(f"\n# {len(uniq)} bài trong {a.hours:g}h qua (đã bỏ {len(seen)} link có sẵn; {notime} bài không đọc được giờ đăng, đã loại).")
print('# Domain lỗi/bị chặn: ' + ('; '.join(f'{n} ({e})' for n, e in errors) if errors else 'không có'))
