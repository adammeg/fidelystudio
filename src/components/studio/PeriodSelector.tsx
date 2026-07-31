"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

export default function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Number(searchParams.get("days")) || 30;
  const label = OPTIONS.find((o) => o.days === current)?.label || `Last ${current} days`;

  function pick(days: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (days === 30) params.delete("days");
    else params.set("days", String(days));
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <details className="period-menu">
        <summary className="period" style={{ listStyle: "none" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
            <path d="M3.5 9.5h17M8 3v4M16 3v4" />
          </svg>
          {label}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 160,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            zIndex: 30,
            overflow: "hidden",
          }}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              type="button"
              onClick={() => pick(o.days)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: 0,
                background: o.days === current ? "var(--bg-sunken)" : "transparent",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
