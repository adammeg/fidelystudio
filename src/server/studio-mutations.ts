import mongoose from "mongoose";
import { connectDatabase } from "./db";
import {
  StudioCampaign,
  StudioConfig,
  StudioConvertyConnection,
  StudioCustomer,
  StudioInfluencer,
  StudioSession,
} from "./models";
import {
  setupWebhooksForUser,
  syncOrdersForUser,
  teardownWebhooksForUser,
} from "./converty-sync";
import { isUnsupportedStudioApi } from "@/lib/features";

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

  if (clean === "campaigns" && method === "POST") {
    const name = String(body.name || "").trim();
    if (name.length < 2) throw Object.assign(new Error("Campaign name is required"), { status: 400 });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const campaign = await StudioCampaign.create({
      user: userId,
      name,
      slug,
      type: body.type,
      state: body.state,
      goal: body.goal,
      budget: body.budget,
      customerDiscountPct: body.customerDiscountPct,
      commissionPct: body.commissionPct,
      durationLabel: body.durationLabel,
      channels: body.channels,
      segmentKey: body.segmentKey,
      incentiveType: body.incentiveType,
    });
    return { campaign };
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

  throw Object.assign(new Error(`Unknown Studio mutation: ${method} ${clean}`), { status: 404 });
}
