import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C} from './ui';

// Ảnh thu nhỏ (thumbnail/cover) 1080x1920 cho Reels/TikTok/Shorts.
// Nội dung chính đặt trong vùng y≈420–1500 để vẫn đọc được khi nền tảng cắt 1:1 hoặc 4:5 ở feed.
// t = {badge, number, unit, title, sub, image, image_credit, tag}
const src = (p?: string) => (!p ? '' : /^https?:/.test(p) ? p : staticFile(p));

export const Thumb: React.FC<{t: any; brief: any}> = ({t = {}, brief: B = {}}) => {
  const num = String(t.number ?? '');
  const unit = String(t.unit ?? '');
  // bề rộng ước tính (đơn vị = cỡ chữ): chữ số đậm có viền ~0.72, đơn vị (cỡ 0.4) ~0.3/ký tự
  const w = num.replace(/[.,]/g, '').length * 0.72 + (num.match(/[.,]/g) || []).length * 0.3 + unit.length * 0.3 + (unit ? 0.05 : 0);
  const nSize = Math.round(Math.min(360, 930 / Math.max(1, w)));
  // "**cụm**" tô vàng cả cụm (không tách từng chữ)
  const title = String(t.title || '').split(/(\*\*.+?\*\*)/).filter(Boolean).map((p) => ({t: p.replace(/^\*\*|\*\*$/g, ''), hl: p.startsWith('**')}));
  const tLen = (t.title || '').replace(/\*/g, '').length;
  const tSize = tLen > 60 ? 74 : tLen > 40 ? 86 : 100;
  return <AbsoluteFill style={{background: 'var(--bg)', overflow: 'hidden'}}>
    {t.image && <Img src={src(t.image)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: t.image_pos || '50% 50%', transform: 'scale(1.04)', filter: 'saturate(1.15) contrast(1.05)'}} />}
    {/* phủ tối để chữ nổi: trên nhạt, giữa tối dần, đáy tối hẳn */}
    <AbsoluteFill style={{background: t.image
      ? 'linear-gradient(180deg,rgba(4,6,13,.5) 0%,rgba(4,6,13,.08) 14%,rgba(4,6,13,.15) 26%,rgba(4,6,13,.7) 40%,rgba(4,6,13,.9) 56%,rgba(4,6,13,.97) 100%)'
      : 'transparent'}} />
    <div style={{position: 'absolute', left: -200, right: -200, top: 560, height: 700, background: 'radial-gradient(closest-side, color-mix(in srgb, var(--acc) 28%, transparent), transparent)'}} />

    {/* đầu: chủ đề + nguồn */}
    <div style={{position: 'absolute', top: 90, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', fontSize: 34, fontWeight: 800, letterSpacing: 2, color: 'rgba(248,250,252,.9)', textShadow: '0 3px 14px rgba(0,0,0,.9)'}}>
      <span>{B.top_left || ''}</span>
    </div>

    {/* khối chính */}
    <div style={{position: 'absolute', top: 470, left: 70, right: 70, bottom: 330, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26}}>
      <div style={{display: 'flex', gap: 16, flexWrap: 'wrap'}}>
        {t.tag && <span style={{fontSize: 44, fontWeight: 900, color: '#fff', background: C.red, padding: '10px 24px', borderRadius: 14, letterSpacing: 2}}>{t.tag}</span>}
        {t.badge && <span style={{fontSize: 44, fontWeight: 900, color: '#0b0f1a', background: 'var(--acc)', padding: '10px 24px', borderRadius: 14, letterSpacing: 2}}>{t.badge}</span>}
      </div>
      {num && <div style={{display: 'flex', alignItems: 'baseline', gap: 14, lineHeight: 0.9, marginTop: 8}}>
        <span style={{fontSize: nSize, fontWeight: 900, letterSpacing: -6, color: 'var(--acc)', WebkitTextStroke: '4px rgba(255,255,255,.9)', textShadow: '0 0 60px color-mix(in srgb, var(--acc) 70%, transparent), 0 14px 40px rgba(0,0,0,.8)'}}>{num}</span>
        {unit && <span style={{fontSize: Math.round(nSize * 0.4), fontWeight: 900, color: '#fff', textShadow: '0 8px 30px rgba(0,0,0,.9)'}}>{unit}</span>}
      </div>}
      {title.length > 0 && <div style={{fontSize: tSize, fontWeight: 900, lineHeight: 1.22, color: C.txt, textShadow: '0 6px 24px rgba(0,0,0,.95)'}}>
        {title.map((w, i) => <span key={i} style={w.hl ? {color: '#0b0f1a', background: '#facc15', padding: '0 14px', borderRadius: 12, textShadow: 'none', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone'} as any : {}}>{w.t}</span>)}
      </div>}
      {t.sub && <div style={{fontSize: 48, fontWeight: 700, lineHeight: 1.25, color: 'rgba(226,232,240,.95)', textShadow: '0 4px 18px rgba(0,0,0,.95)'}}>{t.sub}</div>}
    </div>

    {/* đáy: nguồn + credit ảnh */}
    <div style={{position: 'absolute', bottom: 120, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 700, color: 'rgba(203,213,225,.85)'}}>
      <span>{B.source_name ? 'Nguồn: ' + B.source_name : ''}</span><span>{t.image_credit || ''}</span>
    </div>
  </AbsoluteFill>;
};
