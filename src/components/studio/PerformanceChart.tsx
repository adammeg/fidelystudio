"use client";

import { useMemo, useState } from "react";

export type ChartKey = "sales" | "delivered" | "cost" | "customers";

export interface ChartSeriesInput {
  label: string;
  unit: string;
  total: string;
  trend: string;
  color: string;
  fill: string;
  v: number[];
}

const PADL = 46,
  PADR = 14,
  PADT = 14,
  PADB = 26,
  W = 1000,
  H = 300;

interface Pt {
  x: number;
  y: number;
}

function smooth(pts: Pt[]): string {
  let d = "M" + pts[0].x + "," + pts[0].y;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += " C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2.x + "," + p2.y;
  }
  return d;
}

function fmt(n: number): string {
  return n >= 1000 ? n.toLocaleString("en-US") : "" + n;
}

const TABS: { key: ChartKey; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "delivered", label: "Delivered orders" },
  { key: "cost", label: "Cost" },
  { key: "customers", label: "New customers" },
];

const ArrowUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M5 15l7-7 7 7" />
  </svg>
);

interface Props {
  series: Record<ChartKey, ChartSeriesInput>;
  xLabels: string[];
}

export default function PerformanceChart({ series, xLabels }: Props) {
  const [active, setActive] = useState<ChartKey>("sales");
  const d = series[active];

  const { line, area, grid, last } = useMemo(() => {
    const v = d.v;
    const n = v.length;
    const max = Math.max(...v) * 1.12;
    const min = 0;
    const plotW = W - PADL - PADR;
    const plotH = H - PADT - PADB;
    const pts: Pt[] = v.map((val, i) => ({
      x: PADL + plotW * (i / (n - 1)),
      y: PADT + plotH * (1 - (val - min) / (max - min)),
    }));
    const line = smooth(pts);
    const area =
      line +
      " L" +
      pts[n - 1].x +
      "," +
      (PADT + plotH) +
      " L" +
      pts[0].x +
      "," +
      (PADT + plotH) +
      " Z";

    const GL = 4;
    const grid: { y: number; val: number }[] = [];
    for (let g = 0; g <= GL; g++) {
      const yy = PADT + plotH * (g / GL);
      const val = Math.round(max * (1 - g / GL));
      grid.push({ y: yy, val });
    }
    return { line, area, grid, last: pts[n - 1] };
  }, [d]);

  return (
    <div className="panel chart-card">
      <div className="chart-head">
        <div>
          <h2>What Fidely generated</h2>
          <div className="sub">
            Last 30 days · updates when orders are delivered &amp; paid
          </div>
        </div>
        <div className="seg-ctrl">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={active === t.key ? "on" : ""}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-summary">
        <div className="big mono">
          {d.total}
          <span className="u">{d.unit}</span>
        </div>
        <span className="trend up">
          <ArrowUp />
          {d.trend} vs previous 30 days
        </span>
      </div>
      <div className="chart-wrap">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
          {grid.map((g, i) => (
            <g key={i}>
              <line
                x1={PADL}
                y1={g.y}
                x2={W - PADR}
                y2={g.y}
                stroke="#EFE7DB"
                strokeWidth={1}
              />
              <text
                x={PADL - 8}
                y={g.y + 4}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="#A99E90"
              >
                {fmt(g.val)}
              </text>
            </g>
          ))}
          <path d={area} fill={d.fill} />
          <path
            d={line}
            fill="none"
            stroke={d.color}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={last.x}
            cy={last.y}
            r="5"
            fill={d.color}
            stroke="#FFFDFA"
            strokeWidth="2.5"
          />
        </svg>
      </div>
      <div className="axis-x">
        {xLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
