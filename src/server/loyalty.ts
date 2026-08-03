import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { StudioConfig, StudioCustomer, StudioLoyaltyTransaction, StudioOrder, StudioRewardRedemption } from "./models";
type LoyaltyProgram = { enabled: boolean; earnRules: { name: string; icon: string; points: number; perAmount: number; note: string | null; active: boolean }[]; rewards: { id: string; name: string; icon: string; cost: number; note: string | null; active: boolean; redeemed: number }[]; tiers: { name: string; threshold: number; basis: string; perk: string | null }[]; pointExpiryDays: number };
const DEFAULT_PROGRAM: LoyaltyProgram = { enabled: true, earnRules: [{ name: "Delivered order", icon: "cart", points: 10, perAmount: 100, note: "Every delivered order", active: true }, { name: "First purchase", icon: "gift", points: 50, perAmount: 0, note: "First delivered order", active: true }], rewards: [{ id: "voucher-10", name: "10 TND voucher", icon: "voucher", cost: 100, note: "On the next order", active: true, redeemed: 0 }, { id: "free-delivery", name: "Free delivery", icon: "delivery", cost: 150, note: "One delivery", active: true, redeemed: 0 }], tiers: [{ name: "Member", threshold: 0, basis: "points", perk: null }, { name: "VIP", threshold: 500, basis: "points", perk: "Priority rewards" }], pointExpiryDays: 365 };

export async function getLoyaltyProgram(userId: string): Promise<LoyaltyProgram> {
  const config = await StudioConfig.findOne({ user: userId, key: "loyalty" }).lean();
  const program = (config?.data || DEFAULT_PROGRAM) as LoyaltyProgram;
  program.rewards = (program.rewards || []).map((reward, index) => ({ ...reward, id: reward.id || `legacy-${index}-${reward.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` }));
  return program;
}

async function updateTier(userId: string, customerId: unknown, program: LoyaltyProgram) {
  const customer = await StudioCustomer.findOne({ _id: customerId, user: userId }).select("points").lean();
  if (!customer) return;
  const tier = [...program.tiers].sort((a, b) => b.threshold - a.threshold).find((item) => customer.points >= item.threshold) || program.tiers[0];
  await StudioCustomer.updateOne({ _id: customerId, user: userId }, { $set: { tier: tier?.name || "Member" } });
}

export async function creditDeliveredOrder(userId: string, orderId: string) {
  const order = await StudioOrder.findOne({ _id: orderId, user: userId });
  if (!order || order.status !== "delivered") return { credited: 0 };
  const program = await getLoyaltyProgram(userId);
  if (!program.enabled) return { credited: 0 };
  const deliveredCount = await StudioOrder.countDocuments({ user: userId, customer: order.customer, status: "delivered", placedAt: { $lte: order.placedAt } });
  const entries: Array<Record<string, unknown>> = [];
  for (const [index, rule] of program.earnRules.entries()) {
    if (!rule.active) continue;
    const earned = rule.perAmount > 0
      ? Math.floor(Number(order.amount || 0) / rule.perAmount) * rule.points
      : deliveredCount === 1 ? rule.points : 0;
    if (earned <= 0) continue;
    entries.push({ user: userId, customer: order.customer, order: order._id, type: "earned", points: earned, description: rule.name, idempotencyKey: `order:${order._id}:rule:${index}`, createdBy: "system" });
  }
  const existingKeys = new Set((await StudioLoyaltyTransaction.find({ user: userId, idempotencyKey: { $in: entries.map((entry) => entry.idempotencyKey) } }).select("idempotencyKey").lean()).map((item) => item.idempotencyKey));
  const pending = entries.filter((entry) => !existingKeys.has(String(entry.idempotencyKey)));
  const total = pending.reduce((sum, entry) => sum + Number(entry.points), 0);
  if (!total) return { credited: 0 };
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await StudioLoyaltyTransaction.insertMany(pending, { session });
      await StudioCustomer.updateOne({ _id: order.customer, user: userId }, { $inc: { points: total } }, { session });
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) return { credited: 0 };
    throw error;
  } finally { await session.endSession(); }
  await updateTier(userId, order.customer, program);
  return { credited: total };
}

export async function reconcileOrderRewards(userId: string, orderId: string) {
  const order = await StudioOrder.findOne({ _id: orderId, user: userId });
  if (!order) return { credited: 0, reversed: 0 };
  const invalidPayment = ["unpaid", "failed", "refunded", "cancelled"].includes(String(order.paymentStatus || "").toLowerCase());
  if (order.status === "delivered" && !invalidPayment) return { ...(await creditDeliveredOrder(userId, orderId)), reversed: 0 };
  const earned = await StudioLoyaltyTransaction.find({ user: userId, order: orderId, type: "earned" }).lean();
  const reversedKeys = new Set((await StudioLoyaltyTransaction.find({ user: userId, idempotencyKey: { $in: earned.map((transaction) => `reversal:${transaction._id}`) } }).select("idempotencyKey").lean()).map((item) => item.idempotencyKey));
  const pending = earned.filter((transaction) => !reversedKeys.has(`reversal:${transaction._id}`));
  const reversed = pending.reduce((sum, transaction) => sum + transaction.points, 0);
  if (!reversed) return { credited: 0, reversed: 0 };
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await StudioLoyaltyTransaction.insertMany(pending.map((transaction) => ({ user: userId, customer: transaction.customer, order: orderId, type: "reversal", points: -transaction.points, description: `Reversal: ${transaction.description}`, idempotencyKey: `reversal:${transaction._id}`, createdBy: "system" })), { session });
      await StudioCustomer.updateOne({ _id: order.customer, user: userId }, [{ $set: { points: { $max: [0, { $subtract: ["$points", reversed] }] } } }], { session });
    });
  } finally { await session.endSession(); }
  await updateTier(userId, order.customer, await getLoyaltyProgram(userId));
  return { credited: 0, reversed };
}

export async function redeemReward(userId: string, customerId: string, rewardId: string) {
  const program = await getLoyaltyProgram(userId);
  const rewardIndex = program.rewards.findIndex((item) => item.id === rewardId);
  const reward = program.rewards[rewardIndex];
  if (!reward?.active) throw Object.assign(new Error("Reward is not available"), { status: 400 });
  const session = await mongoose.startSession();
  try {
    let result: { points: number; redemption: unknown } | null = null;
    await session.withTransaction(async () => {
      const customer = await StudioCustomer.findOneAndUpdate({ _id: customerId, user: userId, points: { $gte: reward.cost } }, { $inc: { points: -reward.cost } }, { new: true, session });
      if (!customer) throw Object.assign(new Error("Customer does not have enough points"), { status: 409 });
      const [transaction] = await StudioLoyaltyTransaction.create([{ user: userId, customer: customer._id, type: "redeemed", points: -reward.cost, description: `Redeemed ${reward.name}`, rewardName: reward.name, idempotencyKey: `redemption:${randomUUID()}`, createdBy: "shop" }], { session });
      const [redemption] = await StudioRewardRedemption.create([{ user: userId, customer: customer._id, transaction: transaction._id, rewardName: reward.name, rewardId: reward.id, pointsCost: reward.cost }], { session });
      await StudioConfig.updateOne({ user: userId, key: "loyalty" }, { $inc: { [`data.rewards.${rewardIndex}.redeemed`]: 1 } }, { session });
      result = { points: customer.points, redemption };
    });
    await updateTier(userId, customerId, program);
    return result!;
  } finally { await session.endSession(); }
}

export async function updateRedemption(userId: string, redemptionId: string, action: "fulfill" | "cancel") {
  const session = await mongoose.startSession();
  try {
    let updated = null;
    await session.withTransaction(async () => {
      const redemption = await StudioRewardRedemption.findOne({ _id: redemptionId, user: userId, status: "issued" }).session(session);
      if (!redemption) throw Object.assign(new Error("Issued redemption not found"), { status: 404 });
      if (action === "fulfill") { redemption.status = "fulfilled"; redemption.fulfilledAt = new Date(); await redemption.save({ session }); updated = redemption; return; }
      const [transaction] = await StudioLoyaltyTransaction.create([{ user: userId, customer: redemption.customer, type: "adjustment", points: redemption.pointsCost, description: `Cancelled redemption: ${redemption.rewardName}`, rewardName: redemption.rewardName, idempotencyKey: `redemption-cancel:${redemption._id}`, createdBy: "shop" }], { session });
      await StudioCustomer.updateOne({ _id: redemption.customer, user: userId }, { $inc: { points: redemption.pointsCost } }, { session });
      redemption.status = "cancelled"; redemption.fulfilledAt = null; redemption.cancellationTransaction = transaction._id; await redemption.save({ session }); updated = redemption;
    });
    return { redemption: updated };
  } finally { await session.endSession(); }
}
