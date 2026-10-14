import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DECKS, BLENDED_DECK, SPREADS, drawSpread, drawClarifiers } from "@/lib/tarotData";
import { deckCardTitle } from "@/lib/deckCardNames";
import CustomSpreadBuilder from "@/components/CustomSpreadBuilder";
import OracleOrb from "@/components/OracleOrb";
import OrbStage from "@/components/OrbStage";
import ReadingStage from "@/components/ReadingStage";
import CardFace from "@/components/CardFace";
import DailyCard from "@/components/DailyCard";
import OnboardingQuestionnaire from "@/components/OnboardingQuestionnaire";
import { Link } from "react-router-dom";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { toSpokenText } from "@/lib/speechText";
import { createOraclePlayer } from "@/lib/oracleVoice";
import CaptionScroll from "@/components/CaptionScroll";
import AmbientSound from "@/components/AmbientSound";
import PullToRefresh from "@/components/PullToRefresh";

export default function Home() {
  const [user, setUser] = useState(null);
  const [memory, setMemory] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [phase, setPhase] = useState("setup"); // setup | drawing | reading
  const [deck, setDeck] = useState(DECKS[0]);
  const [blendDecks, setBlendDecks] = useState(true);
  const [spreadCategory, setSpreadCategory] = useState("General");
  const [spread, setSpread] = useState(SPREADS[0]);
  const [clarifyOn, setClarifyOn] = useState(false);
  const [clarifyCount, setClarifyCount] = useState(1);
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState([]);
  const [reading, setReading] = useState("");
  const [readingError, setReadingError] = useState("");
  const [orbState, setOrbState] = useState("idle");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entitlement, setEntitlement] = useState(null);
  const [readingsUsed, setReadingsUsed] = useState(0);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [captionProgress, setCaptionProgress] = useState(0);
  const recogRef = useRef(null);
  const busyRef = useRef(false);
  // ONE audio player for the whole page, so two voices can never sound at once.
  const playerRef = useRef(null);
  if (!playerRef.current) playerRef.current = createOraclePlayer();
  const player = playerRef.current;

  // Stop any in-flight audio on unmount so the Oracle never keeps talking
  // after the seeker leaves the page.
  useEffect(() => {
    return () => { player.stop(); };
  }, []);

  // Load user + memory — re-run by pull-to-refresh on mobile.
  const loadData = useCallback(async () => {
      // All load in parallel — one failure never blocks the others.
      const [meRes, memRes, profRes, entRes, journalRes] = await Promise.allSettled([
        base44.auth.me(),
        base44.entities.OracleMemory.list("-updated_date", 1),
        base44.entities.SeekerProfile.list("-updated_date", 1),
        base44.entities.Entitlement.list("-updated_date", 1),
        base44.entities.JournalEntry.count(),
      ]);
      if (entRes.status === "fulfilled" && entRes.value && entRes.value.length) setEntitlement(entRes.value[0]);
      else if (entRes.status === "rejected") console.error(entRes.reason);
      if (journalRes.status === "fulfilled" && typeof journalRes.value === "number") setReadingsUsed(journalRes.value);
      else if (journalRes.status === "rejected") console.error(journalRes.reason);
      if (meRes.status === "fulfilled") setUser(meRes.value);
      else console.error(meRes.reason);
      if (memRes.status === "fulfilled" && memRes.value && memRes.value.length) setMemory(memRes.value[0]);
      else if (memRes.status === "rejected") console.error(memRes.reason);
      if (profRes.status === "fulfilled" && profRes.value && profRes.value.length) setProfile(profRes.value[0]);
      else if (profRes.status === "rejected") console.error(profRes.reason);
      setProfileLoaded(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const categories = ["General", "Love", "Career", "Decision", "Yearly", "Spiritual", "Custom"];
  const spreadsInCat = SPREADS.filter((s) => s.category === spreadCategory);
  const activeDeck = blendDecks ? BLENDED_DECK : deck;

  // ---- Voice input (Web Speech API) ----
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input isn't supported in this browser. Try Chrome or Safari."); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onstart = () => { setListening(true); setOrbState("listening"); };
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setQuestion((q) => (q ? q + " " : "") + text);
    };
    r.onend = () => { setListening(false); setOrbState("idle"); };
    r.onerror = () => { setListening(false); setOrbState("idle"); };
    recogRef.current = r;
    r.start();
  };
  const stopListening = () => { recogRef.current?.stop(); };

  // ---- Draw cards ----
  const handleDraw = () => {
    if (!question.trim()) return;
    const drawn = drawSpread(spread).map((c) => ({
      ...c,
      cardDeck: blendDecks ? DECKS[Math.floor(Math.random() * DECKS.length)] : deck,
      clarifiers: clarifyOn ? drawClarifiers(clarifyCount).map((x) => ({ ...x, card: x.card })) : [],
    }));
    setCards(drawn);
    setPhase("drawing");
    setOrbState("thinking");
  };

  // ---- Generate reading ----
  const handleRead = async () => {
    // A ref (not state) so a fast double-tap can't start two readings — two
    // readings means two voices.
    if (busy || busyRef.current) return;
    busyRef.current = true;
    // This tap is the one moment the browser lets us unlock audio, so the
    // voice can start by itself when the reading arrives.
    player.unlock();
    setPhase("reading");
    setOrbState("thinking");
    setBusy(true);
    setReading("");
    setReadingError("");
    setOutOfCredits(false);
    try {
      const payload = {
        question, deck: activeDeck, spread,
        cards: cards.map((c) => ({
          name: c.name, reversed: c.reversed, position: c.position,
          deck_name: (c.cardDeck || activeDeck).name,
          deck_tradition: (c.cardDeck || activeDeck).tradition,
          deck_title: deckCardTitle((c.cardDeck || activeDeck).id, c.name),
          clarifiers: (c.clarifiers || []).map((x) => ({ name: x.name, reversed: x.reversed })),
        })),
        profile: profile ? {
          full_name: profile.full_name,
          occupation: profile.occupation,
          goals: profile.goals,
          trigger: profile.trigger,
          makes_happy: profile.makes_happy,
          hard_memory: profile.hard_memory,
        } : null,
        memory: memory ? {
          user_name: seekerName,
          summary: memory.summary,
          recurring_themes: memory.recurring_themes,
          last_question: memory.last_question,
          last_advice: memory.last_advice,
          reading_count: memory.reading_count,
        } : null,
      };
      const res = await base44.functions.invoke("generateReading", payload);
      const text = res?.data?.reading;
      if (typeof text !== "string" || !text.trim()) {
        throw new Error("The reading service returned no reading.");
      }
      setReading(text);
      // A snippet reading: the Oracle stops early and the paywall speaks.
      if (res?.data?.snippet) {
        setOutOfCredits(true);
        setReadingError(res?.data?.message || "The Oracle stops here — sign up to hear the whole reading.");
      }
      // Mirror the server-side spend locally: the first reading is free,
      // premium reads freely, after that each full reading spends a credit.
      if (!res?.data?.snippet && user?.role !== "admin" && entitlement && entitlement.plan !== "premium" && readingsUsed >= 1) {
        setEntitlement({ ...entitlement, credits: Math.max(0, (entitlement.credits || 0) - 1) });
      }
      setReadingsUsed((r) => r + 1);
      // His voice starts right now — saving to the journal happens in the
      // background below and never holds it up.
      speak(text);

      try {
        // The journal entry is written by the SERVER inside generateReading
        // (before the reading is returned) so usage can't be bypassed by
        // calling the function directly — the client must not duplicate it.

        const adviceSnippet = text.slice(-280);
        if (memory) {
          await base44.entities.OracleMemory.update(memory.id, {
            summary: text.slice(0, 600),
            last_question: question,
            last_advice: adviceSnippet,
            reading_count: (memory.reading_count || 0) + 1,
            user_name: seekerName,
            recurring_cards: [...new Set([...(memory.recurring_cards || []), ...cards.map((c) => c.name)])].slice(0, 12),
          });
        } else {
          const created = await base44.entities.OracleMemory.create({
            user_name: seekerName,
            summary: text.slice(0, 600),
            recurring_themes: [spread.category],
            recurring_cards: cards.map((c) => c.name).slice(0, 12),
            last_question: question,
            last_advice: adviceSnippet,
            reading_count: 1,
          });
          setMemory(created);
        }
      } catch (persistenceError) {
        console.error("Reading succeeded but could not be saved.", persistenceError);
      }
    } catch (e) {
      console.error(e);
      // Surface the actual server-side error so we can see what's failing
      // (missing API key, 401, rate-limit, timeout, etc.). The Base44 SDK
      // packs the function's JSON error body into a few different shapes
      // depending on how it hit — dig for whichever one has the real message.
      const detail =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e?.data?.error ||
        e?.message ||
        String(e || "unknown error");
      if (e?.response?.status === 402 || /out_of_credits/i.test(detail)) {
        setOutOfCredits(true);
        setReadingError("You're out of readings. The Oracle waits for no one — grab credits or go Premium to keep going.");
      } else {
        setReadingError(
          /timed out|timeout/i.test(detail)
            ? `The reading took too long to arrive — try again. (${detail})`
            : `The reading couldn't be completed — try again. Reason: ${detail}`
        );
      }
      setOrbState("idle");
    }
    busyRef.current = false;
    setBusy(false);
  };

  // ---- Oracle voice: OpenAI TTS only ----
  // The whole reading is spoken piece by piece: the first piece arrives in a
  // couple of seconds and the rest load while he talks. The words on screen
  // begin at the exact moment the first sound plays, and track his voice.
  // If the browser blocks the sound, "Hear His Voice" is a fresh tap.
  const speak = async (sourceText) => {
    if (!sourceText) return;
    const spoken = toSpokenText(sourceText);
    setVoiceBusy(true);
    setVoicePaused(false);
    setOrbState("thinking");
    setCaptionText("");
    setCaptionProgress(0);

    const result = await player.speak(spoken, {
      onStart: () => { setCaptionText(spoken); setOrbState("speaking"); },
      onProgress: setCaptionProgress,
    });

    // A newer speak() or a reset took over — it owns the cleanup.
    if (result === "aborted") return;
    setCaptionProgress(1);
    setOrbState("idle");
    setVoiceBusy(false);
    setVoicePaused(false);
  };

  const reset = () => {
    player.stop();
    setPhase("setup"); setCards([]); setReading(""); setReadingError(""); setOrbState("idle"); setQuestion(""); setCaptionText(""); setCaptionProgress(0); setVoiceBusy(false); setVoicePaused(false); setOutOfCredits(false);
  };

  // Names: the platform auto-fills the account name from the email address,
  // so "t4cmldxp82t" can end up treated as a person's name. The Oracle must
  // NEVER call a seeker that — prefer the profile name they chose, then the
  // memory record, and use the account name ONLY when it isn't just the
  // email username.
  const emailLocal = (user?.email || "").split("@")[0].toLowerCase();
  const notEmailUsername = (n) => (n && n.trim().toLowerCase() !== emailLocal ? n.trim() : "");
  const seekerName = notEmailUsername(profile?.full_name) || notEmailUsername(memory?.user_name) || notEmailUsername(user?.full_name);
  const greeting = seekerName ? `Welcome back, ${seekerName.split(" ")[0]}.` : "Welcome, seeker.";

  if (!profileLoaded) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center text-center pt-4">
          <OracleOrb state="idle" size={160} />
        </div>
        <OnboardingQuestionnaire onComplete={setProfile} defaultName={notEmailUsername(user?.full_name)} />
        <AmbientSound />
      </div>
    );
  }

  return (
    <div>
      {/* Hero — the orb suspended in its gyroscope over the nebula */}
      {phase !== "reading" && (
        <section
          className="neo-hero grid grid-cols-1 md:grid-cols-2 items-center gap-[30px] px-4 sm:px-[54px] pt-10 pb-12 sm:pt-[54px] sm:pb-[46px] min-h-[60vh] sm:min-h-[530px]"
        >
          <div className="text-center" style={{ animation: "materialize 1s .12s ease both" }}>
            <h1 className="neo-h1 text-gold-ember mx-auto m-0 max-w-[560px] text-[30px] tracking-[3px] sm:text-[46px] sm:tracking-[4px]">
              {phase === "setup" ? "Let the Oracle Deliver the Message the Universe Wants You to Know" : "The Cards Are Drawn"}
            </h1>
            <p style={{ maxWidth: 460, color: "#b5ad99", fontSize: 15, lineHeight: 1.7, margin: "24px auto 0" }}>
              {phase === "setup"
                ? `${greeting} Speak your question, choose the deck and spread, and let the Oracle read your cards.`
                : "The cards are dealing. Watch them reveal — then ask him to read."}
            </p>
          </div>
          <div style={{ animation: "materialize 1s .3s ease both" }}>
            <OrbStage state={orbState} size={340} height={430} />
          </div>
        </section>
      )}

      {/* SETUP PHASE — bento grid of beveled glass panels */}
      {phase === "setup" && (
        <PullToRefresh onRefresh={loadData}>
          <section className="enter delay1 mx-4 sm:mx-[54px] mb-6">
            <DailyCard memory={memory} setMemory={setMemory} userName={seekerName} />
          </section>

          <section className="enter delay2 mx-4 sm:mx-[54px] mb-6 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-6">
            {/* Question + voice — the box fills the panel, footer pinned to the bottom */}
            <div className="neo-panel flex flex-col" style={{ background: "linear-gradient(110deg, rgba(42,8,14,.9), rgba(5,5,7,.93))" }}>
              <h2 className="neo-label mt-0 mb-[18px]">Your Question</h2>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="What do you need the truth about?"
                rows={9}
                className="neo-field flex-1 min-h-[260px]" />
              <div className="flex items-center justify-between gap-4 mt-[17px]">
                <button onClick={listening ? stopListening : startListening}
                  className="neo-button flex items-center gap-2">
                  {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {listening ? "Listening…" : "Speak It"}
                </button>
                <span className="neo-note">Or type your question above.</span>
              </div>
            </div>

            {/* Deck selection */}
            <div className="neo-panel" style={{ background: "linear-gradient(110deg, rgba(42,8,14,.9), rgba(5,5,7,.93))" }}>
              <div className="flex items-center justify-between">
                <h2 className="neo-label m-0">Choose Your Deck</h2>
                <span className="flex items-center gap-2" style={{ color: "#98907d", fontSize: 14 }}>
                  Blend all decks
                  <button onClick={() => setBlendDecks((v) => !v)}
                    type="button"
                    aria-label="Blend all decks"
                    aria-pressed={blendDecks}
                    className={`neo-toggle ${blendDecks ? "on" : ""}`}><i /></button>
                </span>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-[9px] mt-[17px] transition-opacity ${blendDecks ? "opacity-40 pointer-events-none" : ""}`}>
                {DECKS.map((d) => (
                  <button key={d.id} onClick={() => { setDeck(d); setBlendDecks(false); }}
                    className={`neo-tile ${!blendDecks && deck.id === d.id ? "is-active" : ""}`}>
                    <div className="neo-art" style={{ backgroundImage: `url(${d.art})` }} />
                    <span className="neo-deck-name">{d.name}</span>
                  </button>
                ))}
              </div>
              {blendDecks && (
                <div className="mt-[9px] flex items-center justify-center gap-2"
                  style={{
                    border: "1px solid var(--gold-leaf)",
                    background: "linear-gradient(100deg, #6f4d0b, var(--gold-leaf), #8b1a2b)",
                    color: "#050505",
                    padding: "6px 10px",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: "0 0 16px rgba(212,175,55,.35)",
                  }}>
                  <span style={{ fontSize: 13 }}>{BLENDED_DECK.backGlyph}</span>
                  <span>Blended — all eight decks, one reading</span>
                </div>
              )}
              <p className="neo-note mt-3">{activeDeck.description}</p>
            </div>
          </section>

          <section className="enter delay3 mx-4 sm:mx-[54px] mb-6">
            {/* Spread selection — one full-width panel */}
            <div className="neo-panel" style={{ background: "linear-gradient(110deg, rgba(42,8,14,.9), rgba(5,5,7,.93))" }}>
              <h2 className="neo-label mt-0 mb-[18px]">Choose Your Spread</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <button key={c} onClick={() => { setSpreadCategory(c); const first = SPREADS.filter((s) => s.category === c)[0]; if (first) setSpread(first); }}
                    className={`neo-pill-gold ${spreadCategory === c ? "is-active" : ""}`}>{c}</button>
                ))}
              </div>
              {spreadCategory === "Custom" ? (
                <CustomSpreadBuilder onBuild={(s) => setSpread(s)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {spreadsInCat.map((s) => (
                    <button key={s.id} onClick={() => setSpread(s)}
                      className={`neo-spread-tile ${spread.id === s.id ? "is-active" : ""}`}>
                      <strong className="block font-serif text-[13px] font-bold" style={{ color: "#000000" }}>{s.name}</strong>
                      <span className="block mt-[3px] font-bold" style={{ color: "#000000", fontSize: 13 }}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Clarifiers — slim strip across the bottom of this panel */}
              <div style={{
                marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(212,175,55,.25)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap",
              }}>
                <h2 className="neo-label m-0" style={{ fontSize: 13 }}>Clarification Cards</h2>
                <p className="neo-note" style={{ margin: 0, flex: 1, minWidth: 200 }}>
                  {clarifyOn ? `${clarifyCount} clarifier card${clarifyCount > 1 ? "s" : ""} will be drawn beside each card, adding nuance.` : "Off — each card stands alone."}
                </p>
                {clarifyOn && (
                  <div className="flex gap-[9px]">
                    {[1, 2, 3].map((n) => (
                      <button key={n} onClick={() => setClarifyCount(n)}
                        className={`neo-count ${clarifyCount === n ? "is-active" : ""}`}
                        style={{ flex: "none", padding: "6px 14px" }}>{n}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => setClarifyOn((v) => !v)}
                  type="button"
                  aria-label="Clarification Cards"
                  aria-pressed={clarifyOn}
                  className={`neo-toggle ${clarifyOn ? "on" : ""}`}><i /></button>
              </div>
            </div>
          </section>

          <div className="enter delay3 mx-4 sm:mx-[54px] mt-3.5">
            <button onClick={handleDraw} disabled={!question.trim()}
              className="neo-button w-full flex items-center justify-center gap-3"
              style={{ height: 62, fontSize: 13, letterSpacing: 5 }}>
              <Sparkles className="w-4 h-4" />Draw the Cards
            </button>
          </div>
          {(user?.role === "admin" || entitlement || readingsUsed < 1) && (
            <div className="enter delay3 mx-4 sm:mx-[54px] mt-2 text-center">
              {user?.role === "admin" ? (
                <span className="neo-note">Admin — unlimited readings, everything unlocked.</span>
              ) : entitlement?.plan === "premium" ? (
                <span className="neo-note">Premium — unlimited readings.</span>
              ) : readingsUsed < 1 ? (
                <span className="neo-note">Your first reading is free — on the house.</span>
              ) : (
                <span className="neo-note">
                  {(entitlement?.credits || 0) > 0
                    ? `${entitlement.credits} reading credit${entitlement.credits === 1 ? "" : "s"} left.`
                    : "Readings open free, then cut off — sign up to hear the whole truth."}
                  {(entitlement?.credits || 0) < 1 && (
                    <Link to="/pricing" className="neo-pill px-3 py-1 ml-3">Get More</Link>
                  )}
                </span>
              )}
            </div>
          )}
        </PullToRefresh>
      )}

      {/* DRAWING PHASE */}
      {phase === "drawing" && (
        <div className="space-y-6 mx-4 sm:mx-[54px] pt-8">
          <div className="flex flex-wrap justify-center gap-3">
            {cards.map((c, i) => (
              <CardFace key={i} card={c} deck={c.cardDeck || activeDeck} index={i} clarifiers={c.clarifiers} dealDelay={i * 350} />
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-serif italic">{spread.name} · {activeDeck.name}</p>
            <p className="mt-1">"{question}"</p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => setPhase("setup")} className="neo-pill px-6 py-2.5">Redraw Setup</button>
            <button onClick={handleRead} className="neo-button px-8">Hear the Reading</button>
          </div>
        </div>
      )}

      {/* READING PHASE — nothing but the Oracle: a full black page, her fire
          globe filling it, colors drifting with her voice, tiny controls at
          the bottom edge. */}
      {phase === "reading" && (
        <ReadingStage
          state={orbState}
          busy={busy}
          voiceBusy={voiceBusy}
          voicePaused={voicePaused}
          error={readingError}
          outOfCredits={outOfCredits}
          onPauseToggle={() => {
            if (voicePaused) { player.resume(); setVoicePaused(false); }
            else { player.pause(); setVoicePaused(true); }
          }}
          onRewind={() => player.rewind()}
          onSpeak={() => speak(reading)}
          onReset={reset}
          onRetry={handleRead}
        />
      )}
      {phase !== "reading" && (
        <CaptionScroll text={captionText} progress={captionProgress} active={orbState === "speaking"} />
      )}
      {phase !== "reading" && <AmbientSound />}
    </div>
  );
}