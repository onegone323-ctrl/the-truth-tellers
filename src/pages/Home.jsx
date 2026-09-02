import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DECKS, SPREADS, drawSpread, drawClarifiers } from "@/lib/tarotData";
import OracleOrb from "@/components/OracleOrb";
import CardFace from "@/components/CardFace";
import { Mic, MicOff, Volume2, VolumeX, RefreshCw, Sparkles } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState(null);
  const [memory, setMemory] = useState(null);
  const [phase, setPhase] = useState("setup"); // setup | drawing | reading
  const [deck, setDeck] = useState(DECKS[0]);
  const [spreadCategory, setSpreadCategory] = useState("General");
  const [spread, setSpread] = useState(SPREADS[0]);
  const [clarifyOn, setClarifyOn] = useState(false);
  const [clarifyCount, setClarifyCount] = useState(1);
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState([]);
  const [reading, setReading] = useState("");
  const [orbState, setOrbState] = useState("idle");
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const recogRef = useRef(null);

  // Load user + memory
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const mem = await base44.entities.OracleMemory.list("-updated_date", 1);
        if (mem && mem.length) setMemory(mem[0]);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const categories = ["General", "Love", "Career", "Decision", "Yearly"];
  const spreadsInCat = SPREADS.filter((s) => s.category === spreadCategory);

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
      clarifiers: clarifyOn ? drawClarifiers(clarifyCount).map((x) => ({ ...x, card: x.card })) : [],
    }));
    setCards(drawn);
    setPhase("drawing");
    setOrbState("thinking");
  };

  // ---- Generate reading ----
  const handleRead = async () => {
    setPhase("reading");
    setOrbState("thinking");
    setBusy(true);
    setReading("");
    try {
      const payload = {
        question, deck, spread,
        cards: cards.map((c) => ({
          name: c.name, reversed: c.reversed, position: c.position,
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
      const text = res?.data?.reading || "The Oracle is silent. Try again.";
      setReading(text);
      setOrbState("speaking");

      // Save journal + update memory (parallel)
      const cardData = cards.map((c) => ({
        name: c.name, reversed: c.reversed, position: c.position,
        clarifiers: (c.clarifiers || []).map((x) => ({ name: x.name, reversed: x.reversed })),
      }));

      // Generate speech if voice mode
      let savedAudio = null;
      if (voiceMode) {
        try {
          const sp = await base44.functions.invoke("generateSpeech", { text, voice: "storm" });
          savedAudio = sp?.data?.audio_url || null;
          if (savedAudio) {
            setAudioUrl(savedAudio);
            setTimeout(() => audioRef.current?.play().catch(() => {}), 300);
          }
        } catch (e) { console.error("TTS failed", e); }
      }

      await base44.entities.JournalEntry.create({
        question, deck: deck.name, spread: spread.name,
        cards_drawn: cardData, interpretation: text, audio_url: savedAudio,
      });

      // Update memory
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
    } catch (e) {
      console.error(e);
      setReading("The veil thickened. The Oracle could not speak — try again.");
    }
    setBusy(false);
  };

  const handleAudioEnded = () => { setSpeaking(false); setOrbState("idle"); };
  const handleAudioPlay = () => { setSpeaking(true); setOrbState("speaking"); };

  const reset = () => {
    setPhase("setup"); setCards([]); setReading(""); setAudioUrl(null); setOrbState("idle"); setQuestion("");
  };

  const greeting = memory?.user_name || user?.full_name
    ? `Welcome back, ${memory?.user_name || user?.full_name.split(" ")[0]}.`
    : "Welcome, seeker.";

  return (
    <div className="space-y-8">
      {/* Hero / Orb */}
      <div className="flex flex-col items-center text-center pt-4">
        <OracleOrb state={orbState} size={200} />
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em] mt-6">
          {phase === "setup" && "Consult the Oracle"}
          {phase === "drawing" && "The Cards Are Drawn"}
          {phase === "reading" && "She Speaks"}
        </h1>
        <p className="text-muted-foreground mt-2 font-body text-sm max-w-md">
          {phase === "setup" && `${greeting} Speak your question, choose your deck and spread, and let her read the cards.`}
          {phase === "drawing" && "Tap each card to turn it. When you're ready, ask her to read."}
          {phase === "reading" && (busy ? "She's looking into the cards…" : "Listen. Or read. The truth is here.")}
        </p>
      </div>

      <hr className="gold-hairline" />

      {/* SETUP PHASE */}
      {phase === "setup" && (
        <div className="space-y-8 max-w-2xl mx-auto">
          {/* Question + voice */}
          <div className="lux-card rounded-xl p-5 space-y-3">
            <label className="text-xs uppercase tracking-widest text-gold-leaf/80">Your Question</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you need the truth about?"
              rows={3}
              className="w-full bg-black/50 rounded-lg p-3 text-sm font-body outline-none resize-none"
              style={{ border: "1px solid rgba(212,175,55,0.25)" }} />
            <div className="flex items-center justify-between">
              <button onClick={listening ? stopListening : startListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-all ${
                  listening ? "gold-pill-active text-red-300" : "gold-pill text-gold-leaf"
                }`}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {listening ? "Listening…" : "Speak It"}
              </button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Volume2 className="w-4 h-4" />
                <span>Voice mode</span>
                <button onClick={() => setVoiceMode((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-all relative ${voiceMode ? "bg-red-800/60" : "bg-zinc-700"}`}
                  style={{ border: "1px solid rgba(212,175,55,0.4)" }}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${voiceMode ? "left-5 bg-gold-leaf" : "left-0.5 bg-zinc-400"}`}
                    style={{ background: voiceMode ? "#d4af37" : "#a1a1aa" }} />
                </button>
              </label>
            </div>
          </div>

          {/* Deck selection */}
          <div className="lux-card rounded-xl p-5 space-y-3">
            <label className="text-xs uppercase tracking-widest text-gold-leaf/80">Choose Your Deck</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DECKS.map((d) => (
                <button key={d.id} onClick={() => setDeck(d)}
                  className={`rounded-lg p-3 text-center transition-all ${deck.id === d.id ? "gold-pill-active" : "gold-pill"}`}>
                  <div className="text-2xl" style={{ color: d.accent }}>{d.backGlyph}</div>
                  <div className="text-xs font-serif mt-1" style={{ color: deck.id === d.id ? "#f5e6b8" : "#a8a29e" }}>{d.name}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">{deck.description}</p>
          </div>

          {/* Spread selection */}
          <div className="lux-card rounded-xl p-5 space-y-3">
            <label className="text-xs uppercase tracking-widest text-gold-leaf/80">Choose Your Spread</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} onClick={() => { setSpreadCategory(c); setSpread(SPREADS.filter((s) => s.category === c)[0]); }}
                  className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-widest transition-all ${
                    spreadCategory === c ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground"
                  }`}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {spreadsInCat.map((s) => (
                <button key={s.id} onClick={() => setSpread(s)}
                  className={`rounded-lg p-3 text-left transition-all ${spread.id === s.id ? "gold-pill-active" : "gold-pill"}`}>
                  <div className="text-sm font-serif" style={{ color: spread.id === s.id ? "#f5e6b8" : "#d4c8a8" }}>{s.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Clarifiers */}
          <div className="lux-card rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-gold-leaf/80">Clarification Cards</label>
              <button onClick={() => setClarifyOn((v) => !v)}
                className={`w-10 h-5 rounded-full transition-all relative ${clarifyOn ? "bg-red-800/60" : "bg-zinc-700"}`}
                style={{ border: "1px solid rgba(212,175,55,0.4)" }}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${clarifyOn ? "left-5" : "left-0.5"}`}
                  style={{ background: clarifyOn ? "#d4af37" : "#a1a1aa" }} />
              </button>
            </div>
            {clarifyOn && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Per card:</span>
                {[1, 2, 3].map((n) => (
                  <button key={n} onClick={() => setClarifyCount(n)}
                    className={`px-4 py-1 rounded-full text-xs font-serif transition-all ${
                      clarifyCount === n ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground"
                    }`}>{n}</button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">
              {clarifyOn ? `${clarifyCount} clarifier card${clarifyCount > 1 ? "s" : ""} will be drawn beside each card, adding nuance.` : "Off — each card stands alone."}
            </p>
          </div>

          <button onClick={handleDraw} disabled={!question.trim()}
            className="w-full py-4 rounded-full text-sm uppercase tracking-[0.3em] font-display transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(160deg, rgba(120,20,30,0.7), rgba(60,10,15,0.9))",
              border: "1px solid rgba(212,175,55,0.6)",
              boxShadow: "0 0 24px rgba(192,57,43,0.3), 0 0 12px rgba(212,175,55,0.2)",
              color: "#f5e6b8",
            }}>
            <Sparkles className="w-4 h-4 inline mr-2" />Draw the Cards
          </button>
        </div>
      )}

      {/* DRAWING PHASE */}
      {phase === "drawing" && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-center gap-3">
            {cards.map((c, i) => (
              <CardFace key={i} card={c} deck={deck} index={i} clarifiers={c.clarifiers} />
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-serif italic">{spread.name} · {deck.name}</p>
            <p className="mt-1">"{question}"</p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={() => setPhase("setup")}
              className="px-6 py-2.5 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest">Redraw Setup</button>
            <button onClick={handleRead}
              className="px-8 py-2.5 rounded-full text-xs uppercase tracking-[0.2em] font-display transition-all"
              style={{
                background: "linear-gradient(160deg, rgba(120,20,30,0.7), rgba(60,10,15,0.9))",
                border: "1px solid rgba(212,175,55,0.6)",
                color: "#f5e6b8",
                boxShadow: "0 0 20px rgba(192,57,43,0.3)",
              }}>
              Hear the Reading
            </button>
          </div>
        </div>
      )}

      {/* READING PHASE */}
      {phase === "reading" && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2">
            {cards.map((c, i) => (
              <div key={i} className="text-center">
                <CardFace card={c} deck={deck} index={i} revealed clarifiers={c.clarifiers} />
              </div>
            ))}
          </div>
          <hr className="gold-hairline" />
          <div className="lux-card rounded-xl p-6">
            {busy ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
                  style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
                She's reading the cards…
              </div>
            ) : (
              <p className="font-body text-foreground/90 leading-relaxed whitespace-pre-wrap text-[15px]">{reading}</p>
            )}
          </div>

          {!busy && audioUrl && (
            <audio ref={audioRef} src={audioUrl} controls onPlay={handleAudioPlay} onEnded={handleAudioEnded}
              className="w-full" />
          )}

          {!busy && (
            <div className="flex justify-center">
              <button onClick={reset}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest">
                <RefreshCw className="w-3.5 h-3.5" /> Another Reading
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}