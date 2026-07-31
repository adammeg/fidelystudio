"use client";

import { useEffect, useState } from "react";
import ConvertySyncCrumbClient from "@/components/studio/ConvertySyncCrumbClient";
import type { ConvertyStatus } from "@/lib/studio";

type WidgetKey =
  | "loyalty"
  | "checkout"
  | "referral"
  | "postpurchase"
  | "whatsapp";

interface Appearance {
  primaryColor: string;
  accentColor: string;
  buttonStyle: string;
  cornerRadius: string;
  language: string;
  logoSynced: boolean;
}

const LABELS: Record<WidgetKey, string> = {
  loyalty: "Loyalty widget",
  checkout: "Checkout redemption",
  referral: "Referral widget",
  postpurchase: "Post-purchase summary",
  whatsapp: "WhatsApp share",
};

const PlaceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M15 4v16" />
  </svg>
);

const widgetCards: { key: WidgetKey; icon: React.ReactNode; name: string; desc: string; place: string }[] = [
  {
    key: "loyalty",
    name: "Loyalty widget",
    desc: "Shows points balance, progress to next reward, and available rewards.",
    place: "Customer account / storefront drawer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
      </svg>
    ),
  },
  {
    key: "checkout",
    name: "Checkout redemption",
    desc: "Lets customers use points before confirming an order.",
    place: "Checkout",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M5 7h14l-1 13H6zM9 7V5a3 3 0 016 0v2" />
      </svg>
    ),
  },
  {
    key: "referral",
    name: "Referral widget",
    desc: "Lets customers copy their referral code and share on WhatsApp.",
    place: "Customer account / thank-you page",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
      </svg>
    ),
  },
  {
    key: "postpurchase",
    name: "Post-purchase summary",
    desc: "Shows points earned after a delivered & paid order.",
    place: "Thank-you page / WhatsApp follow-up",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h4" />
      </svg>
    ),
  },
  {
    key: "whatsapp",
    name: "WhatsApp share",
    desc: "Referral message customers can send to friends.",
    place: "Inside the referral widget",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.2.1.7-.1 1.3z" />
      </svg>
    ),
  },
];

const PRIMARY_SWATCHES = ["#7C5A43", "#2A6FDB", "#1F8A5B"];
const ACCENT_SWATCHES = ["#C8744F", "#C98A2B", "#3E8E5A"];

export default function WidgetPreviewPage() {
  const [active, setActive] = useState<WidgetKey>("loyalty");
  const isWa = active === "referral" || active === "whatsapp";

  const [enabled, setEnabled] = useState<Record<WidgetKey, boolean>>({
    loyalty: true,
    checkout: true,
    referral: true,
    postpurchase: true,
    whatsapp: true,
  });
  const [appearance, setAppearance] = useState<Appearance>({
    primaryColor: "#7C5A43",
    accentColor: "#C8744F",
    buttonStyle: "rounded",
    cornerRadius: "M",
    language: "EN",
    logoSynced: true,
  });
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [converty, setConverty] = useState<ConvertyStatus | null>(null);

  useEffect(() => {
    fetch("/api/studio/converty/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setConverty)
      .catch(() => setConverty(null));
  }, []);

  useEffect(() => {
    fetch("/api/studio/widgets")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.config) return;
        const w = data.config.widgets || {};
        setEnabled({
          loyalty: w.loyalty?.enabled ?? true,
          checkout: w.checkout?.enabled ?? true,
          referral: w.referral?.enabled ?? true,
          postpurchase: w.postpurchase?.enabled ?? true,
          whatsapp: w.whatsapp?.enabled ?? true,
        });
        if (data.config.appearance) setAppearance(data.config.appearance);
      })
      .catch(() => {});
  }, []);

  function toggle(key: WidgetKey, e: React.MouseEvent) {
    e.stopPropagation();
    setEnabled((s) => ({ ...s, [key]: !s[key] }));
  }

  async function publish() {
    setSaving(true);
    setSaved(false);
    try {
      const widgets = Object.fromEntries(
        (Object.keys(enabled) as WidgetKey[]).map((k) => [k, { enabled: enabled[k] }])
      );
      const res = await fetch("/api/studio/widgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgets, appearance }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  const storeUrl = converty?.store?.slug
    ? `${converty.store.slug}.converty.shop`
    : converty?.store?.domain?.replace(/^https?:\/\//, "") || "yourstore.converty.shop";
  const storeName = converty?.store?.name || "Your store";
  const storefrontUrl = converty?.store?.domain || (converty?.store?.slug ? `https://${converty.store.slug}.converty.shop` : null);

  return (
    <>
      <header className="topbar">
        <div>
          <ConvertySyncCrumbClient detail="Theme & customers synced" className="crumb" />
          <h1>Widgets</h1>
          <div className="subt">
            Preview how loyalty, referral, and rewards appear inside your store.
          </div>
        </div>
        <div className="tb-actions">
          <button
            className="btn btn-secondary"
            disabled={!storefrontUrl}
            onClick={() => storefrontUrl && window.open(storefrontUrl, "_blank")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h5" />
            </svg>
            Open storefront
          </button>
          {saved && (
            <span style={{ color: "var(--pos-fg)", fontSize: "12.5px", fontWeight: 700, alignSelf: "center" }}>
              Published ✓
            </span>
          )}
          <button className="btn btn-primary" onClick={publish} disabled={saving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {saving ? "Publishing…" : "Publish changes"}
          </button>
        </div>
      </header>

      <div className="content">
        {/* STATUS STRIP */}
        <div className="status-strip" data-screen-label="Status">
          <span className="status-pill live">
            <span className="ld"></span>Widgets live
          </span>
          <span className="status-pill cod">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Connected to {converty?.connected ? storeName : "Converty"}
          </span>
          <span className="status-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12a9 9 0 019-9 9 9 0 016.5 2.8L21 8M21 3v5h-5" />
              <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.5-2.8L3 16" />
            </svg>
            Theme synced
          </span>
          <span className="status-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="7" y="3" width="10" height="18" rx="2.5" />
              <path d="M11 18h2" />
            </svg>
            Mobile-first preview
          </span>
        </div>

        <div className="grid-12">
          {/* LEFT */}
          <div className="span4">
            <div
              className="panel"
              style={{ padding: "16px 16px 18px" }}
              data-screen-label="Widget list"
            >
              <div className="fp-title" style={{ marginBottom: "3px" }}>
                Available widgets
              </div>
              <div className="fp-sub" style={{ marginBottom: "14px" }}>
                Pick one to preview how it appears in your store
              </div>

              {widgetCards.map((w) => (
                <div
                  key={w.key}
                  className={`wcard${active === w.key ? " sel" : ""}`}
                  onClick={() => setActive(w.key)}
                >
                  <div className="wc-top">
                    <span className="wc-ic">{w.icon}</span>
                    <span className="wc-nm">{w.name}</span>
                    <span
                      className={`chip-i ${enabled[w.key] ? "c-paid" : "c-nd"}`}
                      style={{ marginLeft: "auto", padding: "3px 9px", cursor: "pointer" }}
                      onClick={(e) => toggle(w.key, e)}
                    >
                      <span className="dot" style={{ background: enabled[w.key] ? "#3E8E5A" : "#A99E90" }}></span>
                      {enabled[w.key] ? "Live" : "Off"}
                    </span>
                  </div>
                  <div className="wc-desc">{w.desc}</div>
                  <div className="wc-foot">
                    <span className="wc-place">
                      <PlaceIcon />
                      {w.place}
                    </span>
                    <span className="wc-edit" onClick={(e) => toggle(w.key, e)} style={{ cursor: "pointer" }}>
                      {enabled[w.key] ? "Turn off" : "Turn on"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Appearance */}
            <div
              className="panel"
              style={{ marginTop: "16px", padding: "16px 18px 14px" }}
              data-screen-label="Appearance"
            >
              <div className="fp-title" style={{ marginBottom: "3px" }}>
                Appearance
              </div>
              <div className="fp-sub" style={{ marginBottom: "6px" }}>
                Kept in sync with your Converty theme
              </div>
              <div className="brand-row">
                <span className="bl">Primary color</span>
                <div className="sw-row">
                  {PRIMARY_SWATCHES.map((c) => (
                    <span
                      key={c}
                      className={`sw${appearance.primaryColor === c ? " sel" : ""}`}
                      style={{ background: c, cursor: "pointer" }}
                      onClick={() => setAppearance((a) => ({ ...a, primaryColor: c }))}
                    ></span>
                  ))}
                </div>
              </div>
              <div className="brand-row">
                <span className="bl">Accent color</span>
                <div className="sw-row">
                  {ACCENT_SWATCHES.map((c) => (
                    <span
                      key={c}
                      className={`sw${appearance.accentColor === c ? " sel" : ""}`}
                      style={{ background: c, cursor: "pointer" }}
                      onClick={() => setAppearance((a) => ({ ...a, accentColor: c }))}
                    ></span>
                  ))}
                </div>
              </div>
              <div className="brand-row">
                <span className="bl">Button style</span>
                <span className="fseg">
                  {(["rounded", "pill", "square"] as const).map((s) => (
                    <button key={s} className={appearance.buttonStyle === s ? "on" : ""} onClick={() => setAppearance((a) => ({ ...a, buttonStyle: s }))}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </span>
              </div>
              <div className="brand-row">
                <span className="bl">Corner radius</span>
                <span className="fseg">
                  {(["S", "M", "L"] as const).map((s) => (
                    <button key={s} className={appearance.cornerRadius === s ? "on" : ""} onClick={() => setAppearance((a) => ({ ...a, cornerRadius: s }))}>
                      {s}
                    </button>
                  ))}
                </span>
              </div>
              <div className="brand-row">
                <span className="bl">Logo</span>
                <span className="logo-sync">
                  <span className="lg">M</span>
                  <span className="syn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    Synced from Converty
                  </span>
                </span>
              </div>
              <div className="brand-row">
                <span className="bl">Language</span>
                <span className="fseg">
                  {(["EN", "FR"] as const).map((s) => (
                    <button key={s} className={appearance.language === s ? "on" : ""} onClick={() => setAppearance((a) => ({ ...a, language: s }))}>
                      {s}
                    </button>
                  ))}
                  <button style={{ opacity: 0.5 }}>AR soon</button>
                </span>
              </div>
            </div>

            <div className="est-note" style={{ marginTop: "16px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" />
              </svg>
              <span>
                Points and rewards appear only after <b>delivered &amp; paid</b>{" "}
                orders. Refused, returned, or cancelled orders do not unlock
                rewards.
              </span>
            </div>
          </div>

          {/* RIGHT: PREVIEW */}
          <div className="span8" data-screen-label="Preview area">
            <div className="cfilter" style={{ marginBottom: "18px" }}>
              <span className="fl">Preview</span>
              <span className="fseg">
                <button className={device === "mobile" ? "on" : ""} onClick={() => setDevice("mobile")}>Mobile</button>
                <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>Desktop</button>
              </span>
              <span className="fl" style={{ marginLeft: "8px" }}>
                Customer
              </span>
              <span className="fselect">
                Ines Ben Salah · 145 pts
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
              <span className="fl" style={{ marginLeft: "8px" }}>
                Store
              </span>
              <span className="fselect">
                {storeName}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </div>

            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
              {/* MOBILE PHONE */}
              <div style={{ flexShrink: 0 }}>
                <div
                  className="preview-head"
                  style={{ marginBottom: "12px", width: "300px" }}
                >
                  <span className="pl">
                    <span className="ld"></span>Mobile · live
                  </span>
                  <span
                    style={{
                      fontSize: "11.5px",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {LABELS[active]}
                  </span>
                </div>
                <div className="phone" style={{ width: "300px" }}>
                  <div className="phone-screen">
                    <div className="phone-status">
                      <span>9:41</span>
                      <span className="dots">
                        <svg viewBox="0 0 24 18" fill="currentColor">
                          <rect x="0" y="6" width="4" height="12" rx="1" />
                          <rect x="6" y="3" width="4" height="15" rx="1" />
                          <rect x="12" y="0" width="4" height="18" rx="1" />
                          <rect x="18" y="9" width="4" height="9" rx="1" opacity=".4" />
                        </svg>
                        <svg viewBox="0 0 26 18" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="3" width="20" height="12" rx="3" />
                          <rect x="3" y="5" width="14" height="8" rx="1.5" fill="currentColor" stroke="none" />
                          <path d="M24 7v4" />
                        </svg>
                      </span>
                    </div>

                    {/* Loyalty */}
                    <div className={`wstate${active === "loyalty" ? " on" : ""}`}>
                      <div className="wdg-store">
                        <span className="wdg-logo">M</span>
                        <div>
                          <div className="sn">{storeName}</div>
                          <div className="ss">Loyalty · Ines</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "center", padding: "14px 0 2px" }}>
                        <span className="wdg-gift">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                          </svg>
                        </span>
                        <div className="w-big" style={{ marginTop: "8px" }}>
                          145
                          <span
                            style={{
                              fontSize: "14px",
                              color: "var(--text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            {" "}
                            points
                          </span>
                        </div>
                        <div className="wdg-reward">
                          <b>55 points</b> to unlock 10 TND off
                        </div>
                      </div>
                      <div className="wprog">
                        <i style={{ width: "72%" }}></i>
                      </div>
                      <div className="w-note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Points are added after your order is delivered.
                      </div>
                      <div style={{ marginTop: "16px" }}>
                        <div className="w-cta">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                          </svg>
                          View rewards
                        </div>
                      </div>
                    </div>

                    {/* Checkout */}
                    <div className={`wstate${active === "checkout" ? " on" : ""}`}>
                      <div className="wdg-store">
                        <span className="wdg-logo">M</span>
                        <div>
                          <div className="sn">{storeName}</div>
                          <div className="ss">Checkout</div>
                        </div>
                      </div>
                      <div className="w-tt" style={{ marginTop: "10px" }}>
                        Use your points
                      </div>
                      <div className="wdg-reward" style={{ textAlign: "center" }}>
                        You have <b>145 points</b>
                      </div>
                      <div
                        style={{
                          background: "var(--bg-sunken)",
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          padding: "13px 14px",
                          marginTop: "14px",
                        }}
                      >
                        <div style={{ fontSize: "12.5px", fontWeight: 600 }}>
                          Unlock 10 TND off at 200 points
                        </div>
                        <div className="wprog" style={{ margin: "10px 0 7px" }}>
                          <i style={{ width: "72%" }}></i>
                        </div>
                        <div
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "#9A6A1E",
                          }}
                        >
                          55 points missing to unlock 10 TND off
                        </div>
                      </div>
                      <div style={{ marginTop: "14px" }}>
                        <div className="w-cta dim">Redeem 10 TND off</div>
                      </div>
                      <div className="w-note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Keep ordering to unlock this reward.
                      </div>
                    </div>

                    {/* Referral */}
                    <div className={`wstate${active === "referral" ? " on" : ""}`}>
                      <div className="wdg-store">
                        <span className="wdg-logo">M</span>
                        <div>
                          <div className="sn">{storeName}</div>
                          <div className="ss">Referral</div>
                        </div>
                      </div>
                      <div className="wdg-hero" style={{ padding: "14px 0 2px" }}>
                        <span className="wdg-gift">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M2 8h20v4H2zM12 8v12M12 8S9.5 4 7 5s.5 3 5 3zM12 8s2.5-4 5-3-.5 3-5 3z" />
                          </svg>
                        </span>
                        <div className="wdg-title">Invite a friend, you both win</div>
                        <div className="wdg-reward">
                          Your friend gets <b>10 TND off</b> their first order. You
                          get <b>10 TND</b> after their first delivered &amp; paid
                          order.
                        </div>
                      </div>
                      <div className="wdg-code">
                        <span className="cd">INES-10</span>
                        <span className="cp">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15V5a2 2 0 012-2h10" />
                          </svg>
                          Copy
                        </span>
                      </div>
                      <div className="wdg-wa">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.2.1.7-.1 1.3z" />
                        </svg>
                        Invite on WhatsApp
                      </div>
                    </div>

                    {/* Post-purchase */}
                    <div className={`wstate${active === "postpurchase" ? " on" : ""}`}>
                      <div className="wdg-store">
                        <span className="wdg-logo">M</span>
                        <div>
                          <div className="sn">{storeName}</div>
                          <div className="ss">Order confirmed</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "center", padding: "16px 0 2px" }}>
                        <span className="wdg-gift" style={{ background: "var(--pos-fg)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <div className="w-tt" style={{ marginTop: "10px" }}>
                          Order delivered &amp; paid
                        </div>
                        <div className="w-big" style={{ color: "var(--pos-fg)", marginTop: "12px" }}>
                          +120
                        </div>
                        <div className="wdg-reward">
                          points earned · current balance <b>145</b>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "var(--bg-sunken)",
                          borderRadius: "9px",
                          padding: "10px 12px",
                          marginTop: "12px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        55 points to unlock 10 TND off
                      </div>
                      <div className="w-note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Points were added after delivery.
                      </div>
                      <div style={{ marginTop: "14px" }}>
                        <div className="w-cta">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                          </svg>
                          View rewards
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div
                      className={`wstate${active === "whatsapp" ? " on" : ""}`}
                      style={{ padding: 0 }}
                    >
                      <div
                        style={{
                          background: "#075E54",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "12px 16px",
                        }}
                      >
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            background: "#128C7E",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          S
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "13px" }}>
                            Salma (friend)
                          </div>
                          <div style={{ fontSize: "10.5px", opacity: 0.8 }}>online</div>
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#E5DDD5",
                          padding: "18px 14px",
                          minHeight: "300px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                        }}
                      >
                        <div className="wa-bubble" style={{ maxWidth: "92%" }}>
                          Salem! I shop at {storeName} 💛 Use my code{" "}
                          <b>INES-10</b> and get 10 TND off your first order.
                          I&apos;ll get 10 TND after your first delivered order.
                          fid.ly/r/ines-10
                        </div>
                        <div className="wa-meta">
                          9:24 AM
                          <svg viewBox="0 0 24 24" fill="none" stroke="#34B7F1" strokeWidth="3">
                            <path d="M2 13l4 4L13 7" />
                            <path d="M10 13l4 4L22 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: DESKTOP STOREFRONT / WHATSAPP */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Desktop storefront preview */}
                <div
                  style={{ display: isWa ? "none" : "block" }}
                  data-screen-label="Desktop preview"
                >
                  <div className="preview-head" style={{ marginBottom: "12px" }}>
                    <span className="pl">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        style={{ width: "14px", height: "14px", strokeWidth: 2 }}
                      >
                        <rect x="2.5" y="4" width="19" height="13" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                      Desktop · storefront
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        fontWeight: 600,
                      }}
                    >
                      Secondary
                    </span>
                  </div>
                  <div className="dtop">
                    <div className="dtop-bar">
                      <span className="d" style={{ background: "#E0876F" }}></span>
                      <span className="d" style={{ background: "#E3B341" }}></span>
                      <span className="d" style={{ background: "#7FB77E" }}></span>
                      <span className="dtop-url">{storeUrl}</span>
                    </div>
                    <div className="dtop-body">
                      <div className="dt-store">
                        <div className="dt-shead">
                          <span className="nm">{storeName}</span>
                          <div className="dt-nav">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                        <div className="dt-grid">
                          <div className="dt-prod"></div>
                          <div className="dt-prod"></div>
                          <div className="dt-prod"></div>
                          <div className="dt-prod"></div>
                        </div>
                      </div>
                      <div className="dt-drawer">
                        {/* loyalty */}
                        <div className={`dd-state${active === "loyalty" ? " on" : ""}`}>
                          <div className="dd-t">Your rewards</div>
                          <div className="dd-pts">
                            145{" "}
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-secondary)",
                                fontWeight: 600,
                              }}
                            >
                              pts
                            </span>
                          </div>
                          <div className="wprog" style={{ height: "6px", margin: "8px 0 7px" }}>
                            <i style={{ width: "72%" }}></i>
                          </div>
                          <div className="dd-sub">55 points to 10 TND off</div>
                          <div
                            className="w-cta"
                            style={{ fontSize: "11px", padding: "8px", marginTop: "11px" }}
                          >
                            View rewards
                          </div>
                        </div>
                        {/* checkout */}
                        <div className={`dd-state${active === "checkout" ? " on" : ""}`}>
                          <div className="dd-t">Use your points</div>
                          <div className="dd-pts">
                            145{" "}
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-secondary)",
                                fontWeight: 600,
                              }}
                            >
                              pts
                            </span>
                          </div>
                          <div className="wprog" style={{ height: "6px", margin: "8px 0 7px" }}>
                            <i style={{ width: "72%" }}></i>
                          </div>
                          <div className="dd-sub" style={{ color: "#9A6A1E", fontWeight: 700 }}>
                            55 points missing
                          </div>
                          <div className="dd-sub" style={{ marginTop: "8px" }}>
                            Keep ordering to unlock this reward.
                          </div>
                        </div>
                        {/* post-purchase */}
                        <div className={`dd-state${active === "postpurchase" ? " on" : ""}`}>
                          <div className="dd-t" style={{ color: "#2E6E45" }}>
                            Delivered &amp; paid ✓
                          </div>
                          <div className="dd-pts" style={{ color: "var(--pos-fg)" }}>
                            +120
                          </div>
                          <div className="dd-sub">points earned</div>
                          <div className="dd-sub" style={{ marginTop: "6px" }}>
                            Balance <b style={{ color: "var(--text-primary)" }}>145</b> · 55
                            to next reward
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="native-cap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      Embedded natively in your Converty storefront — same theme,
                      no code to install.
                    </span>
                  </div>
                </div>

                {/* WhatsApp message preview */}
                <div
                  style={{ display: isWa ? "block" : "none" }}
                  data-screen-label="WhatsApp preview"
                >
                  <div className="preview-head" style={{ marginBottom: "11px" }}>
                    <span className="pl">
                      <svg
                        viewBox="0 0 24 24"
                        fill="#25D366"
                        style={{ width: "14px", height: "14px" }}
                      >
                        <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2z" />
                      </svg>
                      WhatsApp share · what the friend receives
                    </span>
                  </div>
                  <div className="wa-preview" style={{ padding: "14px" }}>
                    <div className="wa-bubble">
                      Salem! I shop at {storeName} 💛 Use my code <b>INES-10</b>{" "}
                      and get 10 TND off your first order. I&apos;ll get 10 TND
                      after your first delivered order. fid.ly/r/ines-10
                    </div>
                    <div className="wa-meta">
                      from Ines · preview
                      <svg viewBox="0 0 24 24" fill="none" stroke="#34B7F1" strokeWidth="3">
                        <path d="M2 13l4 4L13 7" />
                        <path d="M10 13l4 4L22 7" />
                      </svg>
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: "11px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 012-2h10" />
                    </svg>
                    Copy message
                  </button>
                  <div className="native-cap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      Customers are identified by phone number — no account needed
                      to share or redeem.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
