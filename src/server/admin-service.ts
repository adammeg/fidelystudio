import { connectDatabase } from "./db";
import {
  StudioAuditLog,
  StudioCampaign,
  StudioConfig,
  StudioConvertyConnection,
  StudioCustomer,
  StudioOrder,
  StudioSubscription,
  StudioUser,
} from "./models";
import { effectiveSubscription } from "@/lib/plans";
import { classifyCustomers } from "@/lib/customer-segments";
import { customerRows } from "./studio-service";

export async function requireAdmin(userId: string) {
  await connectDatabase();
  const user = await StudioUser.findOne({ _id: userId, role: "admin" }).lean();
  if (!user) throw Object.assign(new Error("Administrator access required"), { status: 403 });
  return user;
}

export async function adminDashboard(userId: string) {
  await requireAdmin(userId);
  const users = await StudioUser.find({ role: "shop" }).sort({ createdAt: -1 }).lean();
  const ids = users.map((user) => user._id);
  const [subscriptions, connections, customerCounts, orderMetrics, campaignMetrics, loyaltyConfigs, segmentRows] = await Promise.all([
    StudioSubscription.find({ user: { $in: ids } }).lean(),
    StudioConvertyConnection.find({ user: { $in: ids } }).select("user storeName lastSyncAt lastSyncError webhookIds").lean(),
    StudioCustomer.aggregate<{ _id: unknown; count: number; loyaltyMembers: number; points: number }>([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", count: { $sum: 1 }, loyaltyMembers: { $sum: { $cond: [{ $gt: ["$points", 0] }, 1, 0] } }, points: { $sum: "$points" } } }]),
    StudioOrder.aggregate<{ _id: unknown; count: number; revenue: number; cost: number; delivered: number }>([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$amount", 0] } }, cost: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, "$cost", 0] } }, delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } } } }]),
    StudioCampaign.aggregate<{ _id: unknown; total: number; drafts: number; launched: number }>([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", total: { $sum: 1 }, drafts: { $sum: { $cond: [{ $eq: ["$state", "draft"] }, 1, 0] } }, launched: { $sum: { $cond: [{ $in: ["$state", ["sending", "sent", "completed", "scheduled"]] }, 1, 0] } } } }]),
    StudioConfig.find({ user: { $in: ids }, key: "loyalty" }).select("user data.enabled data.rewards").lean(),
    Promise.all(users.map(async (user) => ({ user: user._id, classification: classifyCustomers(await customerRows(String(user._id))) }))),
  ]);
  const byUser = <T extends { user?: unknown; _id?: unknown }>(rows: T[], id: unknown) => rows.find((row) => String(row.user ?? row._id) === String(id));
  const merchants = users.map((user) => {
    const subscription = byUser(subscriptions, user._id);
    const connection = byUser(connections, user._id);
    const order = byUser(orderMetrics, user._id);
    const campaign = byUser(campaignMetrics, user._id);
    const customerMetric = byUser(customerCounts, user._id);
    const loyalty = byUser(loyaltyConfigs, user._id);
    const segments = segmentRows.find((row) => String(row.user) === String(user._id))?.classification;
    return {
      id: String(user._id), email: user.email || "", shopName: user.shopName,
      ownerName: user.ownerName || "", createdAt: user.createdAt,
      subscription: subscription ? {
        status: effectiveSubscription(subscription.status, subscription.trialEndsAt),
        rawStatus: subscription.status, trialEndsAt: subscription.trialEndsAt,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt || null,
      } : null,
      store: connection ? { name: connection.storeName, lastSyncAt: connection.lastSyncAt, healthy: !connection.lastSyncError && connection.webhookIds?.length === 2 } : null,
      customers: customerMetric?.count || 0,
      loyaltyMembers: customerMetric?.loyaltyMembers || 0,
      pointsOutstanding: customerMetric?.points || 0,
      activeRewards: Array.isArray(loyalty?.data?.rewards) ? loyalty.data.rewards.filter((reward: { active?: boolean }) => reward.active).length : 0,
      orders: order?.count || 0,
      deliveredOrders: order?.delivered || 0,
      revenue: Math.round(order?.revenue || 0),
      cost: Math.round(order?.cost || 0),
      campaigns: campaign?.total || 0,
      campaignDrafts: campaign?.drafts || 0,
      campaignsLaunched: campaign?.launched || 0,
      segments: { vip: segments?.members.vip.length || 0, atRisk: segments?.members.atRisk.length || 0, dormant: segments?.members.dormant.length || 0, highBasket: segments?.members.highBasket.length || 0, closeReward: segments?.members.closeReward.length || 0 },
    };
  });
  return {
    totals: {
      merchants: merchants.length,
      active: merchants.filter((merchant) => merchant.subscription?.status === "active").length,
      trialing: merchants.filter((merchant) => merchant.subscription?.status === "trialing").length,
      pending: merchants.filter((merchant) => merchant.subscription?.status === "restricted").length,
      connected: merchants.filter((merchant) => merchant.store).length,
    },
    merchants,
  };
}

export async function setMerchantSubscription(adminId: string, merchantId: string, active: boolean) {
  await requireAdmin(adminId);
  const merchant = await StudioUser.findOne({ _id: merchantId, role: "shop" }).lean();
  if (!merchant) throw Object.assign(new Error("Merchant not found"), { status: 404 });
  const now = new Date();
  const subscription = await StudioSubscription.findOneAndUpdate(
    { user: merchantId },
    active
      ? { $set: { plan: "fidely", status: "active", currentPeriodEndsAt: new Date(now.getTime() + 30 * 86_400_000) }, $setOnInsert: { trialEndsAt: now } }
      : { $set: { plan: "fidely", status: "cancelled", currentPeriodEndsAt: now }, $setOnInsert: { trialEndsAt: now } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  await StudioAuditLog.create({ actor: adminId, action: active ? "subscription.activated" : "subscription.deactivated", targetUser: merchantId, details: { currentPeriodEndsAt: subscription.currentPeriodEndsAt } });
  return { subscription };
}
