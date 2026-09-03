// Generative ambient engine for the occult atmosphere: a low drone, drifting
// wind, and sparse chimes — all synthesized live in the browser, no audio files.
export function createAmbientEngine() {
  let ctx = null;
  let master = null;
  let delay = null;
  const stoppables = [];
  let chimeTimer = null;
  let running = false;

  // Dark minor voicing — A-based, somber, bell-friendly
  const SCALE = [220.0, 246.94, 261.63, 311.13, 329.63, 392.0, 466.16];

  function buildDrone() {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.5;
    filter.connect(droneGain);
    droneGain.connect(master);

    // Layered low partials with slight detune so the drone slowly breathes
    [[55, 0.35], [82.41, 0.16], [110.4, 0.22], [164.81, 0.07]].forEach(([freq, vol]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = vol;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      stoppables.push(osc);
    });

    // Slow sweep of the drone's tone — the "shimmer" of the veil
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
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

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 320;
    bandpass.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(master);
    noise.start();
    stoppables.push(noise);

    // Wind wanders — its band drifts slowly up and down
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.03;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(bandpass.frequency);
    lfo.start();
    stoppables.push(lfo);
  }

  function buildSpace() {
    delay = ctx.createDelay(2);
    delay.delayTime.value = 0.55;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 1400;
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);
  }

  function chime() {
    if (!running) return;
    const t = ctx.currentTime;
    const base = SCALE[Math.floor(Math.random() * SCALE.length)];
    // Bell-like partials with a long, soft decay into the delay tail
    [1, 2.01, 3.02].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = base * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11 / (i + 1), t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      osc.connect(g);
      g.connect(master);
      g.connect(delay);
      osc.start(t);
      osc.stop(t + 4);
    });
    chimeTimer = setTimeout(chime, 7000 + Math.random() * 9000);
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
      // Fade in gently over three seconds
      master.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 3);
      chimeTimer = setTimeout(chime, 2500);
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