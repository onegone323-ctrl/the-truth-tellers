import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Settings as SettingsIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Starfield from "@/components/Starfield";
import TabBar from "@/components/TabBar";
import RouteTransition from "@/components/RouteTransition";

const NAV = [
  { to: "/", label: "Consult" },
  { to: "/journal", label: "Journal" },
  { to: "/timeline", label: "Timeline" },
  { to: "/cards", label: "Cards" },
  { to: "/connect", label: "Connect" },
];

export default function Layout() {
  const location = useLocation();

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="obsidian-page min-h-screen overflow-x-hidden text-foreground" style={{ background: "#050505", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <Starfield />
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 sm:px-[54px]"
        style={{
          minHeight: 82,
          paddingTop: "max(env(safe-area-inset-top), 0px)",
          borderBottom: "1px solid rgba(212,175,55,0.35)",
          background: "rgba(5,5,5,0.8)",
          backdropFilter: "blur(18px)",
          animation: "materialize .8s ease both",
        }}
      >
        <Link to="/" className="flex items-center" style={{ gap: 13 }}>
          <span style={{ fontSize: 27, color: "#00e5ff", textShadow: "0 0 14px #00e5ff" }}>✶</span>
          <span
            style={{
              color: "#d4af37",
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            The Truth Teller
          </span>
        </Link>
        <nav className="flex items-center flex-wrap justify-end" style={{ gap: 4 }}>
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} className={`neo-navlink hidden sm:inline-flex ${location.pathname === to ? "is-active" : ""}`}>
              {label}
            </Link>
          ))}
          <Link to="/settings" className={`neo-navlink inline-flex items-center gap-1.5 ${location.pathname === "/settings" ? "is-active" : ""}`}
            title="Settings" aria-label="Settings">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <button onClick={handleLogout} className="neo-navlink" title="Sign out" aria-label="Sign out">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </nav>
      </header>
      <main className={`overscroll-none ${location.pathname === "/" ? "relative z-[1] pb-[72px]" : "relative z-[1] max-w-5xl mx-auto px-4 py-8"}`}>
        <RouteTransition />
        {/* keeps content clear of the mobile tab bar */}
        <div className="h-[72px] sm:hidden" aria-hidden="true" />
      </main>
      <TabBar />
    </div>
  );
}