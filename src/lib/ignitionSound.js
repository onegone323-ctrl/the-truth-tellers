// The sound of the globe catching: a low thump, a rushing whoosh that
// sweeps up and settles, a scatter of crackles, and a faint bell as the
// light comes alive. All synthesized on the spot — no audio files.
// Never throws: if the browser refuses audio, the fire is simply silent.

let ownCtx = null;

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function playIgnition(sharedCtx, volume = .42) {
  try {
    const ctx = sharedCtx || ownCtx || (ownCtx = new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime + .01;
    const master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);

    // Whoosh — noise through a sweeping band-pass.
    const whoosh = ctx.createBufferSource(); whoosh.buffer = noiseBuffer(ctx, 2.4);
    const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.Q.value = .8;
    band.frequency.setValueAtTime(140, now);
    band.frequency.exponentialRampToValueAtTime(2600, now + .42);
    band.frequency.exponentialRampToValueAtTime(260, now + 2.1);
    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(1, now + .14);
    whooshGain.gain.exponentialRampToValueAtTime(.001, now + 2.2);
    whoosh.connect(band); band.connect(whooshGain); whooshGain.connect(master);
    whoosh.start(now); whoosh.stop(now + 2.4);

    // Thump — the moment it catches.
    const thump = ctx.createOscillator(); thump.type = "sine";
    thump.frequency.setValueAtTime(110, now); thump.frequency.exponentialRampToValueAtTime(36, now + .5);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(.9, now + .025);
    thumpGain.gain.exponentialRampToValueAtTime(.001, now + .75);
    thump.connect(thumpGain); thumpGain.connect(master);
    thump.start(now); thump.stop(now + .8);

    // Crackle — brief bright ticks scattered through the burn.
    const high = ctx.createBiquadFilter(); high.type = "highpass"; high.frequency.value = 2800;
    const crackleGain = ctx.createGain(); crackleGain.gain.value = .5;
    high.connect(crackleGain); crackleGain.connect(master);
    for (let i = 0; i < 16; i++) {
      const at = now + .1 + Math.random() * 1.6;
      const tick = ctx.createBufferSource(); tick.buffer = noiseBuffer(ctx, .03);
      const g = ctx.createGain();
      g.gain.setValueAtTime(.6 + Math.random() * .4, at);
      g.gain.exponentialRampToValueAtTime(.001, at + .025 + Math.random() * .03);
      tick.connect(g); g.connect(high);
      tick.start(at); tick.stop(at + .06);
    }

    // Bell — a soft, distant tone as the aura settles in.
    [[1318.5, .07], [1975.5, .035], [2637, .02]].forEach(([freq, vol]) => {
      const bell = ctx.createOscillator(); bell.type = "sine"; bell.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, now + .35);
      g.gain.exponentialRampToValueAtTime(vol, now + .55);
      g.gain.exponentialRampToValueAtTime(.0001, now + 3.2);
      bell.connect(g); g.connect(master);
      bell.start(now + .35); bell.stop(now + 3.3);
    });
  } catch (error) {
    // Silent fire is still fire.
  }
}
