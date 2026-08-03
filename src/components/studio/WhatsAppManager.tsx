"use client";

import { useState } from "react";
import Image from "next/image";
import type { WhatsAppStatus } from "@/lib/studio";

export default function WhatsAppManager({ initial }: { initial: WhatsAppStatus }) {
  const [status, setStatus] = useState(initial);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function connect() {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/studio/whatsapp/connect", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not connect WhatsApp");
      setQr(data.qrCode); setStatus((current) => ({ ...current, status: data.status, connected: false }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed"); }
    finally { setBusy(false); }
  }
  async function refresh() {
    setBusy(true);
    try { const response = await fetch("/api/studio/whatsapp/status"); const data = await response.json(); if (!response.ok) throw new Error(data.message); setStatus(data); if (data.connected) setQr(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status check failed"); }
    finally { setBusy(false); }
  }
  async function disconnect() {
    if (!confirm("Disconnect this shop WhatsApp account? Pending messages will remain queued.")) return;
    setBusy(true); setError(null);
    try { const response = await fetch("/api/studio/whatsapp/disconnect", { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Disconnect failed"); setQr(null); setStatus((current) => ({ ...current, connected: false, status: "disconnected" })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Disconnect failed"); }
    finally { setBusy(false); }
  }
  return <div className="panel" style={{ marginTop: 16 }} data-screen-label="WhatsApp connection">
    <div className="p-head"><div><h3>WhatsApp campaigns</h3><div className="sub">Connect the shop WhatsApp account through Evolution API.</div></div><span className={`status-pill${status.connected ? " live" : ""}`}><span className="ld" />{status.connected ? "Connected" : status.status === "connecting" ? "Waiting for scan" : "Not connected"}</span></div>
    <div style={{ padding: "16px 18px" }}>
      {!status.configured && <div className="integration-unavailable"><strong>WhatsApp setup is temporarily unavailable</strong><p>Contact your Fidely administrator to enable this integration.</p><details><summary>Developer setup</summary><p>Add <code>EVOLUTION_API_URL</code>, <code>EVOLUTION_API_KEY</code>, and <code>APP_URL</code> to the server environment.</p></details></div>}
      {qr && <div style={{ maxWidth: 300, marginBottom: 16 }}><p>On the shop phone, open WhatsApp → Linked devices → Link a device, then scan this code.</p><Image src={qr} alt="QR code to connect WhatsApp" width={300} height={300} unoptimized style={{ width: "100%", height: "auto", borderRadius: 12 }} /></div>}
      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
      {status.lastError && <p style={{ color: "#C2603C" }}>{status.lastError}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn btn-primary" disabled={busy || !status.configured || status.connected} onClick={connect}>{busy ? "Please wait…" : qr ? "Generate a new QR code" : "Connect WhatsApp"}</button><button className="btn btn-secondary" disabled={busy || !status.configured} onClick={refresh}>Check connection</button>{status.connected && <button className="btn btn-secondary" disabled={busy} onClick={disconnect}>Disconnect WhatsApp</button>}</div>
    </div>
  </div>;
}
