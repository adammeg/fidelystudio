"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface ShopInfo {
  name: string;
  platform: string;
  initial: string;
}

interface SubEntry {
  label: string;
  href: string;
}

interface NavEntry {
  label: string;
  href: string;
  icon: React.ReactNode;
  subs?: SubEntry[];
}

const mainNav: NavEntry[] = [
  {
    label: "Studio",
    href: "/studio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 12l9-8 9 8" />
        <path d="M5 10v9h14v-9" />
      </svg>
    ),
  },
  {
    label: "Customers",
    href: "/customers",
    subs: [
      { label: "Segments", href: "/customers/segments" },
      { label: "All customers", href: "/customers" },
      { label: "Cohorts", href: "/customers/cohorts" },
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
        <path d="M17 7.5a3 3 0 010 5" />
        <path d="M19.5 19.5c0-2.4-1.2-3.8-3-4.4" />
      </svg>
    ),
  },
  {
    label: "Campaigns",
    href: "/campaigns",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 13l13-9-3 17-4-5-6-3z" /></svg>,
  },
];

const settingsNav: NavEntry = {
  label: "Settings",
  href: "/settings",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  ),
};

function sectionActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function subActive(pathname: string, href: string) {
  return pathname === href;
}

export default function Sidebar({ shop }: { shop: ShopInfo }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar" data-screen-label="Sidebar">
      <div className="sb-brand">
        <Image className="sb-logo-img" src="/fidely-logo.png" width={38} height={38} alt="" priority />
        <Image className="sb-wordmark" src="/complete-fidely-logo.png" width={102} height={38} alt="Fidely" priority />
      </div>

      {mainNav.map((item) => {
        const active = sectionActive(pathname, item.href);
        return (
          <div className="nav-group" key={item.href}>
            <Link
              href={item.href}
              className={`nav-item${active ? " active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
            {item.subs && active && (
              <div className="nav-sub">
                {item.subs.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={subActive(pathname, sub.href) ? "on" : ""}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="nav-cap">Account</div>
      <Link
        href={settingsNav.href}
        className={`nav-item${sectionActive(pathname, settingsNav.href) ? " active" : ""}`}
      >
        {settingsNav.icon}
        {settingsNav.label}
      </Link>

      <div className="sb-foot">
        <div className="sb-avatar">{shop.initial}</div>
        <div className="who">
          {shop.name}
          <span>{shop.platform}</span>
        </div>
        <Link href="/settings" className="gear" title="Account" aria-label="Account">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
