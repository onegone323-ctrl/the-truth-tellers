import React, { useEffect, useRef, useState } from 'react';
import { Image } from '@/components/ui/image';
import { ORACLE_ASSETS } from '@/lib/oracleAssets';
import { getVoiceAudioContext } from '@/lib/oracleVoice';
import { playIgnition } from '@/lib/ignitionSound';

// Two faces of the Oracle:
// - Everywhere outside the reading (home, onboarding): her calm, still globe.
// - Only during the reading (immersive): the looping flame video — spinning,
//   drifting through the spectrum while she speaks, settling back when she
//   stops. The flames are the reading's surprise.
const ORACLE_VIDEO = 'https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/d7456e2d6_oracle.mp4';

export default function OracleSphere({ state = 'idle', paused = false, size = 215, immersive = false }) {
  const videoRef = useRef(null);
  const previous = useRef('idle');
  const [error, setError] = useState('');
  const speaking = !paused && state === 'speaking';
  const box = immersive ? `min(${Math.round(size * 1.55)}px, 90vw, 70vh)` : `min(${Math.round(size * 1.55)}px, 90vw)`;

  // Muted autoplay is allowed everywhere; set `muted` imperatively too, since
  // React's muted prop doesn't always reach the DOM attribute.
  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.muted = true;
      el.play().catch(() => { /* a tap elsewhere already unlocks playback */ });
    }
  }, []);

  // Keep the existing ignition sound, but never draw artificial fire.
  useEffect(() => {
    const next = paused ? 'paused' : state;
    if (next === 'speaking' && previous.current !== 'speaking' && previous.current !== 'paused'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      playIgnition(getVoiceAudioContext());
    }
    previous.current = next;
  }, [state, paused]);

  return (
    <div className='flex max-w-full flex-col items-center'>
      <div role='img' aria-label={`truth4clarity globe: ${paused ? 'paused' : state}`}
        className={`relative max-w-full aspect-square ${immersive && speaking ? 'oracle-speaking' : ''}`}
        style={{ width: box }}>
        {immersive ? (
          <video ref={videoRef} src={ORACLE_VIDEO} poster={ORACLE_ASSETS.idle}
            loop autoPlay playsInline preload='auto'
            onError={() => setError('The Oracle could not load.')}
            className='h-full w-full pointer-events-none select-none object-contain' />
        ) : (
          <Image src={ORACLE_ASSETS.idle} alt='' fittingType='fit' quality={95}
            draggable={false} aria-hidden='true'
            className='h-full w-full pointer-events-none select-none'
            onError={() => setError('The Oracle could not load.')} />
        )}
      </div>
      {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}
    </div>
  );
}