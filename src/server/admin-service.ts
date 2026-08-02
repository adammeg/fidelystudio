import { connectDatabase } from "./db";
import {
  StudioAuditLog,
  StudioCampaign,
  StudioConvertyConnection,
  StudioCustomer,
  StudioOrder,
  StudioSubscription,
  StudioUser,
} from "./models";
import { effectiveSubscription } from "@/lib/plans";

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
  const [subscriptions, connections, customerCounts, orderCounts, campaignCounts] = await Promise.all([
    StudioSubscription.find({ user: { $in: ids } }).lean(),
    StudioConvertyConnection.find({ user: { $in: ids } }).select("user storeName lastSyncAt lastSyncError webhookIds").lean(),
    StudioCustomer.aggregate<{ _id: unknown; count: number }>([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
    StudioOrder.aggregate<{ _id: unknown; count: number }>([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
    StudioCampaign.aggregate<{ _id: unknown; count: number }>([{ $match: { user: { $in: ids } } }, { $group: { _id: "$user", count: { $sum: 1 } } }]),
  ]);
  const byUser = <T extends { user?: unknown; _id?: unknown }>(rows: T[], id: unknown) => rows.find((row) => String(row.user ?? row._id) === String(id));
  const merchants = users.map((user) => {
    const subscription = byUser(subscriptions, user._id);
    const connection = byUser(connections, user._id);
    return {
      id: String(user._id), email: user.email || "", shopName: user.shopName,
      ownerName: user.ownerName || "", createdAt: user.createdAt,
      subscription: subscription ? {
        status: effectiveSubscription(subscription.status, subscription.trialEndsAt),
        rawStatus: subscription.status, trialEndsAt: subscription.trialEndsAt,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt || null,
      } : null,
      store: connection ? { name: connection.storeName, lastSyncAt: connection.lastSyncAt, healthy: !connection.lastSyncError && connection.webhookIds?.length === 2 } : null,
      customers: byUser(customerCounts, user._id)?.count || 0,
      orders: byUser(orderCounts, user._id)?.count || 0,
      campaigns: byUser(campaignCounts, user._id)?.count || 0,
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
