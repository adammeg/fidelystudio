// Presentation helpers that turn raw API data into the view shapes the
// screens already use (chip classes, avatar colors, formatted numbers, …).

export function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["#C8744F", "#7C5A43", "#B0896B", "#A99E90", "#3E8E5A", "#C98A2B"];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export type ResultLevel = "hp" | "pr" | "wc" | "nd" | "lo";

export function resultChip(level: ResultLevel, label: string) {
  const map: Record<ResultLevel, { cls: string; dot: string }> = {
    hp: { cls: "c-hp", dot: "#3E8E5A" },
    pr: { cls: "c-pr", dot: "#5BA877" },
    wc: { cls: "c-wc", dot: "#C98A2B" },
    nd: { cls: "c-nd", dot: "#A99E90" },
    lo: { cls: "c-pay", dot: "#C2603C" },
  };
  return { ...(map[level] || map.nd), label };
}

export function tierChip(tier: string) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    new: { label: "New", cls: "t-new", dot: "#A99E90" },
    silver: { label: "Silver", cls: "t-silver", dot: "#8C8073" },
    gold: { label: "Gold", cls: "t-gold", dot: "#C98A2B" },
    vip: { label: "VIP", cls: "t-gold", dot: "#7C5A43" },
  };
  return map[tier] || map.new;
}

export function platformLabel(p: string): string {
  const map: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    youtube: "YouTube",
    other: "Other",
  };
  return map[p] || p;
}

export function stateChip(state: string) {
  const map: Record<string, { label: string; dot: string }> = {
    active: { label: "Active", dot: "#3E8E5A" },
    finished: { label: "Finished", dot: "#A99E90" },
    scheduled: { label: "Scheduled", dot: "#C98A2B" },
  };
  return map[state] || { label: state, dot: "#A99E90" };
}

export function syncAgo(date: string | Date | null | undefined): string {
  if (!date) return "never";
  const d = typeof date === "string" ? new Date(date) : date;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return timeAgo(d);
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export interface ApiSource {
  type: string;
  code?: string | null;
  influencer?: { handle?: string; code?: string } | string | null;
  campaign?: { name?: string; slug?: string } | string | null;
  label?: string | null;
}

export function sourceText(source: ApiSource | null | undefined): { s1: string; s2?: string } {
  if (!source) return { s1: "Organic" };
  const inf = source.influencer && typeof source.influencer === "object" ? source.influencer : null;
  const camp = source.campaign && typeof source.campaign === "object" ? source.campaign : null;
  switch (source.type) {
    case "influencer":
      return { s1: inf?.handle || source.code || "Influencer", s2: camp?.name };
    case "referral":
      return { s1: "Referral" };
    case "campaign":
      return { s1: "Campaign", s2: camp?.name };
    case "ads":
      return { s1: "Ads", s2: source.code || undefined };
    default:
      return { s1: "Organic" };
  }
}
