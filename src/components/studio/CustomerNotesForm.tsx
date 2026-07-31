"use client";

import { useState } from "react";
import { saveCustomerNote } from "@/lib/studio-client";

export default function CustomerNotesForm({ customerId, initialNote }: { customerId: string; initialNote: string | null }) {
  const [note, setNote] = useState(initialNote || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveCustomerNote(customerId, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "var(--text-secondary)", margin: "16px 0 7px" }}>
        Merchant notes
      </label>
      <textarea
        className="input"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a private note about this customer…"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save note"}
        </button>
        {saved && <span style={{ fontSize: 12, color: "var(--pos-fg)", fontWeight: 600 }}>Saved</span>}
        {error && <span style={{ fontSize: 12, color: "#C2603C", fontWeight: 600 }}>{error}</span>}
      </div>
    </div>
  );
}
