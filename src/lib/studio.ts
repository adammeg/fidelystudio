import "server-only";
import type { ApiSource } from "./format";
import { getSessionUser } from "./session";
import { studioGet } from "@/server/studio-service";

async function get<T>(path: string): Promise<T> {
  const user = await getSessionUser();
  const url = new URL(path, "http://fidely.local");
  return studioGet(user.id, url.pathname.replace(/^\/studio\//, ""), url.searchParams) as Promise<T>;
}

/* ---------- shared types ---------- */

export interface Series {
  v: number[];
  total: number;
  trend: number;
}

export interface ApiResult {
  label: string;
  level: "hp" | "pr" | "wc" | "nd" | "lo";
}

export interface ApiInfluencer {
  id: string;
  handle: string;
  platform: string;
  code: string;
  link: string | null;
  avatarBg: string;
  commissionPct: number;
  placed: number;
  delivered: number;
  deliveredPct: number;
  earned: number;
  commission: number;
  paidOut: number;
  toPay: number;
  paid: boolean;
  result: ApiResult;
}

export interface ApiCampaign {
  id: string;
  name: string;
  slug: string;
  type: string;
  state: string;
  goal: string;
  budget: number;
  customerDiscountPct: number;
  commissionPct: number;
  durationLabel: string | null;
  audienceCount: number;
  eligibleCount: number;
  message: string | null;
  influencers: { id: string; handle: string; initial: string; avatarBg: string }[];
  placed: number;
  delivered: number;
  deliveredPct: number;
  earned: number;
  spent: number;
  result: ApiResult;
}

export interface ApiSegments {
  storeAvgBasket: number;
  currency: string;
  counts: {
    vip: number;
    atRisk: number;
    dormant: number;
    closeReward: number;
    influencerAcquired: number;
    referralChampions: number;
    highBasket: number;
  };
}

export interface ConvertyStatus {
  connected: boolean;
  configured: boolean;
  store: {
    id: string;
    name: string | null;
    slug: string | null;
    domain: string | null;
    currency: string | null;
    country: string | null;
  } | null;
  lastSyncAt: string | null;
  lastSyncStartedAt: string | null;
  lastSyncError: string | null;
  lastSyncOrderCount: number;
  lastWebhookAt: string | null;
  lastDataAt: string | null;
  lastWebhookError: string | null;
  connectedAt: string | null;
  webhooksActive?: boolean;
  webhookScopesGranted: boolean;
  health: "healthy" | "attention" | "stale" | "disconnected";
}

export interface Overview {
  store: { name: string; logoUrl: string | null; currency: string };
  converty: {
    connected: boolean;
    storeName: string | null;
    lastSyncAt: string | null;
    connectedAt: string | null;
  };
  kpis: {
    sales: Series;
    delivered: Series;
    cost: Series;
    customers: Series;
    totalCustomers: number;
  };
  chart: { labels: string[]; series: { sales: Series; delivered: Series; cost: Series; customers: Series } };
  advanced: { cac: number; roas: number; attributionDays: number; deliveryRate: number };
  topCampaigns: ApiCampaign[];
  topInfluencers: ApiInfluencer[];
  segments: ApiSegments;
  topRewards: { name: string; icon: string; redeemed: number; pct: number }[];
}

export interface ApiCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: ApiSource;
  marketingConsent: { whatsapp: boolean; sms: boolean; email: boolean };
  points: number;
  tier: string;
  placed: number;
  delivered: number;
  refused: number;
  spent: number;
  lastDeliveredAt: string | null;
  firstDeliveredAt: string | null;
  createdAt: string;
}

export interface CustomerDetail {
  customer: ApiCustomer & { tags: string[]; note: string | null; referredBy: { name: string; phone: string } | null };
  stats: { placed: number; delivered: number; refused: number; spent: number; deliveryRate: number };
  orders: {
    id: string;
    reference: string | null;
    amount: number;
    status: string;
    source: { type: string; code?: string | null };
    pointsEarned: number;
    placedAt: string;
    deliveredAt: string | null;
  }[];
  referrals: { id: string; code: string; status: string; referred: { name?: string; phone?: string }; createdAt: string }[];
}

export interface ReferralProgram {
  enabled: boolean;
  friendReward: { type: string; value: number };
  referrerReward: { type: string; value: number };
  rewardTrigger: string;
  validationDelayDays: number;
  minOrderValue: number;
  whatsappMessage: string;
}

export interface ReferralData {
  program: ReferralProgram;
  stats: { totalReferrals: number; rewarded: number; pending: number; revenue: number; deliveredOrders: number; conversionPct: number };
}

export interface LoyaltyProgram {
  enabled: boolean;
  earnRules: { name: string; icon: string; points: number; perAmount: number; note: string | null; active: boolean }[];
  rewards: { _id?: string; name: string; icon: string; cost: number; note: string | null; active: boolean; redeemed: number }[];
  tiers: { name: string; threshold: number; basis: string; perk: string | null }[];
  pointExpiryDays: number;
}

export interface LoyaltyData {
  program: LoyaltyProgram;
  stats: { members: number; pointsOutstanding: number };
}

export interface WidgetConfig {
  widgets: Record<string, { enabled: boolean; placement: string | null }>;
  appearance: {
    primaryColor: string;
    accentColor: string;
    buttonStyle: string;
    cornerRadius: string;
    language: string;
    logoSynced: boolean;
  };
}

export interface CohortsData {
  currency: string;
  bySource: { source: string; customers: number; secondDelivered: number; repeatPct: number; revenue: number }[];
  byMonth: { month: string; monthKey: string; newCustomers: number; second: number; third: number; repeatPct: number; sales: number }[];
}
export interface WhatsAppStatus { configured: boolean; connected: boolean; status: "disconnected" | "connecting" | "connected"; phone: string | null; lastError: string | null; connectedAt?: string | null; lastWebhookAt?: string | null }

export interface AccountData {
  profile: { email: string; shopName: string; ownerName: string; currency: string };
  subscription: {
    plan: "fidely";
    price: { amount: 50; currency: "TND"; interval: "month" };
    status: "active" | "trialing" | "restricted";
    rawStatus: string;
    trialEndsAt: string;
    currentPeriodEndsAt: string | null;
    customerCount: number;
    billingConfigured: boolean;
    entitlements: { customerLimit: number; stores: number; csvExport: boolean; campaigns: boolean; teamMembers: number };
  };
  onboarding: { profileComplete: boolean; storeConnected: boolean; firstSyncComplete: boolean };
}

/* ---------- fetchers ---------- */

export const getOverview = (days = 30) => get<Overview>(`/studio/overview?days=${days}`);
export const getConvertyStatus = () => get<ConvertyStatus>("/studio/converty/status");
export const getWhatsAppStatus = () => get<WhatsAppStatus>("/studio/whatsapp/status");
export const getAccount = () => get<AccountData>("/studio/account");
export const getInfluencers = () => get<{ influencers: ApiInfluencer[] }>("/studio/influencers");
export const getCampaigns = () => get<{ campaigns: ApiCampaign[] }>("/studio/campaigns");
export const getCampaign = (slug: string) =>
  get<{ campaign: ApiCampaign; totals: { placed: number; delivered: number; deliveredPct: number; earned: number; spent: number }; influencers: ApiInfluencer[] }>(
    `/studio/campaigns/${encodeURIComponent(slug)}`
  );
export const getReferral = () => get<ReferralData>("/studio/referral");
export const getCustomers = (qs = "") => get<{ customers: ApiCustomer[]; currency: string }>(`/studio/customers${qs}`);
export const getCustomer = (id: string) => get<CustomerDetail>(`/studio/customers/${encodeURIComponent(id)}`);
export const getSegments = () => get<ApiSegments>("/studio/segments");
export const getCohorts = (qs = "") => get<CohortsData>(`/studio/cohorts${qs}`);
export const getLoyalty = () => get<LoyaltyData>("/studio/loyalty");
export const getLoyaltyCustomers = () => get<{ customers: ApiCustomer[] }>("/studio/loyalty/customers");
export const getWidgets = () => get<{ config: WidgetConfig }>("/studio/widgets");
