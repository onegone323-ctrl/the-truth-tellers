import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";

// First-visit questionnaire — the Oracle wants to know who she's reading for.
export default function OnboardingQuestionnaire({ onComplete, defaultName = "" }) {
  const [form, setForm] = useState({
    full_name: defaultName,
    birthdate: "",
    favorite_color: "",
    trigger: "",
    makes_happy: "",
    hard_memory: "",
    occupation: "",
    goals: ["", "", ""],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setGoal = (i, v) =>
    setForm((f) => ({ ...f, goals: f.goals.map((g, gi) => (gi === i ? v : g)) }));

  const valid =
    form.full_name.trim() && form.birthdate && form.favorite_color.trim() &&
    form.trigger.trim() && form.makes_happy.trim() && form.hard_memory.trim() &&
    form.occupation.trim() && form.goals.filter((g) => g.trim()).length === 3;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await base44.entities.SeekerProfile.create({
        full_name: form.full_name.trim(),
        birthdate: form.birthdate,
        favorite_color: form.favorite_color.trim(),
        trigger: form.trigger.trim(),
        makes_happy: form.makes_happy.trim(),
        hard_memory: form.hard_memory.trim(),
        occupation: form.occupation.trim(),
        goals: form.goals.map((g) => g.trim()),
      });
      onComplete(created);
    } catch (e) {
      console.error(e);
      setError("The ink wouldn't take. Try again.");
    }
    setBusy(false);
  };

  const cls = "w-full bg-black/50 rounded-lg p-3 text-sm font-body outline-none";
  const style = { border: "1px solid rgba(212,175,55,0.25)" };
  const labelCls = "block text-xs uppercase tracking-widest text-gold-leaf/80 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl text-gold-leaf uppercase tracking-[0.2em]">
          Before She Reads for You
        </h2>
        <p className="text-muted-foreground text-sm mt-2 font-body max-w-md mx-auto">
          The Oracle doesn't read for strangers. Tell her who you are — what she learns stays between you two.
        </p>
      </div>

      <div className="lux-card rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Your Name</label>
            <input name="full_name" className={cls} style={style} value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)} placeholder="What should she call you?" />
          </div>
          <div>
            <label className={labelCls}>Birthdate</label>
            <input name="birthdate" type="date" className={cls} style={{ ...style, colorScheme: "dark" }}
              value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Favorite Color</label>
            <input name="favorite_color" className={cls} style={style} value={form.favorite_color}
              onChange={(e) => set("favorite_color", e.target.value)} placeholder="The one you always reach for." />
          </div>
          <div>
            <label className={labelCls}>Occupation</label>
            <input name="occupation" className={cls} style={style} value={form.occupation}
              onChange={(e) => set("occupation", e.target.value)} placeholder="What do you do all day?" />
          </div>
        </div>

        <div>
          <label className={labelCls}>A Trigger — What Sets You Off?</label>
          <textarea name="trigger" rows={2} className={cls} style={style} value={form.trigger}
            onChange={(e) => set("trigger", e.target.value)} placeholder="The thing that always gets under your skin." />
        </div>
        <div>
          <label className={labelCls}>What Makes You Happy?</label>
          <textarea name="makes_happy" rows={2} className={cls} style={style} value={form.makes_happy}
            onChange={(e) => set("makes_happy", e.target.value)} placeholder="The people, places, moments that light you up." />
        </div>
        <div>
          <label className={labelCls}>A Memory You Wish You Could Forget</label>
          <textarea name="hard_memory" rows={2} className={cls} style={style} value={form.hard_memory}
            onChange={(e) => set("hard_memory", e.target.value)} placeholder="She'll hold it gently. Promise." />
        </div>

        <div>
          <label className={labelCls}>Name Three Goals</label>
          <div className="space-y-2">
            {form.goals.map((g, i) => (
              <input key={i} name={`goal-${i}`} className={cls} style={style} value={g}
                onChange={(e) => setGoal(i, e.target.value)} placeholder={`Goal ${i + 1}`} />
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button onClick={submit} disabled={!valid || busy}
          className="w-full py-4 rounded-full text-sm uppercase tracking-[0.3em] font-display transition-all disabled:opacity-40"
          style={{
            background: "linear-gradient(160deg, rgba(120,20,30,0.7), rgba(60,10,15,0.9))",
            border: "1px solid rgba(212,175,55,0.6)",
            boxShadow: "0 0 24px rgba(192,57,43,0.3), 0 0 12px rgba(212,175,55,0.2)",
            color: "#f5e6b8",
          }}>
          <Sparkles className="w-4 h-4 inline mr-2" />
          {busy ? "Sealing it…" : "Give It to the Oracle"}
        </button>
      </div>
    </div>
  );
}