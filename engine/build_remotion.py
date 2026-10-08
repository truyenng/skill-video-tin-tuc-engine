#!/usr/bin/env python3
"""Dựng video tin tức dọc 9:16 bằng REMOTION từ <project>/brief.json + scenes.json.
Dùng:  python3 build_remotion.py <project> [--check] [--preview] [--force] [--rate 4.2]
Cần: node + remotion/ (npm install xong), ffmpeg, numpy, pillow; giọng: venv VieNeu (VIENEU_PY)."""
import json, re, sys, os, subprocess, argparse, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('project'); ap.add_argument('--preview', action='store_true'); ap.add_argument('--check', action='store_true'); ap.add_argument('--force', action='store_true')
ap.add_argument('--rate', type=float, default=None); ap.add_argument('--fps', type=int, default=30)
a = ap.parse_args()
P = os.path.abspath(a.project); HERE = os.path.dirname(os.path.abspath(__file__))
brief = json.load(open(f'{P}/brief.json', encoding='utf-8'))
scenes = json.load(open(f'{P}/scenes.json', encoding='utf-8'))
RATE = a.rate or brief.get('speech_rate', 4.2)   # âm tiết/giây của giọng TTS
slug = brief.get('slug') or os.path.basename(P)

# ---------- 1. Thời gian: ước lượng theo số âm tiết ----------
def syl(s):
    n = 0
    for w in re.split(r'[\s-]+', s.strip()):
        d = re.sub(r'\D', '', w)
        n += max(1, round(len(d) * 1.7)) if d else 1
    return n

def chunks(text):
    out = []
    for p in re.split(r'(?<=[.:!?])\s+', text.strip()):
        if len(p.split()) > 9 and re.search(r',\s', p):
            buf = ''
            for sg in [x.strip() for x in re.split(r',\s+', p)]:
                cand = (buf + ', ' + sg) if buf else sg
                if buf and len(cand.split()) > 8: out.append(buf + ','); buf = sg
                else: buf = cand
            out.append(buf)
        else: out.append(p)
    m = []
    for c in out:
        if m and (len(c.split()) <= 2 or (len(m[-1].split()) <= 3 and not m[-1].endswith('.'))): m[-1] += ' ' + c
        else: m.append(c)
    return m

VOICE = brief.get('voice')            # vd "Minh Đức" -> tự tạo giọng bằng VieNeu-TTS
PRON = brief.get('pronounce', {})      # {"Soluto": "Xô-lu-tô"} chỉ áp cho giọng đọc, phụ đề giữ nguyên
VPY = os.environ.get('VIENEU_PY', os.path.expanduser('~/vn/bin/python'))

def speak(text):
    for k in sorted(PRON, key=len, reverse=True):
        text = re.sub(r'(?<![\wÀ-ỹ])' + re.escape(k) + r'(?![\wÀ-ỹ])', PRON[k], text)
    return text

def wav_dur(fn):
    with wave.open(fn) as w: return w.getnframes() / w.getframerate()

plan = [[c for c in chunks(sc['narration'])] for sc in scenes]
DMIN, DMAX = brief.get('duration_range', [30, 35])   # giây; video 30–35s, KHÔNG tăng tốc giọng để ép thời lượng
VR = brief.get('tts_rate') or {'Hải Đăng': 5.8, 'Minh Đức': 4.4, 'Mai Anh': 4.7, 'Trúc Ly': 5.9, 'Ngọc Huyền': 5.3, 'Ngọc Linh': 5.2, 'Đoan Trang': 4.9, 'Quỳnh Anh': 4.9}.get(VOICE, 4.6)   # âm tiết/giây thực đo ở 1.1x, mỗi giọng khác nhau
SYL = sum(syl(speak(sc['narration'])) for sc in scenes); OH = 0.75 * len(scenes) + 0.6   # khoảng nghỉ ước tính
lo, hi = int((DMIN - OH) * VR), int((DMAX - OH) * VR)
print(f'Lời đọc: {SYL} âm tiết ≈ {SYL / VR + OH:.0f}s video (giọng {VOICE or "CapCut"}). Khung {DMIN}–{DMAX}s với {len(scenes)} cảnh = {lo}–{hi} âm tiết.' + ('' if SYL <= hi else f' -> DÀI: cắt bớt ~{SYL - hi} âm tiết.') + (f' -> NGẮN: có thể thêm ~{lo - SYL} âm tiết.' if SYL < lo else ''))
if a.check: sys.exit(0)

clips = {}; raw = {}
def prep(SPD):   # tăng tốc (giữ cao độ) + cắt khoảng lặng đầu/cuối mỗi câu
    for c, fn in raw.items():
        out = fn.replace('.wav', f'_x{int(round(SPD * 100))}.wav')
        if not os.path.exists(out):
            af = (f'atempo={SPD:.3f},' if SPD != 1.0 else '') + 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', fn, '-af', af, '-ar', '48000', '-ac', '1', out], check=True)
        clips[c] = out
if VOICE:   # 1 file giọng / dòng phụ đề, cache theo nội dung
    if not os.path.exists(VPY): sys.exit(f'Chưa có venv VieNeu ở {VPY} (xem mục "Cài đặt" trong SKILL.md, hoặc đặt VIENEU_PY)')
    import hashlib
    os.makedirs(f'{P}/out/tts', exist_ok=True)
    items = []
    for c in [c for cs in plan for c in cs]:
        s = speak(c); h = hashlib.md5((VOICE + '|' + s).encode()).hexdigest()[:12]
        raw[c] = f'{P}/out/tts/{h}.wav'; items.append({'text': s, 'out': raw[c]})
    json.dump({'voice': VOICE, 'items': items}, open(f'{P}/out/tts/job.json', 'w', encoding='utf-8'), ensure_ascii=False)
    env = dict(os.environ, NO_PROXY='localhost,127.0.0.1', no_proxy='localhost,127.0.0.1')
    subprocess.run([VPY, '-I', f'{HERE}/tts_worker.py', f'{P}/out/tts/job.json'], check=True, env=env)
    SPD = float(brief.get('voice_speed', 1.1)); prep(SPD)

def layout():
    t = 0.0; tl = []; subs = []
    for i, (sc, cs) in enumerate(zip(scenes, plan)):
        start = t; t += 0.2 if VOICE else 0.3
        for c in cs:
            if VOICE:
                d = wav_dur(clips[c])
                gap = 0.18 if c.rstrip().endswith(('.', '!', '?', ':')) else 0.08   # nghỉ cuối câu dài hơn dấu phẩy
                subs.append({'start': round(t, 3), 'end': round(t + d, 3), 'text': c, 'wav': clips[c]}); t += d + gap
            else:
                d = syl(c) / RATE + 0.2
                subs.append({'start': round(t, 2), 'end': round(t + d, 2), 'text': c}); t += d
        t += sc.get('hold', 0.8 if i == len(scenes) - 1 else 0.25)
        tl.append({'start': round(start, 2), 'end': round(t, 2)})
    return t, tl, subs
t, tl, subs = layout()
if t > DMAX + 0.5 and not a.force:
    sys.exit(f'DỪNG: video {t:.1f}s > {DMAX}s. Rút gọn kịch bản khoảng {int((t - DMAX) * VR) + 1} âm tiết rồi chạy lại (chỉ câu đổi mới tạo lại giọng). Không tăng tốc giọng.')
if t < DMIN - 3: print(f'Lưu ý: video {t:.1f}s ngắn hơn {DMIN}s — có thể thêm 1 ý.')
DUR = round(t, 2)

if VOICE:   # ghép giọng đúng vị trí -> voice.wav
    sr = 48000; track = np.zeros(int((DUR + 1) * sr), dtype=np.float32)
    for s in subs:
        with wave.open(s['wav']) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768
            if w.getnchannels() == 2: x = x.reshape(-1, 2).mean(1)
            if w.getframerate() != sr: x = np.interp(np.arange(0, len(x), w.getframerate() / sr), np.arange(len(x)), x)
        i = int(s['start'] * sr); track[i:i + len(x)] += x[:len(track) - i]
    w = wave.open(f'{P}/out/voice.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
    for s in subs: s.pop('wav')

def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); mi, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{mi:02}:{s:02},{ms:03}'
os.makedirs(f'{P}/out', exist_ok=True)
with open(f'{P}/out/{slug}-loi-doc.srt', 'w', encoding='utf-8') as f:
    for k, s in enumerate(subs, 1): f.write(f"{k}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n")
with open(f'{P}/out/{slug}-loi-doc.txt', 'w', encoding='utf-8') as f:
    for i, sc in enumerate(scenes, 1): f.write(f"[Cảnh {i} | {ts(tl[i-1]['start'])[3:8]}] {sc['narration']}\n")
print(f'Thời lượng ước tính: {DUR}s | {len(scenes)} cảnh | {len(subs)} dòng phụ đề')

# ---------- 2. Remotion ----------
import shutil
R = os.environ.get('REMOTION_DIR', f'{HERE}/remotion')
pub = f'{R}/public/{slug}'; shutil.rmtree(pub, ignore_errors=True); os.makedirs(pub, exist_ok=True)
def fix(p):   # ảnh trong project -> public/<slug>/...
    if not p or re.match(r'https?:', p): return p
    dst = f'{pub}/{p}'; os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy(f'{P}/{p}', dst); return f'{slug}/{p}'
sc2 = [dict(sc, image=fix(sc.get('image'))) if sc.get('image') else sc for sc in scenes]
props = {'brief': brief, 'scenes': sc2, 'timeline': {'scenes': tl, 'subs': subs}, 'duration': DUR + 0.5}
json.dump(props, open(f'{P}/out/props.json', 'w', encoding='utf-8'), ensure_ascii=False)
env2 = dict(os.environ, NO_PROXY='localhost,127.0.0.1', no_proxy='localhost,127.0.0.1')
if a.preview:   # 1 khung ở ~75% mỗi cảnh -> contact sheet
    from PIL import Image
    frames = [int((s['start'] + (s['end'] - s['start']) * 0.75) * 30) for s in tl]
    subprocess.run(['node', f'{R}/render.mjs', f'{P}/out/props.json', f'{P}/out/stills', '--stills=' + ','.join(map(str, frames))], check=True, env=env2)
    ims = [Image.open(f'{P}/out/stills/still_{fr}.png') for fr in frames]
    w, h = 360, 640; sheet = Image.new('RGB', (w * len(ims), h))
    for i, im in enumerate(ims): sheet.paste(im.convert('RGB').resize((w, h)), (i * w, 0))
    sheet.save(f'{P}/out/preview.png'); print('Preview:', f'{P}/out/preview.png'); sys.exit(0)
subprocess.run(['node', f'{R}/render.mjs', f'{P}/out/props.json', f'{P}/out/_raw.mp4'], check=True, env=env2)

# ---------- 3. Nhạc nền ----------
bgm = brief.get('bgm')
if bgm and not os.path.isabs(bgm): bgm = f'{P}/{bgm}'
if not bgm or not os.path.exists(bgm):
    MOODS = {'tech': [[57,60,64],[53,57,60],[48,52,55],[55,59,62]], 'calm': [[48,52,55],[57,60,64],[53,57,60],[55,59,62]],
             'news': [[50,53,57],[46,50,53],[43,47,50],[45,49,52]], 'somber': [[45,48,52],[41,45,48],[43,46,50],[40,43,47]],
             'energetic': [[52,56,59],[49,52,56],[45,49,52],[47,51,54]]}
    chords = MOODS.get(brief.get('bgm_mood', 'tech'), MOODS['tech']); pulse = brief.get('bgm_mood') not in ('calm', 'somber')
    sr = 44100; D = DUR + 1; tt = np.arange(int(sr * D)) / sr; f = lambda n: 440 * 2 ** ((n - 69) / 12); out = np.zeros_like(tt); L = 4.0
    for k in range(int(D / L) + 1):
        s = k * L; ch = chords[k % 4]; m = (tt >= s - 0.5) & (tt < s + L + 1); x = tt[m] - s
        env = np.clip((x + .5) / 1.2, 0, 1) * np.clip((L + 1 - x) / 1.5, 0, 1)
        for nn in ch + [ch[0] - 12]: out[m] += env * (np.sin(2*np.pi*f(nn)*tt[m]) + .3*np.sin(2*np.pi*f(nn)*2.003*tt[m])) * .12
        for j, nn in enumerate(ch + [ch[0] + 12]):
            pm = (tt >= s + j) & (tt < s + j + .9); out[pm] += np.sin(2*np.pi*f(nn+12)*tt[pm]) * np.exp(-(tt[pm]-s-j)*5) * .10
    if pulse: out += np.sin(2*np.pi*55*tt) * np.exp(-(tt % .5) * 18) * .25
    out *= np.clip(tt / 2, 0, 1) * np.clip((D - tt) / 2.5, 0, 1); out = out / np.abs(out).max() * .8
    st = np.stack([out, np.roll(out, 300)], 1)
    w = wave.open(f'{P}/out/_bgm_raw.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((st * 32767).astype('<i2').tobytes()); w.close(); bgm = f'{P}/out/_bgm_raw.wav'

# ---------- 3b. SFX chuyển cảnh (whoosh tổng hợp) ----------
sr = 44100; sfx = np.zeros(int((DUR + 2) * sr), dtype=np.float32)
if brief.get('sfx', True):
    from numpy.fft import rfft, irfft
    rng = np.random.default_rng(1); L = int(0.45 * sr); tt = np.arange(L) / sr
    fr = np.fft.rfftfreq(L, 1 / sr)
    for i, s_ in enumerate(tl[1:], 1):
        sp = rfft(rng.standard_normal(L)) * np.exp(-((fr - 1800) / 1500) ** 2)
        x = irfft(sp, L) * np.sin(np.pi * tt / tt[-1]) ** 2 * (0.5 + 0.5 * tt / tt[-1])
        x = x / (np.abs(x).max() + 1e-9) * 0.35; st = int(max(0, s_['start'] - 0.3) * sr); sfx[st:st + L] += x[:len(sfx) - st]
w = wave.open(f'{P}/out/_sfx.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((np.clip(sfx, -1, 1) * 32767).astype('<i2').tobytes()); w.close()

# ---------- 4. Ghép âm thanh ----------
voice = f'{P}/out/voice.wav' if VOICE else next((f'{P}/{v}' for v in ('voice.mp3', 'voice.wav', 'voice.m4a') if os.path.exists(f'{P}/{v}')), None)
final = f'{P}/out/{slug}.mp4'
if voice:   # có giọng: nhạc tự giảm khi có giọng (sidechain), chuẩn -14 LUFS
    fc = ('[1:a]lowpass=f=5000,volume=0.35[b];[2:a]aresample=44100,apad[v];[v]asplit[v1][v2];[3:a]aresample=44100,volume=0.5[x];'
          '[b][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[bd];[bd][v2][x]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5[a]')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{P}/out/_raw.mp4', '-stream_loop', '-1', '-i', bgm, '-i', voice, '-i', f'{P}/out/_sfx.wav',
           '-filter_complex', fc, '-map', '0:v', '-map', '[a]']
else:
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{P}/out/_raw.mp4', '-stream_loop', '-1', '-i', bgm, '-i', f'{P}/out/_sfx.wav',
           '-filter_complex', f"[1:a]lowpass=f=5000,aecho=0.8:0.6:120:0.25,loudnorm=I={brief.get('bgm_lufs', -24)}:TP=-2[b];[2:a]volume=0.25[x];[b][x]amix=inputs=2:normalize=0:duration=first[a]", '-map', '0:v', '-map', '[a]']
subprocess.run(cmd + ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', final], check=True)
print('XONG:', final, '| có giọng' if voice else '| chưa có giọng (dùng file .srt để tạo giọng trong CapCut)')
