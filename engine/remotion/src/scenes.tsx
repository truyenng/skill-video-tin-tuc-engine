import React from 'react';
import {Img, staticFile, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, Card, Words, Counter, Eyebrow, Pop, appear, pop, stag, clamp, parseRich, fmt} from './ui';

type S = any;
const src = (p: string) => (/^https?:/.test(p) ? p : staticFile(p));

// Ảnh hero: Ken Burns theo motion + vệt sáng quét + viền accent
export const Media: React.FC<{s: S; d: number; dur: number; height?: number}> = ({s, d, dur, height = 680}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = interpolate(f, [0, dur], [0, 1], clamp);
  const m = s.motion || ['zoom-in', 'pan-left', 'zoom-out', 'pan-right', 'pan-up'][(s._i || 0) % 5];
  const tf: Record<string, string> = {
    'zoom-in': `scale(${1.05 + 0.15 * p})`, 'zoom-out': `scale(${1.2 - 0.15 * p})`,
    'pan-left': `scale(1.18) translateX(${5 - 10 * p}%)`, 'pan-right': `scale(1.18) translateX(${-5 + 10 * p}%)`,
    'pan-up': `scale(1.18) translateY(${5 - 10 * p}%)`, 'pan-down': `scale(1.18) translateY(${-5 + 10 * p}%)`, none: 'none',
  };
  const e = pop(f, d, fps, 14); const sweep = interpolate(f, [d + 8, d + 38], [-60, 160], clamp);
  return <div style={{height, borderRadius: 36, overflow: 'hidden', position: 'relative', marginBottom: 32, border: '3px solid color-mix(in srgb, var(--acc) 55%, transparent)', boxShadow: '0 30px 90px rgba(0,0,0,.55)', opacity: Math.min(1, e * 1.5), transform: `scale(${0.88 + 0.12 * e})`, clipPath: `inset(0 0 ${(1 - Math.min(1, e)) * 100}% 0 round 36px)`}}>
    <Img src={src(s.image)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: tf[m] || tf['zoom-in']}} />
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${sweep - 20}%, rgba(255,255,255,.28) ${sweep}%, transparent ${sweep + 20}%)`}} />
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, var(--shade))'}} />
    {s.image_credit && <div style={{position: 'absolute', right: 18, bottom: 16, fontSize: 24, background: 'rgba(0,0,0,.6)', padding: '6px 14px', borderRadius: 10, color: '#e2e8f0'}}>{s.image_credit}</div>}
  </div>;
};

const Note: React.FC<{n: S; dur: number}> = ({n, dur}) => !n ? null :
  <Pop d={Math.round(dur * 0.6)} from="scale" style={{marginTop: 34}}>
    <Card tone={n.tone} style={{padding: '30px 40px'}}>
      <Words text={n.text} d={Math.round(dur * 0.6) + 4} size={44} weight={800} step={1} />
      {n.sub && <div style={{fontSize: 34, color: C.mut, fontWeight: 700, marginTop: 10}}>{n.sub}</div>}
    </Card>
  </Pop>;

const Chips: React.FC<{s: S; d0: number; dur: number}> = ({s, d0, dur}) => !s.chips ? null :
  <div style={{marginTop: 38}}>
    {s.chips_title && <Pop d={d0}><div style={{fontSize: 36, fontWeight: 800, color: 'var(--acc)', marginBottom: 22, letterSpacing: 2}}>{s.chips_title}</div></Pop>}
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
      {s.chips.map((c: string, k: number) => <Pop key={k} d={d0 + 4 + k * 4} from="scale"><div style={{fontSize: 36, fontWeight: 700, padding: '16px 28px', borderRadius: 999, background: 'rgba(148,163,184,.14)', border: '2px solid rgba(148,163,184,.3)'}}>{c}</div></Pop>)}
    </div>
  </div>;

// Số trong chuỗi ("4.300", "1,4") -> đếm động; chuỗi khác giữ nguyên
const Num: React.FC<{v: string; d: number}> = ({v, d}) => {
  const m = String(v).match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/);
  if (!m) return <>{v}</>;
  const dec = m[2] ? m[2].length : 0; const n = parseFloat(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : ''));
  return <Counter to={n} d={d} dec={dec} style={{textShadow: 'none'}} />;
};

export const Scene: React.FC<{s: S; dur: number}> = ({s, dur}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const T = s.type;
  const head: React.ReactNode[] = [];
  if (s.eyebrow) head.push(<Eyebrow key="e" text={s.eyebrow} d={2} tone={T === 'alert' ? 'red' : undefined} />);
  if (s.image && T !== 'image') head.push(<Media key="m" s={s} d={6} dur={dur} height={T === 'hook' ? 640 : 560} />);
  if (s.title) head.push(<Words key="t" text={s.title} d={s.image ? 12 : 6} style={{marginBottom: 36}} />);
  const b0 = s.image ? 16 : s.title ? 12 : 6;   // khung bắt đầu phần thân
  let body: React.ReactNode = null;

  if (T === 'hook') {
    body = <>
      <Pop d={b0}><div style={{display: 'flex', alignItems: 'flex-end', gap: 24}}>
        {s.pre && <div style={{fontSize: 56, fontWeight: 800, color: C.mut, paddingBottom: 36}}>{s.pre}</div>}
        <div style={{fontSize: s.image ? 220 : 260, fontWeight: 900, lineHeight: .95, letterSpacing: -8, color: 'var(--acc)'}}>{s.prefix}<Counter from={s.from ?? 0} to={s.number} d={b0} /></div>
      </div></Pop>
      {s.unit && <Words text={s.unit} d={b0 + 8} />}
    </>;
  } else if (T === 'stat') {
    const p = appear(f, b0, 40); const R = 230, L = 2 * Math.PI * R;
    body = <Pop d={b0} from="scale"><Card style={{textAlign: 'center', padding: '50px 30px', position: 'relative'}}>
      <svg width={520} height={520} style={{display: 'block', margin: '0 auto'}} viewBox="0 0 520 520">
        <circle cx={260} cy={260} r={R} fill="none" stroke="rgba(148,163,184,.15)" strokeWidth={14} />
        <circle cx={260} cy={260} r={R} fill="none" stroke="var(--acc)" strokeWidth={14} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} transform="rotate(-90 260 260)" />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 50, height: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        {s.label && <div style={{fontSize: 40, fontWeight: 800, color: C.mut}}>{s.label}</div>}
        <div style={{fontSize: 170, fontWeight: 900, letterSpacing: -6, lineHeight: 1, color: 'var(--acc)'}}>{s.prefix}<Counter from={s.from ?? 0} to={s.number} d={b0 + 4} />{s.suffix}</div>
        {s.unit && <div style={{fontSize: 40, fontWeight: 800, marginTop: 8, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.2}}>{s.unit}</div>}
      </div>
    </Card></Pop>;
  } else if (T === 'table') {
    const n = s.rows.length;
    body = <Pop d={b0}><Card>
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${s.columns.length}, 1fr)`, fontSize: 30, color: C.mut, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', paddingBottom: 22}}>{s.columns.map((c: string, j: number) => <div key={j}>{c}</div>)}</div>
      {s.rows.map((r: string[], k: number) => {
        const d = b0 + 6 + stag(k, n, dur) ; const p = pop(f, d, fps, 15); const ln = appear(f, d + 12, 10); const hp = pop(f, d + 18, fps, 9);
        return <div key={k} style={{display: 'grid', gridTemplateColumns: `repeat(${r.length}, 1fr)`, alignItems: 'center', padding: '26px 0', borderTop: '2px solid rgba(148,163,184,.18)', fontSize: 46, fontWeight: 800, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * 200}px)`}}>
          {r.map((c, j) => j === s.strike_col
            ? <div key={j}><span style={{position: 'relative', color: C.mut}}>{c}<span style={{position: 'absolute', left: -6, right: -6, top: '52%', height: 6, background: C.red, borderRadius: 3, transform: `scaleX(${ln})`, transformOrigin: 'left'}} /></span></div>
            : j === s.hl_col
              ? <div key={j} style={{color: 'var(--acc)', fontSize: 64, fontWeight: 900, transform: `scale(${0.5 + 0.5 * Math.max(0, hp)})`, transformOrigin: 'left center', textShadow: '0 0 30px color-mix(in srgb, var(--acc) 60%, transparent)'}}>{c}</div>
              : <div key={j}>{c}</div>)}
        </div>;
      })}
      {s.footnote && <div style={{fontSize: 30, color: C.mut, marginTop: 10, fontWeight: 600}}>{s.footnote}</div>}
    </Card></Pop>;
  } else if (T === 'bars') {
    const n = s.items.length; const mx = s.max || Math.max(...s.items.map((i: S) => i.value)) * 1.08;
    body = <Pop d={b0}><Card>
      {s.items.map((it: S, k: number) => {
        const d = b0 + 4 + stag(k, n, dur); const p = pop(f, d, fps, 16); const w = interpolate(f - d, [0, 24], [0, it.value / mx], {...clamp, easing: (x) => 1 - Math.pow(1 - x, 3)});
        const shine = interpolate((f - d) % 50, [0, 50], [-30, 130]);
        return <div key={k} style={{margin: '22px 0', opacity: Math.min(1, p * 1.5)}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 40, fontWeight: 800, marginBottom: 12}}>
            <span>{it.label} {it.sub && <span style={{fontSize: 28, color: 'var(--acc)'}}>· {it.sub}</span>}</span>
            <span style={{color: it.hl ? 'var(--acc)' : undefined}}>{it.display ?? <Counter to={it.value} d={d} style={{textShadow: 'none'}} />}</span>
          </div>
          <div style={{height: 62, background: 'rgba(148,163,184,.1)', borderRadius: 18, overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${w * 100}%`, borderRadius: 18, background: it.hl ? `linear-gradient(105deg, color-mix(in srgb, var(--acc) 70%, var(--bardark)), var(--acc) ${shine - 10}%, #fff6 ${shine}%, var(--acc) ${shine + 10}%)` : 'linear-gradient(90deg,#334155,#64748b)', boxShadow: it.hl ? '0 0 30px color-mix(in srgb, var(--acc) 50%, transparent)' : 'none'}} />
          </div>
        </div>;
      })}
      {s.footnote && <div style={{fontSize: 30, color: C.mut, marginTop: 6, fontWeight: 600}}>{s.footnote}</div>}
    </Card></Pop>;
  } else if (T === 'tiles') {
    const n = s.items.length;
    body = <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26}}>
      {s.items.map((it: S, k: number) => { const d = b0 + stag(k, n, Math.min(dur, 90));
        return <Pop key={k} d={d} from="flip"><Card style={{padding: '38px 32px'}}>
          <div style={{fontSize: 74, fontWeight: 900, color: 'var(--acc)', letterSpacing: -1, lineHeight: 1.05}}><Num v={it.value} d={d} />{it.unit && <span style={{fontSize: 38}}> {it.unit}</span>}</div>
          <div style={{fontSize: 32, color: C.mut, fontWeight: 700, marginTop: 10}}>{it.label}</div>
        </Card></Pop>; })}
    </div>;
  } else if (T === 'alert') {
    const sh = Math.sin(f * 1.6) * 18 * Math.max(0, 1 - (f - b0) / 18) * (f > b0 ? 1 : 0);
    const glow = 30 + 25 * Math.sin(f / 6);
    body = <Pop d={b0} from="scale"><div style={{transform: `translateX(${sh}px)`}}><Card tone="red" style={{textAlign: 'center', padding: '60px 40px', boxShadow: `0 0 ${glow}px rgba(248,113,113,.55), 0 30px 80px rgba(0,0,0,.5)`}}>
      <div style={{fontSize: 150, lineHeight: 1, marginBottom: 16, transform: `scale(${1 + 0.06 * Math.sin(f / 5)})`}}>{s.icon || '⚠'}</div>
      <Words text={s.headline} d={b0 + 6} size={92} style={{justifyContent: 'center'}} />
      {s.sub && <div style={{fontSize: 44, color: C.mut, fontWeight: 800, marginTop: 18}}>{s.sub}</div>}
    </Card></div></Pop>;
  } else if (T === 'verdict') {
    const box = (title: string, items: string[], tone: string, col: string, sign: string, d: number, from: any) =>
      <Pop d={d} from={from} style={{marginTop: tone === 'red' ? 30 : 0}}><Card tone={tone}>
        <div style={{fontSize: 44, fontWeight: 900, color: col, marginBottom: 18}}>{sign} {title}</div>
        <div style={{fontSize: 50, fontWeight: 800, lineHeight: 1.4}}>{items.map((x, k) => <div key={k}>{x}</div>)}</div>
      </Card></Pop>;
    body = <>
      {s.pros && box(s.pros_title || 'PHÙ HỢP NẾU', s.pros, 'green', C.green, '✓', b0, 'left')}
      {s.cons && box(s.cons_title || 'NÊN CÂN NHẮC NẾU', s.cons, 'red', C.red, '✕', b0 + Math.round(dur * 0.35), 'right')}
    </>;
  } else if (T === 'list') {
    const n = s.items.length;
    body = <div>{s.items.map((x: string, k: number) => { const d = b0 + stag(k, n, dur); const p = appear(f, d, 18);
      return <Pop key={k} d={d} from="left"><div style={{display: 'flex', gap: 26, alignItems: 'center', marginBottom: 34}}>
        <svg width={90} height={90} viewBox="0 0 90 90" style={{flex: 'none'}}><circle cx={45} cy={45} r={40} fill="color-mix(in srgb, var(--acc) 18%, transparent)" stroke="var(--acc)" strokeWidth={6} strokeDasharray={252} strokeDashoffset={252 * (1 - p)} transform="rotate(-90 45 45)" />
          <text x={45} y={58} textAnchor="middle" fontSize={44} fontWeight={900} fill="var(--acc)">{k + 1}</text></svg>
        <Words text={x} d={d + 4} size={48} weight={800} step={1} />
      </div></Pop>; })}</div>;
  } else if (T === 'quote') {
    const txt = parseRich(s.quote).map((w) => w.t).join(' '); const nch = Math.floor(interpolate(f, [b0, b0 + Math.min(dur * 0.5, txt.length * 1.2)], [0, txt.length], clamp));
    body = <Pop d={b0}><Card>
      <div style={{fontSize: 180, lineHeight: .6, color: 'var(--acc)', fontWeight: 900}}>“</div>
      <div style={{fontSize: 62, fontWeight: 800, lineHeight: 1.3}}>{txt.slice(0, nch)}<span style={{opacity: f % 16 < 8 ? 1 : 0, color: 'var(--acc)'}}>|</span></div>
      {s.by && <div style={{fontSize: 36, color: C.mut, marginTop: 24, fontWeight: 700}}>— {s.by}</div>}
    </Card></Pop>;
  } else if (T === 'image') {
    body = <><Media s={s} d={4} dur={dur} height={s.height || 820} />{s.text && <Words text={s.text} d={14} size={60} weight={800} />}</>;
  } else if (T === 'compare') {
    const side = (o: S, win: boolean, d: number, from: any) => <Pop d={d} from={from} style={{flex: 1}}><Card tone={win ? undefined : 'gray'} style={{textAlign: 'center', padding: '40px 20px', minHeight: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: win ? '0 0 50px color-mix(in srgb, var(--acc) 45%, transparent)' : undefined}}>
      <div style={{fontSize: 40, fontWeight: 800, color: C.mut}}>{o.title}</div>
      <div style={{fontSize: 96, fontWeight: 900, color: win ? 'var(--acc)' : C.txt, margin: '18px 0', letterSpacing: -2}}><Num v={String(o.value)} d={d + 6} /></div>
      {o.sub && <div style={{fontSize: 34, color: C.mut, fontWeight: 700}}>{o.sub}</div>}
      {win && <div style={{marginTop: 22, alignSelf: 'center', fontSize: 30, fontWeight: 900, color: '#0b0f1a', background: 'var(--acc)', padding: '8px 22px', borderRadius: 999}}>{s.badge || 'TỐT HƠN'}</div>}
    </Card></Pop>;
    const vs = pop(f, b0 + 10, fps, 8);
    body = <div style={{display: 'flex', gap: 30, position: 'relative', alignItems: 'stretch'}}>
      {side(s.left, s.winner === 'left', b0, 'left')}
      {side(s.right, s.winner === 'right', b0 + 6, 'right')}
      <div style={{position: 'absolute', left: '50%', top: '50%', width: 130, height: 130, marginLeft: -65, marginTop: -65, borderRadius: '50%', background: '#0b0f1a', border: '5px solid var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, fontWeight: 900, color: 'var(--acc)', transform: `scale(${Math.max(0, vs)}) rotate(${(1 - vs) * 180}deg)`}}>VS</div>
    </div>;
  } else if (T === 'kinetic') {
    const lines: string[] = s.lines || [];
    body = <div style={{textAlign: 'center'}}>{lines.map((ln, k) => { const d = b0 + stag(k, lines.length, dur * 0.8); const p = pop(f, d, fps, 9);
      return <div key={k} style={{fontSize: s.size || 110, fontWeight: 900, lineHeight: 1.1, letterSpacing: -2, opacity: Math.min(1, p * 2), transform: `scale(${3 - 2 * Math.min(1, p)})`, filter: `blur(${Math.max(0, 1 - p) * 10}px)`}}>
        {parseRich(ln).map((w, i) => <span key={i} style={{color: w.hl ? 'var(--acc)' : undefined}}>{w.t} </span>)}</div>; })}</div>;
  }

  return <div style={{position: 'absolute', left: 60, right: 60, top: 210, height: 1230, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
    {head}{body}
    <Chips s={s} d0={b0 + Math.round(dur * 0.32)} dur={dur} />
    {s.footer && <Pop d={Math.round(dur * 0.55)}><div style={{textAlign: 'center', marginTop: 34, fontSize: 30, color: C.mut, fontWeight: 600}}>{s.footer}</div></Pop>}
    <Note n={s.note} dur={dur} />
  </div>;
};
