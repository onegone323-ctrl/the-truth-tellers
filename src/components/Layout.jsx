import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Settings as SettingsIcon } from "lucide-react";
import useGoBack from "@/hooks/useGoBack";
import { base44 } from "@/api/base44Client";
import Starfield from "@/components/Starfield";
import TabBar from "@/components/TabBar";
import RouteTransition from "@/components/RouteTransition";
import CompanyMark from "@/components/CompanyMark";

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
        className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 sm:px-[54px]"
        style={{
          minHeight: 82,
          paddingTop: "max(env(safe-area-inset-top), 0px)",
          borderBottom: "1px solid var(--neo-border)",
          background: "var(--surface-glass)",
          backdropFilter: "blur(18px)",
          animation: "materialize .8s ease both",
        }}
      >
        {!isTabRoot && (
          <div className="md:hidden flex items-center" style={{ gap: 8 }}>
            <button onClick={goBack} className="neo-navlink" title="Go back" aria-label="Go back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span
              style={{
                color: "var(--gold-leaf)",
                fontSize: 15,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "44vw",
              }}
            >
              {pageTitle}
            </span>
          </div>
        )}
        <Link to="/" className={`${isTabRoot ? "flex" : "hidden md:flex"} items-center`} style={{ gap: 13 }}>
          <img
            src="https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/4eec5cc5e_globe1.jpg"
            alt="Truth 4 Clarity"
            style={{ width: 36, height: 36, objectFit: "cover", borderRadius: "50%", boxShadow: "0 0 12px rgba(255,120,30,.45)" }}
          />
          <span
            style={{
              color: "var(--gold-leaf)",
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Truth 4 Clarity
          </span>
          <span className="hidden md:inline-flex" style={{ marginLeft: 6 }}>
            <CompanyMark height={36} />
          </span>
        </Link>
        <nav className="flex items-center flex-wrap justify-end" style={{ gap: 4 }}>
          {/* Desktop-only: below 768px the TabBar is the primary nav. */}
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} className={`neo-navlink hidden md:inline-flex ${location.pathname === to ? "is-active" : ""}`}>
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={`neo-navlink hidden md:inline-flex ${location.pathname === "/admin" ? "is-active" : ""}`}>
              Admin
            </Link>
          )}
          <Link to="/settings" className={`neo-navlink hidden md:flex items-center gap-1.5 ${location.pathname === "/settings" ? "is-active" : ""}`}
            title="Settings" aria-label="Settings">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden md:inline">Settings</span>
          </Link>
          <button onClick={handleLogout} className="neo-navlink hidden md:flex items-center" title="Sign out" aria-label="Sign out">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </nav>
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