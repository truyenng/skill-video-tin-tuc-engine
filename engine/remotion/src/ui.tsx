import React from 'react';
import {interpolate, spring, Easing, useCurrentFrame, useVideoConfig} from 'remotion';

export const C = {acc: '#fb923c', red: '#f87171', green: '#4ade80', txt: '#f8fafc', mut: '#94a3b8'};
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const appear = (f: number, d: number, len = 16) => interpolate(f, [d, d + len], [0, 1], {...clamp, easing: EASE});
export const pop = (f: number, d: number, fps: number, damping = 11) => spring({frame: f - d, fps, config: {damping, stiffness: 140, mass: 0.8}});
// thời điểm xuất hiện phần tử thứ k / n trong cảnh dài dur khung
export const stag = (k: number, n: number, dur: number) => Math.round(6 + (n > 1 ? (k * Math.min(dur * 0.42, 16 * n)) / (n - 1) : 0));
export const fmt = (n: number, dec = 0) => n.toLocaleString('de-DE', {minimumFractionDigits: dec, maximumFractionDigits: dec});
// "**chữ**" -> [{t, hl}]
export const parseRich = (s: string) => {
  const out: {t: string; hl: boolean}[] = [];
  String(s ?? '').split(/(\*\*.+?\*\*)/).forEach((p) => {
    if (!p) return;
    const hl = p.startsWith('**');
    (hl ? p.slice(2, -2) : p).split(/\s+/).filter(Boolean).forEach((w) => out.push({t: w, hl}));
  });
  return out;
};

export const Card: React.FC<{tone?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({tone, style, children}) => {
  const border = tone === 'red' ? 'rgba(248,113,113,.75)' : tone === 'green' ? 'rgba(74,222,128,.65)' : tone === 'gray' ? 'rgba(148,163,184,.45)' : 'color-mix(in srgb, var(--acc) 50%, transparent)';
  const bg = tone === 'red' ? 'linear-gradient(160deg,rgba(90,20,30,.78),rgba(30,10,16,.82))' : tone === 'green' ? 'linear-gradient(160deg,rgba(16,64,42,.72),rgba(8,24,18,.82))' : 'var(--card)';
  return <div style={{background: bg, border: `3px solid ${border}`, borderRadius: 36, padding: 46, boxShadow: '0 30px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)', backdropFilter: 'blur(6px)', ...style}}>{children}</div>;
};

// Chữ hiện từng từ (spring), từ **nhấn mạnh** có vệt marker chạy dưới
export const Words: React.FC<{text: string; d: number; size?: number; weight?: number; color?: string; style?: React.CSSProperties; step?: number}> = ({text, d, size = 84, weight = 900, color = C.txt, style, step = 2}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const ws = parseRich(text);
  return <div style={{fontSize: size, fontWeight: weight, lineHeight: 1.12, letterSpacing: size > 70 ? -1 : 0, color, display: 'flex', flexWrap: 'wrap', columnGap: size * 0.26, ...style}}>
    {ws.map((w, i) => {
      const p = pop(f, d + i * step, fps, 14); const m = appear(f, d + i * step + 8, 12);
      return <span key={i} style={{display: 'inline-block', position: 'relative', opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 50}px) rotate(${(1 - p) * 4}deg)`, color: w.hl ? 'var(--acc)' : undefined}}>
        {w.hl && <span style={{position: 'absolute', left: -4, right: -4, bottom: size * 0.06, height: size * 0.2, background: 'color-mix(in srgb, var(--acc) 30%, transparent)', borderRadius: 6, transform: `scaleX(${m})`, transformOrigin: 'left', zIndex: -1}} />}
        {w.t}
      </span>;
    })}
  </div>;
};

// Số đếm: spring + nảy + phát sáng
export const Counter: React.FC<{from?: number; to: number; d: number; dec?: number; style?: React.CSSProperties}> = ({from = 0, to, d, dec = 0, style}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = spring({frame: f - d, fps, config: {damping: 20, stiffness: 60}, durationInFrames: 40});
  const done = interpolate(f, [d + 30, d + 36, d + 46], [0, 1, 0], clamp);
  return <span style={{display: 'inline-block', transform: `scale(${1 + done * 0.08})`, textShadow: `0 0 ${20 + done * 60}px color-mix(in srgb, var(--acc) ${40 + done * 50}%, transparent)`, ...style}}>{fmt(from + (to - from) * p, dec)}</span>;
};

export const Eyebrow: React.FC<{text: string; d: number; tone?: string}> = ({text, d, tone}) => {
  const f = useCurrentFrame(); const p = appear(f, d, 14);
  return <div style={{alignSelf: 'flex-start', marginBottom: 32, clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 14px)`, fontSize: 32, fontWeight: 800, letterSpacing: 3, color: '#0b0f1a', background: tone === 'red' ? C.red : 'var(--acc)', padding: '12px 26px', borderRadius: 14}}>{text}</div>;
};

export const Pop: React.FC<{d: number; children: React.ReactNode; style?: React.CSSProperties; from?: 'up' | 'left' | 'right' | 'scale' | 'flip'}> = ({d, children, style, from = 'up'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = pop(f, d, fps, 13); const o = Math.min(1, Math.max(0, p) * 1.6);
  const tf = from === 'left' ? `translateX(${(1 - p) * -500}px)` : from === 'right' ? `translateX(${(1 - p) * 500}px)` : from === 'scale' ? `scale(${0.6 + 0.4 * p})` : from === 'flip' ? `perspective(1200px) rotateX(${(1 - p) * 85}deg)` : `translateY(${(1 - p) * 80}px)`;
  return <div style={{opacity: o, transform: tf, transformOrigin: 'center top', ...style}}>{children}</div>;
};
