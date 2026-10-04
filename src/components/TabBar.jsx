import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, BookOpen, TrendingUp, LayoutGrid, Link2, Brain } from "lucide-react";

export const TABS = [
  { to: "/", label: "Consult", Icon: Sparkles },
  { to: "/journal", label: "Journal", Icon: BookOpen },
  { to: "/memory", label: "Memory", Icon: Brain },
  { to: "/timeline", label: "Timeline", Icon: TrendingUp },
  { to: "/cards", label: "Cards", Icon: LayoutGrid },
  { to: "/connect", label: "Connect", Icon: Link2 },
];

const HIDDEN_ON = ["/login", "/register", "/forgot-password", "/reset-password", "/oauth/consent"];
const tabRootOf = (path) =>
  TABS.map((t) => t.to).filter((r) => r !== "/").find((r) => path === r || path.startsWith(r + "/")) || (path === "/" ? "/" : null);

// Per-tab navigation stacks, kept in memory. Each tab owns its own history
// (stacks[root] = [paths, root first]), so leaving a tab saves its stack and
// coming back restores exactly where you left it — including how deep you
// were. sessionStorage keeps each stack's top across page reloads.
const stacks = {};
const stackOf = (root) => {
  if (!stacks[root]) stacks[root] = [sessionStorage.getItem(`tab:${root}`) || root];
  return stacks[root];
};

// Fixed bottom tab bar (mobile only). Each tab maintains its own back
// history; tapping the tab you're already on resets it to its root.
export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeRoot = tabRootOf(pathname);

  // Bookkeep every path into the tab it belongs to: a new path pushes onto
  // that tab's stack, a path already in the stack pops everything above it
  // (browser back or a page's back button). URL routing itself is untouched.
  useEffect(() => {
    if (!activeRoot) return;
    const stack = stackOf(activeRoot);
    const idx = stack.indexOf(pathname);
    if (idx >= 0) stack.length = idx + 1;
    else if (stack[stack.length - 1] !== pathname) stack.push(pathname);
    sessionStorage.setItem(`tab:${activeRoot}`, stack[stack.length - 1]);
  }, [pathname, activeRoot]);

  if (HIDDEN_ON.includes(pathname)) return null;

  const openTab = (to) => {
    if (activeRoot === to) {
      // Re-selecting the active tab resets it to its root.
      stacks[to] = [to];
      sessionStorage.setItem(`tab:${to}`, to);
      navigate(to);
    } else {
      // Switching tabs restores this tab's saved stack top.
      const stack = stackOf(to);
      navigate(stack[stack.length - 1]);
    }
  };

  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed inset-x-0 bottom-0 z-50 flex items-stretch"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--surface-glass-strong)",
        borderTop: "1px solid var(--neo-border)",
        backdropFilter: "blur(18px)",
      }}
    >
      {TABS.map(({ to, label, Icon }) => {
        const active = activeRoot === to;
        return (
          <Link key={to} to={to} aria-current={active ? "page" : undefined}
            onClick={(e) => { e.preventDefault(); openTab(to); }}
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