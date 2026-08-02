import mongoose from "mongoose";
import { connectDatabase } from "./db";
import {
  StudioCampaign,
  StudioCampaignRecipient,
  StudioConfig,
  StudioConvertyConnection,
  StudioCustomer,
  StudioInfluencer,
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
  const protectedWrite = clean.startsWith("customers/") || ["campaigns", "referral", "loyalty", "widgets"].some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
  if (protectedWrite) {
    const subscription = await ensureSubscription(userId);
    if (effectiveSubscription(subscription.status, subscription.trialEndsAt) === "restricted") {
      throw Object.assign(new Error("Your trial or subscription is not active"), { status: 402 });
    }
  }

  if (clean === "campaigns" && method === "POST") {
    const name = String(body.name || "").trim();
    if (name.length < 2) throw Object.assign(new Error("Campaign name is required"), { status: 400 });
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const segmentKey = String(body.segmentKey || "") as SegmentKey;
    const channels = Array.isArray(body.channels) ? body.channels.filter((channel): channel is "whatsapp" | "sms" | "email" => ["whatsapp", "sms", "email"].includes(String(channel))) : [];
    const message = String(body.message || "").trim();
    if (!channels.length) throw Object.assign(new Error("Select at least one channel"), { status: 400 });
    if (message.length < 10 || message.length > 1000) throw Object.assign(new Error("Message must be between 10 and 1,000 characters"), { status: 400 });
    const rows = await customerRows(userId);
    const classification = classifyCustomers(rows);
    if (!(segmentKey in classification.members)) throw Object.assign(new Error("Select a valid customer segment"), { status: 400 });
    const audience = classification.members[segmentKey];
    const frequencyCutoff = new Date(Date.now() - 7 * 86_400_000);
    const campaign = await StudioCampaign.create({
      user: userId,
      name,
      slug,
      type: body.type,
      state: "draft",
      goal: body.goal,
      budget: body.budget,
      customerDiscountPct: body.customerDiscountPct,
      commissionPct: body.commissionPct,
      durationLabel: body.durationLabel,
      channels,
      segmentKey,
      incentiveType: body.incentiveType,
      message,
      scheduledAt: body.scheduledAt ? new Date(String(body.scheduledAt)) : new Date(),
      attributionDays: 14,
      audienceCount: audience.length,
    });
    const recipients = audience.flatMap((customer) => channels.map((channel) => {
      const consent = Boolean(customer.marketingConsent?.[channel]);
      const frequencyBlocked = customer.lastMessagedAt && new Date(customer.lastMessagedAt) > frequencyCutoff;
      const destination = channel === "email" ? customer.email : customer.phone;
      return {
        user: userId, campaign: campaign._id, customer: customer.id, channel,
        destination: destination || "unavailable",
        status: !consent || !destination ? "excluded_consent" : frequencyBlocked ? "excluded_frequency" : "queued",
      };
    }));
    if (recipients.length) await StudioCampaignRecipient.insertMany(recipients);
    const eligibleCount = recipients.filter((recipient) => recipient.status === "queued").length;
    campaign.eligibleCount = eligibleCount;
    if (!eligibleCount) campaign.state = "draft";
    await campaign.save();
    return { campaign, audienceCount: audience.length, eligibleCount, excludedCount: recipients.length - eligibleCount };
  }

  if (clean.startsWith("campaigns/") && method === "PATCH") {
    const campaign = await StudioCampaign.findOneAndUpdate(
      { user: userId, slug: clean.slice("campaigns/".length) },
      { $set: body },
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
    const customer = await StudioCustomer.findOneAndUpdate(
      { _id: customerId, user: userId },
      { $set: { ...(body.note !== undefined ? { note: body.note } : {}), ...(body.tags ? { tags: body.tags } : {}) } },
      { new: true }
    );
    if (!customer) throw Object.assign(new Error("Customer not found"), { status: 404 });
    return { customer: { id: String(customer._id), note: customer.note, tags: customer.tags } };
  }

  if (["referral", "loyalty", "widgets"].includes(clean) && method === "PUT") {
    const record = await StudioConfig.findOneAndUpdate(
      { user: userId, key: clean },
      { $set: Object.fromEntries(Object.entries(body).map(([key, value]) => [`data.${key}`, value])) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return { [clean === "widgets" ? "config" : "program"]: record.data };
  }

  if (clean === "converty/sync" && method === "POST") return syncOrdersForUser(userId);
  if (clean === "converty/webhooks/setup" && method === "POST") return setupWebhooksForUser(userId);
  if (clean === "converty/disconnect" && method === "POST") {
    await teardownWebhooksForUser(userId);
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
