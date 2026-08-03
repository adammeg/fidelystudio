import { StudioCampaignRecipient, StudioCustomer, StudioMessageOutbox, StudioSubscription, StudioUser, StudioWhatsAppConnection } from "./models";
import { randomToken, sha256 } from "./security";
import { effectiveSubscription } from "../lib/plans";

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

export function normalizeWhatsAppNumber(value: string, country?: string | null) {
  let number = String(value || "").replace(/\D/g, "").replace(/^00/, "");
  const code = String(country || "").toLowerCase();
  const dialingCode = code === "tn" || code === "tun" || code.includes("tunisia") ? "216" : code === "dz" || code === "dza" || code.includes("algeria") ? "213" : code === "ma" || code === "mar" || code.includes("morocco") ? "212" : null;
  if (dialingCode && number.startsWith("0")) number = number.slice(1);
  if (dialingCode && !number.startsWith(dialingCode)) number = `${dialingCode}${number}`;
  if (number.length < 10 || number.length > 15) throw new Error("Invalid WhatsApp phone number");
  return number;
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
  if (connection.status === "connected") await processMessageOutbox(userId, 10);
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

export async function disconnectWhatsApp(userId: string) {
  const connection = await StudioWhatsAppConnection.findOne({ user: userId });
  if (!connection) return { disconnected: true };
  try { await request(`/instance/delete/${encodeURIComponent(connection.instanceName)}`, { method: "DELETE" }); } catch { /* Delete local credentials even if the provider is unavailable. */ }
  await StudioWhatsAppConnection.deleteOne({ _id: connection._id });
  return { disconnected: true };
}

export async function sendCampaignBatch(userId: string, slug: string, limit = 20) {
  const { StudioCampaign } = await import("./models");
  const campaign = await StudioCampaign.findOne({ user: userId, slug });
  if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
  if (["paused", "cancelled", "completed"].includes(campaign.state)) throw Object.assign(new Error(`Campaign is ${campaign.state}`), { status: 409 });
  const [connection, user] = await Promise.all([StudioWhatsAppConnection.findOne({ user: userId }), StudioUser.findById(userId).select("shopName country").lean()]);
  if (!connection || connection.status !== "connected") throw Object.assign(new Error("Connect WhatsApp before sending this campaign"), { status: 409 });
  campaign.state = "sending";
  await campaign.save();
  await StudioCampaignRecipient.updateMany({ user: userId, campaign: campaign._id, status: "sending", sendClaimedAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } }, { $set: { status: "queued", sendClaimedAt: null } });
  let sent = 0;
  let attempted = 0;
  for (let index = 0; index < Math.min(50, Math.max(1, limit)); index += 1) {
    const recipient = await StudioCampaignRecipient.findOneAndUpdate({ user: userId, campaign: campaign._id, status: "queued" }, { $set: { status: "sending", sendClaimedAt: new Date() } }, { new: true, sort: { createdAt: 1 } });
    if (!recipient) break;
    attempted += 1;
    try {
      const customer = await StudioCustomer.findOne({ _id: recipient.customer, user: userId });
      const number = normalizeWhatsAppNumber(String(recipient.destination), user?.country);
      if (!customer?.marketingConsent?.whatsapp || !number) throw new Error("WhatsApp consent or phone number is missing");
      const text = String(campaign.message || "").replaceAll("{name}", customer.name).replaceAll("{store}", user?.shopName || "our store");
      const data = await request(`/message/sendText/${encodeURIComponent(connection.instanceName)}`, { method: "POST", body: JSON.stringify({ number, textMessage: { text }, linkPreview: true }) });
      recipient.status = "sent";
      recipient.providerMessageId = data?.key?.id || null;
      recipient.sentAt = new Date();
      recipient.sendClaimedAt = null;
      customer.lastMessagedAt = new Date();
      await Promise.all([recipient.save(), customer.save()]);
      sent += 1;
    } catch (error) {
      recipient.status = "failed";
      recipient.failureReason = error instanceof Error ? error.message.slice(0, 500) : "Send failed";
      recipient.sendClaimedAt = null;
      await recipient.save();
    }
  }
  const remaining = await StudioCampaignRecipient.countDocuments({ user: userId, campaign: campaign._id, status: "queued" });
  if (!remaining) { const failures = await StudioCampaignRecipient.countDocuments({ user: userId, campaign: campaign._id, status: "failed" }); campaign.state = failures ? "partially_failed" : "completed"; await campaign.save(); }
  return { sent, attempted, remaining, complete: remaining === 0 };
}

export async function sendDeliveryPointsUpdate(userId: string, customerId: string, earned: number, orderId: string) {
  if (earned <= 0) return { sent: false };
  const [subscription, customer, user] = await Promise.all([
    StudioSubscription.findOne({ user: userId }).lean(),
    StudioCustomer.findOne({ _id: customerId, user: userId }).lean(),
    StudioUser.findById(userId).select("shopName").lean(),
  ]);
  if (!subscription || effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt) === "restricted" || !customer?.marketingConsent?.whatsapp) return { sent: false };
  const number = normalizeWhatsAppNumber(String(customer.phone || ""), user?.country);
  if (!number) return { sent: false };
  const { getLoyaltyProgram } = await import("./loyalty");
  const program = await getLoyaltyProgram(userId);
  const nextReward = program.rewards.filter((reward) => reward.active && reward.cost > customer.points).sort((a, b) => a.cost - b.cost)[0];
  const rewardText = nextReward ? ` You need ${nextReward.cost - customer.points} more points to unlock ${nextReward.name}.` : " You can now redeem an available reward.";
  const text = `Thank you for your delivered order from ${user?.shopName || "our store"}! You earned ${earned} points. Your balance is ${customer.points} points.${rewardText}`;
  try {
    await StudioMessageOutbox.create({ user: userId, customer: customerId, kind: "points_update", idempotencyKey: `points:${orderId}`, destination: number, text });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
  }
  return processMessageOutbox(userId, 10);
}

export async function processMessageOutbox(userId: string, limit = 10) {
  const connection = await StudioWhatsAppConnection.findOne({ user: userId, status: "connected" });
  if (!connection) return { sent: 0, pending: await StudioMessageOutbox.countDocuments({ user: userId, status: { $in: ["pending", "failed"] } }) };
  let sent = 0;
  for (let index = 0; index < Math.min(25, Math.max(1, limit)); index += 1) {
    const job = await StudioMessageOutbox.findOneAndUpdate(
      { user: userId, status: { $in: ["pending", "failed"] }, nextAttemptAt: { $lte: new Date() }, attempts: { $lt: 8 } },
      { $set: { status: "sending" }, $inc: { attempts: 1 } },
      { new: true, sort: { createdAt: 1 } }
    );
    if (!job) break;
    try {
      const data = await request(`/message/sendText/${encodeURIComponent(connection.instanceName)}`, { method: "POST", body: JSON.stringify({ number: job.destination, textMessage: { text: job.text }, linkPreview: false }) });
      job.status = "sent"; job.sentAt = new Date(); job.providerMessageId = data?.key?.id || null; job.lastError = null; await job.save(); sent += 1;
    } catch (error) {
      job.status = "failed"; job.lastError = error instanceof Error ? error.message.slice(0, 500) : "Send failed";
      job.nextAttemptAt = new Date(Date.now() + Math.min(24 * 60, 2 ** job.attempts) * 60_000); await job.save();
    }
  }
  return { sent, pending: await StudioMessageOutbox.countDocuments({ user: userId, status: { $in: ["pending", "failed"] }, attempts: { $lt: 8 } }) };
}

export function evolutionConnectionState(value: unknown) { return normalizeState(value); }
