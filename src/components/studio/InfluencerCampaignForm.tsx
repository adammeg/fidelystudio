"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { id: string; influencerName: string; promoCode: string; budget: number };
const blank = (): Row => ({ id: crypto.randomUUID(), influencerName: "", promoCode: "", budget: 0 });

export default function InfluencerCampaignForm() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function update(id: string, patch: Partial<Row>) { setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row)); }
  async function save() {
    setBusy(true); setError(null); setSuccess(null);
    try {
      let matchedOrders = 0;
      for (const row of rows) {
        const response = await fetch("/api/studio/influencer-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ influencerName: row.influencerName, promoCode: row.promoCode, budget: row.budget }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `Could not add ${row.influencerName || "influencer"}`);
        matchedOrders += Number(data.matchedOrders) || 0;
      }
      setRows([blank()]); setSuccess(`${rows.length} influencer campaign${rows.length === 1 ? "" : "s"} saved${matchedOrders ? ` · ${matchedOrders} existing order${matchedOrders === 1 ? "" : "s"} matched` : ""}.`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save influencer campaigns"); }
    finally { setBusy(false); }
  }

  const valid = rows.length > 0 && rows.every((row) => row.influencerName.trim().length >= 2 && row.promoCode.trim().length >= 2 && row.budget >= 0);
  return <section className="panel block"><div className="p-head"><div><h3>Add influencer campaigns</h3><div className="sub">One unique Converty promo code per influencer. No messages are sent.</div></div><button type="button" className="btn btn-secondary btn-sm" onClick={() => setRows((current) => [...current, blank()])}>Add another</button></div>
    <div className="influencer-form-body"><div className="influencer-input-list">{rows.map((row, index) => <div className="influencer-input-row" key={row.id}><div className="field"><label>Influencer name</label><input className="input" placeholder={`Influencer ${index + 1}`} value={row.influencerName} onChange={(event) => update(row.id, { influencerName: event.target.value })}/></div><div className="field"><label>Promo code</label><input className="input promo-input" placeholder="ADAM10" value={row.promoCode} onChange={(event) => update(row.id, { promoCode: event.target.value.toUpperCase().replace(/\s+/g, "") })}/></div><div className="field"><label>Budget spent (TND)</label><input className="input" type="number" min="0" value={row.budget} onChange={(event) => update(row.id, { budget: Number(event.target.value) || 0 })}/></div>{rows.length > 1 && <button className="remove-influencer" type="button" aria-label="Remove influencer" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>×</button>}</div>)}</div>{error && <div className="login-error">{error}</div>}{success && <div className="save-success">{success}</div>}<div className="influencer-form-actions"><p>New orders are attributed automatically through Converty webhooks.</p><button className="btn btn-primary" type="button" disabled={busy || !valid} onClick={save}>{busy ? "Saving…" : `Save ${rows.length} influencer${rows.length === 1 ? "" : "s"}`}</button></div></div>
  </section>;
}
