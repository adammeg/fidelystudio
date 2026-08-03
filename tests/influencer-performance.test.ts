import { describe, expect, it } from "vitest";
import { influencerProfitability } from "../src/lib/influencer-performance";

describe("influencer campaign profitability", () => {
  it("recommends continuing only when delivered revenue exceeds spend", () => {
    expect(influencerProfitability(650, 400)).toMatchObject({ profitable: true, roiPct: 63, label: "Worth continuing" });
    expect(influencerProfitability(250, 400)).toMatchObject({ profitable: false, roiPct: -37, label: "Below budget" });
  });

  it("does not invent ROI when no budget or revenue exists", () => {
    expect(influencerProfitability(0, 0)).toEqual({ profitable: false, roiPct: null, label: "Needs data", level: "nd" });
  });
});
