import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DECKS, BLENDED_DECK, SPREADS, drawSpread, drawClarifiers } from "@/lib/tarotData";
import { deckCardTitle } from "@/lib/deckCardNames";
import CustomSpreadBuilder from "@/components/CustomSpreadBuilder";
import OracleOrb from "@/components/OracleOrb";
import OrbStage from "@/components/OrbStage";
import CardFace from "@/components/CardFace";
import DailyCard from "@/components/DailyCard";
import OnboardingQuestionnaire from "@/components/OnboardingQuestionnaire";
import { Mic, MicOff, RefreshCw, Sparkles, Volume2 } from "lucide-react";
import { toSpokenText } from "@/lib/speechText";
import CaptionScroll from "@/components/CaptionScroll";
import AmbientSound from "@/components/AmbientSound";

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
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [captionProgress, setCaptionProgress] = useState(0);
  const recogRef = useRef(null);
  const audioRef = useRef(null);
  const captionTimerRef = useRef(null);
  const busyRef = useRef(false);
  // Identifies the active speak() run. Any playback chain that finds a newer
  // run id aborts itself.
  const speakRunRef = useRef(0);

  // The Oracle's voice plays through ONE audio element for the whole page, so
  // two voices can never sound at once — a new reading just re-points it.
  const getVoice = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };
  const stopVoice = () => {
    speakRunRef.current += 1; // invalidates every running playback chain
    const el = audioRef.current;
    if (el) {
      el.onended = null;
      el.onerror = null;
      try { el.pause(); } catch { /* ignore */ }
    }
  };

  // Stop any in-flight audio on unmount so the Oracle never keeps talking
  // after the seeker leaves the page.
  useEffect(() => {
    return () => {
      stopVoice();
      if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    };
  }, []);

  // Load user + memory
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const mem = await base44.entities.OracleMemory.list("-updated_date", 1);
        if (mem && mem.length) setMemory(mem[0]);
        const prof = await base44.entities.SeekerProfile.list("-updated_date", 1);
        if (prof && prof.length) setProfile(prof[0]);
      } catch (e) { console.error(e); }
      setProfileLoaded(true);
    })();
  }, []);

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
    setPhase("reading");
    setOrbState("thinking");
    setBusy(true);
    setReading("");
    setReadingError("");
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
        memory: memory ? {
          user_name: memory.user_name || user?.full_name,
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
      setOrbState("idle");

      try {
        const cardData = cards.map((c) => ({
          name: c.name, reversed: c.reversed, position: c.position,
          clarifiers: (c.clarifiers || []).map((x) => ({ name: x.name, reversed: x.reversed })),
        }));

        await base44.entities.JournalEntry.create({
          question, deck: activeDeck.name, spread: spread.name,
          cards_drawn: cardData, interpretation: text, audio_url: null,
        });

        const adviceSnippet = text.slice(-280);
        if (memory) {
          await base44.entities.OracleMemory.update(memory.id, {
            summary: text.slice(0, 600),
            last_question: question,
            last_advice: adviceSnippet,
            reading_count: (memory.reading_count || 0) + 1,
            user_name: memory.user_name || user?.full_name || "",
            recurring_cards: [...new Set([...(memory.recurring_cards || []), ...cards.map((c) => c.name)])].slice(0, 12),
          });
        } else {
          const created = await base44.entities.OracleMemory.create({
            user_name: user?.full_name || "",
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

      // Browsers require a fresh user gesture to start audio, so we don't
      // auto-speak here (the click that submitted the question is minutes
      // stale by the time the reading arrives). The 'Hear His Voice' button
      // below is tied directly to a click and always works.
      // Try anyway for browsers that allow it — harmless if blocked.
      speak(text);
    } catch (e) {
      console.error(e);
      // Surface the actual server-side error so we can see what's failing
      // (missing API key, 401, rate-limit, timeout, etc.). The Base44 SDK
      // packs the function's JSON error body into a few different shapes
      // depending on how it hit — dig for whichever one has the real message.
      const detail =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e?.data?.error ||
        e?.message ||
        String(e || "unknown error");
      setReadingError(
        /timed out|timeout/i.test(detail)
          ? `The reading took too long to arrive — try again. (${detail})`
          : `The reading couldn't be completed — try again. Reason: ${detail}`
      );
      setOrbState("idle");
    }
    busyRef.current = false;
    setBusy(false);
  };

  // ---- Oracle voice: OpenAI TTS only ----
  // The reading is synthesized server-side in chunks and played back-to-back
  // through the single shared audio element. If the voice can't play, the
  // "Hear His Voice" button is a fresh tap that retries.
  const playAudioChunks = (chunks, runId) =>
    new Promise((allDone) => {
      const el = getVoice();
      let i = 0;
      const playNext = () => {
        if (speakRunRef.current !== runId) { allDone(false); return; }
        if (i >= chunks.length) { allDone(true); return; }
        const isFirst = i === 0;
        // Each chunk may move the chain forward exactly once. Without this,
        // a chunk that both errors AND rejects play() would advance twice and
        // fork the chain into two overlapping voices.
        let moved = false;
        const advance = () => {
          if (moved) return;
          moved = true;
          playNext();
        };
        el.onended = advance;
        el.onerror = advance;
        el.src = "data:audio/mpeg;base64," + chunks[i++];
        el.play().catch(() => {
          if (moved) return;
          // The browser refused to start the very first chunk (autoplay
          // policy) — stop cleanly so the tap-to-hear button can retry.
          if (isFirst && speakRunRef.current === runId) { moved = true; allDone(false); return; }
          advance();
        });
      };
      playNext();
    });

  const speak = async (sourceText) => {
    if (!sourceText) return;
    // Silence whatever is playing and claim a fresh run id: any older chain
    // aborts the moment it sees it.
    stopVoice();
    const myRun = speakRunRef.current;
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);

    setVoiceBusy(true);
    setOrbState("speaking");
    const spoken = toSpokenText(sourceText);
    setCaptionText(spoken);
    setCaptionProgress(0);

    // Drive the caption scroll off elapsed speaking time.
    const estMs = Math.max(4000, (spoken.length / 14) * 1000);
    const start = Date.now();
    captionTimerRef.current = setInterval(() => {
      setCaptionProgress(Math.min(1, (Date.now() - start) / estMs));
    }, 100);

    const finish = () => {
      if (captionTimerRef.current) clearInterval(captionTimerRef.current);
      setCaptionProgress(1);
      setOrbState("idle");
      setVoiceBusy(false);
    };

    // 1) Try OpenAI's natural voice.
    let chunks = null;
    try {
      const res = await base44.functions.invoke("speakReading", { text: spoken });
      if (Array.isArray(res?.data?.chunks) && res.data.chunks.length) chunks = res.data.chunks;
    } catch (e) {
      console.warn("The Oracle's voice service is unavailable.", e?.message || e);
    }

    // A newer speak() took over — it owns the cleanup and the voice.
    if (speakRunRef.current !== myRun) return;

    if (chunks) {
      await playAudioChunks(chunks, myRun);
      if (speakRunRef.current !== myRun) return;
    }
    finish();
  };

  const reset = () => {
    stopVoice();
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    setPhase("setup"); setCards([]); setReading(""); setReadingError(""); setOrbState("idle"); setQuestion(""); setCaptionText(""); setCaptionProgress(0); setVoiceBusy(false);
  };

  const seekerName = profile?.full_name || memory?.user_name || user?.full_name;
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
        <OnboardingQuestionnaire onComplete={setProfile} defaultName={user?.full_name || ""} />
        <AmbientSound />
      </div>
    );
  }

  return (
    <div>
      {/* Hero — the orb suspended in its gyroscope over the nebula */}
      {phase !== "reading" && (
        <section
          className="neo-hero grid grid-cols-1 lg:grid-cols-2 items-center gap-[30px] px-4 sm:px-[54px] pt-10 pb-12 sm:pt-[54px] sm:pb-[46px]"
          style={{ minHeight: 530 }}
        >
          <div style={{ animation: "materialize 1s .12s ease both" }}>
            <div className="neo-eyebrow mb-5">Consult</div>
            <h1 className="neo-h1 m-0 max-w-[520px] text-[30px] tracking-[4px] sm:text-[58px] sm:tracking-[9px]">
              {phase === "setup" ? "Consult the Oracle" : "The Cards Are Drawn"}
            </h1>
            <p style={{ maxWidth: 460, color: "#b5ad99", fontSize: 15, lineHeight: 1.7, margin: "24px 0 0" }}>
              {phase === "setup"
                ? `${greeting} Speak your question, choose your deck and spread, and let him read the cards.`
                : "The cards are dealing. Watch them reveal — then ask her to read."}
            </p>
          </div>
          <div style={{ animation: "materialize 1s .3s ease both" }}>
            <OrbStage state={orbState} size={215} height={370} />
          </div>
        </section>
      )}

      {/* SETUP PHASE — bento grid of beveled glass panels */}
      {phase === "setup" && (
        <>
          <section className="enter delay1 mx-4 sm:mx-[54px] mb-6">
            <DailyCard memory={memory} setMemory={setMemory} userName={user?.full_name} />
          </section>

          <section className="enter delay2 mx-4 sm:mx-[54px] mb-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            {/* Question + voice */}
            <div className="neo-panel">
              <h2 className="neo-label mt-0 mb-[18px]">Your Question</h2>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="What do you need the truth about?"
                rows={3}
                className="neo-field min-h-[105px]" />
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
            <div className="neo-panel">
              <div className="flex items-center justify-between">
                <h2 className="neo-label m-0">Choose Your Deck</h2>
                <span className="flex items-center gap-2" style={{ color: "#98907d", fontSize: 11 }}>
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
                    <div className="neo-art" />
                    {d.name}
                  </button>
                ))}
              </div>
              {blendDecks && (
                <div className="neo-tile is-active mt-[9px] py-3">
                  <div className="text-2xl" style={{ color: BLENDED_DECK.accent }}>{BLENDED_DECK.backGlyph}</div>
                  <div className="mt-1">Blended — all eight decks, one reading</div>
                </div>
              )}
              <p className="neo-note mt-3">{activeDeck.description}</p>
            </div>
          </section>

          <section className="enter delay3 mx-4 sm:mx-[54px] mb-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            {/* Spread selection */}
            <div className="neo-panel">
              <h2 className="neo-label mt-0 mb-[18px]">Choose Your Spread</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <button key={c} onClick={() => { setSpreadCategory(c); const first = SPREADS.filter((s) => s.category === c)[0]; if (first) setSpread(first); }}
                    className={`neo-pill ${spreadCategory === c ? "is-active" : ""}`}>{c}</button>
                ))}
              </div>
              {spreadCategory === "Custom" ? (
                <CustomSpreadBuilder onBuild={(s) => setSpread(s)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {spreadsInCat.map((s) => (
                    <button key={s.id} onClick={() => setSpread(s)}
                      className={`neo-spread-tile ${spread.id === s.id ? "is-active" : ""}`}>
                      <strong className="block font-serif text-[15px] font-normal" style={{ color: "#eadfbf" }}>{s.name}</strong>
                      <span className="block mt-[5px]" style={{ color: "#817a6d", fontSize: 11 }}>{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clarifiers */}
            <div className="neo-panel">
              <div className="flex items-center justify-between">
                <h2 className="neo-label m-0">Clarification Cards</h2>
                <button onClick={() => setClarifyOn((v) => !v)}
                  type="button"
                  aria-label="Clarification Cards"
                  aria-pressed={clarifyOn}
                  className={`neo-toggle ${clarifyOn ? "on" : ""}`}><i /></button>
              </div>
              {clarifyOn && (
                <div className="flex gap-[9px] mt-[15px]">
                  {[1, 2, 3].map((n) => (
                    <button key={n} onClick={() => setClarifyCount(n)}
                      className={`neo-count ${clarifyCount === n ? "is-active" : ""}`}>{n}</button>
                  ))}
                </div>
              )}
              <p className="neo-note mt-3">
                {clarifyOn ? `${clarifyCount} clarifier card${clarifyCount > 1 ? "s" : ""} will be drawn beside each card, adding nuance.` : "Off — each card stands alone."}
              </p>
            </div>
          </section>

          <div className="enter delay3 mx-4 sm:mx-[54px] mt-3.5">
            <button onClick={handleDraw} disabled={!question.trim()}
              className="neo-button w-full flex items-center justify-center gap-3"
              style={{ height: 62, fontSize: 13, letterSpacing: 5 }}>
              <Sparkles className="w-4 h-4" />Draw the Cards
            </button>
          </div>
        </>
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

      {/* READING PHASE — she takes the stage: the orb rises and spins while
          she reads, then she speaks and her words roll along the bottom.
          No cards, no text on screen — pure voice. */}
      {phase === "reading" && (
        <div className="flex flex-col items-center justify-center text-center min-h-[55vh] space-y-8">
          <div style={{ animation: "orbRise 0.9s ease-out both" }}>
            <OracleOrb state={orbState} size={300} />
          </div>
          <p className="text-muted-foreground font-body text-sm max-w-md">
            {readingError
              ? readingError
              : busy || voiceBusy
              ? "He's looking into the cards…"
              : orbState === "speaking"
              ? "Listen. The truth is in his voice."
              : "His words are yours to keep."}
          </p>

          {readingError && !busy && (
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={handleRead} className="neo-button px-6">Try This Reading Again</button>
              <button onClick={reset} className="neo-pill px-6 py-2.5">Another Reading</button>
            </div>
          )}



          {!readingError && !busy && !voiceBusy && orbState !== "speaking" && (
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => speak(reading)}
                className="neo-button flex items-center gap-2 px-6">
                <Volume2 className="w-3.5 h-3.5" /> Hear His Voice
              </button>
              <button onClick={reset}
                className="neo-pill flex items-center gap-2 px-6 py-2.5">
                <RefreshCw className="w-3.5 h-3.5" /> Another Reading
              </button>
            </div>
          )}

          <style>{`
            @keyframes orbRise {
              from { transform: translateY(60px) scale(0.85); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      <CaptionScroll text={captionText} progress={captionProgress} active={orbState === "speaking"} />
      <AmbientSound />
    </div>
  );
}