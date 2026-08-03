import mongoose from "mongoose";
import { connectDatabase } from "./db";
import {
  StudioCampaign,
  StudioCampaignRecipient,
  StudioConfig,
  StudioConvertyConnection,
  StudioCustomer,
  StudioInfluencer,
  StudioLoyaltyTransaction,
  StudioRewardRedemption,
  StudioOrder,
  StudioSubscription,
  StudioUser,
} from "./models";
import { isUnsupportedStudioApi } from "@/lib/features";
import { classifyCustomers, isInSegment, type SegmentKey } from "@/lib/customer-segments";
import { effectiveSubscription, FIDELY_ENTITLEMENTS, FIDELY_MONTHLY_PRICE } from "@/lib/plans";
import { ensureSubscription } from "./subscriptions";
import { whatsappStatus } from "./evolution";

const referralDefaults = {
  enabled: true,
  friendReward: { type: "amount", value: 10 },
  referrerReward: { type: "amount", value: 10 },
  rewardTrigger: "first_delivered",
  validationDelayDays: 0,
  minOrderValue: 50,
  whatsappMessage:
    "I love {store}! Use my code {code} to get {friendReward} off your first order: {link}",
};

export const loyaltyDefaults = {
  enabled: true,
  earnRules: [
    { name: "Delivered order", icon: "cart", points: 10, perAmount: 100, note: "Every delivered order", active: true },
    { name: "First purchase", icon: "gift", points: 50, perAmount: 0, note: "First delivered order", active: true },
  ],
  rewards: [
    { id: "voucher-10", name: "10 TND voucher", icon: "voucher", cost: 100, note: "On the next order", active: true, redeemed: 0 },
    { id: "free-delivery", name: "Free delivery", icon: "delivery", cost: 150, note: "One delivery", active: true, redeemed: 0 },
  ],
  tiers: [
    { name: "Member", threshold: 0, basis: "points", perk: null },
    { name: "VIP", threshold: 500, basis: "points", perk: "Priority rewards" },
  ],
  pointExpiryDays: 365,
};

const widgetDefaults = {
  widgets: {
    loyalty: { enabled: true, placement: null },
    checkout: { enabled: true, placement: null },
    referral: { enabled: true, placement: null },
    postpurchase: { enabled: true, placement: null },
    whatsapp: { enabled: true, placement: null },
  },
  appearance: {
    primaryColor: "#7C5A43",
    accentColor: "#C8744F",
    buttonStyle: "rounded",
    cornerRadius: "12",
    language: "en",
    logoSynced: true,
  },
};

function id(value: unknown) {
  return String(value);
}

function trend(values: number[]) {
  if (values.length < 2) return 0;
  const split = Math.floor(values.length / 2);
  const previous = values.slice(0, split).reduce((sum, value) => sum + value, 0);
  const current = values.slice(split).reduce((sum, value) => sum + value, 0);
  return previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0;
}

function series(values: number[]) {
  const safeValues = values.map((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  });
  return {
    v: safeValues.map((value) => Math.round(value)),
    total: Math.round(safeValues.reduce((sum, value) => sum + value, 0)),
    trend: trend(safeValues),
  };
}

async function config(userId: string, key: string, defaults: object) {
  const record = await StudioConfig.findOneAndUpdate(
    { user: userId, key },
    { $setOnInsert: { data: defaults } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return record!.data;
}

export type CustomerAnalyticsRow = {
  id: string; name: string; phone: string; email: string | null; source: { type?: string; [key: string]: unknown };
  marketingConsent: { whatsapp: boolean; sms: boolean; email: boolean }; lastMessagedAt: Date | null;
  marketingConsentEvidence?: { whatsapp?: { source?: string | null; recordedAt?: Date | null; note?: string | null } };
  points: number; tier: string; placed: number; delivered: number; refused: number; spent: number;
  lastDeliveredAt: Date | null; firstDeliveredAt: Date | null; createdAt: Date;
};

export async function customerRowsForUsers(userIds: string[]) {
  const objectIds = userIds.filter(mongoose.isValidObjectId).map((value) => new mongoose.Types.ObjectId(value));
  const [customers, metrics, deliveryDates] = await Promise.all([
    StudioCustomer.find({ user: { $in: objectIds } }).sort({ updatedAt: -1 }).lean(),
    StudioOrder.aggregate([{ $match: { user: { $in: objectIds } } }, { $group: { _id: { user: "$user", customer: "$customer" }, placed: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }, refused: { $sum: { $cond: [{ $in: ["$status", ["refused", "returned", "cancelled", "rejected"]] }, 1, 0] } }, spent: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$amount", 0] } } } }]),
    StudioOrder.aggregate([{ $match: { user: { $in: objectIds }, status: "delivered", deliveredAt: { $ne: null } } }, { $group: { _id: { user: "$user", customer: "$customer" }, firstDeliveredAt: { $min: "$deliveredAt" }, lastDeliveredAt: { $max: "$deliveredAt" } } }]),
  ]);
  const key = (user: unknown, customer: unknown) => `${id(user)}:${id(customer)}`;
  const metricMap = new Map(metrics.map((row) => [key(row._id.user, row._id.customer), row]));
  const dateMap = new Map(deliveryDates.map((row) => [key(row._id.user, row._id.customer), row]));
  const byUser = new Map<string, CustomerAnalyticsRow[]>();
  for (const customer of customers) {
    const metric = metricMap.get(key(customer.user, customer._id));
    const dates = dateMap.get(key(customer.user, customer._id));
    const row: CustomerAnalyticsRow = {
      id: id(customer._id),
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      source: (customer.source || { type: "direct" }) as CustomerAnalyticsRow["source"],
      marketingConsent: (customer.marketingConsent || { whatsapp: false, sms: false, email: false }) as CustomerAnalyticsRow["marketingConsent"],
      marketingConsentEvidence: customer.marketingConsentEvidence || undefined,
      lastMessagedAt: customer.lastMessagedAt || null,
      points: customer.points || 0,
      tier: customer.tier || "Member",
      placed: metric?.placed || 0,
      delivered: metric?.delivered || 0,
      refused: metric?.refused || 0,
      spent: Math.round(metric?.spent || 0),
      lastDeliveredAt: dates?.lastDeliveredAt || null,
      firstDeliveredAt: dates?.firstDeliveredAt || null,
      createdAt: new Date(customer.createdAt),
    };
    const userKey = id(customer.user);
    byUser.set(userKey, [...(byUser.get(userKey) || []), row]);
  }
  return byUser;
}

export async function customerRows(userId: string) {
  return (await customerRowsForUsers([userId])).get(userId) || [];
}

type CampaignRecord = {
  _id: unknown;
  name: string;
  slug: string;
  type?: string;
  state?: string;
  goal?: string;
  budget?: number;
  customerDiscountPct?: number;
  commissionPct?: number;
  durationLabel?: string | null;
  audienceCount?: number;
  eligibleCount?: number;
  message?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  channels?: string[];
  segmentKey?: string | null;
};

function campaignJson(campaign: CampaignRecord, metrics: { placed?: number; delivered?: number; earned?: number; spent?: number } = {}) {
  return {
    id: id(campaign._id),
    name: campaign.name,
    slug: campaign.slug,
    type: campaign.type,
    state: campaign.state,
    goal: campaign.goal,
    budget: campaign.budget || 0,
    customerDiscountPct: campaign.customerDiscountPct || 0,
    commissionPct: campaign.commissionPct || 0,
    durationLabel: campaign.durationLabel || null,
    audienceCount: campaign.audienceCount || 0,
    eligibleCount: campaign.eligibleCount || 0,
    message: campaign.message || null,
    createdAt: campaign.createdAt || null,
    updatedAt: campaign.updatedAt || null,
    channels: campaign.channels || ["whatsapp"],
    segmentKey: campaign.segmentKey || null,
    influencers: [],
    placed: metrics.placed || 0,
    delivered: metrics.delivered || 0,
    deliveredPct: metrics.placed ? Math.round(((metrics.delivered || 0) / metrics.placed) * 100) : 0,
    earned: metrics.earned || 0,
    spent: metrics.spent || 0,
    result: metrics.delivered ? { label: "Delivered revenue", level: "pr" } : { label: "No attributed orders", level: "nd" },
  };
}

export async function studioGet(userId: string, path: string, search = new URLSearchParams()) {
  await connectDatabase();
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (isUnsupportedStudioApi(clean)) {
    throw Object.assign(new Error("This feature is not available yet"), { status: 404 });
  }
  if (!["account", "account/export"].includes(clean)) {
    const subscription = await ensureSubscription(userId);
    if (effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt) === "restricted") throw Object.assign(new Error("Your trial or subscription has expired"), { status: 402 });
  }

  if (clean === "converty/status") {
    const connection = await StudioConvertyConnection.findOne({ user: userId }).lean();
    const activityTimes = [connection?.lastSyncAt, connection?.lastWebhookAt]
      .filter(Boolean).map((value) => new Date(value!).getTime());
    const lastDataAt = activityTimes.length ? new Date(Math.max(...activityTimes)) : null;
    return {
      connected: Boolean(connection),
      configured: Boolean(
        process.env.MONGODB_URI &&
          process.env.CONVERTY_CLIENT_ID &&
          process.env.CONVERTY_CLIENT_SECRET &&
          process.env.CONVERTY_REDIRECT_URI &&
          process.env.TOKEN_ENCRYPTION_KEY
      ),
      store: connection
        ? {
            id: connection.convertyStoreId,
            name: connection.storeName,
            slug: connection.storeSlug,
            domain: connection.storeDomain,
            currency: connection.currency,
            country: connection.country,
          }
        : null,
      lastSyncAt: connection?.lastSyncAt || null,
      lastSyncStartedAt: connection?.lastSyncStartedAt || null,
      lastSyncError: connection?.lastSyncError || null,
      lastSyncOrderCount: connection?.lastSyncOrderCount || 0,
      lastWebhookAt: connection?.lastWebhookAt || null,
      lastDataAt,
      lastWebhookError: connection?.lastWebhookError || null,
      connectedAt: connection?.connectedAt || null,
      webhooksActive: connection?.webhookIds?.length === 2,
      webhookScopesGranted: ["read-hooks", "create-hooks", "delete-hooks"].every((scope) => connection?.scopes?.includes(scope)),
      health: !connection
        ? "disconnected"
        : connection.lastSyncError || connection.lastWebhookError || connection.webhookIds?.length !== 2
          ? "attention"
          : lastDataAt && Date.now() - lastDataAt.getTime() <= 86_400_000
            ? "healthy" : "stale",
    };
  }

  if (clean === "whatsapp/status") return whatsappStatus(userId);

  if (clean === "account") {
    const [user, connection, customerCount] = await Promise.all([
      StudioUser.findById(userId).lean(),
      StudioConvertyConnection.findOne({ user: userId }).lean(),
      StudioCustomer.countDocuments({ user: userId }),
    ]);
    if (!user) throw Object.assign(new Error("Account not found"), { status: 404 });
    const subscription = (await ensureSubscription(userId)).toObject();
    return {
      profile: { email: user.email || "", shopName: user.shopName, ownerName: user.ownerName || "", currency: connection?.currency || user.currency || "TND" },
      subscription: {
        plan: "fidely", price: FIDELY_MONTHLY_PRICE,
        status: effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt),
        rawStatus: subscription.status, trialEndsAt: subscription.trialEndsAt,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt || null,
        entitlements: FIDELY_ENTITLEMENTS, customerCount,
        billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_FIDELY_PRICE_ID),
      },
      onboarding: {
        profileComplete: Boolean(user.email && user.shopName),
        storeConnected: Boolean(connection),
        firstSyncComplete: Boolean(connection?.lastSyncAt),
      },
    };
  }

  if (clean === "account/export") {
    const [user, customers, orders, campaigns, campaignRecipients, influencers, configs, subscription] = await Promise.all([
      StudioUser.findById(userId).select("email shopName ownerName currency createdAt updatedAt").lean(),
      StudioCustomer.find({ user: userId }).select("-user").lean(),
      StudioOrder.find({ user: userId }).select("-user -raw").lean(),
      StudioCampaign.find({ user: userId }).select("-user").lean(),
      StudioCampaignRecipient.find({ user: userId }).select("-user -destination").lean(),
      StudioInfluencer.find({ user: userId }).select("-user").lean(),
      StudioConfig.find({ user: userId }).select("-user").lean(),
      StudioSubscription.findOne({ user: userId }).select("-user -providerCustomerId -providerSubscriptionId").lean(),
    ]);
    return { exportedAt: new Date(), profile: user, subscription, customers, orders, campaigns, campaignRecipients, influencers, settings: configs };
  }

  if (clean === "customers" || clean === "loyalty/customers") {
    let rows = await customerRows(userId);
    const q = search.get("q")?.toLowerCase();
    const source = search.get("source");
    const segment = search.get("segment") as SegmentKey | null;
    const from = search.get("from") ? new Date(`${search.get("from")}T00:00:00Z`) : null;
    const to = search.get("to") ? new Date(`${search.get("to")}T23:59:59.999Z`) : null;
    if (q) rows = rows.filter((row) => `${row.name} ${row.phone}`.toLowerCase().includes(q));
    if (source) rows = rows.filter((row) => row.source?.type === source);
    if (from && Number.isFinite(from.getTime())) rows = rows.filter((row) => row.lastDeliveredAt && new Date(row.lastDeliveredAt) >= from);
    if (to && Number.isFinite(to.getTime())) rows = rows.filter((row) => row.lastDeliveredAt && new Date(row.lastDeliveredAt) <= to);
    const classification = classifyCustomers(rows);
    if (segment) {
      if (segment in classification.members) {
        rows = rows.filter((row) => isInSegment(row, segment, classification.storeAvgBasket));
      }
    }
    rows = rows.map((row) => ({ ...row, segments: (Object.keys(classification.members) as SegmentKey[]).filter((key) => isInSegment(row, key, classification.storeAvgBasket)) }));
    if (clean === "loyalty/customers") {
      rows = rows.filter((row) => row.points > 0);
      const activity = await StudioLoyaltyTransaction.aggregate([{ $match: { user: new mongoose.Types.ObjectId(userId) } }, { $group: { _id: "$customer", earned: { $sum: { $cond: [{ $gt: ["$points", 0] }, "$points", 0] } }, redeemed: { $sum: { $cond: [{ $lt: ["$points", 0] }, { $abs: "$points" }, 0] } }, lastActivityAt: { $max: "$createdAt" } } }]);
      const byCustomer = new Map(activity.map((item) => [String(item._id), item]));
      rows = rows.map((row) => ({ ...row, loyalty: byCustomer.get(row.id) || { earned: 0, redeemed: 0, lastActivityAt: null } }));
    }
    const total = rows.length;
    const page = Math.max(1, Number(search.get("page")) || 1);
    const limit = Math.min(200, Math.max(1, Number(search.get("limit")) || 50));
    rows = rows.slice((page - 1) * limit, page * limit);
    const connection = await StudioConvertyConnection.findOne({ user: userId }).select("currency").lean();
    return { customers: rows, total, page, limit, pages: Math.ceil(total / limit), currency: connection?.currency || "TND" };
  }

  if (clean.startsWith("customers/")) {
    const customerId = clean.slice("customers/".length);
    if (!mongoose.isValidObjectId(customerId)) throw Object.assign(new Error("Customer not found"), { status: 404 });
    const customer = (await customerRows(userId)).find((row) => row.id === customerId);
    if (!customer) throw Object.assign(new Error("Customer not found"), { status: 404 });
    const [orders, loyaltyTransactions] = await Promise.all([
      StudioOrder.find({ user: userId, customer: customerId }).sort({ placedAt: -1 }).lean(),
      StudioLoyaltyTransaction.find({ user: userId, customer: customerId }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    return {
      customer: {
        ...customer,
        tags: (await StudioCustomer.findById(customerId).lean())?.tags || [],
        note: (await StudioCustomer.findById(customerId).lean())?.note || null,
        referredBy: null,
      },
      stats: {
        placed: customer.placed,
        delivered: customer.delivered,
        refused: customer.refused,
        spent: customer.spent,
        deliveryRate: customer.placed ? Math.round((customer.delivered / customer.placed) * 100) : 0,
      },
      orders: orders.map((order) => ({
        id: id(order._id),
        reference: order.reference,
        amount: order.amount,
        status: order.status,
        source: { type: "direct" },
        pointsEarned: 0,
        placedAt: order.placedAt,
        deliveredAt: order.deliveredAt,
        products: ((order.raw as { cart?: Array<{ quantity?: number; price?: number; variant?: { name?: string; title?: string }; product?: { _id?: string; name?: string; title?: string; price?: number; image?: string; images?: string[] } }> } | null)?.cart || []).map((item, index) => ({
          id: item.product?._id || `${order._id}-${index}`,
          name: item.product?.name || item.product?.title || "Product",
          variant: item.variant?.name || item.variant?.title || null,
          quantity: item.quantity || 1,
          unitPrice: item.price || item.product?.price || null,
          image: item.product?.image || item.product?.images?.[0] || null,
        })),
      })),
      referrals: [],
      loyaltyTransactions: loyaltyTransactions.map((transaction) => ({ id: id(transaction._id), type: transaction.type, points: transaction.points, description: transaction.description, rewardName: transaction.rewardName || null, createdAt: transaction.createdAt })),
    };
  }

  if (clean === "campaigns") {
    const campaigns = await StudioCampaign.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const metrics = await StudioOrder.aggregate([{ $match: { user: new mongoose.Types.ObjectId(userId), attributedCampaign: { $ne: null } } }, { $group: { _id: "$attributedCampaign", placed: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }, earned: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$amount", 0] } }, spent: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$cost", 0] } } } }]);
    const byCampaign = new Map(metrics.map((item) => [id(item._id), item]));
    return { campaigns: campaigns.map((campaign) => campaignJson(campaign, byCampaign.get(id(campaign._id)))) };
  }
  if (clean.startsWith("campaigns/")) {
    const campaign = await StudioCampaign.findOne({ user: userId, slug: clean.slice(10) }).lean();
    if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
    const recipientCounts = await StudioCampaignRecipient.aggregate([
      { $match: { campaign: campaign._id } }, { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const [orderTotals] = await StudioOrder.aggregate([{ $match: { user: new mongoose.Types.ObjectId(userId), attributedCampaign: campaign._id } }, { $group: { _id: null, placed: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } }, earned: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$amount", 0] } }, spent: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$cost", 0] } } } }]);
    const totals = orderTotals || { placed: 0, delivered: 0, earned: 0, spent: 0 };
    return {
      campaign: campaignJson(campaign, totals),
      recipients: Object.fromEntries(recipientCounts.map((row) => [row._id, row.count])),
      totals: { ...totals, deliveredPct: totals.placed ? Math.round((totals.delivered / totals.placed) * 100) : 0 },
      influencers: [],
    };
  }
  if (clean === "influencers") {
    const influencers = await StudioInfluencer.find({ user: userId }).sort({ createdAt: -1 }).lean();
    return {
      influencers: influencers.map((influencer) => ({
        id: id(influencer._id),
        handle: influencer.handle,
        platform: influencer.platform,
        code: influencer.code,
        link: influencer.link,
        avatarBg: "#7C5A43",
        commissionPct: influencer.commissionPct,
        placed: 0,
        delivered: 0,
        deliveredPct: 0,
        earned: 0,
        commission: 0,
        paidOut: influencer.paidOut,
        toPay: 0,
        paid: true,
        result: { label: "Needs data", level: "nd" },
      })),
    };
  }
  if (clean === "referral") return { program: await config(userId, "referral", referralDefaults), stats: { totalReferrals: 0, rewarded: 0, pending: 0, revenue: 0, deliveredOrders: 0, conversionPct: 0 } };
  if (clean === "loyalty") {
    const customers = await customerRows(userId);
    const [rawProgram, redemptionCount, transactionCount, recentRedemptions] = await Promise.all([config(userId, "loyalty", loyaltyDefaults), StudioRewardRedemption.countDocuments({ user: userId }), StudioLoyaltyTransaction.countDocuments({ user: userId }), StudioRewardRedemption.find({ user: userId }).sort({ createdAt: -1 }).limit(50).populate("customer", "name phone").lean()]);
    const program = { ...rawProgram, rewards: (rawProgram.rewards || []).map((reward: { id?: string; name: string }, index: number) => ({ ...reward, id: reward.id || `legacy-${index}-${reward.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` })) };
    return { program, redemptions: recentRedemptions.map((item) => ({ id: id(item._id), rewardName: item.rewardName, pointsCost: item.pointsCost, status: item.status, createdAt: item.createdAt, customer: item.customer })), stats: { members: customers.filter((c) => c.points > 0).length, pointsOutstanding: customers.reduce((sum, c) => sum + c.points, 0), redemptions: redemptionCount, transactions: transactionCount } };
  }
  if (clean === "widgets") return { config: await config(userId, "widgets", widgetDefaults) };

  const customers = await customerRows(userId);
  const classification = classifyCustomers(customers);
  const analyticsConnection = await StudioConvertyConnection.findOne({ user: userId }).select("currency").lean();
  const segments = {
    storeAvgBasket: classification.storeAvgBasket,
    currency: analyticsConnection?.currency || "TND",
    counts: {
      vip: classification.members.vip.length,
      atRisk: classification.members.atRisk.length,
      dormant: classification.members.dormant.length,
      closeReward: classification.members.closeReward.length,
      influencerAcquired: classification.members.influencerAcquired.length,
      referralChampions: 0,
      highBasket: classification.members.highBasket.length,
    },
  };
  if (clean === "segments") return segments;
  if (clean === "cohorts") {
    const sourceFilter = search.get("source");
    const cohortCustomers = sourceFilter ? customers.filter((customer) => customer.source?.type === sourceFilter) : customers;
    const bySourceMap = new Map<string, typeof customers>();
    for (const customer of cohortCustomers) {
      const source = customer.source?.type || "direct";
      bySourceMap.set(source, [...(bySourceMap.get(source) || []), customer]);
    }
    const bySource = [...bySourceMap].map(([source, rows]) => {
      const repeat = rows.filter((row) => row.delivered >= 2).length;
      return {
        source,
        customers: rows.length,
        secondDelivered: repeat,
        repeatPct: rows.length ? Math.round((repeat / rows.length) * 100) : 0,
        revenue: rows.reduce((sum, row) => sum + row.spent, 0),
      };
    });
    const monthMap = new Map<string, typeof customers>();
    for (const customer of cohortCustomers) {
      if (!customer.firstDeliveredAt) continue;
      const date = new Date(customer.firstDeliveredAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, [...(monthMap.get(key) || []), customer]);
    }
    const byMonth = [...monthMap]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, rows]) => ({
        monthKey,
        month: new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString("en", { month: "short", year: "numeric" }),
        newCustomers: rows.length,
        second: rows.filter((row) => row.delivered >= 2).length,
        third: rows.filter((row) => row.delivered >= 3).length,
        repeatPct: rows.length ? Math.round((rows.filter((row) => row.delivered >= 2).length / rows.length) * 100) : 0,
        sales: rows.reduce((sum, row) => sum + row.spent, 0),
      }));
    const connection = await StudioConvertyConnection.findOne({ user: userId }).select("currency").lean();
    return { bySource, byMonth, currency: connection?.currency || "TND" };
  }

  if (clean === "overview") {
    const user = await StudioUser.findById(userId).lean();
    const connection = await StudioConvertyConnection.findOne({ user: userId }).lean();
    const days = Math.min(90, Math.max(7, Number(search.get("days")) || 30));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);
    const orders = await StudioOrder.find({ user: userId, placedAt: { $gte: start } }).lean();
    const labels: string[] = [];
    const salesValues = Array(days).fill(0) as number[];
    const deliveredValues = Array(days).fill(0) as number[];
    const costValues = Array(days).fill(0) as number[];
    const customerValues = Array(days).fill(0) as number[];
    for (let index = 0; index < days; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      labels.push(date.toISOString().slice(0, 10));
    }
    for (const order of orders) {
      const index = Math.floor((new Date(order.placedAt).getTime() - start.getTime()) / 864e5);
      if (index < 0 || index >= days) continue;
      if (order.status === "delivered") {
        salesValues[index] += Number(order.amount) || 0;
        deliveredValues[index] += 1;
        costValues[index] += Number(order.cost) || 0;
      }
    }
    for (const customer of customers) {
      const index = Math.floor((new Date(customer.createdAt).getTime() - start.getTime()) / 864e5);
      if (index >= 0 && index < days) customerValues[index] += 1;
    }
    const sales = series(salesValues);
    const deliveredSeries = series(deliveredValues);
    const cost = series(costValues);
    const newCustomers = series(customerValues);
    const campaigns = await StudioCampaign.find({ user: userId }).limit(4).lean();
    return {
      store: { name: user?.shopName || "Store", logoUrl: user?.logoUrl || null, currency: connection?.currency || user?.currency || "TND" },
      converty: { connected: Boolean(connection), storeName: connection?.storeName || null, lastSyncAt: connection?.lastSyncAt || null, connectedAt: connection?.connectedAt || null },
      kpis: { sales, delivered: deliveredSeries, cost, customers: newCustomers, totalCustomers: customers.length },
      chart: { labels, series: { sales, delivered: deliveredSeries, cost, customers: newCustomers } },
      advanced: {
        cac: newCustomers.total ? Math.round((cost.total / newCustomers.total) * 10) / 10 : 0,
        roas: cost.total ? Math.round((sales.total / cost.total) * 10) / 10 : 0,
        attributionDays: 14,
        deliveryRate: orders.length ? Math.round((deliveredSeries.total / orders.length) * 100) : 0,
      },
      topCampaigns: campaigns.map((campaign) => campaignJson(campaign)),
      topInfluencers: [],
      segments,
      topRewards: [],
    };
  }

  throw Object.assign(new Error(`Unknown Studio endpoint: ${clean}`), { status: 404 });
}
