// Canonical Fidely demo dataset (design brief A10).
// Numbers must reconcile across all screens. Phase 1: static mock data only.

export const store = {
  name: "Maison Leïla",
  platform: "Converty store",
  initial: "M",
};

export type ChartKey = "sales" | "delivered" | "cost" | "customers";

export interface ChartSeries {
  label: string;
  unit: string;
  total: string;
  trend: string;
  color: string;
  fill: string;
  v: number[];
}

export const chartData: Record<ChartKey, ChartSeries> = {
  sales: {
    label: "Sales",
    unit: "TND",
    total: "12,400",
    trend: "+18%",
    color: "#C8744F",
    fill: "rgba(200,116,79,.16)",
    v: [
      210, 260, 180, 240, 320, 360, 290, 340, 410, 380, 300, 440, 520, 480, 360,
      420, 560, 610, 540, 470, 600, 680, 560, 520, 640, 720, 690, 610, 740, 820,
    ],
  },
  delivered: {
    label: "Delivered orders",
    unit: "orders",
    total: "184",
    trend: "+11%",
    color: "#7C5A43",
    fill: "rgba(124,90,67,.14)",
    v: [
      3, 4, 3, 5, 6, 5, 4, 6, 7, 6, 5, 7, 8, 7, 6, 7, 9, 9, 8, 7, 9, 10, 8, 7, 9,
      10, 9, 8, 10, 11,
    ],
  },
  cost: {
    label: "Cost",
    unit: "TND",
    total: "2,100",
    trend: "+6%",
    color: "#C98A2B",
    fill: "rgba(201,138,43,.15)",
    v: [
      40, 45, 38, 50, 60, 58, 48, 62, 70, 66, 55, 72, 80, 76, 62, 70, 88, 92, 84,
      76, 90, 100, 86, 78, 96, 104, 98, 88, 100, 110,
    ],
  },
  customers: {
    label: "New customers",
    unit: "customers",
    total: "96",
    trend: "+9%",
    color: "#3E8E5A",
    fill: "rgba(62,142,90,.14)",
    v: [
      2, 2, 1, 3, 3, 2, 2, 3, 4, 3, 2, 4, 4, 3, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4,
      5, 4, 4, 5, 5,
    ],
  },
};

export const chartXLabels = ["May 9", "May 15", "May 21", "May 27", "Jun 2", "Jun 7"];

export interface TopCampaign {
  name: string;
  tag: string;
  state: "Active" | "Finished" | "Scheduled";
  stateNote: string;
  stateDot: string;
  earned: string | null;
  spent: string | null;
  result: { label: string; cls: string; dot: string };
}

export const topCampaigns: TopCampaign[] = [
  {
    name: "Ramadan Collection",
    tag: "Influencer",
    state: "Active",
    stateNote: "This period",
    stateDot: "#3E8E5A",
    earned: "10,000",
    spent: "1,260",
    result: { label: "Highly profitable", cls: "c-hp", dot: "#3E8E5A" },
  },
  {
    name: "New Skincare Launch",
    tag: "Loyalty",
    state: "Active",
    stateNote: "This period",
    stateDot: "#3E8E5A",
    earned: "1,600",
    spent: "280",
    result: { label: "Profitable", cls: "c-pr", dot: "#5BA877" },
  },
  {
    name: "Back to School",
    tag: "Referral",
    state: "Finished",
    stateNote: "April · earlier period",
    stateDot: "#A99E90",
    earned: "4,800",
    spent: "720",
    result: { label: "Profitable", cls: "c-pr", dot: "#5BA877" },
  },
  {
    name: "Summer Drop",
    tag: "Influencer",
    state: "Scheduled",
    stateNote: "Starts in July",
    stateDot: "#C98A2B",
    earned: null,
    spent: null,
    result: { label: "Not enough data", cls: "c-nd", dot: "#A99E90" },
  },
];

export interface TopInfluencer {
  handle: string;
  avatarBg: string;
  initial: string;
  platform: string;
  code: string;
  earned: string;
  toPay: string | null;
  paid: boolean;
}

export const topInfluencers: TopInfluencer[] = [
  {
    handle: "@Sarra",
    avatarBg: "#C8744F",
    initial: "S",
    platform: "Instagram",
    code: "SARRA10",
    earned: "6,800",
    toPay: "544 TND",
    paid: false,
  },
  {
    handle: "@Aya",
    avatarBg: "#7C5A43",
    initial: "A",
    platform: "TikTok",
    code: "AYA10",
    earned: "2,450",
    toPay: "196 TND",
    paid: false,
  },
  {
    handle: "@Meriem",
    avatarBg: "#B0896B",
    initial: "M",
    platform: "Instagram",
    code: "MERIEM10",
    earned: "580",
    toPay: null,
    paid: true,
  },
];

export interface SegmentRow {
  count: string;
  shortLabel: string;
  name: string;
  rule: string;
}

export const segmentsToActivate: SegmentRow[] = [
  {
    count: "128",
    shortLabel: "at-risk",
    name: "At-risk customers",
    rule: "No delivered order in the last 60 days",
  },
  {
    count: "312",
    shortLabel: "close",
    name: "Close to a reward",
    rule: "Within 100 points of their next reward",
  },
  {
    count: "96",
    shortLabel: "via inf.",
    name: "Influencer-acquired",
    rule: "First delivered order came from an influencer code",
  },
  {
    count: "342",
    shortLabel: "dormant",
    name: "Dormant customers",
    rule: "Bought before, no delivered order in 90+ days",
  },
];

export interface RewardRow {
  name: string;
  icon: "voucher" | "delivery" | "star";
  redeemed: number;
  pct: number;
}

export const topRewards: RewardRow[] = [
  { name: "10 TND off voucher", icon: "voucher", redeemed: 142, pct: 100 },
  { name: "Free delivery", icon: "delivery", redeemed: 88, pct: 62 },
  { name: "Double points weekend", icon: "star", redeemed: 64, pct: 45 },
];

export const advancedMetrics = [
  { label: "CAC", sub: "Cost per acquired customer", value: "21.9 TND" },
  { label: "ROAS", sub: "Return on spend", value: "5.9×" },
  { label: "Attribution window", sub: "Order → delivery", value: "14 days" },
  { label: "Delivery rate", sub: "Delivered ÷ placed", value: "68%" },
];

/* =========================================================
   Influence & Referral (B11 / B12 / B10)
   ========================================================= */

export interface ResultChip {
  label: string;
  cls: string;
  dot: string;
}

export interface InfluencerCampaignRow {
  name: string;
  slug: string | null;
  tag: string;
  state: "Active" | "Finished" | "Scheduled";
  stateNote: string;
  stateDot: string;
  avatars: { initial: string; bg: string }[];
  infCount: string;
  placed: string | null;
  delivered: string | null;
  deliveredPct: number | null;
  deliveredFrac: string | null;
  earned: string | null;
  spent: string | null;
  result: ResultChip;
}

export const influencerCampaigns: InfluencerCampaignRow[] = [
  {
    name: "Ramadan Collection",
    slug: "ramadan-collection",
    tag: "Influencer",
    state: "Active",
    stateNote: "This period",
    stateDot: "#3E8E5A",
    avatars: [
      { initial: "S", bg: "#C8744F" },
      { initial: "A", bg: "#7C5A43" },
      { initial: "M", bg: "#B0896B" },
      { initial: "Y", bg: "#A99E90" },
    ],
    infCount: "4",
    placed: "195",
    delivered: "133",
    deliveredPct: 68,
    deliveredFrac: "68% delivered",
    earned: "10,000",
    spent: "1,260",
    result: { label: "Highly profitable", cls: "c-hp", dot: "#3E8E5A" },
  },
  {
    name: "New Skincare Launch",
    slug: null,
    tag: "Influencer",
    state: "Active",
    stateNote: "This period",
    stateDot: "#3E8E5A",
    avatars: [
      { initial: "L", bg: "#C8744F" },
      { initial: "N", bg: "#7C5A43" },
    ],
    infCount: "2",
    placed: "46",
    delivered: "31",
    deliveredPct: 67,
    deliveredFrac: "67% delivered",
    earned: "1,600",
    spent: "280",
    result: { label: "Profitable", cls: "c-pr", dot: "#5BA877" },
  },
  {
    name: "Back to School",
    slug: null,
    tag: "Influencer",
    state: "Finished",
    stateNote: "April · earlier period",
    stateDot: "#A99E90",
    avatars: [
      { initial: "K", bg: "#7C5A43" },
      { initial: "R", bg: "#B0896B" },
      { initial: "H", bg: "#A99E90" },
    ],
    infCount: "3",
    placed: "120",
    delivered: "84",
    deliveredPct: 70,
    deliveredFrac: "70% delivered",
    earned: "4,800",
    spent: "720",
    result: { label: "Profitable", cls: "c-pr", dot: "#5BA877" },
  },
  {
    name: "Summer Drop",
    slug: null,
    tag: "Influencer",
    state: "Scheduled",
    stateNote: "Starts in July",
    stateDot: "#C98A2B",
    avatars: [
      { initial: "D", bg: "#C8744F" },
      { initial: "F", bg: "#7C5A43" },
    ],
    infCount: "2 invited",
    placed: null,
    delivered: null,
    deliveredPct: null,
    deliveredFrac: null,
    earned: null,
    spent: null,
    result: { label: "Not enough data", cls: "c-nd", dot: "#A99E90" },
  },
];

/* =========================================================
   Customers — Segments (B3)
   ========================================================= */

export interface SegmentCard {
  name: string;
  icon: string;
  rule: string;
  count: string;
  stats: { l: string; v: string }[];
  rec: string;
}

export const customerSegments: SegmentCard[] = [
  {
    name: "VIP customers",
    icon: "crown",
    rule: "High-value repeat buyers with several delivered orders.",
    count: "214",
    stats: [
      { l: "Sales generated", v: "38,600" },
      { l: "Avg basket", v: "180 TND" },
      { l: "Last activity", v: "3 days ago" },
    ],
    rec: "Reward loyalty with an exclusive VIP perk",
  },
  {
    name: "At-risk customers",
    icon: "warning",
    rule: "No delivered order in the last 60 days.",
    count: "128",
    stats: [
      { l: "Sales generated", v: "14,200" },
      { l: "Avg basket", v: "95 TND" },
      { l: "Last delivered", v: "64 days ago" },
    ],
    rec: "Send a WhatsApp comeback offer",
  },
  {
    name: "Dormant customers",
    icon: "moon",
    rule: "Bought before, no delivered order in 90+ days.",
    count: "342",
    stats: [
      { l: "Sales generated", v: "22,800" },
      { l: "Avg basket", v: "78 TND" },
      { l: "Last delivered", v: "4 months ago" },
    ],
    rec: "Launch a reactivation campaign",
  },
  {
    name: "High basket customers",
    icon: "bag",
    rule: "Average delivered order value above store average.",
    count: "89",
    stats: [
      { l: "Sales generated", v: "26,400" },
      { l: "Avg basket", v: "240 TND" },
      { l: "Last activity", v: "6 days ago" },
    ],
    rec: "Offer premium rewards instead of discounts",
  },
  {
    name: "Close to a reward",
    icon: "star",
    rule: "Within 100 points of their next reward.",
    count: "312",
    stats: [
      { l: "Sales generated", v: "19,500" },
      { l: "Avg basket", v: "110 TND" },
      { l: "Last activity", v: "8 days ago" },
    ],
    rec: "Launch a double-points weekend",
  },
  {
    name: "Referral champions",
    icon: "network",
    rule: "Referred at least 2 friends with delivered orders.",
    count: "47",
    stats: [
      { l: "Sales generated", v: "9,800" },
      { l: "Avg basket", v: "130 TND" },
      { l: "Last activity", v: "5 days ago" },
    ],
    rec: "Give them a stronger referral perk",
  },
  {
    name: "Influencer-acquired",
    icon: "megaphone",
    rule: "First delivered order came from an influencer code.",
    count: "96",
    stats: [
      { l: "Sales generated", v: "11,600" },
      { l: "Avg basket", v: "120 TND" },
      { l: "Last activity", v: "7 days ago" },
    ],
    rec: "Turn them into referrers with a WhatsApp offer",
  },
];

/* =========================================================
   Customers — All customers + cohorts
   ========================================================= */

export interface CustomerRow {
  name: string;
  initials: string;
  avBg: string;
  phone: string;
  source: { s1: string; s2?: string };
  placed: string;
  delivered: string;
  refused: string;
  refusedZero?: boolean;
  spent: string;
  points: string;
  status: { label: string; cls: string; dot: string };
  lastDelivered: string;
}

export const customerRows: CustomerRow[] = [
  {
    name: "Ines Ben Salah",
    initials: "IB",
    avBg: "#C8744F",
    phone: "+216 22 415 •••",
    source: { s1: "@Sarra", s2: "Ramadan Collection" },
    placed: "3",
    delivered: "2",
    refused: "1",
    spent: "240",
    points: "145",
    status: { label: "New", cls: "t-new", dot: "#A99E90" },
    lastDelivered: "7 days ago",
  },
  {
    name: "Mouna Trabelsi",
    initials: "MT",
    avBg: "#7C5A43",
    phone: "+216 29 884 •••",
    source: { s1: "Referral" },
    placed: "7",
    delivered: "6",
    refused: "1",
    spent: "680",
    points: "420",
    status: { label: "Silver", cls: "t-silver", dot: "#8C8073" },
    lastDelivered: "2 days ago",
  },
  {
    name: "Salma Gharbi",
    initials: "SG",
    avBg: "#C8744F",
    phone: "+216 21 770 •••",
    source: { s1: "Organic" },
    placed: "12",
    delivered: "10",
    refused: "2",
    spent: "1,240",
    points: "910",
    status: { label: "Gold", cls: "t-gold", dot: "#C98A2B" },
    lastDelivered: "1 day ago",
  },
  {
    name: "Karim Belhadj",
    initials: "KB",
    avBg: "#B0896B",
    phone: "+216 50 339 •••",
    source: { s1: "@Aya", s2: "Ramadan Collection" },
    placed: "4",
    delivered: "3",
    refused: "1",
    spent: "390",
    points: "230",
    status: { label: "Silver", cls: "t-silver", dot: "#8C8073" },
    lastDelivered: "4 days ago",
  },
  {
    name: "Rania Jelassi",
    initials: "RJ",
    avBg: "#7C5A43",
    phone: "+216 24 661 •••",
    source: { s1: "Organic" },
    placed: "1",
    delivered: "1",
    refused: "0",
    refusedZero: true,
    spent: "95",
    points: "95",
    status: { label: "New", cls: "t-new", dot: "#A99E90" },
    lastDelivered: "11 days ago",
  },
  {
    name: "Yassine M.",
    initials: "YM",
    avBg: "#A99E90",
    phone: "+216 55 102 •••",
    source: { s1: "Facebook", s2: "YASS10" },
    placed: "2",
    delivered: "1",
    refused: "1",
    spent: "80",
    points: "80",
    status: { label: "New", cls: "t-new", dot: "#A99E90" },
    lastDelivered: "18 days ago",
  },
];

export interface CohortRow {
  source: string;
  customers: string;
  secondDelivered: string;
  repeatPct: number;
  repeatBarColor?: string;
  revenue: string;
  action: string;
}

export const cohortRows: CohortRow[] = [
  {
    source: "Influencer-acquired",
    customers: "96",
    secondDelivered: "34",
    repeatPct: 35,
    revenue: "11,600",
    action: "Send referral offer",
  },
  {
    source: "Referral-acquired",
    customers: "74",
    secondDelivered: "31",
    repeatPct: 42,
    revenue: "7,400",
    action: "Reward top referrers",
  },
  {
    source: "Organic",
    customers: "1,120",
    secondDelivered: "460",
    repeatPct: 41,
    revenue: "68,000",
    action: "Push loyalty rewards",
  },
  {
    source: "Campaign-acquired",
    customers: "210",
    secondDelivered: "58",
    repeatPct: 28,
    repeatBarColor: "#C98A2B",
    revenue: "14,800",
    action: "Reactivate with WhatsApp",
  },
];

export interface MonthCohortRow {
  month: string;
  young?: boolean;
  newCustomers: string;
  second: string;
  secondMuted?: boolean;
  third: string;
  thirdMuted?: boolean;
  repeatPct: number;
  repeatBarColor?: string;
  repeatPctMuted?: boolean;
  sales: string;
}

export const monthCohorts: MonthCohortRow[] = [
  {
    month: "March",
    newCustomers: "420",
    second: "178",
    third: "74",
    repeatPct: 42,
    sales: "32,400",
  },
  {
    month: "April",
    newCustomers: "390",
    second: "152",
    third: "58",
    repeatPct: 39,
    sales: "28,900",
  },
  {
    month: "May",
    newCustomers: "360",
    second: "118",
    third: "32",
    repeatPct: 33,
    sales: "21,700",
  },
  {
    month: "June",
    young: true,
    newCustomers: "96",
    second: "18",
    secondMuted: true,
    third: "4",
    thirdMuted: true,
    repeatPct: 19,
    repeatBarColor: "#A99E90",
    repeatPctMuted: true,
    sales: "6,200",
  },
];

export interface InfluencerLite {
  handle: string;
  initial: string;
  bg: string;
  platform: string;
  code: string;
  delivered: string;
  deliveredPct: number;
  deliveredBarColor?: string;
  placedNote: string;
  earned: string;
  payout: { paid: boolean; amount?: string };
}

export interface CampaignDetailInfluencer {
  handle: string;
  initial: string;
  bg: string;
  platform: string;
  code: string;
  link: string;
  placed: string;
  delivered: string;
  deliveredPct: number;
  deliveredBarColor?: string;
  deliveredFrac: string;
  earned: string;
  payout: { paid: boolean; amount?: string };
  result: ResultChip;
}

export const campaignDetail = {
  slug: "ramadan-collection",
  name: "Ramadan Collection",
  state: { label: "Active", cls: "c-pr", dot: "#3E8E5A" },
  meta: [
    { label: "Budget", value: "1,500 TND" },
    { label: "Customer discount", value: "−10%" },
    { label: "Commission", value: "8%" },
    { label: "Duration", value: "Last 30 days" },
    { label: "Goal", value: "New customers" },
  ],
  influencers: [
    {
      handle: "@Sarra",
      initial: "S",
      bg: "#C8744F",
      platform: "Instagram",
      code: "SARRA10",
      link: "fid.ly/sarra10",
      placed: "112",
      delivered: "83",
      deliveredPct: 74,
      deliveredFrac: "74% delivered",
      earned: "6,800",
      payout: { paid: false, amount: "544 TND" },
      result: { label: "Highly profitable", cls: "c-hp", dot: "#3E8E5A" },
    },
    {
      handle: "@Aya",
      initial: "A",
      bg: "#7C5A43",
      platform: "TikTok",
      code: "AYA10",
      link: "fid.ly/aya10",
      placed: "54",
      delivered: "38",
      deliveredPct: 70,
      deliveredFrac: "70% delivered",
      earned: "2,450",
      payout: { paid: false, amount: "196 TND" },
      result: { label: "Profitable", cls: "c-pr", dot: "#5BA877" },
    },
    {
      handle: "@Meriem",
      initial: "M",
      bg: "#B0896B",
      platform: "Instagram",
      code: "MERIEM10",
      link: "fid.ly/meriem10",
      placed: "21",
      delivered: "9",
      deliveredPct: 43,
      deliveredBarColor: "#C98A2B",
      deliveredFrac: "43% delivered",
      earned: "580",
      payout: { paid: true },
      result: { label: "Watch closely", cls: "c-wc", dot: "#C98A2B" },
    },
    {
      handle: "@Yassine",
      initial: "Y",
      bg: "#A99E90",
      platform: "Facebook",
      code: "YASS10",
      link: "fid.ly/yass10",
      placed: "8",
      delivered: "3",
      deliveredPct: 38,
      deliveredBarColor: "#A99E90",
      deliveredFrac: "38% delivered",
      earned: "170",
      payout: { paid: true },
      result: { label: "Not enough data", cls: "c-nd", dot: "#A99E90" },
    },
  ] as CampaignDetailInfluencer[],
};

export const topInfluencersTable: InfluencerLite[] = [
  {
    handle: "@Sarra",
    initial: "S",
    bg: "#C8744F",
    platform: "Instagram",
    code: "SARRA10",
    delivered: "83",
    deliveredPct: 74,
    placedNote: "of 112 placed",
    earned: "6,800",
    payout: { paid: false, amount: "544 TND" },
  },
  {
    handle: "@Aya",
    initial: "A",
    bg: "#7C5A43",
    platform: "TikTok",
    code: "AYA10",
    delivered: "38",
    deliveredPct: 70,
    placedNote: "of 54 placed",
    earned: "2,450",
    payout: { paid: false, amount: "196 TND" },
  },
  {
    handle: "@Meriem",
    initial: "M",
    bg: "#B0896B",
    platform: "Instagram",
    code: "MERIEM10",
    delivered: "9",
    deliveredPct: 43,
    deliveredBarColor: "#C98A2B",
    placedNote: "of 21 placed",
    earned: "580",
    payout: { paid: true },
  },
];
