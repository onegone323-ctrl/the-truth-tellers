import React, { useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseISO(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

export default function OccultDatePicker({
  value,
  onChange,
  label = "Birthdate",
  name = "birthdate",
}) {
  const parsed = parseISO(value);
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [y, setY] = useState(parsed?.y ?? now.getFullYear() - 25);
  const [m, setM] = useState(parsed?.m ?? 0);
  const [d, setD] = useState(parsed?.d ?? 1);

  const maxDay = daysInMonth(y, m);
  const day = Math.min(d, maxDay);

  const years = useMemo(() => {
    const end = now.getFullYear();
    return Array.from({ length: 120 }, (_, i) => end - i);
  }, []);

  const display = parsed
    ? `${MONTHS[parsed.m]} ${parsed.d}, ${parsed.y}`
    : "Select a date";

  const commit = () => {
    onChange(toISO(y, m, day));
    setOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        name={name}
        aria-label={label}
        onClick={() => setOpen(true)}
        className="neo-field w-full text-left"
        style={{ minHeight: 44 }}
      >
        {display}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="outline-none"
          style={{
            background: "var(--void)",
            borderColor: "var(--neo-border)",
            color: "hsl(var(--foreground))",
          }}
        >
          <DrawerHeader>
            <DrawerTitle className="text-center" style={{ color: "var(--gold-leaf)" }}>
              {label}
            </DrawerTitle>
          </DrawerHeader>

          <div className="grid grid-cols-3 gap-2 px-4 pb-4">
            <select
              className="neo-field px-2 py-2"
              value={m}
              aria-label="Month"
              onChange={(e) => setM(Number(e.target.value))}
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
            <select
              className="neo-field px-2 py-2"
              value={day}
              aria-label="Day"
              onChange={(e) => setD(Number(e.target.value))}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <select
              className="neo-field px-2 py-2"
              value={y}
              aria-label="Year"
              onChange={(e) => setY(Number(e.target.value))}
            >
              {years.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <button type="button" className="neo-button w-full" onClick={commit}>
              Confirm
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
