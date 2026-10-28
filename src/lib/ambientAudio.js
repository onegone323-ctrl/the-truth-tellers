// Generative ambient engine for the occult atmosphere: a warm low drone,
// a breath of wind, and rare soft chimes — all synthesized live in the browser,
// no audio files. Tuned for comfort: deeper, quieter, slower moving.
export function createAmbientEngine() {
  let ctx = null;
  let master = null;
  let delay = null;
  const stoppables = [];
  let chimeTimer = null;
  let running = false;

  // Warm open-fifth voicing in D — deep, settled, no sharp edges.
  const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88];

  function buildDrone() {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    // A soft roll-off leaves the lows round instead of muffled.
    filter.Q.value = 0.4;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.5;
    filter.connect(droneGain);
    droneGain.connect(master);

    // Layered low partials. Each is doubled a few cents sharp so the pair
    // beats very slowly — that gentle sway is what makes it feel warm.
    [[73.42, 0.34], [110.0, 0.18], [146.83, 0.16], [220.0, 0.05]].forEach(([freq, vol]) => {
      [[0, 1], [5, 0.45]].forEach(([cents, scale]) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.value = vol * scale;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        stoppables.push(osc);
      });
    });

    // Slow sweep of the drone's tone — a breath in the veil, never a wobble.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.035;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    stoppables.push(lfo);
  }

  function buildWind() {
    const length = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Lower and narrower than before — a distant draught, not a hiss.
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 260;
    bandpass.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.02;
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(master);
    noise.start();
    stoppables.push(noise);

    // The draught drifts so slowly it's barely noticeable.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.02;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);
    lfo.start();
    stoppables.push(lfo);
  }

  function buildSpace() {
    delay = ctx.createDelay(2);
    delay.delayTime.value = 0.7;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 900;
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);
  }

  function chime() {
    if (!running) return;
    const t = ctx.currentTime;
    const base = SCALE[Math.floor(Math.random() * SCALE.length)];
    // Soft, low bell partials with a long decay into the tail. Quiet on
    // purpose — they should arrive like a distant thought.
    [1, 2.01].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 / (i + 1), t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
      osc.connect(g);
      g.connect(master);
      g.connect(delay);
      osc.start(t);
      osc.stop(t + 5.2);
    });
    // Rare: one every 16–30 seconds.
    chimeTimer = setTimeout(chime, 16000 + Math.random() * 14000);
  }

  return {
    start() {
      if (running) return;
      running = true;
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      buildDrone();
      buildWind();
      buildSpace();
      // Ease in over five seconds, and sit lower in the mix than before.
      master.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 5);
      chimeTimer = setTimeout(chime, 6000);
    },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(chimeTimer);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        stoppables.forEach((n) => { try { n.stop(); } catch (e) {} });
        try { ctx.close(); } catch (e) {}
        stoppables.length = 0;
      }, 1100);
    },
  };
}