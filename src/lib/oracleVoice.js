import { base44 } from "@/api/base44Client";

// Playback speed for her voice (1 = exactly as generated — unhurried, so
// the authority in the delivery stays intact).
const VOICE_RATE = 1.0;
// The first piece gives the next piece time to load while he talks;
// later pieces are small enough that each arrives long before the
// current one finishes playing — even on a slow mobile connection.
const FIRST_PART_CHARS = 450;
const PART_CHARS = 600;

// Live audio energy for the Oracle's visuals: one AudioContext + analyser
// wired to the single voice element, so the fire can react to his actual
// voice while he speaks. Purely additive — if it fails, his voice is fine.
let audioCtx = null;
let analyserNode = null;
let sourceNode = null;
export function getVoiceAnalyser() { return analyserNode; }
// The same (already unlocked) context, so the ignition sound can play the
// instant the voice starts without needing another tap.
export function getVoiceAudioContext() { return audioCtx; }

// Breaks the reading into sentence-aligned pieces that cover ALL of the text.
export function splitForSpeech(text) {
  const flat = (text || "").replace(/\s+/g, " ").trim();
  if (!flat) return [];
  const sentences = flat.match(/[\s\S]+?[.!?]+["')\]]*(?=\s|$)|[\s\S]+$/g) || [flat];
  const parts = [];
  let buf = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    const limit = parts.length === 0 ? FIRST_PART_CHARS : PART_CHARS;
    if (buf && buf.length + 1 + s.length > limit) {
      parts.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

// A short silent clip. Playing it inside a tap "unlocks" the audio element,
// so the browser lets us start the real voice later without another tap.
function silentWav() {
  const n = 800;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, "data"); v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

// Asks the voice service for one piece; keeps retrying with a short pause
// between attempts so a hiccup never swallows part of the reading. Never throws.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchClips(text) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await base44.functions.invoke("speakReading", { text });
      const clips = res?.data?.chunks;
      if (Array.isArray(clips) && clips.length) return clips;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 402) {
        // Entitlement rejection is final — the paywall speaks, not the Oracle.
        console.warn("The Oracle's voice is resting.", e?.response?.data?.message || e?.message || e);
        return null;
      }
      if (status === 429) {
        // The speed limit is a one-minute window, not a refusal. Wait it out
        // and try again — a mid-reading piece is never dropped.
        console.warn("The Oracle's voice is pacing itself — waiting for the next piece.");
        await sleep(15000);
        continue;
      }
      console.warn("The Oracle's voice service hiccuped.", e?.message || e);
    }
    if (attempt < 5) await sleep(1200 * (attempt + 1));
  }
  return null;
}

// ONE audio element for the whole page, so two voices can never sound at once.
export function createOraclePlayer() {
  let el = null;
  let run = 0;
  let cancelClip = null;
  let rewindFlag = false;
  let paused = false;

  const audio = () => {
    if (!el) {
      el = new Audio();
      el.defaultPlaybackRate = VOICE_RATE;
    }
    return el;
  };

  // Plays one clip. Resolves "ended" | "error" | "blocked" | "aborted".
  const playClip = (src, onPlaying, onFraction) =>
    new Promise((resolve) => {
      const a = audio();
      let settled = false;
      let tick = null;
      const done = (result) => {
        if (settled) return;
        settled = true;
        clearInterval(tick);
        a.onended = null;
        a.onerror = null;
        cancelClip = null;
        resolve(result);
      };
      cancelClip = () => done("aborted");
      a.onended = () => done("ended");
      a.onerror = () => done("error");
      a.src = src;
      a.playbackRate = VOICE_RATE;
      a.play()
        .then(() => {
          if (settled) return;
          onPlaying();
          tick = setInterval(() => {
            if (a.duration) onFraction(a.currentTime / a.duration);
          }, 120);
        })
        .catch((e) => done(e?.name === "AbortError" ? "aborted" : e?.name === "NotAllowedError" ? "blocked" : "error"));
    });

  return {
    // Wires the shared voice element into an analyser (inside a tap gesture,
    // where the browser allows audio contexts to start).
    ensureAnalyser() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
        if (!sourceNode) {
          sourceNode = audioCtx.createMediaElementSource(audio());
          analyserNode = audioCtx.createAnalyser();
          analyserNode.fftSize = 256;
          analyserNode.smoothingTimeConstant = 0.72;
          sourceNode.connect(analyserNode);
          analyserNode.connect(audioCtx.destination);
        }
      } catch (e) {
        // The analyser is optional — his voice plays with or without it.
      }
    },

    // Call inside a tap (before any await) so later playback is allowed.
    unlock() {
      this.ensureAnalyser();
      const a = audio();
      a.src = silentWav();
      a.play().catch(() => {});
    },

    stop() {
      run += 1;
      rewindFlag = false;
      paused = false;
      if (cancelClip) cancelClip();
      if (el) el.pause();
    },

    // Freeze his voice mid-word; resume() picks up exactly where it left off.
    pause() {
      if (el) el.pause();
      paused = true;
    },

    resume() {
      paused = false;
      if (el) el.play().catch(() => {});
    },

    // Replay what he just said: restart the clip he's on, or fall back one
    // whole piece when pressed between pieces (or right at the start of one).
    rewind() {
      if (!el) { rewindFlag = true; return; }
      if (el.currentTime > 1) { el.currentTime = 0; return; }
      rewindFlag = true;
    },

    // Speaks the WHOLE text, piece by piece. onStart fires the moment the first
    // sound plays; onProgress reports 0..1 of the text actually spoken.
    // Returns "done" | "blocked" | "failed" | "aborted".
    async speak(text, { onStart, onProgress }) {
      const myRun = ++run;
      if (cancelClip) cancelClip();
      rewindFlag = false;
      paused = false;
      const a = audio();
      a.pause();
      this.unlock();

      const parts = splitForSpeech(text);
      const total = parts.reduce((n, p) => n + p.length, 0) || 1;
      const pending = [];
      const prefetch = (i) => {
        if (i < parts.length && !pending[i]) pending[i] = fetchClips(parts[i]);
      };

      let spokenChars = 0;
      let started = false;
      const missed = []; // pieces the voice service couldn't produce (yet)
      for (let i = 0; i < parts.length; i++) {
        prefetch(i); prefetch(i + 1); prefetch(i + 2);
        const clips = await pending[i];
        if (run !== myRun) return "aborted";
        if (!clips) { missed.push(i); continue; }
        if (clips) {
          for (let k = 0; k < clips.length; k++) {
            const result = await playClip(
              "data:audio/mpeg;base64," + clips[k],
              () => { if (!started) { started = true; onStart(); } },
              (f) => { if (run === myRun) onProgress((spokenChars + parts[i].length * ((k + f) / clips.length)) / total); },
            );
            if (run !== myRun) return "aborted";
            if (result === "blocked") return "blocked";
            if (result === "error") { missed.push(i); break; } // re-fetch this piece later
          }
        }
        spokenChars += parts[i].length;
        onProgress(spokenChars / total);
        // A rewind pressed between pieces falls back one whole piece.
        if (rewindFlag && run === myRun) {
          rewindFlag = false;
          if (i > 0) { spokenChars -= parts[i - 1].length; i -= 2; }
          else { spokenChars -= parts[i].length; i -= 1; }
        }
      }

      // Anything the voice service dropped gets one more full pass — the
      // Oracle never leaves a piece of the reading unsaid.
      for (const i of missed) {
        const clips = await fetchClips(parts[i]);
        if (run !== myRun) return "aborted";
        if (!clips) continue;
        for (let k = 0; k < clips.length; k++) {
          const result = await playClip(
            "data:audio/mpeg;base64," + clips[k],
            () => { if (!started) { started = true; onStart(); } },
            (f) => { if (run === myRun) onProgress((spokenChars + parts[i].length * ((k + f) / clips.length)) / total); },
          );
          if (run !== myRun) return "aborted";
          if (result === "blocked") return "blocked";
        }
      }
      return started ? "done" : "failed";
    },
  };
}