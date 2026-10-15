import React, { useEffect, useRef, useState } from 'react';
import { animateOracleFlames } from '@/lib/oracleFlames';

export default function OracleFlames({ active, radius }) {
  const canvasRef = useRef(null);
  const liveRef = useRef({ active, radius });
  const timerRef = useRef(null);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('Waiting for canvas');
  liveRef.current = { active: active || testing, radius };
  useEffect(() => {
    const canvas = canvasRef.current;
    let stop;
    try { stop = animateOracleFlames(canvas, liveRef); }
    catch (error) { canvas.dataset.flameError = String(error.message || error); }
    const inspect = () => {
      const r = canvas.getBoundingClientRect();
      const error = canvas.dataset.flameError;
      const loop = canvas.dataset.voiceEnergy !== undefined;
      setStatus(`${error ? 'ERROR: ' + error : loop ? 'Animation loop updating (visibility not verified)' : 'No animation update recorded'} | Canvas ${Math.round(r.width)} x ${Math.round(r.height)} | Buffer ${canvas.width} x ${canvas.height} | Ignition ${liveRef.current.active ? 'ON' : 'OFF'} | Voice ${canvas.dataset.voiceEnergy ?? 'unavailable'}`);
    };
    inspect();
    const interval = setInterval(inspect, 500);
    return () => { clearInterval(interval); clearTimeout(timerRef.current); if (typeof stop === 'function') stop(); };
  }, []);
  const test = () => {
    clearTimeout(timerRef.current);
    const next = !testing;
    liveRef.current = { active: active || next, radius };
    setTesting(next);
    if (next) timerRef.current = setTimeout(() => { liveRef.current = { ...liveRef.current, active }; setTesting(false); }, 10000);
  };
  return <>
    <canvas ref={canvasRef} data-oracle-flames data-flame-diagnostic-version='ignition-v1' aria-hidden='true' style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    <aside aria-label='Temporary flame diagnostics' style={{ position: 'fixed', left: 12, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 1000, maxWidth: 'min(440px, calc(100vw - 24px))', padding: 10, background: 'rgba(12,10,8,.95)', border: '1px solid #d4af37', borderRadius: 8, color: '#fff0c7', pointerEvents: 'auto', font: '12px/1.5 monospace', overflowWrap: 'anywhere' }}>
      <button type='button' onClick={test} aria-pressed={testing} style={{ minHeight: 44, padding: '8px 14px', background: '#d4af37', color: '#090806', border: 0, borderRadius: 5, cursor: 'pointer' }}>{testing ? 'Stop flame test' : 'Test flames (10 seconds)'}</button>
      <div>Diagnostic ignition-v1 | {testing ? 'TEST ACTIVE: speech not required' : 'Normal playback trigger'}</div>
      <output style={{ display: 'block' }}>{status}</output>
      <div>This panel is temporary. A running loop does not confirm visible fire.</div>
    </aside>
  </>;
}
