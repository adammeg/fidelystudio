"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AccountData } from "@/lib/studio";

export default function AccountManager({ account }: { account: AccountData }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const checklist = [
    ["Complete store profile", account.onboarding.profileComplete],
    ["Connect Converty store", account.onboarding.storeConnected],
    ["Complete first order sync", account.onboarding.firstSyncComplete],
  ] as const;

  async function saveProfile(formData: FormData) {
    setMessage(null);
    const response = await fetch("/api/studio/account", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopName: formData.get("shopName"), ownerName: formData.get("ownerName") }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Account details saved." : data.message || "Could not save account details.");
    if (response.ok) router.refresh();
  }

  async function deleteAccount() {
    const response = await fetch("/api/studio/account", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Could not delete account.");
    window.location.href = "/login";
  }

  const limit = account.subscription.entitlements.customerLimit;
  return <>
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="p-head"><div><h3>Getting started</h3><div className="sub">Your path to reliable live analytics.</div></div></div>
      <div className="stat-list">{checklist.map(([label, done]) => <div className="stat-row" key={label}><span>{label}</span><b>{done ? "Complete" : "Required"}</b></div>)}</div>
    </div>
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="p-head"><div><h3>Plan and usage</h3><div className="sub">Billing activates after Stripe products are configured.</div></div><span className="status-pill live">{account.subscription.status}</span></div>
      <div className="stat-list">
        <div className="stat-row"><span>Subscription</span><b>Fidely · {account.subscription.price.amount} DT / month</b></div>
        <div className="stat-row"><span>Customers</span><b>{account.subscription.customerCount.toLocaleString()} / {limit === Number.MAX_SAFE_INTEGER ? "Unlimited" : limit.toLocaleString()}</b></div>
        <div className="stat-row"><span>Trial ends</span><b>{new Date(account.subscription.trialEndsAt).toLocaleDateString()}</b></div>
        <div className="stat-row"><span>Billing</span><b>{account.subscription.billingConfigured ? "Configured" : "Not configured"}</b></div>
      </div>
    </div>
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="p-head"><div><h3>Account details</h3><div className="sub">Used across Studio reports and exports.</div></div></div>
      <form action={saveProfile} style={{ padding: 18, display: "grid", gap: 12 }}>
        <label>Store name<input className="input" name="shopName" defaultValue={account.profile.shopName} required minLength={2} /></label>
        <label>Owner name<input className="input" name="ownerName" defaultValue={account.profile.ownerName} /></label>
        <label>Email<input className="input" value={account.profile.email} disabled /></label>
        <button className="btn btn-primary" type="submit">Save account</button>
      </form>
    </div>
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="p-head"><div><h3>Privacy and data</h3><div className="sub">Download your merchant data or permanently delete the account.</div></div></div>
      <div style={{ padding: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn-secondary" href="/api/studio/account/export">Export account data</Link>
        <input className="input" style={{ maxWidth: 180 }} value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type DELETE" />
        <button className="btn btn-secondary" type="button" disabled={confirm !== "DELETE"} onClick={deleteAccount}>Delete account</button>
      </div>
      {message && <div style={{ padding: "0 18px 18px" }}>{message}</div>}
    </div>
  </>;
}
