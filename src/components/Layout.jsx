import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { BookOpen, Layers, Sparkles, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Starfield from "@/components/Starfield";

const NAV = [
  { to: "/", label: "Consult", icon: Sparkles },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/cards", label: "Cards", icon: Layers },
];

export default function Layout() {
  const location = useLocation();

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="min-h-screen text-foreground">
      <Starfield />
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.55)", borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl" style={{ color: "#d4af37", textShadow: "0 0 12px rgba(212,175,55,0.6)" }}>✶</span>
            <span className="font-display text-lg tracking-[0.25em] text-gold-leaf uppercase">The Truth Teller</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all ${
                    active ? "gold-pill-active text-gold-leaf" : "text-muted-foreground hover:text-gold-leaf"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
            <button onClick={handleLogout}
              className="ml-1 p-1.5 rounded-full text-muted-foreground hover:text-accent transition-colors"
              title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}