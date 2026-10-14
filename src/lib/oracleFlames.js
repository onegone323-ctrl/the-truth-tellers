import { getVoiceAnalyser } from "@/lib/oracleVoice";

// Long, asymmetric flame ribbons fill the stage, not a circular image mask.
export function animateOracleFlames(canvas, live) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  let width = 0, height = 0, frame = 0, last = 0, heat = 0, level = 0;
  let bins = null;
  const ribbons = Array.from({ length: 48 }, (_, i) => ({
    side: i % 2 ? 1 : -1,
    offset: Math.random(),
    phase: Math.random() * Math.PI * 2,
    reach: 0.35 + Math.random() * 0.65,
    speed: 0.6 + Math.random(),
  }));
  const resize = () => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas); resize();
  const tick = now => {
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    if (document.hidden) return;
    const { active, radius } = live.current;
    const analyser = active ? getVoiceAnalyser() : null;
    let energy = 0;
    if (analyser) {
      if (!bins || bins.length !== analyser.fftSize) bins = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(bins);
      for (const b of bins) energy += ((b - 128) / 128) ** 2;
      energy = Math.min(1, Math.sqrt(energy / bins.length) * 7);
    }
    heat += (energy - heat) * (1 - Math.exp(-dt * 12));
    level += ((active ? 1 : 0) - level) * (1 - Math.exp(-dt * 5));
    canvas.dataset.voiceEnergy = heat.toFixed(3);
    ctx.clearRect(0, 0, width, height);
    if (level < 0.01) return;
    const t = now / 1000, cx = width / 2, cy = height / 2;
    ctx.globalCompositeOperation = "lighter";
    for (const p of ribbons) {
      const flow = Math.sin(t * p.speed * 2 + p.phase);
      const x = cx + p.side * radius * (0.15 + p.offset * 0.75);
      const y = cy + radius * (0.1 + p.offset * 0.55);
      const tipX = cx + p.side * (radius * 0.4 + width * p.reach * (0.12 + heat * 0.4)) + flow * radius * 0.3;
      const tipY = y - (radius * 1.2 + height * p.reach * (0.1 + heat * 0.65));
      const bendX = x + p.side * radius * (0.2 + heat * 0.65);
      const sway = Math.sin(t * 3 + p.phase) * radius * (0.08 + heat * 0.15);
      const thickness = radius * (0.08 + heat * 0.2) * (0.45 + p.reach * 0.55);
      const hue = 10 + 30 * (0.5 + Math.sin(t * 0.3 + p.phase) * 0.5);
      const gradient = ctx.createLinearGradient(x, y, tipX, tipY);
      gradient.addColorStop(0, `hsla(42,100%,85%,${level * (0.08 + heat * 0.13)})`);
      gradient.addColorStop(0.25, `hsla(${hue},100%,58%,${level * (0.1 + heat * 0.24)})`);
      gradient.addColorStop(0.65, `hsla(${hue * 0.4},100%,45%,${level * (0.03 + heat * 0.1)})`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.moveTo(x - thickness, y);
      ctx.bezierCurveTo(bendX - thickness + sway, y - radius * 0.6, tipX + sway - thickness, tipY + radius * 0.4, tipX, tipY);
      ctx.bezierCurveTo(tipX + sway + thickness, tipY + radius * 0.4, bendX + thickness + sway, y - radius * 0.6, x + thickness, y);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };
  frame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(frame); observer.disconnect(); ctx.clearRect(0, 0, width, height); };
}