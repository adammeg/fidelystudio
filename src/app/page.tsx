import Link from "next/link";
import Image from "next/image";

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="Fidely home">
          <Image src="/complete-fidely-logo.png" width={132} height={49} alt="Fidely" priority />
        </Link>
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <Link className="btn btn-primary" href="/login">
          Open Studio
        </Link>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-glow" aria-hidden="true" />
          <div className="landing-eyebrow">
            <span className="sync-dot" />
            Built for Converty merchants
          </div>
          <h1>
            Understand what happens
            <span> after the order is placed.</span>
          </h1>
          <p>
            Fidely turns your real Converty orders, deliveries, and customers into a
            clear operating view—so you can see what sold, what delivered, and who
            came back.
          </p>
          <div className="landing-actions">
            <Link className="btn btn-primary landing-primary" href="/login">
              Connect your store
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a className="btn btn-secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="landing-trust">
            <span><Check /> Secure Converty OAuth</span>
            <span><Check /> Delivery-first analytics</span>
            <span><Check /> No spreadsheet setup</span>
          </div>

          <div className="landing-preview" aria-label="Fidely dashboard preview">
            <div className="preview-sidebar">
              <div className="preview-brand"><Image src="/fidely-logo.png" width={28} height={28} alt="" /> Fidely</div>
              <i className="active" /><i /><i /><i />
            </div>
            <div className="preview-main">
              <div className="preview-heading">
                <div><small>Connected to your Converty store</small><strong>Good morning</strong></div>
                <span>Last 30 days</span>
              </div>
              <div className="preview-kpis">
                <div><small>Delivered sales</small><strong>24,860</strong><em>TND</em></div>
                <div><small>Delivered orders</small><strong>186</strong><em>orders</em></div>
                <div><small>Customers</small><strong>142</strong><em>people</em></div>
              </div>
              <div className="preview-chart">
                <div><small>Delivery performance</small><strong>What your store generated</strong></div>
                <svg viewBox="0 0 800 180" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="landingArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#c8744f" stopOpacity=".24" />
                      <stop offset="1" stopColor="#c8744f" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 150 C80 140 100 105 170 118 S260 75 330 92 S430 35 500 62 S620 48 800 18 L800 180 L0 180Z" fill="url(#landingArea)" />
                  <path d="M0 150 C80 140 100 105 170 118 S260 75 330 92 S430 35 500 62 S620 48 800 18" fill="none" stroke="#c8744f" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="product">
          <div className="section-heading">
            <span>One reliable source of truth</span>
            <h2>Built around delivered orders, not vanity metrics.</h2>
            <p>Every visible number traces back to data imported from your connected Converty store.</p>
          </div>
          <div className="landing-features">
            <article>
              <span className="feature-icon">01</span>
              <h3>Store performance</h3>
              <p>Track delivered sales, order volume, operating cost, new customers, and delivery rate over time.</p>
            </article>
            <article>
              <span className="feature-icon">02</span>
              <h3>Customer intelligence</h3>
              <p>See every customer, their order history, delivered value, returns, and latest activity.</p>
            </article>
            <article>
              <span className="feature-icon">03</span>
              <h3>Segments and cohorts</h3>
              <p>Identify VIP, at-risk, dormant, and repeat customers using real delivery behavior.</p>
            </article>
          </div>
        </section>

        <section className="landing-process" id="how-it-works">
          <div className="section-heading light">
            <span>Simple by design</span>
            <h2>From connection to clarity in three steps.</h2>
          </div>
          <div className="process-grid">
            <article><b>1</b><h3>Authorize Converty</h3><p>Approve read-only store and order access through Converty&apos;s secure OAuth screen.</p></article>
            <article><b>2</b><h3>Fidely imports the truth</h3><p>Orders and customers are synchronized, then kept current through order webhooks.</p></article>
            <article><b>3</b><h3>Act with context</h3><p>Use delivery-aware dashboards, customer profiles, segments, and cohorts to make better decisions.</p></article>
          </div>
        </section>

        <section className="landing-security" id="security">
          <div>
            <span className="section-kicker">Security is part of the product</span>
            <h2>Your Converty credentials stay with Converty.</h2>
            <p>Fidely uses OAuth, encrypted tokens, short-lived authorization state, secure server sessions, and scoped store access.</p>
          </div>
          <ul>
            <li><Check /><span><b>AES-256-GCM token encryption</b>OAuth tokens are encrypted before MongoDB storage.</span></li>
            <li><Check /><span><b>Server-only secrets</b>Client secrets and encryption keys never enter browser bundles.</span></li>
            <li><Check /><span><b>Store-scoped data</b>Sessions and queries are isolated to the authenticated merchant.</span></li>
          </ul>
        </section>

        <section className="landing-cta">
          <span>Ready when your store is.</span>
          <h2>See the business behind your delivered orders.</h2>
          <Link className="btn btn-primary landing-primary" href="/login">Open Fidely Studio</Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span>© 2026 Fidely Studio</span>
        <span>Connected commerce intelligence for Converty merchants.</span>
      </footer>
    </div>
  );
}
