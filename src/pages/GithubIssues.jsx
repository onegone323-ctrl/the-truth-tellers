import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CircleDot, ExternalLink, RefreshCw, MessageSquare, Tag } from "lucide-react";
import PullToRefresh from "@/components/PullToRefresh";

const REPOS = ["onegone323-ctrl/the-truth-tellers", "onegone323-ctrl/perplexity-py"];

const labelPill = (color) => ({
  background: color + "33",
  borderColor: color + "66",
  color: "#f5e6b8",
});

export default function GithubIssues() {
  const [repo, setRepo] = useState(REPOS[0]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (r) => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("getGithubIssues", { repo: r });
      setIssues(res?.data?.issues || []);
    } catch (e) {
      setError("Couldn't reach the codebase — " + (e?.response?.data?.error || e?.message || "try again."));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(repo); }, [repo, load]);

  const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <PullToRefresh onRefresh={() => load(repo)}>
    <div className="space-y-6 overscroll-none">
      <div className="text-center">
        <h1 className="font-display text-4xl text-gold-leaf uppercase tracking-[0.2em]">Issue Ledger</h1>
        <p className="text-muted-foreground mt-2 font-body">Open issues across the Oracle codebase.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="flex flex-wrap items-center justify-between gap-3 max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-2">
          {REPOS.map((r) => (
            <button key={r} onClick={() => setRepo(r)}
              className={`px-3 py-1.5 min-h-[44px] rounded-full text-sm uppercase tracking-widest transition-all ${
                repo === r ? "gold-pill-active text-gold-leaf" : "gold-pill text-muted-foreground"
              }`}>
              {r.split("/")[1]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{loading ? "" : `${issues.length} open`}</span>
          <button onClick={() => load(repo)}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full gold-pill text-gold-leaf text-sm uppercase tracking-widest">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-center text-red-300/90 text-sm border border-red-400/30 rounded-lg px-4 py-3 max-w-lg mx-auto"
          style={{ background: "rgba(60,10,15,0.4)" }}>{error}</p>
      ) : loading ? (
        <div className="text-center text-muted-foreground py-12">Consulting the code…</div>
      ) : issues.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <p className="font-serif text-lg">No open issues.</p>
          <p className="text-sm mt-1">The ledger is clear — for now.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl mx-auto">
          {issues.map((i) => (
            <a key={i.number} href={i.url} target="_blank" rel="noreferrer"
              className="lux-card rounded-xl p-4 flex items-start gap-3 hover:scale-[1.01] transition-transform">
              <CircleDot className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#facc15" }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-serif text-foreground/90">#{i.number} · {i.title}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                  <span>{i.author} · opened {fmt(i.created)}</span>
                  {i.comments > 0 && (
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{i.comments}</span>
                  )}
                </div>
                {i.labels?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {i.labels.map((l) => (
                      <span key={l.name}
                        className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1"
                        style={labelPill(l.color)}>
                        <Tag className="w-2.5 h-2.5" />{l.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
            </a>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}