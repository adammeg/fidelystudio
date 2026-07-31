"use client";

import { useState } from "react";
import type { ReferralProgram } from "@/lib/studio";

export default function ReferralForm({ program, storeName }: { program: ReferralProgram; storeName: string }) {
  const [friend, setFriend] = useState(program.friendReward.value);
  const [referrer, setReferrer] = useState(program.referrerReward.value);
  const [minOrder, setMinOrder] = useState(program.minOrderValue);
  const [message, setMessage] = useState(program.whatsappMessage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/studio/referral", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendReward: { type: "amount", value: Number(friend) },
          referrerReward: { type: "amount", value: Number(referrer) },
          minOrderValue: Number(minOrder),
          whatsappMessage: message,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const preview = message
    .replace("{store}", storeName)
    .replace("{code}", "INES-10")
    .replace("{friendReward}", `${friend} TND`)
    .replace("{referrerReward}", `${referrer} TND`)
    .replace("{link}", "fid.ly/r/ines-10");

  return (
    <>
      <div className="block-head">
        <div>
          <h2>Program settings</h2>
          <div className="sub">
            Configure the evergreen program. Rewards are honored only after the friend&apos;s first order is
            delivered &amp; paid.
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {saved && <span style={{ color: "var(--pos-fg)", fontSize: "12.5px", fontWeight: 700 }}>Saved ✓</span>}
          {error && <span style={{ color: "#C25B4E", fontSize: "12.5px", fontWeight: 700 }}>{error}</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
      <div className="grid-12">
        {/* LEFT: SETTINGS */}
        <div className="span8" data-screen-label="Referral settings">
          <div className="panel form-panel">
            <div className="fp-title">Referral rewards</div>
            <div className="fp-sub">
              Set what each side gets. Both rewards are honored only after the friend&apos;s first order is
              delivered &amp; paid.
            </div>
            <div className="two-col">
              <div className="field">
                <label>Friend gets</label>
                <div className="affix">
                  <input className="input" value={friend} onChange={(e) => setFriend(Number(e.target.value) || 0)} />
                  <span className="suf">TND</span>
                </div>
                <div className="hint">Discount on their first order.</div>
              </div>
              <div className="field">
                <label>You get (referrer)</label>
                <div className="affix">
                  <input className="input" value={referrer} onChange={(e) => setReferrer(Number(e.target.value) || 0)} />
                  <span className="suf">TND</span>
                </div>
                <div className="hint">Credited after their first delivered order.</div>
              </div>
            </div>
            <div className="field" style={{ marginTop: "16px" }}>
              <label>Minimum order value</label>
              <div className="affix" style={{ maxWidth: "240px" }}>
                <input className="input" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value) || 0)} />
                <span className="suf">TND</span>
              </div>
              <div className="hint">The friend&apos;s first order must reach this amount to qualify.</div>
            </div>
          </div>

          <div className="panel form-panel">
            <div className="fp-title">When rewards are validated</div>
            <div className="fp-sub">
              Cash-on-delivery means a reward only counts once the order truly lands and is paid.
            </div>
            <div className="cod-callout">
              <span className="ci">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 7h13l2 4h3v6H3z" />
                  <circle cx="7" cy="18" r="1.8" />
                  <circle cx="17" cy="18" r="1.8" />
                </svg>
              </span>
              <div>
                <div className="ct">Rewards are credited after delivery, never at checkout.</div>
                <div className="cs">
                  If the friend&apos;s order is refused or returned, no reward is given to either side. This
                  protects your margin in a COD market.
                </div>
              </div>
            </div>
            <div className="vtl">
              <div className="vstep done">
                <div className="vline"></div>
                <span className="vnode">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 7h14l-1 13H6zM9 7V5a3 3 0 016 0v2" />
                  </svg>
                </span>
                <span className="vlabel">Order placed</span>
                <span className="vsub">Friend buys</span>
              </div>
              <div className="vstep done">
                <div className="vline"></div>
                <span className="vnode">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                  </svg>
                </span>
                <span className="vlabel">Confirmed</span>
                <span className="vsub">On its way</span>
              </div>
              <div className="vstep final">
                <span className="vnode">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="vlabel">Delivered &amp; paid</span>
                <span className="vsub" style={{ color: "var(--pos-fg)", fontWeight: 700 }}>
                  Both rewards credited
                </span>
              </div>
            </div>
          </div>

          <div className="panel form-panel">
            <div className="fp-title">WhatsApp share message</div>
            <div className="fp-sub">
              What your customer sends to a friend. Use {"{store}"}, {"{code}"}, {"{friendReward}"},{" "}
              {"{referrerReward}"}, {"{link}"} as placeholders.
            </div>
            <div className="field">
              <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="wa-preview" style={{ marginTop: "14px" }}>
              <div className="wa-bubble">{preview}</div>
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

        {/* RIGHT: SMALL WIDGET PREVIEW */}
        <div className="span4">
          <div className="preview-wrap" data-screen-label="Widget preview">
            <div className="preview-head">
              <span className="pl">
                <span className="ld"></span>Customer preview
              </span>
              <a className="preview-link" href="/widgets">
                Open in Widgets
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <div className="wdg-frame">
              <div className="wdg">
                <div className="wdg-store">
                  <span className="wdg-logo">{storeName.charAt(0)}</span>
                  <div>
                    <div className="sn">{storeName}</div>
                    <div className="ss">Referral program</div>
                  </div>
                </div>
                <div className="wdg-hero">
                  <span className="wdg-gift">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M2 8h20v4H2zM12 8v12M12 8S9.5 4 7 5s.5 3 5 3zM12 8s2.5-4 5-3-.5 3-5 3z" />
                    </svg>
                  </span>
                  <div className="wdg-title">Invite a friend, you both win</div>
                  <div className="wdg-reward">
                    Your friend gets <b>{friend} TND off</b> their first order. You get <b>{referrer} TND</b> after
                    their first delivered order.
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
                <div className="wdg-foot">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Reward after your friend&apos;s first delivered order
                </div>
              </div>
            </div>
            <div className="preview-cap">
              Shoppers are identified by phone number — no account needed.
              <br />
              The full widget preview lives in <b>Widgets</b>.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
