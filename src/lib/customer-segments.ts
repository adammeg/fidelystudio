export const SEGMENT_THRESHOLDS = {
  vipSpend: 1000,
  vipDeliveries: 2,
  atRiskDays: 60,
  dormantDays: 90,
  rewardMinPoints: 70,
  rewardCost: 100,
} as const;

export type SegmentKey = "vip" | "atRisk" | "dormant" | "highBasket" | "closeReward" | "influencerAcquired";

export type SegmentCustomer = {
  spent: number;
  delivered: number;
  points: number;
  lastDeliveredAt: Date | string | null;
  source?: { type?: string } | null;
};

export function averageBasket(customer: SegmentCustomer) {
  return customer.delivered > 0 ? customer.spent / customer.delivered : 0;
}

function daysSince(value: Date | string | null, now: Date) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.floor((now.getTime() - timestamp) / 86_400_000);
}

export function isInSegment(customer: SegmentCustomer, segment: SegmentKey, storeAvgBasket: number, now = new Date()) {
  const inactiveDays = daysSince(customer.lastDeliveredAt, now);
  switch (segment) {
    case "vip":
      return customer.delivered >= SEGMENT_THRESHOLDS.vipDeliveries && customer.spent >= SEGMENT_THRESHOLDS.vipSpend;
    case "atRisk":
      return inactiveDays !== null && inactiveDays >= SEGMENT_THRESHOLDS.atRiskDays && inactiveDays < SEGMENT_THRESHOLDS.dormantDays;
    case "dormant":
      return inactiveDays !== null && inactiveDays >= SEGMENT_THRESHOLDS.dormantDays;
    case "highBasket":
      return customer.delivered > 0 && averageBasket(customer) > storeAvgBasket;
    case "closeReward":
      return customer.points >= SEGMENT_THRESHOLDS.rewardMinPoints && customer.points < SEGMENT_THRESHOLDS.rewardCost;
    case "influencerAcquired":
      return customer.source?.type === "influencer";
  }
}

export function classifyCustomers<T extends SegmentCustomer>(customers: T[], now = new Date()) {
  const deliveredOrders = customers.reduce((sum, customer) => sum + customer.delivered, 0);
  const deliveredRevenue = customers.reduce((sum, customer) => sum + customer.spent, 0);
  const storeAvgBasket = deliveredOrders ? deliveredRevenue / deliveredOrders : 0;
  const keys: SegmentKey[] = ["vip", "atRisk", "dormant", "highBasket", "closeReward", "influencerAcquired"];
  const members = Object.fromEntries(keys.map((key) => [key, customers.filter((customer) => isInSegment(customer, key, storeAvgBasket, now))])) as Record<SegmentKey, T[]>;
  return { storeAvgBasket: Math.round(storeAvgBasket), members };
}
