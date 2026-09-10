import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { GitPullRequest, ExternalLink, RefreshCw } from "lucide-react";

const REPOS = ["ADPOV-MEDIA-ENT/the-truth-teller", "ADPOV-MEDIA-ENT/THE-ORACLE"];

const statusStyle = (p) => {
  if (p.merged) return { label: "Merged", pill: "bg-purple-900/40 border-purple-400/40 text-purple-200" };
  if (p.state === "open") return { label: p.draft ? "Draft" : "Open", pill: "bg-emerald-900/30 border-emerald-400/40 text-emerald-200" };
  return { label: "Closed", pill: "bg-red-900/30 border-red-400/40 text-red-300" };
};

export default function PullRequests() {
  const [repo, setRepo] = useState(REPOS[0]);
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (r) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getPullRequests", { repo: r });
      setPulls(res?.data?.pulls || []);
    } catch (e) {
      setError("Couldn't reach the codebase — " + (e?.response?.data?.error || e?.message || "try again."));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(repo); }, [repo, load]);

  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-4xl text-gold-leaf uppercase tracking-[0.2em]">The Codex</h1>
        <p className="text-muted-foreground mt-2 font-body">Pull requests across the Oracle codebase.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="flex flex-wrap items-center justify-between gap-3 max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-2">
          {REPOS.map((r) => (
            <button key={r} onClick={() => setRepo(r)}
              className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-widest transition-all ${
                repo === r ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground"
              }`}>
              {r.split("/")[1]}
            </button>
          ))}
        </div>
        <button onClick={() => load(repo)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full gold-pill text-gold-leaf text-xs uppercase tracking-widest">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error ? (
        <p className="text-center text-red-300/90 text-sm border border-red-400/30 rounded-lg px-4 py-3 max-w-lg mx-auto"
          style={{ background: "rgba(60,10,15,0.4)" }}>{error}</p>
      ) : loading ? (
        <div className="text-center text-muted-foreground py-12">Consulting the code…</div>
      ) : pulls.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p className="font-serif text-lg">No pull requests yet.</p>
          <p className="text-sm mt-1">The codebase is quiet — for now.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl mx-auto">
          {pulls.map((p) => {
            const s = statusStyle(p);
            return (
              <a key={p.number} href={p.url} target="_blank" rel="noreferrer"
                className="lux-card rounded-xl p-4 flex items-start gap-3 hover:scale-[1.01] transition-transform">
                <GitPullRequest className="w-5 h-5 mt-0.5 shrink-0" style={{ color: p.merged ? "#c084fc" : p.state === "open" ? "#34d399" : "#f87171" }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-serif text-foreground/90 truncate">#{p.number} · {p.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-widest ${s.pill}`}>{s.label}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {p.author} · {p.branch} · updated {fmt(p.updated)} · {p.comments} comments
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}