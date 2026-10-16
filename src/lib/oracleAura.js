// The Oracle's living light, in four acts:
//   calm    — the globe alone, slowly turning.
//   ignite  — a burst of real fire wraps the globe (with sound) the moment
//             the voice begins.
//   simmer  — the fire NEVER goes out while she speaks: flames keep rising
//             off the rim for the whole reading (brighter with every word),
//             over a blinking aura that drifts through colours.
//   cool    — the aura fades and the globe turns again.
//
// Everything here is Canvas 2D with additive blending — no WebGL, no image
// files — so it draws the same on every phone and laptop.

const TAU = Math.PI * 2;
const IGNITE_SECONDS = 2.6;

// Temperature ramp for fire particles: 1 = white-gold heart, 0 = dying red smoke.
function fireColor(t) {
  if (t > .75) return [255, 236 - (1 - t) * 160, 170 - (1 - t) * 520];
  if (t > .45) { const k = (t - .45) / .3; return [255, 120 + k * 76, 10 + k * 30]; }
  if (t > .18) { const k = (t - .18) / .27; return [150 + k * 105, 12 + k * 108, 6 + k * 4]; }
  const k = t / .18; return [60 + k * 90, 4 + k * 8, 6];
}

function makeSprites() {
  const sprites = [];
  for (let i = 0; i < 24; i++) {
    const [r, g, b] = fireColor(i / 23).map(v => Math.round(Math.max(0, Math.min(255, v))));
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(.35, `rgba(${r},${g},${b},.55)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad; x.fillRect(0, 0, 64, 64);
    sprites.push(c);
  }
  return sprites;
}

// Where the aura's colour travels over time: gold → ember → rose → violet →
// sapphire → teal → back to gold. Each stop lasts about seven seconds.
const HUES = [44, 14, 338, 285, 222, 182, 48];
function auraHue(t) {
  const span = HUES.length - 1, pos = ((t / 7) % span + span) % span;
  const i = Math.floor(pos), k = pos - i, a = HUES[i], b = HUES[i + 1];
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * (k * k * (3 - 2 * k)) + 360) % 360;
}
const hsla = (h, s, l, a) => `hsla(${h.toFixed(1)},${(s * 100).toFixed(0)}%,${(l * 100).toFixed(0)}%,${Math.max(0, Math.min(1, a)).toFixed(3)})`;

export function animateOracleAura(canvas, live, options = {}) {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return { stop() {}, ignite() {}, level: () => 0 };
  const { getEnergy = () => 0, onIgnite = () => {}, onFrame = () => {} } = options;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sprites = makeSprites();

  let frame = 0, last = 0, ratio = 1, disposed = false;
  let time = 0, heat = 0, level = 0, blinkAmp = 0, hueT = 0, prevMode = "calm", prevHeat = 0;
  let igniteAt = -1; // time the fire was lit, -1 when cold
  const flames = [], sparks = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();

  const spawnFlame = (cx, cy, r, hot) => {
    const a = rnd(0, TAU), rim = r * rnd(.86, 1.04);
    const ux = Math.cos(a), uy = Math.sin(a);
    const out = r * rnd(.25, 1.1), up = r * rnd(.5, 1.6);
    flames.push({ x: cx + ux * rim, y: cy + uy * rim, vx: ux * out, vy: uy * out * .55 - up,
      life: 0, ttl: rnd(.6, 1.5) * (hot ? 1 : .7), size: r * rnd(.05, .15), seed: rnd(0, TAU), temp: rnd(.7, .95) });
  };
  const spawnSpark = (cx, cy, r, speed) => {
    const a = rnd(0, TAU), ux = Math.cos(a), uy = Math.sin(a);
    sparks.push({ x: cx + ux * r * 1.02, y: cy + uy * r * 1.02, vx: ux * r * speed * rnd(.6, 1.6), vy: uy * r * speed * rnd(.6, 1.6) - r * rnd(.2, .8),
      life: 0, ttl: rnd(.9, 2.6), size: r * rnd(.012, .03), seed: rnd(0, TAU) });
  };

  const ignite = () => {
    if (reduced.matches) return;
    igniteAt = time; flames.length = 0; sparks.length = 0;
    onIgnite();
  };

  const drawSprite = (p, temp, alpha, size) => {
    const i = Math.max(0, Math.min(23, Math.round(temp * 23)));
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprites[i], p.x - size, p.y - size, size * 2, size * 2);
  };

  const tick = now => {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min((now - last) / 1000, .05) : .016; last = now;
    if (document.hidden) return;
    const { mode = "calm", cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2, r = 100 } = live.current;

    // Transitions. The fire lights exactly once: when the voice first starts.
    if (mode !== prevMode) {
      if (mode === "live" && prevMode !== "paused") { hueT = 0; ignite(); } // the aura is born gold, out of the fire
      prevMode = mode;
    }
    time += dt;

    // Voice heat: fast attack, slow release, so each word lands.
    const energy = mode === "live" ? Math.max(0, Math.min(1, getEnergy())) : 0;
    heat += (energy - heat) * (1 - Math.exp(-dt * (energy > heat ? 14 : 3.2)));
    const burning = igniteAt >= 0 && time - igniteAt < IGNITE_SECONDS;
    const sinceIgnite = igniteAt >= 0 ? time - igniteAt : 99;

    // Aura level: comes up as the fire dies back; dims on pause; fades on calm.
    const targetLevel = mode === "live" ? 1 : mode === "paused" ? .55 : mode === "warming" ? .22 : 0;
    const lagging = burning && sinceIgnite < .7 && mode === "live"; // let the flash own the first beat
    level += ((lagging ? 0 : targetLevel) - level) * (1 - Math.exp(-dt * (mode === "calm" ? 1.6 : 2.2)));
    blinkAmp += ((mode === "live" && !reduced.matches ? 1 : 0) - blinkAmp) * (1 - Math.exp(-dt * 2));
    hueT += dt * (mode === "live" ? 1 + heat * .6 : .35);

    // Words: a jump in loudness throws a few sparks off the rim.
    if (mode === "live" && !burning && heat - prevHeat > .035 && sparks.length < 90)
      for (let i = 0, n = 2 + Math.round(heat * 6); i < n; i++) spawnSpark(cx, cy, r, .9);
    prevHeat = heat;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.globalCompositeOperation = "lighter";

    // ---- The simmering aura -------------------------------------------------
    if (level > .004) {
      const hue = auraHue(hueT);
      const blink = Math.pow(.5 + .5 * Math.sin(time * TAU * .58), 1.7);
      // Blink carries the quiet moments; the voice adds reach and a brighter rim
      // rather than raw brightness, so a loud word never washes the globe out.
      const core = level * (.38 + blinkAmp * blink * .42 * (1 - heat * .55));
      const intensity = Math.min(.95, core + heat * .3 * level);
      const reach = r * (1.55 + heat * .7 + blinkAmp * blink * .08);
      const whiten = Math.min(.15, heat * .18);

      // One halo: a faint wash over the globe, a bright band at the rim, then
      // a long fall-off into the dark. The voice pushes the band outward.
      let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
      const rim = Math.min(.9, (r * .9) / reach);
      g.addColorStop(0, hsla(hue, .95, .62 + whiten, Math.min(.14, intensity * .16)));
      g.addColorStop(rim * .8, hsla(hue, .95, .62 + whiten, Math.min(.18, intensity * .2)));
      g.addColorStop(rim, hsla(hue, .95, .64 + whiten, Math.min(.68, intensity * .85)));
      g.addColorStop(rim + (1 - rim) * .3, hsla(hue, .95, .58, intensity * (.4 + heat * .15)));
      g.addColorStop(rim + (1 - rim) * .65, hsla(hue, .9, .52, intensity * .12));
      g.addColorStop(1, hsla(hue, .9, .5, 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1; ctx.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);

      // Living lobes drifting around the rim so the aura never sits still.
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + time * .17 + Math.sin(time * .9 + i * 1.7) * .25;
        const wob = .55 + .45 * Math.sin(time * 2.1 + i * 2.3);
        const d = r * (1.02 + .1 * Math.sin(time * 1.3 + i));
        const lx = cx + Math.cos(a) * d, ly = cy + Math.sin(a) * d, ls = r * (.42 + heat * .25) * (.7 + wob * .5);
        g = ctx.createRadialGradient(lx, ly, 0, lx, ly, ls);
        g.addColorStop(0, hsla(hue + 18 * Math.sin(time + i), .95, .66 + whiten, intensity * .22 * wob));
        g.addColorStop(1, hsla(hue, .95, .6, 0));
        ctx.fillStyle = g; ctx.fillRect(lx - ls, ly - ls, ls * 2, ls * 2);
      }

      // Bright rim — the line where the globe meets its light.
      ctx.globalAlpha = Math.min(1, intensity * 1.1 + heat * .15);
      ctx.lineWidth = r * (.028 + heat * .018);
      ctx.strokeStyle = hsla(hue, .9, .74 + whiten, 1);
      ctx.shadowColor = hsla(hue, .95, .62, 1); ctx.shadowBlur = r * .4;
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.005, 0, TAU); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ---- Ignition: one burst of fire ----------------------------------------
    if (burning) {
      const t = sinceIgnite;
      // A flash of light in the first half second.
      if (t < .6) {
        const k = 1 - t / .6;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (1.05 + t * .9));
        g.addColorStop(0, `rgba(255,246,214,${(k * k * .7).toFixed(3)})`);
        g.addColorStop(.4, `rgba(255,170,60,${(k * .3).toFixed(3)})`);
        g.addColorStop(1, "rgba(255,80,20,0)");
        ctx.fillStyle = g; ctx.globalAlpha = 1;
        ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
      }
      // Fuel: heavy for the first second, then starved.
      const fuel = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / .9);
      for (let i = 0, n = Math.round(fuel * 22 * (dt * 60)); i < n; i++) spawnFlame(cx, cy, r, t < .9);
      if (t < 1.4) for (let i = 0, n = Math.round(fuel * 5 * (dt * 60)); i < n; i++) spawnSpark(cx, cy, r, 2.2);
    } else if (mode === "live" && !reduced.matches) {
      // The steady burn: while her voice runs the fire keeps rising off the
      // rim — a thinner crown than the ignition burst, breathing with the
      // words (heat pushes more flames up).
      for (let i = 0, n = Math.round(2 + heat * 6); i < n; i++) spawnFlame(cx, cy, r, true);
    }

    // ---- Particles ------------------------------------------------------------
    for (let i = flames.length - 1; i >= 0; i--) {
      const p = flames[i]; p.life += dt;
      if (p.life >= p.ttl) { flames.splice(i, 1); continue; }
      const k = p.life / p.ttl;
      // Turbulence and buoyancy: flames curl and lift as they cool.
      p.vx += (Math.sin(time * 6.5 + p.seed + p.y * .02) * .9 + Math.sin(time * 11 + p.seed * 3) * .4) * r * dt * 1.8;
      p.vy -= r * dt * (1.6 + k * 1.4);
      p.vx *= 1 - dt * 1.4; p.vy *= 1 - dt * .55;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const temp = Math.max(0, p.temp * (1 - k * 1.05));
      const size = p.size * (0.7 + Math.sin(k * Math.PI) * 1.1 + k * .9);
      drawSprite(p, temp, (1 - k) * (k < .12 ? k / .12 : 1) * .55, size);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i]; p.life += dt;
      if (p.life >= p.ttl) { sparks.splice(i, 1); continue; }
      const k = p.life / p.ttl;
      p.vx += Math.sin(time * 9 + p.seed) * r * dt * 1.2; p.vy -= r * dt * .5;
      p.vx *= 1 - dt * .9; p.vy *= 1 - dt * .9;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const flicker = .55 + .45 * Math.sin(time * 23 + p.seed * 5);
      drawSprite(p, .92 - k * .5, (1 - k) * flicker, p.size * (1 + k) * 2.2);
    }

    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    onFrame({ level, heat, burning, dt, time });
  };
  frame = requestAnimationFrame(tick);

  return {
    ignite,
    level: () => level,
    stop() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); },
  };
}