import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ORACLE_FIRE_FRAMES } from "@/lib/oracleFireAssets";
import { splitForSpeech, fetchClips, getSilentWavSrc } from "@/lib/oracleVoice";
import { toSpokenText } from "@/lib/speechText";
import { base44 } from "@/api/base44Client";
import OracleReadingVideo from "@/components/OracleReadingVideo";

const LAYERS = ["dormant", "open", "spark", "ignite", "gold", "red", "blue", "green", "purple", "simmer"];
const FIRE_LAYERS = ["open", "spark", "ignite", "gold", "red", "blue", "green", "purple"];
const COLORS = ["gold", "red", "blue", "green", "purple"];
const CROSS = { open: 1500, spark: 1000, ignite: 1000, simmer: 1800, dormant: 2200, color: 900 };
// The Oracle Fire picker: "dance" cycles every flame; a single color holds.
const AURA_COLORS = {
  dance: COLORS,
  gold: ["gold"],
  violet: ["purple"],
  azure: ["blue"],
  ember: ["red"],
  emerald: ["green"],
};

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- ONE Oracle, wherever she appears ----
// The hero and the reading view render this component twice, but the state
// machine, the opacities and the voice element live here at module scope —
// so the fire never skips a beat when the page repositions her.
const fire = {
  opacity: Object.fromEntries(LAYERS.map((l) => [l, l === "dormant" ? 1 : 0])),
  z: Object.fromEntries(LAYERS.map((l) => [l, 1])),
  topZ: 1,
  fades: [],
  state: "dormant",
  aura: "dance",
  level: 0,
  levels: [],
  cycle: null,
  paused: false,
  rewindFlag: false,
  run: 0,
  generating: false,
  pendingPlay: false,
  payload: null,
  handlers: null,
  reading: null,
  captionParts: [],
  audio: null,
  ctx: null,
  analyser: null,
  srcNode: null,
  onState: null,
  onCaption: null,
};
const imgRefs = {};

const fade = (layer, to, dur) => {
  // Whatever fades in goes on top, so crossfades read correctly.
  if (to > fire.opacity[layer]) {
    fire.z[layer] = ++fire.topZ;
    const el = imgRefs[layer];
    if (el) el.style.zIndex = fire.z[layer];
  }
  fire.fades = fire.fades.filter((f) => f.layer !== layer);
  fire.fades.push({ layer, from: fire.opacity[layer], to, start: performance.now(), dur });
};

const setFireState = (s) => {
  fire.state = s;
  fire.onState?.(s);
};

const pushCaption = (part) => {
  fire.captionParts = [...fire.captionParts, part];
  fire.onCaption?.(fire.captionParts);
};

const getAudio = () => {
  if (!fire.audio) fire.audio = new Audio();
  return fire.audio;
};

// One AudioContext + analyser on her voice element — created inside the tap
// that asks for the reading, where browsers allow it. If the analyser fails,
// the loop falls back to a breathing pattern so the fire still moves.
const ensureAudioGraph = () => {
  const el = getAudio();
  try {
    if (!fire.ctx) fire.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (fire.ctx.state === "suspended") fire.ctx.resume().catch(() => {});
    if (!fire.srcNode) {
      fire.srcNode = fire.ctx.createMediaElementSource(el);
      fire.analyser = fire.ctx.createAnalyser();
      fire.analyser.fftSize = 256;
      fire.analyser.smoothingTimeConstant = 0.72;
      fire.srcNode.connect(fire.analyser);
      fire.analyser.connect(fire.ctx.destination);
    }
  } catch (e) {
    fire.analyser = null;
  }
  // A silent clip inside the gesture unlocks later playback without another tap.
  el.src = getSilentWavSrc();
  el.play().catch(() => {});
};

// Faster when her voice is loud for a stretch, slower when she speaks softly.
const cycleDuration = () => {
  const now = performance.now();
  const recent = fire.levels.filter((l) => now - l.t < 1000);
  const avg = recent.length ? recent.reduce((n, x) => n + x.v, 0) / recent.length : 0;
  if (avg > 0.5) return 1600;
  if (avg < 0.15) return 3000;
  return 2400;
};

const advanceColor = (now) => {
  const palette = AURA_COLORS[fire.aura] || COLORS;
  if (palette.length === 1) {
    // A single aura holds only its color — no cycling.
    const c = palette[0];
    fade(c, 1, CROSS.color);
    for (const l of COLORS) if (l !== c && fire.opacity[l] > 0) fade(l, 0, CROSS.color);
    fire.cycle = { color: c, holdUntil: Infinity };
    return;
  }
  const prev = fire.cycle ? fire.cycle.color : null;
  let idx = prev ? palette.indexOf(prev) + 1 : 0;
  if (idx < 0 || idx >= palette.length) idx = 0;
  const c = palette[idx];
  fade(c, 1, CROSS.color);
  // Fade out anything not in the current palette — covers an aura switched
  // mid-speech.
  for (const l of COLORS) if (l !== c && fire.opacity[l] > 0) fade(l, 0, CROSS.color);
  fire.cycle = { color: c, holdUntil: now + cycleDuration() };
};

// Plays one audio clip; resolves "ended" | "error" | "blocked".
const playChunk = (src, onPlaying) =>
  new Promise((resolve) => {
    const el = getAudio();
    let settled = false;
    const done = (r) => {
      if (settled) return;
      settled = true;
      el.onended = null;
      el.onerror = null;
      resolve(r);
    };
    el.onended = () => done("ended");
    el.onerror = () => done("error");
    el.src = src;
    el.play()
      .then(() => {
        if (!settled) onPlaying?.();
      })
      .catch((e) => done(e?.name === "NotAllowedError" ? "blocked" : "error"));
  });

// The reading request — the existing oracle function, untouched. Entitlements
// and OracleUsage tracking live server-side inside it, exactly as they were.
const runGeneration = async () => {
  const myRun = ++fire.run;
  fire.generating = true;
  try {
    const res = await base44.functions.invoke("generateReading", fire.payload);
    if (myRun !== fire.run) return;
    const text = res?.data?.reading;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("The reading service returned no reading.");
    }
    fire.reading = text;
    const snippet = !!res?.data?.snippet;
    fire.handlers?.onComplete?.({
      reading: text,
      snippet,
      message: res?.data?.message,
    });
    // She starts the reading herself — no tap needed.
    if (!snippet) speakChain();
  } catch (e) {
    if (myRun !== fire.run) return;
    fire.reading = null;
    fire.handlers?.onError?.(e);
    toRest();
  } finally {
    if (myRun === fire.run) fire.generating = false;
  }
};

// Speaking done (or failed): the fire simmers, rests, and returns to dormant.
const toRest = async () => {
  const myRun = fire.run;
  fire.cycle = null;
  fire.handlers?.onVoiceEnd?.();
  setFireState("simmering");
  fade("simmer", 1, CROSS.simmer);
  for (const l of FIRE_LAYERS) fade(l, 0, CROSS.simmer);
  await wait(CROSS.simmer + 3200);
  if (myRun !== fire.run) return;
  setFireState("resting");
  fade("dormant", 1, CROSS.dormant);
  fade("simmer", 0, CROSS.dormant);
  for (const l of FIRE_LAYERS) fire.opacity[l] = 0;
  await wait(CROSS.dormant);
  if (myRun !== fire.run) return;
  setFireState("dormant");
  fire.handlers?.onDone?.();
};

// Ignite → think while her voice is fetched → speak with the color cycle.
const speakChain = async () => {
  const myRun = ++fire.run;
  fire.rewindFlag = false;
  fire.paused = false;
  fire.cycle = null;
  fire.captionParts = [];
  fire.onCaption?.([]);
  // She stays calm while her voice is fetched — the fire ignites the moment
  // her voice is ready, not before.
  setFireState("thinking");

  const igniteNow = () => {
    setFireState("igniting");
    fade("spark", 1, CROSS.spark);
    fade("open", 0, CROSS.spark);
    wait(CROSS.spark).then(() => {
      if (myRun !== fire.run) return;
      fade("ignite", 1, CROSS.ignite);
      fade("spark", 0, CROSS.ignite);
    });
  };

  const spoken = toSpokenText(fire.reading || "");
  const parts = splitForSpeech(spoken);
  if (!parts.length) {
    fire.handlers?.onError?.(new Error("The reading had nothing to speak."));
    return toRest();
  }
  // The first piece arrives in a couple of seconds; later pieces load while
  // she talks — the same prefetch pattern the voice service was built for.
  const pending = [];
  const prefetch = (i) => {
    if (i < parts.length && !pending[i]) pending[i] = fetchClips(parts[i]);
  };
  let started = false;
  let ignited = false;
  const onPlaying = () => {
    if (!started) {
      started = true;
      setFireState("speaking");
      fire.cycle = null;
      fire.handlers?.onVoiceStart?.();
    }
  };
  const missed = [];
  for (let i = 0; i < parts.length; i++) {
    prefetch(i);
    prefetch(i + 1);
    prefetch(i + 2);
    const clips = await pending[i];
    if (myRun !== fire.run) return;
    if (!clips) {
      missed.push(i);
      continue;
    }
    // The fire ignites as her first words land, and burns for the whole reading.
    if (!ignited) {
      ignited = true;
      igniteNow();
    }
    pushCaption(parts[i]);
    for (let k = 0; k < clips.length; k++) {
      const result = await playChunk("data:audio/mpeg;base64," + clips[k], onPlaying);
      if (myRun !== fire.run) return;
      if (result === "blocked") {
        fire.handlers?.onBlocked?.();
        return toRest();
      }
      if (result === "error") {
        missed.push(i);
        break;
      }
      if (fire.rewindFlag) {
        fire.rewindFlag = false;
        if (k === 0) k = -1;
        else k -= 2;
      }
    }
  }
  // Anything the voice service dropped gets one more pass — she never leaves
  // a piece of the reading unsaid.
  for (const i of missed) {
    const clips = await fetchClips(parts[i]);
    if (myRun !== fire.run) return;
    if (!clips) continue;
    if (!ignited) {
      ignited = true;
      igniteNow();
    }
    pushCaption(parts[i]);
    for (let k = 0; k < clips.length; k++) {
      const result = await playChunk("data:audio/mpeg;base64," + clips[k], onPlaying);
      if (myRun !== fire.run) return;
      if (result === "blocked") {
        fire.handlers?.onBlocked?.();
        return toRest();
      }
    }
  }
  if (!started) {
    fire.handlers?.onBlocked?.();
    return toRest();
  }
  await toRest();
};

const OracleFire = forwardRef(function OracleFire(
  { mode = "dormant", aura = "dance", width, fill = false, showVideo = false, className = "" },
  ref
) {
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const [state, setState] = useState(fire.state);

  // The latest mounted instance owns the shared listeners.
  useEffect(() => {
    fire.onState = setState;
    return () => {
      if (fire.onState === setState) fire.onState = null;
    };
  }, []);

  // Outside a reading, the hero follows the page: dormant, or "open" while
  // the seeker speaks their question into the mic.
  useEffect(() => {
    if (fire.state !== "dormant") return;
    if (mode === "open") {
      fade("open", 1, 1200);
      fade("dormant", 0, 1200);
    } else {
      fade("dormant", 1, 1200);
      fade("open", 0, 1200);
    }
  }, [mode]);

  // The seeker's chosen fire: applied instantly, even mid-speech.
  useEffect(() => {
    fire.aura = aura;
    if (fire.state === "speaking" && !fire.paused) advanceColor(performance.now());
  }, [aura]);

  // The single animation loop: crossfades, voice-reactive level, color cycle,
  // and the flicker/scale on the stage. Reduced motion keeps only crossfades.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const freq = new Uint8Array(128);
    let raf;
    let lastFrame = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(100, now - (lastFrame || now - 16));
      lastFrame = now;
      for (const f of fire.fades) {
        const t = Math.min(1, (now - f.start) / f.dur);
        fire.opacity[f.layer] = f.from + (f.to - f.from) * easeInOut(t);
        const el = imgRefs[f.layer];
        if (el) el.style.opacity = fire.opacity[f.layer];
      }
      fire.fades = fire.fades.filter((f) => now - f.start < f.dur);

      const active = !fire.paused && (fire.state === "igniting" || fire.state === "thinking" || fire.state === "speaking");
      let target = 0;
      if (active) {
        if (fire.analyser) {
          fire.analyser.getByteFrequencyData(freq);
          let sum = 0;
          for (let i = 0; i < freq.length; i++) sum += freq[i];
          target = sum / (freq.length * 255);
        } else {
          target = 0.35 + 0.3 * Math.sin(now / 900);
        }
        fire.levels.push({ t: now, v: fire.level });
        fire.levels = fire.levels.filter((l) => now - l.t < 1200);
      }
      fire.level += (target - fire.level) * 0.15;

      if (fire.state === "speaking" && !fire.paused && (!fire.cycle || now >= fire.cycle.holdUntil)) {
        advanceColor(now);
      }

      const stage = stageRef.current;
      if (stage) {
        if (active && !reduced) {
          const flicker = Math.sin(now / 130) * 0.02 + Math.sin(now / 47) * 0.01;
          stage.style.filter = `brightness(${(1 + fire.level * 0.14 + flicker).toFixed(3)}) saturate(${(1 + fire.level * 0.12).toFixed(3)})`;
          stage.style.transform = `scale(${(1 + fire.level * 0.008).toFixed(4)})`;
        } else if (stage.style.filter) {
          stage.style.filter = "";
          stage.style.transform = "";
        }
      }

      // The reading video shifts its own colors now — the speaking clip
      // carries the gold-through-teal drift natively, so no filter is added.
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Leave things tidy if the page itself goes away mid-reading.
  useEffect(() => {
    return () => {
      try {
        fire.audio?.pause();
      } catch (e) {}
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      // Submitting the question: awaken, and start the reading request right
      // now, in parallel with the awakening crossfade.
      startOracle(payload, handlers) {
        // Unlock her voice inside this tap, so she can start speaking on her
        // own the moment the reading is ready — no second tap needed.
        ensureAudioGraph();
        fire.payload = payload;
        fire.handlers = handlers || {};
        fire.reading = null;
        setFireState("awakening");
        fade("open", 1, CROSS.open);
        fade("dormant", 0, CROSS.open);
        runGeneration();
      },
      // Ignite and speak. Safe to press while the reading is still being
      // asked for (she waits on ignite), after an error (she asks again),
      // or once a reading is in hand (she replays it).
      play() {
        if (fire.state === "igniting" || fire.state === "thinking" || fire.state === "speaking") return;
        ensureAudioGraph();
        if (fire.reading) speakChain();
        else this.startOracle(fire.payload, fire.handlers);
      },
      pause() {
        fire.paused = true;
        try {
          fire.audio?.pause();
        } catch (e) {}
      },
      resume() {
        fire.paused = false;
        try {
          fire.audio?.play().catch(() => {});
        } catch (e) {}
      },
      rewind() {
        const el = fire.audio;
        if (el && el.currentTime > 1) el.currentTime = 0;
        else fire.rewindFlag = true;
      },
      reset() {
        fire.run++;
        fire.generating = false;
        fire.cycle = null;
        fire.paused = false;
        fire.rewindFlag = false;
        fire.reading = null;
        try {
          fire.audio?.pause();
        } catch (e) {}
        fire.captionParts = [];
        fire.onCaption?.([]);
        setFireState("dormant");
        fade("dormant", 1, 900);
        for (const l of FIRE_LAYERS.concat(["simmer"])) fade(l, 0, 900);
      },
    }),
    []
  );

  return (
    <div className={(fill ? "flex h-full w-full flex-col items-center " : "flex flex-col items-center ") + className}>
      <div
        ref={stageRef}
        role="img"
        aria-label={`The Oracle's fire, ${state}`}
        className="relative select-none overflow-hidden"
        style={{
          ...(fill
            ? { width: "100%", height: "100%", maxHeight: "none" }
            : { width: width || "min(54vh, 92vw)", aspectRatio: "2 / 3", maxHeight: "84vh" }),
          maxWidth: "100%",
          borderRadius: fill ? 0 : 18,
          background: "#0b0614",
          transformOrigin: "50% 55%",
          willChange: "filter, transform",
        }}
      >
        {showVideo ? <OracleReadingVideo videoRef={videoRef} phase={state} /> : LAYERS.map((l) => (
          <img
            key={l}
            ref={(el) => {
              imgRefs[l] = el;
            }}
            src={ORACLE_FIRE_FRAMES[l]}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
            style={{ opacity: fire.opacity[l], zIndex: fire.z[l] }}
          />
        ))}

      </div>
    </div>
  );
});

export default OracleFire;