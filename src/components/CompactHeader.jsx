import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Settings } from "lucide-react";
import CompanyMark from "@/components/CompanyMark";
import { Image } from "@/components/ui/image";

const GLOBE = "https://media.base44.com/images/public/6a97b3175d08a6bc8bc635af/4eec5cc5e_globe1.jpg";

export default function CompactHeader({ path, nav, isAdmin, isTabRoot, pageTitle, goBack, onLogout }) {
  return (
    <div className="flex h-12 min-w-0 items-center gap-2">
      {!isTabRoot && <div className="flex min-w-0 flex-1 items-center md:hidden">
        <button onClick={goBack} className="neo-navlink flex" aria-label="Go back"><ArrowLeft className="h-4 w-4" /></button>
        <span className="truncate text-xs uppercase tracking-widest text-primary">{pageTitle}</span>
      </div>}
      <div className={`${isTabRoot ? "flex" : "hidden md:flex"} shrink-0 items-center gap-2`}>
        <CompanyMark height={16} compact />
        <Link to="/" className="flex items-center gap-1.5" aria-label="Truth 4 Clarity home">
          <Image src={GLOBE} alt="" className="h-5 w-5 shrink-0 overflow-hidden rounded-full" />
          <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[1px] text-primary">Truth 4 Clarity</span>
          <Image src={GLOBE} alt="" className="hidden h-5 w-5 shrink-0 overflow-hidden rounded-full lg:inline-block" />
        </Link>
      </div>
      <nav aria-label="Main navigation" className="hidden min-w-0 flex-1 items-center overflow-x-auto md:flex">
        {[...nav, ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : [])].map(({ to, label }) => (
          <Link key={to} to={to} aria-current={path === to ? "page" : undefined}
            className={`neo-navlink flex shrink-0 !px-2 !py-2 !text-[10px] !tracking-[1px] ${path === to ? "is-active" : ""}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center">
        <Link to="/settings" className={`neo-navlink flex !px-2 ${path === "/settings" ? "is-active" : ""}`} aria-label="Settings"><Settings className="h-3.5 w-3.5" /></Link>
        <button onClick={onLogout} className="neo-navlink flex !px-2" aria-label="Sign out"><ArrowUpRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}