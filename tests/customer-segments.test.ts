import { describe, expect, it } from "vitest";
import { classifyCustomers, isInSegment, type SegmentCustomer } from "../src/lib/customer-segments";

const now = new Date("2026-08-02T12:00:00Z");
const customer = (overrides: Partial<SegmentCustomer> = {}): SegmentCustomer => ({
  spent: 0, delivered: 0, points: 0, lastDeliveredAt: null, source: { type: "direct" }, ...overrides,
});

describe("customer segment classification", () => {
  it("requires both repeat delivery and delivered revenue for VIP", () => {
    expect(isInSegment(customer({ spent: 1000, delivered: 2 }), "vip", 100, now)).toBe(true);
    expect(isInSegment(customer({ spent: 1000, delivered: 1 }), "vip", 100, now)).toBe(false);
    expect(isInSegment(customer({ spent: 999, delivered: 3 }), "vip", 100, now)).toBe(false);
  });

  it("keeps at-risk and dormant windows mutually exclusive", () => {
    const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
    expect(isInSegment(customer({ delivered: 1, lastDeliveredAt: daysAgo(59) }), "atRisk", 100, now)).toBe(false);
    expect(isInSegment(customer({ delivered: 1, lastDeliveredAt: daysAgo(60) }), "atRisk", 100, now)).toBe(true);
    expect(isInSegment(customer({ delivered: 1, lastDeliveredAt: daysAgo(89) }), "atRisk", 100, now)).toBe(true);
    expect(isInSegment(customer({ delivered: 1, lastDeliveredAt: daysAgo(90) }), "atRisk", 100, now)).toBe(false);
    expect(isInSegment(customer({ delivered: 1, lastDeliveredAt: daysAgo(90) }), "dormant", 100, now)).toBe(true);
    expect(isInSegment(customer(), "atRisk", 100, now)).toBe(false);
  });

  it("uses per-delivery basket rather than lifetime spend", () => {
    const result = classifyCustomers([
      customer({ spent: 300, delivered: 1 }),
      customer({ spent: 1200, delivered: 6 }),
    ], now);
    expect(result.storeAvgBasket).toBe(214);
    expect(result.members.highBasket).toHaveLength(1);
    expect(result.members.highBasket[0].spent).toBe(300);
  });

  it("applies reward and acquisition boundaries", () => {
    expect(isInSegment(customer({ points: 70 }), "closeReward", 100, now)).toBe(true);
    expect(isInSegment(customer({ points: 100 }), "closeReward", 100, now)).toBe(false);
    expect(isInSegment(customer({ source: { type: "influencer" } }), "influencerAcquired", 100, now)).toBe(true);
  });
});
