"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionButton({ merchantId, active }: { merchantId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<"bank_transfer" | "flouci">("flouci");
  async function update() {
    setBusy(true); setError(null);
    const response = await fetch("/api/admin/subscriptions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, active: !active, ...(!active ? { method, reference, amount: 49 } : {}) }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Update failed"); setBusy(false); return; }
    router.refresh();
  }
  return <div>{!active && <div style={{ display: "grid", gap: 5, marginBottom: 6 }}><select className="input" value={method} onChange={(event) => setMethod(event.target.value as "bank_transfer" | "flouci")}><option value="flouci">Flouci</option><option value="bank_transfer">BTE transfer</option></select><input className="input" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Payment reference" /></div>}<button className={`btn ${active ? "btn-secondary" : "btn-primary"}`} onClick={update} disabled={busy || (!active && reference.trim().length < 3)}>
    {busy ? "Updating…" : active ? "Deactivate" : "Activate · 49 DT/month"}
  </button>{error && <div style={{ color: "#C2603C", fontSize: 12, marginTop: 4 }}>{error}</div>}</div>;
}
