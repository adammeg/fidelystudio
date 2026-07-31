export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="sb-logo">F</div>
          <div className="login-brandname">Fidely</div>
        </div>
        <h1 className="login-title">Connect your store</h1>
        <p className="login-sub">
          Sign in securely with Converty. Fidely imports your real store, customers,
          orders, and delivery statuses after you approve access.
        </p>

        {error && <div className="login-error">{error}</div>}

        <a className="btn btn-primary login-submit converty-login" href="/api/auth/converty/start">
          <span className="converty-mark">C</span>
          Continue with Converty
        </a>

        <p className="login-security">
          You will be redirected to Converty to approve access. Fidely never receives
          your Converty password.
        </p>
      </div>
    </div>
  );
}
