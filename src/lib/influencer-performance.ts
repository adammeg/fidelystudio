export function influencerProfitability(revenue: number, budget: number) {
  const safeRevenue = Math.max(0, Number(revenue) || 0);
  const safeBudget = Math.max(0, Number(budget) || 0);
  const profitable = safeRevenue > safeBudget;
  const roiPct = safeBudget > 0 ? Math.round(((safeRevenue - safeBudget) / safeBudget) * 100) : null;
  return {
    profitable,
    roiPct,
    label: profitable ? "Worth continuing" : safeRevenue > 0 ? "Below budget" : "Needs data",
    level: profitable ? "pr" : safeRevenue > 0 ? "wc" : "nd",
  } as const;
}
