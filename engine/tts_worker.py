#!/usr/bin/env python3
"""Chạy bằng python của venv VieNeu. Input: JSON {voice, items:[{text,out}]}. Bỏ qua file đã có (cache)."""
import json, sys, os, time, glob

def deref_hf_cache():   # onnxruntime mới từ chối file .data qua symlink của cache HF -> thay symlink bằng file thật
    for l in glob.glob(os.path.expanduser('~/.cache/huggingface/hub/models--*/snapshots/**/*'), recursive=True):
        if os.path.islink(l):
            t = os.path.realpath(l); os.remove(l); os.rename(t, l)

job = json.load(open(sys.argv[1], encoding='utf-8'))
todo = [it for it in job['items'] if not os.path.exists(it['out'])]
if todo:
    from vieneu import Vieneu
    try: tts = Vieneu()
    except Exception as e:
        if 'External data' not in str(e) and 'escapes model directory' not in str(e): raise
        deref_hf_cache(); tts = Vieneu()
    for k, it in enumerate(todo, 1):
        t = time.time()
        a = tts.infer(it['text'], voice=job['voice'])
        tts.save(a, it['out'])
        print(f'TTS {k}/{len(todo)} {time.time()-t:.1f}s: {it["text"][:50]}', flush=True)
print('TTS xong', len(job['items']), 'câu,', len(todo), 'câu mới')
