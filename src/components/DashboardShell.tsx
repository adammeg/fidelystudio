"use client";

import { useState } from "react";
import Image from "next/image";
import Sidebar from "./Sidebar";

interface ShopInfo { name: string; platform: string; initial: string }

export default function DashboardShell({ shop, trial, children }: { shop: ShopInfo; trial?: { endsAt: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className={`app${open ? " nav-open" : ""}`}>
    <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />
    <Sidebar shop={shop} onNavigate={() => setOpen(false)} />
    <main className="main">
      <div className="mobile-appbar">
        <Image src="/complete-fidely-logo.png" width={112} height={38} alt="Fidely" priority unoptimized />
        <button className="mobile-menu" type="button" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
      {trial && <aside className="trial-banner" role="status">
        <span className="trial-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg></span>
        <span><strong>Your 7-day free trial is active</strong><small>Continue for 49 TND/month after {new Date(trial.endsAt).toLocaleDateString("en-GB")}.</small></span>
        <a className="btn btn-secondary btn-sm" href="/payment">View subscription</a>
      </aside>}
      <div className="page-stage">{children}</div>
    </main>
  </div>;
}
