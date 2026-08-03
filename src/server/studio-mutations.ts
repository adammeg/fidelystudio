import mongoose from "mongoose";
import { z } from "zod";
import { connectDatabase } from "./db";
import {
  StudioCampaign,
  StudioCampaignRecipient,
  StudioConfig,
  StudioConvertyConnection,
  StudioCustomer,
  StudioInfluencer,
  StudioLoyaltyTransaction,
  StudioMessageOutbox,
  StudioPaymentRecord,
  StudioRewardRedemption,
  StudioOrder,
  StudioSession,
  StudioSubscription,
  StudioUser,
} from "./models";
import {
  setupWebhooksForUser,
  syncOrdersForUser,
  teardownWebhooksForUser,
} from "./converty-sync";
import { isUnsupportedStudioApi } from "@/lib/features";
import { effectiveSubscription } from "@/lib/plans";
import { ensureSubscription } from "./subscriptions";
import { classifyCustomers, type SegmentKey } from "@/lib/customer-segments";
import { customerRows } from "./studio-service";
import { snapshotAudience } from "@/lib/campaign-audience";
import { connectWhatsApp, disconnectWhatsApp, sendCampaignBatch } from "./evolution";
import { redeemReward, updateRedemption } from "./loyalty";

const campaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(["loyalty", "referral"]).default("loyalty"),
  goal: z.enum(["Repeat purchase", "Reactivation", "Referral", "New customers", "Revenue"]),
  channels: z.tuple([z.literal("whatsapp")]),
  durationLabel: z.string().max(50).optional(),
  customerDiscountPct: z.number().min(0).max(100).default(0),
  commissionPct: z.number().min(0).max(100).default(0),
  segmentKey: z.enum(["vip", "atRisk", "dormant", "highBasket", "closeReward", "influencerAcquired"]),
  incentiveType: z.enum(["points", "free_delivery", "discount", "gift"]),
  message: z.string().trim().min(10).max(1000),
  scheduledAt: z.string().datetime().optional(),
}).strict();

const campaignUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  message: z.string().trim().min(10).max(1000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  state: z.enum(["draft", "paused", "cancelled"]).optional(),
}).strict();

const customerUpdateSchema = z.object({
  note: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  marketingConsent: z.object({ whatsapp: z.boolean(), sms: z.boolean(), email: z.boolean() }).strict().optional(),
  marketingConsentEvidence: z.object({ whatsapp: z.object({ source: z.enum(["checkout", "written", "verbal", "imported", "other"]), recordedAt: z.string().datetime(), note: z.string().trim().max(500).nullable() }).strict() }).strict().optional(),
}).strict();
const loyaltySchema = z.object({
  enabled: z.boolean().optional(),
  earnRules: z.array(z.object({ name: z.string().trim().min(1).max(80), icon: z.string().max(30), points: z.number().int().min(0).max(100000), perAmount: z.number().min(0).max(1000000), note: z.string().max(200).nullable(), active: z.boolean() }).strict()).max(10).optional(),
  rewards: z.array(z.object({ id: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(100), icon: z.string().max(30), cost: z.number().int().min(1).max(1000000), note: z.string().max(200).nullable(), active: z.boolean(), redeemed: z.number().int().min(0).default(0) }).strict()).max(20).optional(),
}).strict();

export async function studioMutate(
  userId: string,
  path: string,
  method: string,
  body: Record<string, unknown>
) {
  await connectDatabase();
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (isUnsupportedStudioApi(clean)) {
    throw Object.assign(new Error("This feature is not available yet"), { status: 404 });
  }
  const protectedWrite = clean.startsWith("customers/") || ["campaigns", "referral", "loyalty", "widgets", "whatsapp"].some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
  if (protectedWrite) {
    const subscription = await ensureSubscription(userId);
    if (effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt) === "restricted") {
      throw Object.assign(new Error("Your trial or subscription is not active"), { status: 402 });
    }
  }

  if (clean === "campaigns" && method === "POST") {
    const parsed = campaignCreateSchema.safeParse(body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || "Invalid campaign"), { status: 400 });
    const input = parsed.data;
    const name = input.name;
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const segmentKey = input.segmentKey as SegmentKey;
    const channels = input.channels;
    const message = input.message;
    const rows = await customerRows(userId);
    const classification = classifyCustomers(rows);
    const audience = classification.members[segmentKey];
    const snapshot = snapshotAudience(audience, channels);
    const campaign = await StudioCampaign.create({
      user: userId,
      name,
      slug,
      type: input.type,
      state: "draft",
      goal: input.goal,
      customerDiscountPct: input.customerDiscountPct,
      commissionPct: input.commissionPct,
      durationLabel: input.durationLabel,
      channels,
      segmentKey,
      incentiveType: input.incentiveType,
      message,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      attributionDays: 14,
      audienceCount: audience.length,
    });
    const recipients = snapshot.recipients.map((recipient) => ({
      user: userId, campaign: campaign._id, customer: recipient.customerId,
      channel: recipient.channel, destination: recipient.destination, status: recipient.status,
    }));
    if (recipients.length) await StudioCampaignRecipient.insertMany(recipients);
    const eligibleCount = snapshot.eligibleCustomerCount;
    campaign.eligibleCount = eligibleCount;
    if (!eligibleCount) campaign.state = "draft";
    await campaign.save();
    return { campaign, audienceCount: audience.length, eligibleCount, queuedMessageCount: snapshot.queuedMessageCount, excludedConsentCount: snapshot.excludedConsentCount, excludedFrequencyCount: snapshot.excludedFrequencyCount };
  }

  if (clean.match(/^campaigns\/[^/]+\/send$/) && method === "POST") {
    return sendCampaignBatch(userId, clean.split("/")[1], Number(body.limit) || 20);
  }
  if (clean.match(/^campaigns\/[^/]+\/(pause|resume|cancel|retry)$/) && method === "POST") {
    const [, slug, action] = clean.split("/");
    const campaign = await StudioCampaign.findOne({ user: userId, slug });
    if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
    if (action === "retry") { await StudioCampaignRecipient.updateMany({ user: userId, campaign: campaign._id, status: "failed" }, { $set: { status: "queued", failureReason: null } }); campaign.state = "draft"; }
    else if (action === "pause") campaign.state = "paused";
    else if (action === "resume") campaign.state = "sending";
    else campaign.state = "cancelled";
    await campaign.save();
    return { campaign };
  }

  if (clean === "whatsapp/connect" && method === "POST") return connectWhatsApp(userId);
  if (clean === "whatsapp/disconnect" && method === "POST") return disconnectWhatsApp(userId);

  if (clean.startsWith("campaigns/") && method === "PATCH") {
    const parsed = campaignUpdateSchema.safeParse(body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || "Invalid campaign update"), { status: 400 });
    const update = { ...parsed.data, ...(parsed.data.scheduledAt !== undefined ? { scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null } : {}) };
    const campaign = await StudioCampaign.findOneAndUpdate(
      { user: userId, slug: clean.slice("campaigns/".length) },
      { $set: update },
      { new: true }
    );
    if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
    return { campaign };
  }

  if (clean === "influencers" && method === "POST") {
    const influencer = await StudioInfluencer.create({
      user: userId,
      handle: body.handle,
      platform: body.platform,
      code: String(body.code || "").toUpperCase(),
      link: body.link,
      commissionPct: body.commissionPct,
    });
    return { influencer };
  }

  if (clean.match(/^influencers\/[^/]+\/payout$/) && method === "POST") {
    const influencerId = clean.split("/")[1];
    if (!mongoose.isValidObjectId(influencerId)) {
      throw Object.assign(new Error("Invalid influencer"), { status: 400 });
    }
    const influencer = await StudioInfluencer.findOneAndUpdate(
      { _id: influencerId, user: userId },
      { $set: { paidOut: 0 } },
      { new: true }
    );
    if (!influencer) throw Object.assign(new Error("Influencer not found"), { status: 404 });
    return { ok: true, paidOut: influencer.paidOut };
  }

  if (clean.startsWith("customers/") && method === "PUT") {
    const customerId = clean.slice("customers/".length);
    if (!mongoose.isValidObjectId(customerId)) throw Object.assign(new Error("Invalid customer"), { status: 400 });
    const parsed = customerUpdateSchema.safeParse(body);
    if (!parsed.success) throw Object.assign(new Error(parsed.error.issues[0]?.message || "Invalid customer update"), { status: 400 });
    if (parsed.data.marketingConsent?.whatsapp && !parsed.data.marketingConsentEvidence?.whatsapp) throw Object.assign(new Error("WhatsApp consent evidence is required"), { status: 400 });
    const customer = await StudioCustomer.findOneAndUpdate(
      { _id: customerId, user: userId },
      { $set: parsed.data },
      { new: true }
    );
    if (!customer) throw Object.assign(new Error("Customer not found"), { status: 404 });
    return { customer: { id: String(customer._id), note: customer.note, tags: customer.tags, marketingConsent: customer.marketingConsent } };
  }

  if (clean.match(/^loyalty\/customers\/[^/]+\/redeem$/) && method === "POST") {
    const customerId = clean.split("/")[2];
    if (!mongoose.isValidObjectId(customerId)) throw Object.assign(new Error("Invalid customer"), { status: 400 });
    const rewardId = z.string().trim().min(1).max(100).safeParse(body.rewardId);
    if (!rewardId.success) throw Object.assign(new Error("Select a valid reward"), { status: 400 });
    return redeemReward(userId, customerId, rewardId.data);
  }
  if (clean.match(/^loyalty\/redemptions\/[^/]+\/(fulfill|cancel)$/) && method === "POST") {
    const [, , redemptionId, action] = clean.split("/");
    if (!mongoose.isValidObjectId(redemptionId)) throw Object.assign(new Error("Invalid redemption"), { status: 400 });
    return updateRedemption(userId, redemptionId, action as "fulfill" | "cancel");
  }

  if (["referral", "loyalty", "widgets"].includes(clean) && method === "PUT") {
    const safeBody = clean === "loyalty" ? loyaltySchema.parse(body) : body;
    const record = await StudioConfig.findOneAndUpdate(
      { user: userId, key: clean },
      { $set: Object.fromEntries(Object.entries(safeBody).map(([key, value]) => [`data.${key}`, value])) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return { [clean === "widgets" ? "config" : "program"]: record.data };
  }

  if (clean === "converty/sync" && method === "POST") return syncOrdersForUser(userId);
  if (clean === "converty/webhooks/setup" && method === "POST") return setupWebhooksForUser(userId);
  if (clean === "converty/disconnect" && method === "POST") {
    await teardownWebhooksForUser(userId);
    await disconnectWhatsApp(userId);
    await Promise.all([
      StudioConvertyConnection.deleteOne({ user: userId }),
      StudioSession.deleteMany({ user: userId }),
    ]);
    return { disconnected: true };
  }

  if (clean === "account" && method === "PATCH") {
    const shopName = String(body.shopName || "").trim();
    const ownerName = String(body.ownerName || "").trim();
    if (shopName.length < 2 || shopName.length > 100) throw Object.assign(new Error("Store name must be between 2 and 100 characters"), { status: 400 });
    if (ownerName.length > 100) throw Object.assign(new Error("Owner name is too long"), { status: 400 });
    const user = await StudioUser.findOneAndUpdate(
      { _id: userId }, { $set: { shopName, ownerName: ownerName || null } }, { new: true }
    ).lean();
    if (!user) throw Object.assign(new Error("Account not found"), { status: 404 });
    return { profile: { shopName: user.shopName, ownerName: user.ownerName || "", email: user.email || "" } };
  }

  if (clean === "account" && method === "DELETE") {
    if (body.confirm !== "DELETE") throw Object.assign(new Error("Type DELETE to confirm account deletion"), { status: 400 });
    await teardownWebhooksForUser(userId);
    await Promise.all([
      StudioCampaign.deleteMany({ user: userId }), StudioConfig.deleteMany({ user: userId }),
      StudioCampaignRecipient.deleteMany({ user: userId }),
      StudioLoyaltyTransaction.deleteMany({ user: userId }),
      StudioRewardRedemption.deleteMany({ user: userId }),
      StudioMessageOutbox.deleteMany({ user: userId }), StudioPaymentRecord.deleteMany({ user: userId }),
      StudioCustomer.deleteMany({ user: userId }), StudioInfluencer.deleteMany({ user: userId }),
      StudioOrder.deleteMany({ user: userId }), StudioSubscription.deleteMany({ user: userId }),
      StudioConvertyConnection.deleteMany({ user: userId }),
    ]);
    await StudioSession.deleteMany({ user: userId });
    await StudioUser.deleteOne({ _id: userId });
    return { deleted: true };
  }

  throw Object.assign(new Error(`Unknown Studio mutation: ${method} ${clean}`), { status: 404 });
}
