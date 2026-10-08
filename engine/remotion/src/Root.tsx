import React from 'react';
import {Composition, AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, random} from 'remotion';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import '@fontsource/be-vietnam-pro/900.css';
import {C, clamp, appear, pop, EASE} from './ui';
import {Scene} from './scenes';

const OV = 8;
const THEMES: Record<string, any> = {
  navy: {bg: 'radial-gradient(1200px 900px at 50% 20%,#14203d 0%,#070b18 55%,#04060d 100%)', orb2: '#3b82f6', subbg: 'rgba(5,7,15,.6)', card: 'linear-gradient(160deg,rgba(30,41,70,.80),rgba(12,18,36,.82))', shade: 'rgba(5,7,15,.55)', bardark: '#7c2d12', acc: '#fb923c', kara: ''},
  purple: {bg: 'radial-gradient(1200px 900px at 50% 20%,#3b1442 0%,#1a0822 55%,#0c0412 100%)', orb2: '#c026d3', subbg: 'rgba(22,6,28,.62)', card: 'linear-gradient(160deg,rgba(62,24,72,.80),rgba(26,8,34,.82))', shade: 'rgba(22,6,28,.55)', bardark: '#14532d', acc: '#4ade80', kara: '#facc15'},
};   // số khung chồng giữa 2 cảnh (chuyển cảnh)
const TRANS = ['zoom', 'slide', 'wipe', 'flip', 'up'];

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const orbs = [0, 1, 2].map((i) => ({x: 540 + Math.sin(f / (70 + i * 23) + i * 2) * 380, y: 600 + i * 450 + Math.cos(f / (90 + i * 17) + i) * 260, c: i === 1 ? 'var(--orb2)' : 'var(--acc)'}));
  return <AbsoluteFill style={{background: 'var(--bg)', overflow: 'hidden'}}>
    {orbs.map((o, i) => <div key={i} style={{position: 'absolute', left: o.x - 450, top: o.y - 450, width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${o.c} ${i === 1 ? 10 : 16}%, transparent), transparent 65%)`}} />)}
    <div style={{position: 'absolute', inset: -200, backgroundImage: 'linear-gradient(rgba(148,163,184,.07) 2px,transparent 2px),linear-gradient(90deg,rgba(148,163,184,.07) 2px,transparent 2px)', backgroundSize: '90px 90px', transform: `perspective(900px) rotateX(18deg) translateY(${(f * 1.2) % 90}px)`}} />
    {Array.from({length: 36}).map((_, i) => { const x = random('x' + i) * 1080, sp = 0.6 + random('s' + i) * 1.6, y = (random('y' + i) * 2100 - f * sp) % 2100;
      return <div key={i} style={{position: 'absolute', left: x, top: (y + 2100) % 2100 - 100, width: 4 + random('r' + i) * 5, height: 4 + random('r' + i) * 5, borderRadius: '50%', background: 'var(--acc)', opacity: 0.12 + random('o' + i) * 0.3}} />; })}
    <div style={{position: 'absolute', top: -400, width: 500, height: 2800, left: ((f * 7) % 2200) - 600, transform: 'rotate(18deg)', background: 'linear-gradient(90deg,transparent,color-mix(in srgb, var(--acc) 10%, transparent),transparent)'}} />
  </AbsoluteFill>;
};

const Shell: React.FC<{kind: string; dur: number; last: boolean; children: React.ReactNode}> = ({kind, dur, last, children}) => {
  const f = useCurrentFrame();
  const p = appear(f, 0, 14); const x = last ? 0 : interpolate(f, [dur + OV - 9, dur + OV], [0, 1], clamp);
  const enter: Record<string, React.CSSProperties> = {
    zoom: {transform: `scale(${1.25 - 0.25 * p})`, filter: `blur(${(1 - p) * 16}px)`},
    slide: {transform: `translateX(${(1 - p) * 700}px)`, filter: `blur(${(1 - p) * 12}px)`},
    wipe: {clipPath: `circle(${p * 150}% at 50% 40%)`},
    flip: {transform: `perspective(1600px) rotateY(${(1 - p) * -60}deg)`, transformOrigin: 'left center'},
    up: {transform: `translateY(${(1 - p) * 400}px)`},
  };
  const e = enter[kind] || enter.zoom;
  return <AbsoluteFill style={{opacity: Math.min(1, p * 2) * (1 - x), ...e, ...(x > 0 ? {transform: `${e.transform || ''} scale(${1 - 0.08 * x})`, filter: `blur(${x * 14}px)`} : {})}}>{children}</AbsoluteFill>;
};

const Subs: React.FC<{subs: any[]; fps: number}> = ({subs, fps}) => {
  const f = useCurrentFrame(); const t = f / fps;
  const k = subs.findIndex((s) => t >= s.start && t < s.end); if (k < 0) return null;
  const s = subs[k]; const words = s.text.split(' ');
  const wt = words.map((w: string) => { const d = w.replace(/\D/g, ''); return d ? Math.max(1, d.length * 1.7) : 1; });
  const tot = wt.reduce((a: number, b: number) => a + b, 0); const pr = (t - s.start) / Math.max(0.3, s.end - s.start - 0.1);
  let acc = 0, ci = words.length - 1; for (let i = 0; i < words.length; i++) { acc += wt[i] / tot; if (pr < acc) { ci = i; break; } }
  const e = pop(f, Math.round(s.start * fps), fps, 14);
  return <div style={{position: 'absolute', left: 60, right: 60, top: 1480, height: 310, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{fontSize: 58, fontWeight: 800, lineHeight: 1.3, textAlign: 'center', background: 'var(--subbg)', padding: '18px 30px', borderRadius: 24, textShadow: '0 4px 18px rgba(0,0,0,.9)', transform: `translateY(${(1 - e) * 30}px) scale(${0.94 + 0.06 * e})`, opacity: Math.min(1, e * 2)}}>
      {words.map((w: string, i: number) => <span key={i} style={{display: 'inline-block', margin: '0 8px', color: i < ci ? '#fff' : i === ci ? 'var(--kara)' : 'rgba(248,250,252,.5)', transform: i === ci ? 'scale(1.1)' : 'none'}}>{w}</span>)}
    </div>
  </div>;
};

export const Main: React.FC<any> = (props) => {
  const {brief: B = {}, scenes = [], timeline = {scenes: [], subs: []}} = props;
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const t = f / fps;
  const TL = timeline.scenes;
  return <AbsoluteFill style={{fontFamily: '"Be Vietnam Pro", Inter, sans-serif', color: C.txt, ...((th) => ({'--acc': B.accent || th.acc, '--kara': B.karaoke || th.kara || B.accent || th.acc, '--bg': th.bg, '--orb2': th.orb2, '--subbg': th.subbg, '--card': th.card, '--shade': th.shade, '--bardark': th.bardark}))(THEMES[B.theme] || THEMES.navy) as any}}>
    <Background />
    {scenes.map((s: any, i: number) => { const st = Math.round(TL[i].start * fps), en = Math.round(TL[i].end * fps); const from = Math.max(0, st - (i ? OV : 0)); const last = i === scenes.length - 1;
      return <Sequence key={i} from={from} durationInFrames={en - from + (last ? fps : OV)}>
        <Shell kind={s.transition || TRANS[i % TRANS.length]} dur={en - from} last={last}><Scene s={{...s, _i: i}} dur={en - from} /></Shell>
      </Sequence>; })}
    {TL.map((s: any, i: number) => { if (!i) return null; const st = Math.round(s.start * fps); const o = interpolate(f, [st - 3, st, st + 6], [0, 0.22, 0], clamp);
      return o > 0 ? <AbsoluteFill key={'fl' + i} style={{background: '#fff', opacity: o}} /> : null; })}
    <div style={{position: 'absolute', top: 70, left: 60, right: 60, display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 700, letterSpacing: 2, color: C.mut}}>
      <span><span style={{color: 'var(--acc)', opacity: 0.5 + 0.5 * Math.sin(f / 5)}}>●</span> {B.top_left || ''}</span><span>{B.top_right || (B.source_name ? 'Nguồn: ' + B.source_name : '')}</span>
    </div>
    <div style={{position: 'absolute', top: 130, left: 60, right: 60, display: 'flex', gap: 10}}>
      {TL.map((s: any, i: number) => <div key={i} style={{flex: 1, height: 8, borderRadius: 4, background: 'rgba(148,163,184,.2)', overflow: 'hidden'}}><div style={{height: '100%', width: `${interpolate(t, [s.start, s.end], [0, 100], clamp)}%`, background: 'var(--acc)'}} /></div>)}
    </div>
    {B.subtitles !== false && <Subs subs={timeline.subs} fps={fps} />}
    {B.handle && <div style={{position: 'absolute', bottom: 62, left: 0, right: 0, textAlign: 'center', fontSize: 30, fontWeight: 800, color: 'rgba(248,250,252,.55)', letterSpacing: 1}}>{B.handle}</div>}
  </AbsoluteFill>;
};

export const Root: React.FC = () => <Composition id="Main" component={Main} fps={30} width={1080} height={1920} durationInFrames={300}
  defaultProps={{brief: {}, scenes: [], timeline: {scenes: [], subs: []}, duration: 10}}
  calculateMetadata={({props}: any) => ({durationInFrames: Math.max(30, Math.ceil((props.duration || 10) * 30))})} />;
