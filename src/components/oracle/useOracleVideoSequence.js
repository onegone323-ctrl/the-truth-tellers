import { useEffect, useReducer } from "react";

export const ORACLE_VIDEOS = {
  awakening: "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/4afa5c09b_media-generation-oracle-awakening-0-a6453e50-4435-4046-ae38-0f792c829f97.mp4",
  speaking: "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/58bbf23ad_media-generation-oracle-speaking-0-70a2fe80-a96e-4432-a618-7fa8043b0799.mp4",
  resting: "https://media.base44.com/videos/public/6a97b3175d08a6bc8bc635af/f7846dd7e_media-generation-oracle-resting-0-2bf8d8db-c415-46d5-959b-ff86efe410df.mp4",
};

function transition(state, event) {
  switch (event) {
    case "begin":
      return state.phase === "idle" ? { phase: "awakening", clip: "awakening" } : state;
    case "awakened":
      return state.phase === "awakening" ? { phase: "speaking", clip: "speaking" } : state;
    case "finish":
      return state.phase === "resting" || (state.phase === "idle" && state.clip === "resting")
        ? state : { phase: "resting", clip: "resting" };
    case "rested":
      return { phase: "idle", clip: "resting" };
    case "reset":
      return state.phase === "idle" ? state : { phase: "idle", clip: "awakening" };
    default:
      return state;
  }
}

export default function useOracleVideoSequence({ phase, videoRef, onAwakened, onRested, onStatus }) {
  const activity = ["awakening", "thinking", "igniting", "speaking"].includes(phase)
    ? "active" : ["simmering", "resting"].includes(phase) ? "ending" : "idle";
  const [sequence, dispatch] = useReducer(transition, {
    phase: activity === "active" ? "awakening" : activity === "ending" ? "resting" : "idle",
    clip: activity === "ending" ? "resting" : "awakening",
  });
  const voiceActive = phase === "speaking";

  // Engine updates within one reading never restart the awakening clip.
  useEffect(() => {
    dispatch(activity === "active" ? "begin" : activity === "ending" ? "finish" : "reset");
  }, [activity]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const shouldPlay = sequence.phase === "awakening" || sequence.phase === "resting"
      || (sequence.phase === "speaking" && voiceActive);
    if (shouldPlay) video.play().catch(error => {
      if (error.name !== "AbortError") onStatus("blocked");
    });
    else video.pause();
    return () => video.pause();
  }, [sequence.phase, sequence.clip, voiceActive, videoRef, onStatus]);

  const onEnded = () => {
    if (sequence.phase === "awakening") {
      dispatch("awakened");
      onAwakened?.();
    } else if (sequence.phase === "resting") {
      dispatch("rested");
      onRested?.();
    }
  };
  return { ...sequence, voiceActive, onEnded };
}