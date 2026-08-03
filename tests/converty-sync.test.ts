import { describe, expect, it } from "vitest";
import { deliveredAt, normalizedStatus, promoSnapshot } from "../src/server/converty-sync";

describe("Converty order mapping", () => {
  it.each([
    ["pending", "pending"],
    ["confirmed", "confirmed"],
    ["in transit", "in_transit"],
    ["delivered", "delivered"],
    ["rejected", "refused"],
    ["returned", "returned"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizedStatus({ _id: "1", status: input })).toBe(expected);
  });

  it("treats archived orders as cancelled", () => {
    expect(normalizedStatus({ _id: "1", status: "confirmed", archived: true })).toBe(
      "cancelled"
    );
  });

  it("uses the latest delivered history timestamp", () => {
    const result = deliveredAt({
      _id: "1",
      status: "delivered",
      history: [
        { status: "delivered", timestamp: 1000 },
        { status: "returned", timestamp: 2000 },
        { status: "delivered", timestamp: 3000 },
      ],
    });
    expect(result?.getTime()).toBe(3000);
  });

  it("does not invent a delivery date for a non-delivered order", () => {
    expect(deliveredAt({ _id: "1", status: "confirmed" })).toBeNull();
  });

  it("normalizes the documented Converty promo-code snapshot", () => {
    expect(promoSnapshot({ _id: "1", total: { promoCode: { couponId: "coupon-1", code: " adam10 ", discountType: "percentage", discountValue: 10, amount: 8, freeShipping: true } } })).toEqual({
      code: "ADAM10", couponId: "coupon-1", discountType: "percentage", discountValue: 10, amount: 8, freeShipping: true,
    });
  });
});
