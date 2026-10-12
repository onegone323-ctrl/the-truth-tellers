import React, { Suspense, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Admin-only control room shell: checks access, then lazily pulls in the
// heavy sections (funds, members, grants, reports, journal moderation) as
// their own chunk — nothing loads until the admin check passes.
const AdminSections = React.lazy(() => import("@/components/admin/AdminSections"));

export default function AdminPanel() {
  const [allowed, setAllowed] = useState(null); // null = checking

  useEffect(() => {
    (async () => {
      let me = null;
      try { me = await base44.auth.me(); } catch (_) {}
      setAllowed(me?.role === "admin");
    })();
  }, []);

  if (allowed === null) {
    return <AdminSpinner />;
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
    <Suspense fallback={<AdminSpinner />}>
      <AdminSections />
    </Suspense>
  );
}

function AdminSpinner() {
  return (
    <div className="flex justify-center pt-16">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: "rgba(212,175,55,0.3)", borderTopColor: "#d4af37" }} />
    </div>
  );
}