const TAU = Math.PI * 2;

// Attached, overlapping flame tongues, not detached circular ember sprites.
export function drawOracleFire(ctx, { cx, cy, r, time, heat, strength, hue }) {
  if (strength < .005) return;
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const angle = i * TAU / 40, seed = i * 2.39996;
    const wave = .5 + .5 * Math.sin(time * 3.8 + seed);
    const lift = .8 + Math.max(0, -Math.sin(angle)) * .35;
    const length = r * (.23 + wave * .32 + heat * .18) * lift;
    const width = r * (.07 + wave * .025);
    const curl = r * (Math.sin(time * 4.4 + seed) * .09 + Math.sin(time * 7.1 + seed) * .035);
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * r * .985, cy + Math.sin(angle) * r * .985);
    ctx.rotate(angle + Math.PI / 2);
    for (let layer = 0; layer < 2; layer++) {
      const w = width * (layer ? .42 : 1), h = length * (layer ? .68 : 1);
      const bend = curl * (layer ? .65 : 1);
      const gradient = ctx.createLinearGradient(0, 2, bend, -h);
      if (layer) {
        gradient.addColorStop(0, 'rgba(255,255,232,.98)');
        gradient.addColorStop(.4, 'rgba(255,231,150,.9)');
        gradient.addColorStop(1, 'rgba(255,210,90,0)');
      } else {
        gradient.addColorStop(0, `hsla(${hue},100%,86%,.96)`);
        gradient.addColorStop(.28, `hsla(${hue},100%,65%,.92)`);
        gradient.addColorStop(.72, `hsla(${hue - 16},100%,55%,.72)`);
        gradient.addColorStop(1, `hsla(${hue + 22},100%,65%,.04)`);
      }
      ctx.globalAlpha = Math.min(1, strength) * (layer ? .95 : .85);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-w, 2);
      ctx.bezierCurveTo(-w * 1.35, -h * .32, bend + w * .55, -h * .56, bend, -h);
      ctx.bezierCurveTo(bend + w * .3, -h * .57, w * 1.5, -h * .34, w, 2);
      ctx.quadraticCurveTo(0, w * .25, -w, 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}