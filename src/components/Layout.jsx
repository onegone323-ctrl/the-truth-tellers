import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useGoBack from "@/hooks/useGoBack";
import { base44 } from "@/api/base44Client";
import Starfield from "@/components/Starfield";
import TabBar from "@/components/TabBar";
import RouteTransition from "@/components/RouteTransition";
import CompactHeader from "@/components/CompactHeader";

const NAV = [
  { to: "/", label: "Consult" },
  { to: "/journal", label: "Journal" },
  { to: "/memory", label: "Memory" },
  { to: "/timeline", label: "Timeline" },
  { to: "/cards", label: "Cards" },
  { to: "/connect", label: "Connect" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Layout() {
  const location = useLocation();
  // The Admin room link is visible to the keeper only.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  // Mobile header: on any path that isn't a tab root (a detail page like
  // /journal/:id, or Settings/Pricing/Admin), show a back arrow and the page
  // title instead of the brand. Tab roots and desktop keep the brand logo.
  const TAB_ROOTS = ["/", "/journal", "/memory", "/timeline", "/cards", "/connect"];
  const isTabRoot = TAB_ROOTS.includes(location.pathname);
  const pageTitle = (() => {
    const p = location.pathname;
    const card = p.match(/^\/cards\/(.+)$/);
    if (card) return decodeURIComponent(card[1]);
    if (/^\/journal\/.+/.test(p)) return "Journal Entry";
    const named = { "/settings": "Settings", "/pricing": "Pricing", "/admin": "Admin", "/pulls": "Pull Requests", "/about": "About", "/contact": "Contact" };
    return named[p] || p.split("/").filter(Boolean).slice(-1)[0] || "Back";
  })();
  const goBack = useGoBack(
    location.pathname.startsWith("/journal") ? "/journal" :
    location.pathname.startsWith("/cards") ? "/cards" : "/"
  );

  return (
    <div className="obsidian-page min-h-screen overflow-x-hidden text-foreground" style={{ background: "var(--void-deep)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <Starfield />
      <header
        className="sticky top-0 z-40 px-3 sm:px-4"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 0px)",
          borderBottom: "1px solid var(--neo-border)",
          background: "var(--surface-glass)",
          backdropFilter: "blur(18px)",
          animation: "materialize .8s ease both",
        }}
      >
        <CompactHeader path={location.pathname} nav={NAV} isAdmin={isAdmin}
          isTabRoot={isTabRoot} pageTitle={pageTitle} goBack={goBack} onLogout={handleLogout} />
      </header>
      <main className={`overscroll-none ${location.pathname === "/" ? "relative z-[1] pb-[72px]" : "relative z-[1] max-w-5xl mx-auto px-4 py-8"}`}>
        <RouteTransition />
        {/* keeps content clear of the mobile tab bar */}
        <div className="h-[72px] md:hidden" aria-hidden="true" />
      </main>
      <TabBar />
    </div>
  );
}