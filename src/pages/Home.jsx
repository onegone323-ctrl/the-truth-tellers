import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { DECKS, BLENDED_DECK, SPREADS, drawSpread, drawClarifiers } from "@/lib/tarotData";
import { deckCardTitle } from "@/lib/deckCardNames";
import CustomSpreadBuilder from "@/components/CustomSpreadBuilder";
import OracleFire from "@/components/OracleFire";
import FireReading from "@/components/FireReading";
import CardFace from "@/components/CardFace";
import GoldSpinner from "@/components/GoldSpinner";
import { Link } from "react-router-dom";
import { Mic, MicOff, Sparkles } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

// Heavy, not needed on first paint — loaded on demand.
const DailyCard = React.lazy(() => import("@/components/DailyCard"));
const OnboardingQuestionnaire = React.lazy(() => import("@/components/OnboardingQuestionnaire"));
const AmbientSound = React.lazy(() => import("@/components/AmbientSound"));

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
  const [aura, setAura] = useState("dance");
  const [clarifyOn, setClarifyOn] = useState(false);
  const [clarifyCount, setClarifyCount] = useState(1);
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState([]);
  const [reading, setReading] = useState("");
  const [readingError, setReadingError] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [entitlement, setEntitlement] = useState(null);
  const [readingsUsed, setReadingsUsed] = useState(0);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [spokenDone, setSpokenDone] = useState(false);
  const recogRef = useRef(null);
  const busyRef = useRef(false);
  // The Oracle's fire — one shared fire for the hero, the drawing view and
  // the reading. It owns the reading request, her voice and every visual.
  const fireRef = useRef(null);

  // Stop any in-flight voice on unmount so the Oracle never keeps talking
  // after the seeker leaves the page.
  useEffect(() => {
    return () => { fireRef.current?.reset(); };
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
    r.onstart = () => { setListening(true); };
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setQuestion((q) => (q ? q + " " : "") + text);
    };
    r.onend = () => { setListening(false); };
    r.onerror = () => { setListening(false); };
    recogRef.current = r;
    r.start();
  };
  const stopListening = () => { recogRef.current?.stop(); };

  // ---- Draw cards ----
  const buildPayload = (q, drawnCards) => ({
    question: q, deck: activeDeck, spread,
    cards: drawnCards.map((c) => ({
      name: c.name, reversed: c.reversed, position: c.position,
      deck_name: (c.cardDeck || activeDeck).name,
      deck_tradition: (c.cardDeck || activeDeck).tradition,
      deck_title: deckCardTitle((c.cardDeck || activeDeck).id, c.name),
      clarifiers: (c.clarifiers || []).map((x) => ({ name: x.name, reversed: x.reversed })),
    })),
    memory: memory ? {
      user_name: seekerName,
      history: memory.history || [],
      recurring_themes: memory.recurring_themes || [],
      reading_count: memory.reading_count,
    } : null,
  });

  // When the reading lands: mirror the server-side spend and keep her memory
  // of this seeker current. The journal entry itself is written by the SERVER
  // inside generateReading (before the reading is returned) so usage can't be
  // bypassed — the client must not duplicate it.
  const handleReadingComplete = async ({ reading: text, snippet, message }) => {
    // She starts the reading on her own the moment it lands.
    setPhase("reading");
    setReading(text);
    setReadingError("");
    setOutOfCredits(false);
    if (snippet) {
      setOutOfCredits(true);
      setReadingError(message || "The Oracle stops here — sign up to hear the whole reading.");
    }
    // Mirror the server-side spend locally: the first reading is free,
    // premium reads freely, after that each full reading spends a credit.
    if (!snippet && user?.role !== "admin" && entitlement && entitlement.plan !== "premium" && readingsUsed >= 1) {
      setEntitlement({ ...entitlement, credits: Math.max(0, (entitlement.credits || 0) - 1) });
    }
    setReadingsUsed((r) => r + 1);
    busyRef.current = false;
    setBusy(false);
    try {
      // True history: each reading appends one entry — the question asked plus
      // the FULL 880-character reading in a single continuous block. The last
      // 5 interactions are kept and sent to every new reading.
      const historyEntry = { question, summary: text.slice(0, 880) };
      const nextHistory = [...(memory?.history || []), historyEntry].slice(-5);
      // Themes accumulate from every reading instead of being set once.
      const nextThemes = [...new Set([...(memory?.recurring_themes || []), spread.category])].slice(0, 12);
      if (memory) {
        await base44.entities.OracleMemory.update(memory.id, {
          summary: historyEntry.summary,
          history: nextHistory,
          recurring_themes: nextThemes,
          last_question: question,
          last_advice: text.slice(-280),
          reading_count: (memory.reading_count || 0) + 1,
          user_name: seekerName,
          recurring_cards: [...new Set([...(memory.recurring_cards || []), ...cards.map((c) => c.name)])].slice(0, 12),
        });
        // Keep the in-session memory current, so a second reading this
        // session already knows the first.
        setMemory((m) => (m
          ? { ...m, summary: historyEntry.summary, history: nextHistory, recurring_themes: nextThemes, reading_count: (memory.reading_count || 0) + 1 }
          : m));
      } else {
        const created = await base44.entities.OracleMemory.create({
          user_name: seekerName,
          summary: historyEntry.summary,
          history: [historyEntry],
          recurring_themes: [spread.category],
          recurring_cards: cards.map((c) => c.name).slice(0, 12),
          last_question: question,
          last_advice: text.slice(-280),
          reading_count: 1,
        });
        setMemory(created);
      }
    } catch (persistenceError) {
      console.error("Reading succeeded but could not be saved.", persistenceError);
    }
  };

  const handleReadingError = (e) => {
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
    busyRef.current = false;
    setBusy(false);
  };

  const handleDraw = () => {
    if (!question.trim() || busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const drawn = drawSpread(spread).map((c) => ({
      ...c,
      cardDeck: blendDecks ? DECKS[Math.floor(Math.random() * DECKS.length)] : deck,
      clarifiers: clarifyOn ? drawClarifiers(clarifyCount).map((x) => ({ ...x, card: x.card })) : [],
    }));
    setCards(drawn);
    setPhase("drawing");
    setReading("");
    setReadingError("");
    setOutOfCredits(false);
    setSpokenDone(false);
    // Submitting the question is the moment the fire awakens — and the
    // reading request starts right now, in parallel with the dealing.
    fireRef.current?.startOracle(buildPayload(question, drawn), {
      onComplete: handleReadingComplete,
      onError: handleReadingError,
      onVoiceStart: () => setVoiceBusy(true),
      onVoiceEnd: () => setVoiceBusy(false),
      onBlocked: () => {},
      onDone: () => setSpokenDone(true),
    });
  };

  // ---- Hear the reading: the fire ignites, thinks, then speaks ----
  const handleRead = () => {
    setPhase("reading");
    fireRef.current?.play();
  };

  const reset = () => {
    fireRef.current?.reset();
    setPhase("setup"); setCards([]); setReading(""); setReadingError(""); setQuestion(""); setVoiceBusy(false); setOutOfCredits(false); setSpokenDone(false);
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
          <OracleFire width={170} />
        </div>
        <React.Suspense fallback={<GoldSpinner />}>
          <OnboardingQuestionnaire onComplete={setProfile} defaultName={notEmailUsername(user?.full_name)} />
        </React.Suspense>
        <React.Suspense fallback={null}>
          <AmbientSound />
        </React.Suspense>
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
            {/* The home-page hero: the Oracle's own card, large and still. The
                fire stays mounted but hidden — its reading engine must stay
                wired for the draw. */}
            {phase === "setup" && (
              <div className="flex justify-center">
                <div className="relative w-full max-w-[280px]">
                  <Image
                    src="https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/6f1556556_oracle-card.png"
                    alt="The Oracle's card, face down"
                    fittingType="fill"
                    originWidth={363}
                    originHeight={633}
                    className="w-full"
                    draggable={false}
                  />
                  {/* The Oracle's eye blinks every few seconds: an eyelid
                      cut from the card's own brow pixels snaps shut. */}
                  <div className="oracle-lid" aria-hidden="true" />
                </div>
              </div>
            )}
            <div style={phase === "setup" ? { display: "none" } : undefined}>
              <OracleFire ref={fireRef} mode={listening ? "open" : "dormant"} aura={aura} width={300} />
            </div>
          </div>
        </section>
      )}

      {/* SETUP PHASE — bento grid of beveled glass panels */}
      {phase === "setup" && (
        <PullToRefresh onRefresh={loadData}>
          <section className="enter delay1 mx-4 sm:mx-[54px] mb-6">
            <React.Suspense fallback={<GoldSpinner />}>
              <DailyCard memory={memory} setMemory={setMemory} userName={seekerName} />
            </React.Suspense>
          </section>

          <section className="enter delay2 mx-4 sm:mx-[54px] mb-6">
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
                    background: "linear-gradient(100deg, #6f4d0b, var(--gold-leaf), #b8860b)",
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
                      <strong className="block font-serif text-[15px] font-bold">{s.name}</strong>
                      <span className="block mt-[3px] font-bold text-[13px]">{s.description}</span>
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
            <button onClick={handleDraw} disabled={!question.trim() || busy}
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
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => setPhase("setup")} className="neo-pill px-6 py-2.5">Redraw Setup</button>
            {busy && (
              <p className="text-sm" style={{ color: "#b1a38b" }}>
                The Oracle is preparing your reading…
              </p>
            )}
          </div>
          {readingError && (
            <div className="text-center">
              <p style={{ color: "#b1a38b", fontSize: 13 }}>{readingError}</p>
              {outOfCredits
                ? <Link to="/pricing" className="neo-button" style={{ display: "inline-block", marginTop: 10 }}>Get More Readings</Link>
                : <button onClick={handleRead} className="neo-button" style={{ marginTop: 10 }}>Try Again</button>}
            </div>
          )}
        </div>
      )}

      {/* READING PHASE — nothing but the Oracle: a full black page, her fire
          filling a tall stage, colors cycling with her voice, the reading's
          words fading in beneath, tiny controls at the bottom edge. */}
      {phase === "reading" && (
        <FireReading
          fireRef={fireRef}
          aura={aura}
          busy={busy}
          voiceBusy={voiceBusy}
          error={readingError}
          outOfCredits={outOfCredits}
          done={spokenDone && !voiceBusy && !busy && !readingError}
          onReset={reset}
          onRetry={handleRead}
        />
      )}
      {phase !== "reading" && (
        <React.Suspense fallback={null}>
          <AmbientSound />
        </React.Suspense>
      )}
    </div>
  );
}