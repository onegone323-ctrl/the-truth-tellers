import React, { useEffect, useRef, useState } from 'react';
import { Image } from '@/components/ui/image';
import { ORACLE_ASSETS } from '@/lib/oracleAssets';
import { getVoiceAudioContext } from '@/lib/oracleVoice';
import { playIgnition } from '@/lib/ignitionSound';

export default function OracleSphere({ state = 'idle', paused = false, size = 215, immersive = false }) {
  const previous = useRef('idle');
  const [error, setError] = useState('');
  const active = paused ? 'idle' : Object.hasOwn(ORACLE_ASSETS, state) ? state : 'idle';
  const box = immersive ? `min(${Math.round(size * 1.55)}px, 90vw, 70vh)` : `min(${Math.round(size * 1.55)}px, 90vw)`;

  // Preserve the existing ignition sound, but never draw artificial fire.
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
        className='relative max-w-full aspect-square' style={{ width: box }}>
        {Object.entries(ORACLE_ASSETS).map(([name, src]) => (
          <Image key={name} src={src} alt='' fittingType='fit' loading='eager' quality={95}
            draggable={false} aria-hidden='true'
            className={`absolute inset-0 h-full w-full pointer-events-none select-none ${name === active ? 'opacity-100' : 'opacity-0'}`}
            style={{ mixBlendMode: 'screen' }}
            onError={() => setError('An Oracle image could not load.')} />
        ))}
      </div>
      {error && <p role='alert' className='text-sm text-destructive'>{error}</p>}
    </div>
  );
}