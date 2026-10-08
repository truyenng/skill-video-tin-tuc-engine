#!/usr/bin/env python3
"""Tải bài báo -> <project>/source.md, ảnh trong bài -> media/, video (mp4/m3u8) nếu có, credits.json.
Dùng: python3 fetch_article.py <url> <project>
Domain của báo + CDN ảnh phải nằm trong allowlist mạng. Bị chặn (403/000) -> báo người dùng, không vượt chặn."""
import sys, os, re, json, html, subprocess, urllib.request, urllib.parse
url, P = sys.argv[1], os.path.abspath(sys.argv[2])
os.makedirs(f'{P}/media', exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'}
def get(u, binary=False):
    req = urllib.request.Request(u, headers={**UA, 'Referer': url})
    with urllib.request.urlopen(req, timeout=30) as r: d = r.read()
    return d if binary else d.decode('utf-8', 'ignore')
try: t = get(url)
except Exception as e: sys.exit(f'Không tải được bài ({e}). Kiểm tra domain đã được cho phép chưa, hoặc nhờ người dùng dán nội dung.')

meta = lambda p: (re.search(r'<meta[^>]+(?:property|name)="%s"[^>]+content="([^"]*)"' % p, t) or [None, ''])[1]
title = html.unescape(meta('og:title') or (re.search(r'<title>(.*?)</title>', t, re.S) or [None, ''])[1]).strip()
# vùng nội dung: thử các class phổ biến của báo VN, không có thì lấy cả trang
body = t
for cls in ['detail-content', 'fck_detail', 'article__body', 'detail__content', 'content-detail', 'singular-content', 'article-content', 'entry-content']:
    i = t.find(cls)
    if i > 0: body = t[i:]; break
body = re.split(r'<div[^>]+class="[^"]*(?:tags|relate|comment|footer|author)[^"]*"', body)[0]
clean = re.sub(r'<(script|style|figure)[^>]*>.*?</\1>', '', body, flags=re.S)
paras = [html.unescape(re.sub(r'<[^>]+>', '', p)).strip() for p in re.findall(r'<p[^>]*>(.*?)</p>', clean, re.S)]
paras = [p for p in paras if len(p) > 25]
caps = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<figcaption[^>]*>(.*?)</figcaption>', body, re.S)]

imgs = []
og = meta('og:image')
for m in re.finditer(r'<img[^>]+>', body):
    tag = m.group(0); src = re.search(r'(?:data-original|data-src|src)="([^"]+)"', tag)
    if src and not re.search(r'logo|icon|avatar-author|\.gif|\.svg|1x1|blank', src.group(1), re.I): imgs.append(urllib.parse.urljoin(url, html.unescape(src.group(1))))
imgs = list(dict.fromkeys(imgs)) or ([og] if og else [])
vids = list(dict.fromkeys(re.findall(r'(https?:[^"\'\s<>]+?\.(?:mp4|m3u8)[^"\'\s<>]*)', body)))

credits = []
for k, u in enumerate(imgs, 1):
    ext = (re.search(r'\.(jpe?g|png|webp)', u, re.I) or [None, 'jpg'])[1].lower()
    fn = f'article-{k}.{ext}'
    try:
        open(f'{P}/media/{fn}', 'wb').write(get(u, True))
        if ext == 'webp': subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{P}/media/{fn}', f'{P}/media/article-{k}.jpg']); os.remove(f'{P}/media/{fn}'); fn = f'article-{k}.jpg'
        from PIL import Image
        if Image.open(f'{P}/media/{fn}').size[0] < 500: os.remove(f'{P}/media/{fn}'); continue   # thumbnail tin liên quan
        credits.append({'file': f'media/{fn}', 'url': u, 'caption': caps[k-1] if k <= len(caps) else ''})
    except Exception as e: print('Bỏ qua ảnh', u, e)
for k, u in enumerate(vids[:1], 1):
    try:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-headers', f'Referer: {url}\r\n', '-i', u, '-t', '120', '-an', '-c:v', 'libx264', '-crf', '22', f'{P}/media/article-video-{k}.mp4'], check=True, timeout=300)
        credits.append({'file': f'media/article-video-{k}.mp4', 'url': u})
    except Exception as e: print('Không tải được video', u, e)

json.dump(credits, open(f'{P}/media/credits.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(f'{P}/source.md', 'w', encoding='utf-8').write(f'# {title}\n\nNguồn: {url}\n\n' + '\n\n'.join(paras) + '\n\n## Ảnh\n' + '\n'.join(f"- {c['file']}: {c.get('caption','')}" for c in credits) + '\n')
print(f'Bài: {title}\n{len(paras)} đoạn | {len([c for c in credits if "video" not in c["file"]])} ảnh | {len([c for c in credits if "video" in c["file"]])} video (tìm thấy {len(vids)} link video)')
