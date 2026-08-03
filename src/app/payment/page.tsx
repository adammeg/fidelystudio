import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ensureSubscription } from "@/server/subscriptions";
import { effectiveSubscription } from "@/lib/plans";
import Link from "next/link";

export default async function PaymentPage() {
  const user = await getSessionUser();
  if (user.role === "admin") redirect("/admin");
  const subscription = await ensureSubscription(user.id);
  const access = effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt);
  if (access === "active") redirect("/settings");
  const confirmation = encodeURIComponent(`Hello, I paid the Fidely subscription for ${user.shopName || user.email || "my shop"}. Please confirm and activate my account.`);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "var(--bg-sunken)" }}>
    <section className="panel" style={{ width: "min(100%, 650px)", padding: 28 }}>
      <div className={`status-pill${access === "trialing" ? " cod" : ""}`} style={{ marginBottom: 16 }}>{access === "trialing" ? "Free trial active" : "Activation pending"}</div>
      <h1 style={{ marginBottom: 8 }}>Activate Fidely Studio</h1>
      <p className="muted">{access === "trialing" ? "You can pay during your free trial to prepare your subscription before it ends." : "Your 7-day free trial has ended."} Pay the 49 TND monthly subscription, then contact us on WhatsApp. Your account will be activated after the payment is verified.</p>
      <div className="stat-list" style={{ margin: "24px 0" }}>
        <div className="stat-row"><span>Monthly subscription</span><b>49 TND / month</b></div>
        <div className="stat-row"><span>Bank</span><b>BTE</b></div>
        <div className="stat-row"><span>Account holder</span><b>Adam Ben Hadj Aissa</b></div>
        <div className="stat-row"><span>RIB</span><b style={{ letterSpacing: 1 }}>24031211590251220109</b></div>
        <div className="stat-row"><span>Flouci payment number</span><b>90 053 729</b></div>
      </div>
      <div className="est-note" style={{ marginBottom: 18 }}><span>Send your payment receipt and shop name. Activation is completed manually by the Fidely administrator.</span></div>
      <a className="btn btn-primary" href={`https://wa.me/21690053729?text=${confirmation}`} target="_blank" rel="noreferrer">Contact us on WhatsApp · 90 053 729</a>
      {access === "trialing" ? <Link className="btn btn-secondary" style={{ marginTop: 12 }} href="/studio">Back to Studio</Link> : <form action="/api/logout" method="post" style={{ marginTop: 12 }}><button className="btn btn-secondary" type="submit">Sign out</button></form>}
    </section>
  </main>;
}
