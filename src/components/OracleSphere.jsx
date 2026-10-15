import React, { useEffect, useRef, useState } from 'react';
import { getVoiceAnalyser, getVoiceAudioContext } from '@/lib/oracleVoice';
import { animateOracleAura } from '@/lib/oracleAura';
import { playIgnition } from '@/lib/ignitionSound';
import { Image } from '@/components/ui/image';

// The truth4clarity globe and its living light.
//   calm      → the globe turns slowly on its own.
//   thinking  → it warms: a faint gold breath while the reading is prepared.
//   speaking  → the moment the voice starts, fire ignites around the globe
//               once (with sound), then settles into a blinking aura that
//               drifts through colours and swells with each spoken word.
//   paused    → the aura dims and holds; resuming does not re-ignite.
//   back to calm → the aura fades out and the globe turns again.
const CALM = 'https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/891c987d1_globe.jpg';
// Where the globe sits inside its square artwork (measured from the image).
const CENTER_X = .5, CENTER_Y = .472, RADIUS = .391;
// The light canvas extends this far beyond the globe box on every side so the
// fire has room to rise.
const PAD = .6;

function voiceEnergy(bins) {
  const analyser = getVoiceAnalyser();
  if (!analyser) return 0;
  if (!bins.current || bins.current.length !== analyser.fftSize) bins.current = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(bins.current);
  let sum = 0;
  for (const b of bins.current) sum += ((b - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / bins.current.length) * 7);
}

export default function OracleSphere({ state = 'idle', paused = false, size = 215, immersive = false }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const liveRef = useRef({ mode: 'calm', cx: 0, cy: 0, r: 1 });
  const binsRef = useRef(null);
  const [error, setError] = useState('');

  liveRef.current.mode = paused && state === 'speaking' ? 'paused'
    : state === 'speaking' ? 'live'
    : state === 'thinking' ? 'warming'
    : 'calm';

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const measure = () => {
      const w = root.clientWidth;
      liveRef.current.cx = (PAD + CENTER_X) * w;
      liveRef.current.cy = (PAD + CENTER_Y) * w;
      liveRef.current.r = RADIUS * w;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root); measure();
    let angle = 0;
    const aura = animateOracleAura(canvas, liveRef, {
      getEnergy: () => voiceEnergy(binsRef),
      onIgnite: () => playIgnition(getVoiceAudioContext()),
      onFrame: ({ level, dt }) => {
        // The globe turns only while its light is out — stillness while it speaks.
        if (level < .02 && !reduced.matches) angle = (angle + dt * 15) % 360;
        root.style.setProperty('--angle', `${angle}deg`);
      },
    });
    return () => { aura.stop(); observer.disconnect(); };
  }, []);

  const mask = `radial-gradient(circle closest-side at ${CENTER_X * 100}% ${CENTER_Y * 100}%, #000 80%, transparent 92%)`;
  const box = immersive ? `min(${Math.round(size * 1.55)}px, 90vw, 70vh)` : `min(${Math.round(size * 1.55)}px, 90vw)`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
      <div ref={rootRef} role='img' aria-label={`truth4clarity globe: ${paused ? 'paused' : state}`}
        style={{ position: 'relative', width: box, maxWidth: '100%', aspectRatio: '1', overflow: 'visible', background: 'transparent', '--angle': '0deg' }}>
        <Image src={CALM} alt='' draggable={false} onError={() => setError('The globe image could not load.')}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none',
            transformOrigin: `${CENTER_X * 100}% ${CENTER_Y * 100}%`, transform: 'rotate(var(--angle))', WebkitMaskImage: mask, maskImage: mask }} />
        {/* The light sits above the globe and screens onto it, so fire and aura
            wrap the glass instead of hiding behind the artwork's black field. */}
        <canvas ref={canvasRef} aria-hidden='true'
          style={{ position: 'absolute', inset: `${-PAD * 100}%`, width: `${(1 + PAD * 2) * 100}%`, height: `${(1 + PAD * 2) * 100}%`, pointerEvents: 'none', mixBlendMode: 'screen' }} />
      </div>
      {error && <p role='alert' style={{ color: '#edb5a4', fontSize: 12 }}>{error}</p>}
    </div>
  );
}
