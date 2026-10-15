import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import OracleSphere from '@/components/OracleSphere';
import { Link } from 'react-router-dom';
import { Pause, Play, RotateCcw, RefreshCw, Volume2, X } from 'lucide-react';

const tinyBtn = { padding: '5px 12px', fontSize: 12, minHeight: 34, letterSpacing: 1.5 };

export default function ReadingStage({
  state, busy, voiceBusy, voicePaused, error, outOfCredits,
  onPauseToggle, onRewind, onSpeak, onReset, onRetry,
}) {
  const [size, setSize] = useState(200);
  useEffect(() => {
    const fit = () => setSize(Math.round(Math.min(window.innerWidth * 0.4, window.innerHeight * 0.36)));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fit();
    window.addEventListener('resize', fit);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('resize', fit);
    };
  }, []);
  const speaking = state === 'speaking';
  return createPortal(
    <div data-reading-stage className='fixed inset-0 z-[100] flex h-[100dvh] flex-col items-center overflow-hidden bg-reading-void' style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <button onClick={onReset} aria-label='Leave the reading' className='neo-pill absolute right-3 z-20 flex items-center justify-center' style={{ top: 'max(12px, env(safe-area-inset-top))', width: 34, height: 34, padding: 0 }}><X className='w-3.5 h-3.5' /></button>
      <div className='relative flex-1 min-h-0 w-full flex items-center justify-center'>
        <div className='relative pointer-events-none' style={{ animation: 'orbRise 0.9s ease-out both' }}>
          <OracleSphere state={state} paused={voicePaused} size={size} immersive />
        </div>
      </div>
      {error && !busy && <p className='relative px-6 pb-3 text-center' style={{ color: '#b1a38b', fontSize: 12, maxWidth: 420 }}>{error}</p>}
      <div className='relative flex flex-wrap items-center justify-center gap-2 pb-5 px-4'>
        {(voiceBusy || speaking) && <>
          <button onClick={onPauseToggle} className='neo-pill flex items-center gap-1.5' style={tinyBtn}>{voicePaused ? <Play className='w-3 h-3' /> : <Pause className='w-3 h-3' />}{voicePaused ? 'Resume' : 'Pause'}</button>
          <button onClick={onRewind} className='neo-pill flex items-center gap-1.5' style={tinyBtn}><RotateCcw className='w-3 h-3' /> Rewind</button>
        </>}
        {error && !busy && <>
          {outOfCredits ? <Link to='/pricing' className='neo-button' style={tinyBtn}>Get More Readings</Link> : <button onClick={onRetry} className='neo-button' style={tinyBtn}>Try Again</button>}
          <button onClick={onReset} className='neo-pill' style={tinyBtn}>Another Reading</button>
        </>}
        {!error && !busy && !voiceBusy && !speaking && <>
          <button onClick={onSpeak} className='neo-button flex items-center gap-1.5' style={tinyBtn}><Volume2 className='w-3 h-3' /> Hear Her Voice</button>
          <button onClick={onReset} className='neo-pill flex items-center gap-1.5' style={tinyBtn}><RefreshCw className='w-3 h-3' /> Another Reading</button>
        </>}
      </div>
      <style>{`@keyframes orbRise { from { transform: translateY(60px) scale(0.85); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
    </div>,
    document.body
  );
}
