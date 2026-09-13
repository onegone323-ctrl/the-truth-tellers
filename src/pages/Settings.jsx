import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft } from "lucide-react";
import useGoBack from "@/hooks/useGoBack";
import DeleteAccountDialog from "@/components/settings/DeleteAccountDialog";

export default function Settings() {
  const goBack = useGoBack("/");
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={goBack} aria-label="Go back"
        className="flex items-center gap-2 min-h-[44px] text-sm uppercase tracking-widest text-muted-foreground hover:text-gold-leaf transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="text-center">
        <h1 className="font-display text-3xl sm:text-4xl text-gold-leaf uppercase tracking-[0.2em]">Settings</h1>
        <p className="text-muted-foreground mt-2 font-body text-sm">Your account with the Oracle.</p>
      </div>
      <hr className="gold-hairline" />

      <div className="lux-card rounded-xl p-6 space-y-1">
        <div className="text-sm uppercase tracking-widest text-gold-leaf/80">Signed in as</div>
        <div className="font-serif text-lg" style={{ color: "#f0e6d2" }}>{user?.full_name || "—"}</div>
        <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
      </div>

      <div className="lux-card rounded-xl p-6 space-y-4" style={{ borderColor: "rgba(192,57,43,0.45)" }}>
        <div>
          <div className="text-sm uppercase tracking-widest" style={{ color: "#e8a9a9" }}>Danger Zone</div>
          <p className="text-sm text-muted-foreground mt-2">
            Deleting your account erases your journal, the Oracle's memory of you, and your profile. There is no undo.
          </p>
        </div>
        <DeleteAccountDialog />
      </div>
    </div>
  );
}