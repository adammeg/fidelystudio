import ConvertyManager from "@/components/studio/ConvertyManager";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import AccountManager from "@/components/studio/AccountManager";
import { getAccount, getConvertyStatus } from "@/lib/studio";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ converty?: string; message?: string }>;
}) {
  const [status, account, params] = await Promise.all([getConvertyStatus(), getAccount(), searchParams]);

  return (
    <>
      <header className="topbar">
        <div>
          <ConvertySyncCrumb detail="Store connection & order sync" />
          <h1>Settings</h1>
          <div className="subt">Manage your Converty connection and data sync.</div>
        </div>
      </header>

      <div className="content">
        <ConvertyManager
          initial={status}
          callbackStatus={params.converty}
          callbackMessage={params.message}
        />

        <AccountManager account={account} />

        <div className="panel" style={{ marginTop: 16 }} data-screen-label="Account">
          <div className="p-head">
            <div>
              <h3>Account</h3>
              <div className="sub">Sign out of Fidely Studio on this device.</div>
            </div>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <form action="/api/logout" method="post">
              <button type="submit" className="btn btn-secondary">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
