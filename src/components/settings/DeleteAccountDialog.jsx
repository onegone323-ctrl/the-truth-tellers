import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2 } from "lucide-react";

// Store-required account deletion: explain the consequences, confirm, wipe, sign out.
export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirmDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("deleteAccount", { confirm: "DELETE" });
      base44.auth.logout("/login");
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "The Oracle could not release your account. Try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="neo-button flex items-center gap-2 min-h-[44px]"
        style={{ background: "linear-gradient(100deg, #5a0d12, #c0392b)", borderColor: "#c0392b", color: "#fff" }}>
        <Trash2 className="w-4 h-4" /> Delete Account
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => !busy && setOpen(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc"
            onClick={(e) => e.stopPropagation()}
            className="lux-card rounded-xl p-6 w-full max-w-md space-y-4" style={{ borderColor: "rgba(192,57,43,0.6)" }}>
            <h2 id="del-title" className="font-display text-xl" style={{ color: "#f0e6d2" }}>Delete your account?</h2>
            <p id="del-desc" className="text-sm" style={{ color: "#b5ad99" }}>
              This is permanent. Your account, every journal entry, the Oracle's memory of you, and your seeker profile
              will be erased and cannot be recovered. You will be signed out immediately.
            </p>
            {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={busy} className="neo-pill min-h-[44px] px-5">Keep my account</button>
              <button onClick={confirmDelete} disabled={busy} className="neo-button min-h-[44px]"
                style={{ background: "#c0392b", borderColor: "#c0392b", color: "#fff" }}>
                {busy ? "Erasing…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}