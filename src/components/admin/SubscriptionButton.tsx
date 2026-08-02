"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionButton({ merchantId, active }: { merchantId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function update() {
    setBusy(true); setError(null);
    const response = await fetch("/api/admin/subscriptions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, active: !active }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.message || "Update failed"); setBusy(false); return; }
    router.refresh();
  }
  return <div><button className={`btn ${active ? "btn-secondary" : "btn-primary"}`} onClick={update} disabled={busy}>
    {busy ? "Updating…" : active ? "Deactivate" : "Activate · 49 DT/month"}
  </button>{error && <div style={{ color: "#C2603C", fontSize: 12, marginTop: 4 }}>{error}</div>}</div>;
}
