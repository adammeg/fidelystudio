import { randomUUID } from "node:crypto";
import { StudioConfig, StudioCustomer, StudioLoyaltyTransaction, StudioOrder, StudioRewardRedemption } from "./models";
type LoyaltyProgram = { enabled: boolean; earnRules: { name: string; icon: string; points: number; perAmount: number; note: string | null; active: boolean }[]; rewards: { name: string; icon: string; cost: number; note: string | null; active: boolean; redeemed: number }[]; tiers: { name: string; threshold: number; basis: string; perk: string | null }[]; pointExpiryDays: number };
const DEFAULT_PROGRAM: LoyaltyProgram = { enabled: true, earnRules: [{ name: "Delivered order", icon: "cart", points: 10, perAmount: 100, note: "Every delivered order", active: true }, { name: "First purchase", icon: "gift", points: 50, perAmount: 0, note: "First delivered order", active: true }], rewards: [{ name: "10 TND voucher", icon: "voucher", cost: 100, note: "On the next order", active: true, redeemed: 0 }, { name: "Free delivery", icon: "delivery", cost: 150, note: "One delivery", active: true, redeemed: 0 }], tiers: [{ name: "Member", threshold: 0, basis: "points", perk: null }, { name: "VIP", threshold: 500, basis: "points", perk: "Priority rewards" }], pointExpiryDays: 365 };

export async function getLoyaltyProgram(userId: string): Promise<LoyaltyProgram> {
  const config = await StudioConfig.findOne({ user: userId, key: "loyalty" }).lean();
  return (config?.data || DEFAULT_PROGRAM) as LoyaltyProgram;
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
  let total = 0;
  for (const [index, rule] of program.earnRules.entries()) {
    if (!rule.active) continue;
    const earned = rule.perAmount > 0
      ? Math.floor(Number(order.amount || 0) / rule.perAmount) * rule.points
      : deliveredCount === 1 ? rule.points : 0;
    if (earned <= 0) continue;
    try {
      await StudioLoyaltyTransaction.create({ user: userId, customer: order.customer, order: order._id, type: "earned", points: earned, description: rule.name, idempotencyKey: `order:${order._id}:rule:${index}`, createdBy: "system" });
      total += earned;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    }
  }
  if (total) {
    await StudioCustomer.updateOne({ _id: order.customer, user: userId }, { $inc: { points: total } });
    await updateTier(userId, order.customer, program);
  }
  return { credited: total };
}

export async function reconcileOrderRewards(userId: string, orderId: string) {
  const order = await StudioOrder.findOne({ _id: orderId, user: userId });
  if (!order) return { credited: 0, reversed: 0 };
  const invalidPayment = ["unpaid", "failed", "refunded", "cancelled"].includes(String(order.paymentStatus || "").toLowerCase());
  if (order.status === "delivered" && !invalidPayment) return { ...(await creditDeliveredOrder(userId, orderId)), reversed: 0 };
  const earned = await StudioLoyaltyTransaction.find({ user: userId, order: orderId, type: "earned" }).lean();
  let reversed = 0;
  for (const transaction of earned) {
    try {
      await StudioLoyaltyTransaction.create({ user: userId, customer: transaction.customer, order: orderId, type: "reversal", points: -transaction.points, description: `Reversal: ${transaction.description}`, idempotencyKey: `reversal:${transaction._id}`, createdBy: "system" });
      await StudioCustomer.updateOne({ _id: transaction.customer, user: userId }, { $inc: { points: -transaction.points } });
      await updateTier(userId, transaction.customer, await getLoyaltyProgram(userId));
      reversed += transaction.points;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    }
  }
  return { credited: 0, reversed };
}

export async function redeemReward(userId: string, customerId: string, rewardIndex: number) {
  const program = await getLoyaltyProgram(userId);
  const reward = program.rewards[rewardIndex];
  if (!reward?.active) throw Object.assign(new Error("Reward is not available"), { status: 400 });
  const customer = await StudioCustomer.findOneAndUpdate({ _id: customerId, user: userId, points: { $gte: reward.cost } }, { $inc: { points: -reward.cost } }, { new: true });
  if (!customer) throw Object.assign(new Error("Customer does not have enough points"), { status: 409 });
  try {
    const transaction = await StudioLoyaltyTransaction.create({ user: userId, customer: customer._id, type: "redeemed", points: -reward.cost, description: `Redeemed ${reward.name}`, rewardName: reward.name, idempotencyKey: `redemption:${randomUUID()}`, createdBy: "shop" });
    const redemption = await StudioRewardRedemption.create({ user: userId, customer: customer._id, transaction: transaction._id, rewardName: reward.name, pointsCost: reward.cost });
    await StudioConfig.updateOne({ user: userId, key: "loyalty" }, { $inc: { [`data.rewards.${rewardIndex}.redeemed`]: 1 } });
    await updateTier(userId, customer._id, program);
    return { points: customer.points, redemption };
  } catch (error) {
    await StudioCustomer.updateOne({ _id: customer._id }, { $inc: { points: reward.cost } });
    throw error;
  }
}
