"use client";

import { useState } from "react";
import { saveCustomerConsent } from "@/lib/studio-client";

type Consent = { whatsapp: boolean; sms: boolean; email: boolean };

export default function CustomerConsentForm({ customerId, initial }: { customerId: string; initial: Consent }) {
  const [consent, setConsent] = useState(initial);
  const [source, setSource] = useState("checkout");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    setState("saving");
    try { await saveCustomerConsent(customerId, consent, source, note); setState("saved"); }
    catch { setState("error"); }
  }
  return <div style={{ padding: 18 }}>
    <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>Only enable a channel when the customer has explicitly agreed to receive marketing messages.</p>
    {(["whatsapp", "sms", "email"] as const).map((channel) => <label className="brand-row" key={channel}>
      <span className="bl" style={{ textTransform: "capitalize" }}>{channel}</span>
      <input type="checkbox" checked={consent[channel]} onChange={(event) => setConsent((current) => ({ ...current, [channel]: event.target.checked }))} />
    </label>)}
    <label style={{ display: "grid", gap: 5, marginTop: 12 }}><span className="muted">Consent source</span><select className="input" value={source} onChange={(event) => setSource(event.target.value)}><option value="checkout">Checkout opt-in</option><option value="written">Written consent</option><option value="verbal">Verbal consent</option><option value="imported">Imported consent record</option><option value="other">Other evidence</option></select></label>
    <label style={{ display: "grid", gap: 5, marginTop: 10 }}><span className="muted">Evidence note</span><textarea className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Where and how consent was collected" maxLength={500} /></label>
    <button type="button" className="btn btn-secondary" onClick={save} disabled={state === "saving"} style={{ marginTop: 12 }}>
      {state === "saving" ? "Saving…" : "Save consent"}
    </button>
    {state === "saved" && <span className="positive" style={{ marginLeft: 10, fontSize: 12 }}>Saved</span>}
    {state === "error" && <span style={{ marginLeft: 10, color: "#C2603C", fontSize: 12 }}>Could not save</span>}
  </div>;
}
