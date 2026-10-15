import React, { useEffect, useRef, useState } from 'react';
import { getVoiceAnalyser } from '@/lib/oracleVoice';
import { Image } from '@/components/ui/image';
import OracleFlames from '@/components/OracleFlames';

const CALM = 'https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/891c987d1_globe.jpg';

export default function OracleSphere({ state = 'idle', size = 215, immersive = false }) {
  const rootRef = useRef(null);
  const stateRef = useRef(state);
  const visualRef = useRef({ angle: 0, heat: 0, level: 0 });
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(size * .57);
  stateRef.current = state;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => setRadius(root.clientWidth * (.57 / 1.55));
    const observer = new ResizeObserver(resize);
    observer.observe(root); resize();
    let frame = 0, last = performance.now(), bins;
    const visual = visualRef.current;
    const tick = now => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (document.hidden) return;
      const speaking = stateRef.current === 'speaking';
      const analyser = speaking ? getVoiceAnalyser() : null;
      let target = 0;
      if (analyser) {
        if (!bins || bins.length !== analyser.fftSize) bins = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(bins);
        let sum = 0;
        for (const b of bins) sum += ((b - 128) / 128) ** 2;
        target = Math.min(1, Math.sqrt(sum / bins.length) * 7);
      }
      visual.heat += (target - visual.heat) * (1 - Math.exp(-dt * 6));
      visual.level += ((speaking ? 1 : 0) - visual.level) * (1 - Math.exp(-dt * (speaking ? 4 : 2.5)));
      if (!speaking && visual.level < .005 && !reduced.matches) visual.angle = (visual.angle + dt * 18) % 360;
      root.style.setProperty('--angle', `${visual.angle}deg`);
      root.style.setProperty('--light', `${visual.level * (.18 + visual.heat * .45)}`);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  const fade = 'radial-gradient(circle at 50% 49%, #000 62%, transparent 72%)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
      <div ref={rootRef} role='img' aria-label={`truth4clarity globe: ${state}`} style={{ position: 'relative', width: `min(${Math.round(size * 1.55)}px, 90vw)`, maxWidth: '100%', aspectRatio: '1', overflow: 'visible', background: 'transparent', '--angle': '0deg', '--light': 0 }}>
        {!immersive && <div aria-hidden='true' style={{ position: 'absolute', inset: '-70% -35%', pointerEvents: 'none' }}><OracleFlames active={state === 'speaking'} radius={radius} /></div>}
        <Image src={CALM} alt='' draggable={false} onError={() => setError('The globe image could not load.')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', transformOrigin: '50% 49%', transform: 'rotate(var(--angle))', WebkitMaskImage: fade, maskImage: fade }} />
        <div aria-hidden='true' style={{ position: 'absolute', inset: '12%', borderRadius: '50%', pointerEvents: 'none', opacity: 'var(--light)', background: 'radial-gradient(ellipse at 20% 72%, rgba(255,63,18,.45), transparent 48%), radial-gradient(ellipse at 78% 30%, rgba(255,207,107,.36), transparent 45%)', boxShadow: 'inset 8px -9px 20px rgba(255,84,25,.5), inset -6px 5px 17px rgba(255,213,129,.4), 0 0 28px rgba(218,67,12,.18)', mixBlendMode: 'screen' }} />
      </div>
      {error && <p role='alert' style={{ color: '#edb5a4', fontSize: 12 }}>{error}</p>}
    </div>
  );
}
