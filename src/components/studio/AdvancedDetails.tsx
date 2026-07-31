"use client";

import { useState } from "react";

export interface AdvancedMetric {
  label: string;
  sub: string;
  value: string;
}

export default function AdvancedDetails({ metrics }: { metrics: AdvancedMetric[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`adv${open ? " open" : ""}`}>
      <button className="adv-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="at-l">
          <span className="at-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </span>
          <span>
            <span className="at-t">Advanced details</span>
            <br />
            <span className="at-s">
              CAC, ROAS &amp; attribution — for power users only
            </span>
          </span>
        </span>
        <span className="caret">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      <div className="adv-panel">
        <div className="adv-inner">
          <div className="adv-note">
            Kept out of the way so your main view stays plain. Terms like CAC,
            ROAS and attribution never appear on the primary screens.
          </div>
          <div className="adv-metrics">
            {metrics.map((m) => (
              <div className="adv-m" key={m.label}>
                <div className="aml">
                  {m.label}
                  <span>{m.sub}</span>
                </div>
                <div className="amv mono">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
