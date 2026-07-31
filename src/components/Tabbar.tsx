"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabItem {
  label: string;
  href: string;
  count?: number;
}

export default function Tabbar({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();
  return (
    <div className="tabbar">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`tab${pathname === t.href ? " on" : ""}`}
        >
          {t.label}
          {typeof t.count === "number" && <span className="ct">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}
