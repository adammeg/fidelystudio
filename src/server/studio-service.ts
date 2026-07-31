import mongoose from "mongoose";
import { connectDatabase } from "./db";
import {
  StudioCampaign,
  StudioConfig,
  StudioConvertyConnection,
  StudioCustomer,
  StudioInfluencer,
  StudioOrder,
  StudioUser,
} from "./models";
import { isUnsupportedStudioApi } from "@/lib/features";

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

const loyaltyDefaults = {
  enabled: true,
  earnRules: [
    { name: "Delivered order", icon: "cart", points: 10, perAmount: 100, note: "Every delivered order", active: true },
    { name: "First purchase", icon: "gift", points: 50, perAmount: 0, note: "First delivered order", active: true },
  ],
  rewards: [
    { name: "10 TND voucher", icon: "voucher", cost: 100, note: "On the next order", active: true, redeemed: 0 },
    { name: "Free delivery", icon: "delivery", cost: 150, note: "One delivery", active: true, redeemed: 0 },
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

async function customerRows(userId: string) {
  const [customers, orders] = await Promise.all([
    StudioCustomer.find({ user: userId }).sort({ updatedAt: -1 }).lean(),
    StudioOrder.find({ user: userId }).lean(),
  ]);
  return customers.map((customer) => {
    const related = orders.filter((order) => id(order.customer) === id(customer._id));
    const delivered = related.filter((order) => order.status === "delivered");
    const refused = related.filter((order) =>
      ["refused", "returned", "cancelled", "rejected"].includes(order.status)
    );
    return {
      id: id(customer._id),
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      source: customer.source || { type: "direct" },
      points: customer.points || 0,
      tier: customer.tier || "Member",
      placed: related.length,
      delivered: delivered.length,
      refused: refused.length,
      spent: Math.round(delivered.reduce((sum, order) => sum + (order.amount || 0), 0)),
      lastDeliveredAt: customer.lastDeliveredAt || null,
      createdAt: customer.createdAt,
    };
  });
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
};

function campaignJson(campaign: CampaignRecord) {
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
    influencers: [],
    placed: 0,
    delivered: 0,
    deliveredPct: 0,
    earned: 0,
    spent: 0,
    result: { label: "Needs data", level: "nd" },
  };
}

export async function studioGet(userId: string, path: string, search = new URLSearchParams()) {
  await connectDatabase();
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (isUnsupportedStudioApi(clean)) {
    throw Object.assign(new Error("This feature is not available yet"), { status: 404 });
  }

  if (clean === "converty/status") {
    const connection = await StudioConvertyConnection.findOne({ user: userId }).lean();
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
      connectedAt: connection?.connectedAt || null,
      webhooksActive: Boolean(connection?.webhookIds?.length),
    };
  }

  if (clean === "customers" || clean === "loyalty/customers") {
    let rows = await customerRows(userId);
    const q = search.get("q")?.toLowerCase();
    const source = search.get("source");
    if (q) rows = rows.filter((row) => `${row.name} ${row.phone}`.toLowerCase().includes(q));
    if (source) rows = rows.filter((row) => row.source?.type === source);
    if (clean === "loyalty/customers") rows = rows.filter((row) => row.points > 0);
    return { customers: rows, total: rows.length };
  }

  if (clean.startsWith("customers/")) {
    const customerId = clean.slice("customers/".length);
    if (!mongoose.isValidObjectId(customerId)) throw Object.assign(new Error("Customer not found"), { status: 404 });
    const customer = (await customerRows(userId)).find((row) => row.id === customerId);
    if (!customer) throw Object.assign(new Error("Customer not found"), { status: 404 });
    const orders = await StudioOrder.find({ user: userId, customer: customerId }).sort({ placedAt: -1 }).lean();
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
      })),
      referrals: [],
    };
  }

  if (clean === "campaigns") {
    const campaigns = await StudioCampaign.find({ user: userId }).sort({ createdAt: -1 }).lean();
    return { campaigns: campaigns.map(campaignJson) };
  }
  if (clean.startsWith("campaigns/")) {
    const campaign = await StudioCampaign.findOne({ user: userId, slug: clean.slice(10) }).lean();
    if (!campaign) throw Object.assign(new Error("Campaign not found"), { status: 404 });
    return {
      campaign: campaignJson(campaign),
      totals: { placed: 0, delivered: 0, deliveredPct: 0, earned: 0, spent: 0 },
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
    return { program: await config(userId, "loyalty", loyaltyDefaults), stats: { members: customers.filter((c) => c.points > 0).length, pointsOutstanding: customers.reduce((sum, c) => sum + c.points, 0) } };
  }
  if (clean === "widgets") return { config: await config(userId, "widgets", widgetDefaults) };

  const customers = await customerRows(userId);
  const now = Date.now();
  const segments = {
    storeAvgBasket: customers.length ? Math.round(customers.reduce((sum, c) => sum + c.spent, 0) / Math.max(1, customers.reduce((sum, c) => sum + c.delivered, 0))) : 0,
    counts: {
      vip: customers.filter((c) => c.spent >= 1000).length,
      atRisk: customers.filter((c) => {
        if (!c.lastDeliveredAt) return false;
        const age = now - new Date(c.lastDeliveredAt).getTime();
        return age >= 60 * 864e5 && age < 90 * 864e5;
      }).length,
      dormant: customers.filter((c) => {
        if (!c.lastDeliveredAt) return false;
        return now - new Date(c.lastDeliveredAt).getTime() >= 90 * 864e5;
      }).length,
      closeReward: customers.filter((c) => c.points >= 70 && c.points < 100).length,
      influencerAcquired: customers.filter((c) => c.source?.type === "influencer").length,
      referralChampions: 0,
      highBasket: customers.filter((c) => c.spent >= 500).length,
    },
  };
  if (clean === "segments") return segments;
  if (clean === "cohorts") {
    const bySourceMap = new Map<string, typeof customers>();
    for (const customer of customers) {
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
    for (const customer of customers) {
      const date = new Date(customer.createdAt);
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
    return { bySource, byMonth };
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
      store: { name: user?.shopName || "Store", logoUrl: user?.logoUrl || null },
      converty: { connected: Boolean(connection), storeName: connection?.storeName || null, lastSyncAt: connection?.lastSyncAt || null, connectedAt: connection?.connectedAt || null },
      kpis: { sales, delivered: deliveredSeries, cost, customers: newCustomers, totalCustomers: customers.length },
      chart: { labels, series: { sales, delivered: deliveredSeries, cost, customers: newCustomers } },
      advanced: {
        cac: newCustomers.total ? Math.round((cost.total / newCustomers.total) * 10) / 10 : 0,
        roas: cost.total ? Math.round((sales.total / cost.total) * 10) / 10 : 0,
        attributionDays: 14,
        deliveryRate: orders.length ? Math.round((deliveredSeries.total / orders.length) * 100) : 0,
      },
      topCampaigns: campaigns.map(campaignJson),
      topInfluencers: [],
      segments,
      topRewards: [],
    };
  }

  throw Object.assign(new Error(`Unknown Studio endpoint: ${clean}`), { status: 404 });
}
