import { base44 } from "@/api/base44Client";

// How much faster than the raw voice he talks (1 = exactly as generated).
const VOICE_RATE = 1.15;
// The first piece is short so his voice starts within a couple of seconds;
// later pieces are longer and load while he is already talking.
const FIRST_PART_CHARS = 300;
const PART_CHARS = 1000;

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
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await base44.functions.invoke("speakReading", { text });
      const clips = res?.data?.chunks;
      if (Array.isArray(clips) && clips.length) return clips;
    } catch (e) {
      console.warn("The Oracle's voice service hiccuped.", e?.message || e);
    }
    if (attempt < 3) await sleep(1200 * (attempt + 1));
  }
  return null;
}

// ONE audio element for the whole page, so two voices can never sound at once.
export function createOraclePlayer() {
  let el = null;
  let run = 0;
  let cancelClip = null;

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
    // Call inside a tap (before any await) so later playback is allowed.
    unlock() {
      const a = audio();
      a.src = silentWav();
      a.play().catch(() => {});
    },

    stop() {
      run += 1;
      if (cancelClip) cancelClip();
      if (el) el.pause();
    },

    // Speaks the WHOLE text, piece by piece. onStart fires the moment the first
    // sound plays; onProgress reports 0..1 of the text actually spoken.
    // Returns "done" | "blocked" | "failed" | "aborted".
    async speak(text, { onStart, onProgress }) {
      const myRun = ++run;
      if (cancelClip) cancelClip();
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