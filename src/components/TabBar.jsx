import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, BookOpen, TrendingUp, LayoutGrid, Link2 } from "lucide-react";

export const TABS = [
  { to: "/", label: "Consult", Icon: Sparkles },
  { to: "/journal", label: "Journal", Icon: BookOpen },
  { to: "/timeline", label: "Timeline", Icon: TrendingUp },
  { to: "/cards", label: "Cards", Icon: LayoutGrid },
  { to: "/connect", label: "Connect", Icon: Link2 },
];

const HIDDEN_ON = ["/login", "/register", "/forgot-password", "/reset-password", "/oauth/consent"];
const tabRootOf = (path) =>
  TABS.map((t) => t.to).filter((r) => r !== "/").find((r) => path === r || path.startsWith(r + "/")) || (path === "/" ? "/" : null);

// Fixed bottom tab bar (mobile only). Each tab remembers where you left it;
// tapping the tab you're already on pops back to its root.
export default function TabBar() {
  const { pathname } = useLocation();
  const activeRoot = tabRootOf(pathname);

  useEffect(() => {
    if (activeRoot) sessionStorage.setItem(`tab:${activeRoot}`, pathname);
  }, [pathname, activeRoot]);

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed inset-x-0 bottom-0 z-50 flex items-stretch"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(5,5,5,0.92)",
        borderTop: "1px solid rgba(212,175,55,0.35)",
        backdropFilter: "blur(18px)",
      }}
    >
      {TABS.map(({ to, label, Icon }) => {
        const active = activeRoot === to;
        const target = active ? to : sessionStorage.getItem(`tab:${to}`) || to;
        return (
          <Link key={to} to={target} aria-current={active ? "page" : undefined}
            className="tab-link flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] text-sm tracking-wide transition-colors"
            style={{ color: active ? "#00e5ff" : "#9c947f", textShadow: active ? "0 0 10px rgba(0,229,255,.5)" : "none" }}>
            <Icon className="w-5 h-5" />
            <span className="text-sm leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}