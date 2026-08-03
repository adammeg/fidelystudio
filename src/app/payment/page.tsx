import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ensureSubscription } from "@/server/subscriptions";
import { effectiveSubscription } from "@/lib/plans";

export default async function PaymentPage() {
  const user = await getSessionUser();
  if (user.role === "admin") redirect("/admin");
  const subscription = await ensureSubscription(user.id);
  if (effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt) !== "restricted") redirect("/settings");
  const confirmation = encodeURIComponent(`Hello, I paid the Fidely subscription for ${user.shopName || user.email || "my shop"}. Please confirm and activate my account.`);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "var(--bg-sunken)" }}>
    <section className="panel" style={{ width: "min(100%, 650px)", padding: 28 }}>
      <div className="status-pill" style={{ marginBottom: 16 }}>Activation pending</div>
      <h1 style={{ marginBottom: 8 }}>Activate Fidely Studio</h1>
      <p className="muted">Your 7-day free trial has ended. Pay the 49 DT monthly subscription, then contact us on WhatsApp. Your account will be activated after the payment is verified.</p>
      <div className="stat-list" style={{ margin: "24px 0" }}>
        <div className="stat-row"><span>Monthly subscription</span><b>49 DT / month</b></div>
        <div className="stat-row"><span>Bank</span><b>BTE</b></div>
        <div className="stat-row"><span>Account holder</span><b>Adam Ben Hadj Aissa</b></div>
        <div className="stat-row"><span>RIB</span><b style={{ letterSpacing: 1 }}>24031211590251220109</b></div>
        <div className="stat-row"><span>Flouci payment number</span><b>90 053 729</b></div>
      </div>
      <div className="est-note" style={{ marginBottom: 18 }}><span>Send your payment receipt and shop name. Activation is completed manually by the Fidely administrator.</span></div>
      <a className="btn btn-primary" href={`https://wa.me/21690053729?text=${confirmation}`} target="_blank" rel="noreferrer">Contact us on WhatsApp · 90 053 729</a>
      <form action="/api/logout" method="post" style={{ marginTop: 12 }}><button className="btn btn-secondary" type="submit">Sign out</button></form>
    </section>
  </main>;
}
