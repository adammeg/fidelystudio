"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function CampaignSender({ slug, queued, connected }: { slug: string; queued: number; connected: boolean }) {
  const router = useRouter(); const [remaining, setRemaining] = useState(queued); const [sending, setSending] = useState(false); const [error, setError] = useState<string | null>(null);
  async function send() { if (!confirm(`Start this WhatsApp campaign for ${remaining} eligible customers? Sending continues safely after you close this page.`)) return; setSending(true); setError(null); try { const response = await fetch(`/api/studio/campaigns/${encodeURIComponent(slug)}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 3 }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Campaign send failed"); setRemaining(data.remaining); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Campaign send failed"); } finally { setSending(false); } }
  return <div>{!connected && <p style={{ color: "#C2603C" }}>Connect WhatsApp in Settings before sending.</p>}{error && <div className="login-error" style={{ marginBottom: 10 }}>{error}</div>}<button className="btn btn-primary" onClick={send} disabled={sending || !connected || remaining === 0}>{sending ? `Sending… ${remaining} remaining` : remaining ? `Send to ${remaining} customers` : "Campaign sent"}</button></div>;
}
