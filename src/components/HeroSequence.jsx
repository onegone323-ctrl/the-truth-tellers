import React, { useEffect, useState } from "react";

// The hero's entrance, in stages:
//   roll  — the headline rolls in
//   out   — it spins away
//   back  — it spins back in
//   typed — the welcome and the invitation type themselves out beneath it
const FIRST_NAME = (name) => (name ? name.trim().split(" ")[0] : "");

export default function HeroSequence({ name }) {
  const [stage, setStage] = useState("roll");
  const [typed, setTyped] = useState("");

  const first = FIRST_NAME(name);
  const welcome = first ? `Welcome back, ${first}.` : "Welcome, seeker.";
  const line = `${welcome} What truth do you seek?`;

  useEffect(() => {
    // Respect reduced motion: land on the finished state with no theatre.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setStage("typed");
      setTyped(line);
      return;
    }
    const timers = [
      setTimeout(() => setStage("out"), 2700),
      setTimeout(() => setStage("back"), 3400),
      setTimeout(() => setStage("typed"), 4300),
    ];
    return () => timers.forEach(clearTimeout);
    // The line only matters for the reduced-motion shortcut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== "typed" || typed === line) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(line.slice(0, i));
      if (i >= line.length) clearInterval(id);
    }, 34);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const headlineClass =
    stage === "out" ? "hero-out" : stage === "back" ? "hero-back" : stage === "roll" ? "hero-roll" : "";

  return (
    <div className="relative">
      <h1 className={`neo-h1 text-gold-ember hero-headline ${headlineClass} mx-auto m-0 max-w-[560px] px-1 text-[26px] tracking-[2px] sm:px-0 sm:text-[46px] sm:tracking-[4px]`}>
        Let the Oracle Deliver the Message the Universe Wants You to Know
      </h1>
      <p className="hero-typed" aria-live="polite">
        {typed}
        {stage === "typed" && typed !== line && <span className="hero-caret" />}
      </p>
    </div>
  );
}