import Link from "next/link";
import { Suspense } from "react";
import PerformanceChart, { type ChartKey, type ChartSeriesInput } from "@/components/studio/PerformanceChart";
import AdvancedDetails from "@/components/studio/AdvancedDetails";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import PeriodSelector from "@/components/studio/PeriodSelector";
import { getOverview } from "@/lib/studio";
import { fmt } from "@/lib/format";

function labelFor(key: string) {
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? key
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function trend(value: number) {
  if (!Number.isFinite(value) || value === 0) return "No change";
  return `${value > 0 ? "+" : ""}${value}%`;
}

export default async function StudioOverview({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = Math.min(90, Math.max(7, Number(sp.days) || 30));
  const { kpis, chart, advanced, segments } = await getOverview(days);

  const series: Record<ChartKey, ChartSeriesInput> = {
    sales: { label: "Delivered revenue", unit: "TND", total: fmt(kpis.sales.total), trend: trend(kpis.sales.trend), color: "#C8744F", fill: "rgba(200,116,79,.16)", v: chart.series.sales.v },
    delivered: { label: "Delivered orders", unit: "orders", total: fmt(kpis.delivered.total), trend: trend(kpis.delivered.trend), color: "#7C5A43", fill: "rgba(124,90,67,.14)", v: chart.series.delivered.v },
    cost: { label: "Product cost", unit: "TND", total: fmt(kpis.cost.total), trend: trend(kpis.cost.trend), color: "#C98A2B", fill: "rgba(201,138,43,.15)", v: chart.series.cost.v },
    customers: { label: "New customers", unit: "customers", total: fmt(kpis.customers.total), trend: trend(kpis.customers.trend), color: "#3E8E5A", fill: "rgba(62,142,90,.14)", v: chart.series.customers.v },
  };
  const indices = chart.labels.length
    ? [...new Set([0, .2, .4, .6, .8, 1].map((p) => Math.round(p * (chart.labels.length - 1))))]
    : [];
  const xLabels = indices.map((i) => labelFor(chart.labels[i]));
  const metrics = [
    { label: "Average order", sub: "Delivered revenue per order", value: `${kpis.delivered.total ? Math.round(kpis.sales.total / kpis.delivered.total) : 0} TND` },
    { label: "Delivery rate", sub: "Delivered divided by placed", value: `${advanced.deliveryRate}%` },
    { label: "Product margin", sub: "Revenue minus known product cost", value: `${Math.max(0, kpis.sales.total - kpis.cost.total).toLocaleString("en-US")} TND` },
    { label: "Observation window", sub: "Selected dashboard period", value: `${days} days` },
  ];

  const cards = [
    ["Delivered revenue", `${fmt(kpis.sales.total)} TND`, trend(kpis.sales.trend)],
    ["Delivered orders", fmt(kpis.delivered.total), trend(kpis.delivered.trend)],
    ["Known product cost", `${fmt(kpis.cost.total)} TND`, trend(kpis.cost.trend)],
    ["New customers", fmt(kpis.customers.total), trend(kpis.customers.trend)],
    ["At-risk customers", fmt(segments.counts.atRisk), "No delivery in 60 days"],
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Studio overview</h1>
          <ConvertySyncCrumb className="crumb sync" />
        </div>
        <div className="tb-actions">
          <Suspense fallback={<button className="period">Last 30 days</button>}><PeriodSelector /></Suspense>
          <Link className="btn btn-secondary" href="/customers">Explore customers</Link>
        </div>
      </header>
      <div className="content">
        <section className="kpi-row" aria-label="Store performance">
          {cards.map(([label, value, note], index) => (
            <article className={`kpi${index === 0 ? " feature" : ""}`} key={label}>
              <div className="k-label">{label}</div>
              <div className="k-val">{value}</div>
              <div className="k-foot">{note}</div>
            </article>
          ))}
        </section>
        <section className="block" aria-label="Performance over time">
          <PerformanceChart series={series} xLabels={xLabels} />
        </section>
        <section className="block">
          <AdvancedDetails metrics={metrics} />
        </section>
        <section className="panel empty-guidance">
          <div>
            <h3>Analytics powered by delivered Converty orders</h3>
            <p className="sub">Revenue and customer behavior update whenever Converty sends an order event or you run a manual sync.</p>
          </div>
          <Link href="/settings" className="btn btn-secondary">Connection settings</Link>
        </section>
      </div>
    </>
  );
}
