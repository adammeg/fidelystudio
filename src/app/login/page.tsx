import Image from "next/image";

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
          <Image src="/complete-fidely-logo.png" width={154} height={50} alt="Fidely" priority />
        </div>
        <h1 className="login-title">Connect your store</h1>
        <p className="login-sub">
          Sign in securely with Converty. Fidely imports your real store, customers,
          orders, and delivery statuses after you approve access.
        </p>

        {error && <div className="login-error">{error}</div>}

        <form action="/api/auth/default" method="post" className="login-form default-login">
          <label className="login-field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn btn-secondary login-submit" type="submit">
            Sign in to Studio
          </button>
        </form>

        <div className="login-divider">
          <span>or</span>
        </div>

        <a className="btn btn-primary login-submit converty-login" href="/api/auth/converty/start">
          <Image className="converty-mark-img" src="/converty-logo.png" width={25} height={25} alt="Converty" style={{ borderRadius: 5 }} />
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
