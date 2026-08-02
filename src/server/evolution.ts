import "server-only";

import { StudioCampaignRecipient, StudioCustomer, StudioWhatsAppConnection } from "./models";
import { randomToken, sha256 } from "./security";

function configuration() {
  const url = process.env.EVOLUTION_API_URL?.replace(/\/+$/, "");
  const key = process.env.EVOLUTION_API_KEY;
  if (!url || !key) throw Object.assign(new Error("Evolution API is not configured"), { status: 503 });
  return { url, key };
}

async function request(path: string, init?: RequestInit) {
  const { url, key } = configuration();
  const response = await fetch(`${url}${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: key, "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.response?.message?.[0] || data?.message || `Evolution API error (${response.status})`), { status: 502 });
  return data;
}

function normalizeState(value: unknown) {
  const state = String(value || "").toLowerCase();
  if (["open", "connected"].includes(state)) return "connected";
  if (["connecting", "qr"].includes(state)) return "connecting";
  return "disconnected";
}

export async function whatsappStatus(userId: string, refresh = true) {
  const connection = await StudioWhatsAppConnection.findOne({ user: userId });
  if (!connection) return { configured: Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY), connected: false, status: "disconnected", phone: null, lastError: null };
  if (refresh) {
    try {
      const data = await request(`/instance/connectionState/${encodeURIComponent(connection.instanceName)}`);
      connection.status = normalizeState(data?.instance?.state ?? data?.state);
      connection.lastStatusAt = new Date();
      connection.lastError = null;
      if (connection.status === "connected" && !connection.connectedAt) connection.connectedAt = new Date();
      await connection.save();
    } catch (error) {
      connection.lastError = error instanceof Error ? error.message : "Could not check WhatsApp";
      await connection.save();
    }
  }
  return { configured: true, connected: connection.status === "connected", status: connection.status, phone: connection.phone, lastError: connection.lastError, connectedAt: connection.connectedAt, lastWebhookAt: connection.lastWebhookAt };
}

export async function connectWhatsApp(userId: string) {
  configuration();
  let connection = await StudioWhatsAppConnection.findOne({ user: userId });
  if (!connection) {
    const secret = randomToken();
    const instanceName = `fidely-${userId}`.toLowerCase();
    const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/+$/, "");
    if (!baseUrl) throw Object.assign(new Error("APP_URL is required for WhatsApp webhooks"), { status: 503 });
    const data = await request("/instance/create", { method: "POST", body: JSON.stringify({
      instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS",
      webhook: { enabled: true, url: `${baseUrl}/api/evolution/webhooks/${secret}`, events: ["CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPDATE", "SEND_MESSAGE"] },
    }) });
    connection = await StudioWhatsAppConnection.create({ user: userId, instanceName, instanceId: data?.instance?.instanceId || null, status: normalizeState(data?.instance?.status), webhookSecretHash: sha256(secret), lastStatusAt: new Date() });
    return { status: connection.status, qrCode: data?.qrcode?.base64 || null, pairingCode: data?.qrcode?.pairingCode || null };
  }
  const data = await request(`/instance/connect/${encodeURIComponent(connection.instanceName)}`);
  connection.status = "connecting";
  connection.lastStatusAt = new Date();
  await connection.save();
  return { status: connection.status, qrCode: data?.base64 || null, pairingCode: data?.pairingCode || null };
}

export async function sendCampaignBatch(userId: string, slug: string, limit = 20) {
  const { StudioCampaign } = await import("./models");
  const campaign = await StudioCampaign.findOne({ user: userId, slug });
  if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  const connection = await StudioWhatsAppConnection.findOne({ user: userId });
  if (!connection || connection.status !== "connected") throw Object.assign(new Error("Connect WhatsApp before sending this campaign"), { status: 409 });
  campaign.state = "sending";
  await campaign.save();
  const queued = await StudioCampaignRecipient.find({ user: userId, campaign: campaign._id, status: "queued" }).limit(Math.min(50, Math.max(1, limit)));
  let sent = 0;
  for (const recipient of queued) {
    try {
      const customer = await StudioCustomer.findOne({ _id: recipient.customer, user: userId });
      const number = String(recipient.destination).replace(/\D/g, "");
      if (!customer?.marketingConsent?.whatsapp || !number) throw new Error("WhatsApp consent or phone number is missing");
      const text = String(campaign.message || "").replaceAll("{name}", customer.name).replaceAll("{store}", "our store");
      const data = await request(`/message/sendText/${encodeURIComponent(connection.instanceName)}`, { method: "POST", body: JSON.stringify({ number, textMessage: { text }, linkPreview: true }) });
      recipient.status = "sent";
      recipient.providerMessageId = data?.key?.id || null;
      recipient.sentAt = new Date();
      customer.lastMessagedAt = new Date();
      await Promise.all([recipient.save(), customer.save()]);
      sent += 1;
    } catch (error) {
      recipient.status = "failed";
      recipient.failureReason = error instanceof Error ? error.message.slice(0, 500) : "Send failed";
      await recipient.save();
    }
  }
  const remaining = await StudioCampaignRecipient.countDocuments({ user: userId, campaign: campaign._id, status: "queued" });
  if (!remaining) { campaign.state = "sent"; await campaign.save(); }
  return { sent, attempted: queued.length, remaining, complete: remaining === 0 };
}

export function evolutionConnectionState(value: unknown) { return normalizeState(value); }
