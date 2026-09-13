import React, { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;

// Touch-only pull-to-refresh: drag down from the top of the page past the
// threshold to re-run onRefresh. Mouse/desktop behaviour is untouched.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = (e) => {
    const atTop = (document.scrollingElement?.scrollTop || 0) <= 0;
    startY.current = atTop && !refreshing ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    setPull(dy > 0 ? Math.min(dy * 0.5, 110) : 0);
  };
  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh?.(); } finally { setRefreshing(false); setPull(0); }
    } else {
      setPull(0);
    }
  };

  const ready = pull >= THRESHOLD;
  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
      className="relative"
      style={{ transform: `translateY(${pull}px)`, transition: startY.current === null ? "transform .25s ease" : "none" }}>
      <div aria-live="polite" className="absolute left-0 right-0 flex justify-center pointer-events-none"
        style={{ top: -56, opacity: Math.min(1, pull / THRESHOLD) }}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.8)", border: `1px solid ${ready ? "#00e5ff" : "rgba(212,175,55,0.5)"}`, boxShadow: ready ? "0 0 14px rgba(0,229,255,.35)" : "none" }}>
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            style={{ color: ready ? "#00e5ff" : "#d4af37", transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }} />
        </div>
      </div>
      {children}
    </div>
  );
}