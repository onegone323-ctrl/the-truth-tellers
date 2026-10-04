import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

// Mobile-aware select. Desktop keeps the standard popper dropdown, untouched.
// Mobile renders the options inside a vaul bottom-sheet drawer instead of the
// popper list (Radix's own focus management fights the drawer if its
// SelectContent is placed there, so the sheet uses plain option buttons with
// the same listbox/option roles and styling).
export default function ResponsiveSelect({
  value,
  onValueChange,
  items, // [{ value, label }]
  ariaLabel,
  triggerClassName,
  placeholder = "",
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selected = items.find((it) => it.value === value);

  // Desktop: exactly the previous popper behavior.
  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger aria-label={ariaLabel} className={triggerClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: plain trigger + bottom-sheet drawer of options.
  return (
    <>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        <span className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </span>
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="px-2 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <DrawerTitle
              className="text-center text-xs uppercase tracking-widest py-2"
              style={{ color: "var(--gold-leaf)" }}
            >
              {ariaLabel || "Choose"}
            </DrawerTitle>
            <div
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-[45vh] overflow-y-auto px-1"
            >
              {items.map((it) => (
                <button
                  key={it.value}
                  type="button"
                  role="option"
                  aria-selected={it.value === value}
                  onClick={() => { onValueChange(it.value); setOpen(false); }}
                  className={`w-full text-left rounded-md min-h-[44px] px-3 py-2.5 text-sm ${
                    it.value === value ? "bg-secondary text-foreground font-medium" : "text-foreground"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}