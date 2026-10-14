import React, { useEffect, useRef, useState } from 'react';
import { getVoiceAnalyser } from '@/lib/oracleVoice';

const CALM = 'https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/891c987d1_globe.jpg';
const FIRE = 'https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/4eec5cc5e_globe1.jpg';

export default function OracleSphere({ state = 'idle', size = 215 }) {
  const rootRef = useRef(null);
  const stateRef = useRef(state);
  const visualRef = useRef({ angle: 0, hue: 0, heat: 0, level: 0 });
  const [error, setError] = useState('');
  stateRef.current = state;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    let width = 1, height = 1, frame = 0, last = performance.now(), bins = null;
    const visual = visualRef.current;
    const resize = () => {
      width = root.clientWidth; height = root.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(root); resize();
    const particles = Array.from({ length: 100 }, () => ({ a: Math.random() * Math.PI * 2, life: Math.random(), rate: .2 + Math.random() * .4 }));
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
      visual.heat += (target - visual.heat) * (1 - Math.exp(-dt * 9));
      visual.level += ((speaking ? 1 : 0) - visual.level) * (1 - Math.exp(-dt * 3));
      if (!speaking && visual.level < .025) visual.angle = (visual.angle + dt * 18) % 360;
      if (speaking) visual.hue = (visual.hue + dt * (12 + visual.heat * 60)) % 360;
      root.style.setProperty('--angle', `${visual.angle}deg`);
      root.style.setProperty('--fire', `${visual.level * (.65 + visual.heat * .35)}`);
      root.style.setProperty('--hue', `${visual.hue}deg`);
      root.style.setProperty('--scale', `${1.28 * (1 + visual.heat * .055)}`);
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (visual.level < .01) return;
      for (const p of particles) {
        p.life += dt * p.rate * (1 + visual.heat);
        if (p.life > 1) { p.life = 0; p.a = Math.random() * Math.PI * 2; }
        const r = .37 + p.life * .17;
        const x = width * (.5 + Math.cos(p.a) * r);
        const y = height * (.49 + Math.sin(p.a) * r - p.life * .08);
        const alpha = visual.level * (1 - p.life) * (.35 + visual.heat * .65);
        ctx.fillStyle = `hsla(${(visual.hue + p.a * 40) % 360},100%,75%,${alpha})`;
        ctx.shadowColor = `hsl(${visual.hue},100%,55%)`; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, 1 + p.life, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  const imageStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen', pointerEvents: 'none', userSelect: 'none', transformOrigin: '50% 49%' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
      <div ref={rootRef} role='img' aria-label={`truth4clarity globe: ${state}`} style={{ position: 'relative', width: `min(${Math.round(size * 1.55)}px, 90vw)`, maxWidth: '100%', aspectRatio: '1', overflow: 'hidden', isolation: 'isolate', background: 'transparent', '--angle': '0deg', '--fire': 0, '--hue': '0deg', '--scale': 1.28 }}>
        <img src={CALM} alt='' draggable={false} onError={() => setError('The calm globe image could not load.')} style={{ ...imageStyle, transform: 'rotate(var(--angle))' }} />
        <img src={FIRE} alt='' draggable={false} onError={() => setError('The fire image could not load.')} style={{ ...imageStyle, opacity: 'var(--fire)', transform: 'scale(var(--scale))', filter: 'hue-rotate(var(--hue)) saturate(1.2)' }} />
        <canvas aria-hidden='true' style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
      </div>
      {error && <p role='alert' style={{ color: '#edb5a4', fontSize: 12 }}>{error}</p>}
    </div>
  );
}