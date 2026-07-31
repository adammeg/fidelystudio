export const PRODUCT_FEATURES = {
  dashboard: true,
  customers: true,
  segments: true,
  cohorts: true,
  settings: true,
  campaigns: false,
  influencers: false,
  referrals: false,
  loyalty: false,
  widgets: false,
  whatsappCampaigns: false,
} as const;

export const UNSUPPORTED_STUDIO_API_PREFIXES = [
  "campaigns",
  "influencers",
  "referral",
  "loyalty",
  "widgets",
] as const;

export function isUnsupportedStudioApi(path: string) {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return UNSUPPORTED_STUDIO_API_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}
