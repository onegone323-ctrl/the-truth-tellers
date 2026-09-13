import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

// Store-required account deletion: explain the consequences, confirm, wipe, sign out.
export default function DeleteAccountDialog() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirmDelete = async (e) => {
    e.preventDefault();
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="neo-button flex items-center gap-2 min-h-[44px]" style={{ background: "linear-gradient(100deg, #5a0d12, #c0392b)", borderColor: "#c0392b", color: "#fff" }}>
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="lux-card" style={{ borderColor: "rgba(192,57,43,0.6)" }}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl" style={{ color: "#f0e6d2" }}>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm space-y-2" style={{ color: "#b5ad99" }}>
            This is permanent. Your account, every journal entry, the Oracle's memory of you, and your seeker profile
            will be erased and cannot be recovered. You will be signed out immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-[44px]" disabled={busy}>Keep my account</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} disabled={busy} className="min-h-[44px]"
            style={{ background: "#c0392b", color: "#fff" }}>
            {busy ? "Erasing…" : "Yes, delete everything"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}