"use client";

import { useState } from "react";
import { saveCustomerConsent } from "@/lib/studio-client";

type Consent = { whatsapp: boolean; sms: boolean; email: boolean };

export default function CustomerConsentForm({ customerId, initial }: { customerId: string; initial: Consent }) {
  const [consent, setConsent] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    setState("saving");
    try { await saveCustomerConsent(customerId, consent); setState("saved"); }
    catch { setState("error"); }
  }
  return <div style={{ padding: 18 }}>
    <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>Only enable a channel when the customer has explicitly agreed to receive marketing messages.</p>
    {(["whatsapp", "sms", "email"] as const).map((channel) => <label className="brand-row" key={channel}>
      <span className="bl" style={{ textTransform: "capitalize" }}>{channel}</span>
      <input type="checkbox" checked={consent[channel]} onChange={(event) => setConsent((current) => ({ ...current, [channel]: event.target.checked }))} />
    </label>)}
    <button type="button" className="btn btn-secondary" onClick={save} disabled={state === "saving"} style={{ marginTop: 12 }}>
      {state === "saving" ? "Saving…" : "Save consent"}
    </button>
    {state === "saved" && <span className="positive" style={{ marginLeft: 10, fontSize: 12 }}>Saved</span>}
    {state === "error" && <span style={{ marginLeft: 10, color: "#C2603C", fontSize: 12 }}>Could not save</span>}
  </div>;
}
