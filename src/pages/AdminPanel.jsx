import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, BookOpen, DollarSign, Gift, Trash2, Users } from "lucide-react";

// Admin-only control room: funds, members, the daily agent's health reports,
// journal moderation (only admins can delete entries) and credit grants.
export default function AdminPanel() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [reports, setReports] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantCredits, setGrantCredits] = useState("5");
  const [grantMessage, setGrantMessage] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    (async () => {
      let me = null;
      try { me = await base44.auth.me(); } catch (_) {}
      if (me?.role !== "admin") { setAllowed(false); return; }
      setAllowed(true);
      const [uRes, pRes, rRes, eRes, entRes] = await Promise.allSettled([
        base44.entities.User.list("-created_date", 50),
        base44.entities.Base44Purchase.filter({}, { sort: "-created_date", limit: 50 }),
        base44.entities.DailyHealthCheck.list("-created_date", 10),
        base44.entities.JournalEntry.filter({}, { sort: "-created_date", limit: 30 }),
        base44.entities.Entitlement.filter({}, { sort: "-updated_date", limit: 100 }),
      ]);
      if (uRes.status === "fulfilled") {
        const rawUsers = uRes.value;
        setUsers(Array.isArray(rawUsers) ? rawUsers : rawUsers.items || []);
      }
      if (pRes.status === "fulfilled") setPurchases(pRes.value.items || []);
      if (rRes.status === "fulfilled") setReports(rRes.value.items || []);
      if (eRes.status === "fulfilled") setEntries(eRes.value.items || []);
      if (entRes.status === "fulfilled") setEntitlements(entRes.value.items || []);
    })();
  }, []);

  const paid = purchases.filter((p) => p.status === "paid");
  const totalFunds = paid.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const currencies = [...new Set(paid.map((p) => p.currency).filter(Boolean))];

  const handleGrant = async () => {
    const email = grantEmail.trim().toLowerCase();
    const amount = parseInt(grantCredits, 10) || 0;
    if (!email || amount < 1) { setGrantMessage("Enter an email and a credit amount."); return; }
    setGrantMessage("Granting…");
    const existing = entitlements.find((e) => (e.email || "").toLowerCase() === email);
    if (existing) {
      // Optimistic: show the new balance immediately, roll back if the write fails.
      const prevCredits = existing.credits || 0;
      setEntitlements((list) =>
        list.map((e) => (e.id === existing.id ? { ...e, credits: prevCredits + amount } : e))
      );
      try {
        await base44.entities.Entitlement.update(existing.id, { credits: prevCredits + amount });
        setGrantMessage(`Added ${amount} reading credit${amount === 1 ? "" : "s"} to ${email}.`);
        setGrantEmail("");
        setGrantCredits("5");
      } catch (e) {
        setEntitlements((list) =>
          list.map((e) => (e.id === existing.id ? { ...e, credits: prevCredits } : e))
        );
        setGrantMessage(e?.message || "Couldn't add credits — try again.");
      }
    } else {
      try {
        const created = await base44.entities.Entitlement.create({ email, credits: amount, plan: "", status: "" });
        setEntitlements((list) => [created, ...list]);
        setGrantMessage(`Added ${amount} reading credit${amount === 1 ? "" : "s"} to ${email}.`);
        setGrantEmail("");
        setGrantCredits("5");
      } catch (e) {
        setGrantMessage(e?.message || "Couldn't add credits — try again.");
      }
    }
  };

  const handleDeleteEntry = async (id) => {
    setDeletingId(id);
    try {
      await base44.entities.JournalEntry.delete(id);
      setEntries((list) => list.filter((e) => e.id !== id));
    } catch (e) {
      console.error(e);
    }
    setDeletingId(null);
  };

  if (allowed === null) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="text-center pt-20">
        <h1 className="font-display text-2xl text-gold-leaf uppercase tracking-[0.2em]">Restricted</h1>
        <p className="neo-note mt-3">This room is for the Oracle's keeper alone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center pt-4">
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em]">
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-2 font-body text-sm">
          Funds, members, the daily agent's reports, and the readings themselves.
        </p>
      </div>

      <hr className="gold-hairline" />

      {/* FUNDS */}
      <section className="neo-panel">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4" style={{ color: "#d4af37" }} />
          <h2 className="neo-label m-0">Funds</h2>
        </div>
        <div style={{ color: "#eadfbf", fontSize: 26, fontWeight: 600 }}>
          {totalFunds.toFixed(2)} {currencies.join("/") || ""}
        </div>
        <p className="neo-note mt-1">{paid.length} paid purchase{paid.length === 1 ? "" : "s"} of {purchases.length} total.</p>
        {purchases.length > 0 && (
          <div className="mt-4 space-y-1.5" style={{ maxHeight: 220, overflowY: "auto" }}>
            {purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm"
                style={{ borderBottom: "1px solid rgba(212,175,55,0.12)", paddingBottom: 6 }}>
                <span style={{ color: "#c7bda4" }}>{p.buyerEmail || p.appUserId || "unknown"}</span>
                <span style={{ color: "#817a6d", fontSize: 12 }}>{p.productName}</span>
                <span style={{ color: p.status === "paid" ? "#d4af37" : "#817a6d" }}>
                  {p.amount} {p.currency} · {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MEMBERS */}
      <section className="neo-panel">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" style={{ color: "#d4af37" }} />
          <h2 className="neo-label m-0">Members</h2>
        </div>
        <p className="neo-note mb-3">{users.length} member{users.length === 1 ? "" : "s"}, newest first.</p>
        <div className="space-y-1.5" style={{ maxHeight: 260, overflowY: "auto" }}>
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 text-sm"
              style={{ borderBottom: "1px solid rgba(212,175,55,0.12)", paddingBottom: 6 }}>
              <span style={{ color: "#c7bda4" }}>{u.full_name || "—"}</span>
              <span style={{ color: "#817a6d", fontSize: 12 }}>{u.email}</span>
              <span style={{ color: u.role === "admin" ? "#00e5ff" : "#817a6d", fontSize: 12 }}>
                {u.role} · {String(u.created_date || "").slice(0, 10)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CREDIT GRANTS */}
      <section className="neo-panel">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4" style={{ color: "#d4af37" }} />
          <h2 className="neo-label m-0">Add Readings (Credits)</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="member@email.com" className="neo-field" style={{ flex: "1 1 220px", padding: "10px 12px" }} />
          <input value={grantCredits} onChange={(e) => setGrantCredits(e.target.value)}
            type="number" min="1" className="neo-field" style={{ width: 90, padding: "10px 12px" }} />
          <button onClick={handleGrant} className="neo-button">Add Credits</button>
        </div>
        {grantMessage && <p className="neo-note mt-3">{grantMessage}</p>}
        <p className="neo-note mt-3">
          {entitlements.length} entitlement record{entitlements.length === 1 ? "" : "s"} on file
          {entitlements.filter((e) => e.plan === "premium").length
            ? ` · ${entitlements.filter((e) => e.plan === "premium").length} premium`
            : ""}.
        </p>
      </section>

      {/* DAILY AGENT REPORTS */}
      <section className="neo-panel">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: "#d4af37" }} />
          <h2 className="neo-label m-0">Daily Agent Reports</h2>
        </div>
        {reports.length === 0 ? (
          <p className="neo-note">No health-check reports yet.</p>
        ) : (
          <div className="space-y-3" style={{ maxHeight: 320, overflowY: "auto" }}>
            {reports.map((r) => (
              <div key={r.id} style={{ borderBottom: "1px solid rgba(212,175,55,0.12)", paddingBottom: 8 }}>
                <div className="flex items-center gap-2 text-sm">
                  <span style={{ color: r.status === "healthy" ? "#7dd8a0" : "#e0a13a" }}>●</span>
                  <span style={{ color: "#c7bda4" }}>{r.run_date} — {r.status}</span>
                </div>
                <div className="mt-1" style={{ fontSize: 12, color: "#817a6d" }}>
                  {(r.checks || []).map((c, i) => `${c.name}: ${c.ok ? "ok" : "FAIL"}${c.detail ? ` (${c.detail})` : ""}`).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* JOURNAL MODERATION — admin-only deletes */}
      <section className="neo-panel">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4" style={{ color: "#d4af37" }} />
          <h2 className="neo-label m-0">Journal Entries</h2>
        </div>
        <p className="neo-note mb-3">Only you can delete journal entries. Showing the {entries.length} most recent.</p>
        <div className="space-y-2" style={{ maxHeight: 360, overflowY: "auto" }}>
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 text-sm"
              style={{ borderBottom: "1px solid rgba(212,175,55,0.12)", paddingBottom: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#c7bda4" }} className="truncate">
                  "{(e.question || "").slice(0, 70)}{(e.question || "").length > 70 ? "…" : ""}"
                </div>
                <div style={{ color: "#817a6d", fontSize: 12 }}>
                  {e.spread} · {e.deck} · {String(e.created_date || "").slice(0, 10)} · by {e.created_by || "unknown"}
                </div>
              </div>
              <button
                onClick={() => handleDeleteEntry(e.id)}
                disabled={deletingId === e.id}
                className="neo-pill flex items-center gap-1.5 px-3 py-1.5"
                style={{ color: deletingId === e.id ? "#817a6d" : "#c0392b" }}
                title="Delete entry"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingId === e.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}