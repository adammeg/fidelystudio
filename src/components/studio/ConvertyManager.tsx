"use client";



import { useRouter } from "next/navigation";

import { useCallback, useState } from "react";

import { syncAgo } from "@/lib/format";

import { setupConvertyWebhooks, syncConvertyOrders } from "@/lib/studio-client";

import type { ConvertyStatus } from "@/lib/studio";



interface Props {

  initial: ConvertyStatus;

  callbackStatus?: string | null;

  callbackMessage?: string | null;

}



export default function ConvertyManager({ initial, callbackStatus, callbackMessage }: Props) {

  const router = useRouter();

  const [status, setStatus] = useState(initial);

  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | "webhooks" | null>(null);

  const [error, setError] = useState<string | null>(null);



  const refreshStatus = useCallback(async () => {

    const refreshed = await fetch("/api/studio/converty/status").then((r) => r.json());

    setStatus(refreshed);

    router.refresh();

  }, [router]);





  async function connect() {

    setBusy("connect");

    setError(null);

    try {

      const res = await fetch("/api/studio/converty/connect-url");

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Could not start Converty authorization");

      window.location.href = data.url;

    } catch (e) {

      setError(e instanceof Error ? e.message : "Connection failed");

      setBusy(null);

    }

  }



  async function sync() {

    setBusy("sync");

    setError(null);

    try {

      for (;;) {
        const result = await syncConvertyOrders() as { complete?: boolean };
        if (result.complete !== false) break;
      }

      await refreshStatus();

    } catch (e) {

      setError(e instanceof Error ? e.message : "Sync failed");

    } finally {

      setBusy(null);

    }

  }



  async function repairWebhooks() {

    setBusy("webhooks");

    setError(null);

    try {

      await setupConvertyWebhooks();

      await refreshStatus();

    } catch (e) {

      setError(e instanceof Error ? e.message : "Webhook setup failed");

    } finally {

      setBusy(null);

    }

  }



  async function disconnect() {

    if (!confirm("Disconnect Converty? Order webhooks will stop and you'll need to reconnect.")) return;

    setBusy("disconnect");

    setError(null);

    try {

      const res = await fetch("/api/studio/converty/disconnect", { method: "POST" });

      if (!res.ok) {

        const data = await res.json();

        throw new Error(data.message || "Disconnect failed");

      }

      await refreshStatus();

    } catch (e) {

      setError(e instanceof Error ? e.message : "Disconnect failed");

    } finally {

      setBusy(null);

    }

  }



  const connected = status.connected;

  const store = status.store;



  return (

    <div className="panel" data-screen-label="Converty">

      <div className="p-head">

        <div>

          <h3>Converty storefront</h3>

          <div className="sub">Connect your Converty store to sync customers, orders, and COD statuses in real time.</div>

        </div>

        {connected ? (

          <span className="status-pill live">

            <span className="ld" />Connected

          </span>

        ) : (

          <span className="status-pill">

            <span className="sync-dot" style={{ width: 6, height: 6, background: "#A99E90" }} />

            Not connected

          </span>

        )}

      </div>



      {callbackStatus === "connected" && (

        <div style={{ margin: "0 0 16px", padding: "10px 14px", borderRadius: 10, background: "rgba(62,142,90,.1)", color: "var(--pos-fg)", fontSize: 13, fontWeight: 600 }}>

          Converty store connected successfully.


        </div>

      )}

      {callbackStatus === "error" && (

        <div style={{ margin: "0 0 16px", padding: "10px 14px", borderRadius: 10, background: "rgba(194,96,60,.1)", color: "#C2603C", fontSize: 13, fontWeight: 600 }}>

          Connection failed{callbackMessage ? `: ${callbackMessage}` : "."}

        </div>

      )}

      {error && (

        <div style={{ margin: "0 0 16px", padding: "10px 14px", borderRadius: 10, background: "rgba(194,96,60,.1)", color: "#C2603C", fontSize: 13, fontWeight: 600 }}>

          {error}

        </div>

      )}



      {!status.configured ? (

        <div className="integration-unavailable"><strong>Store connection is temporarily unavailable</strong><p>Contact your Fidely administrator to enable the Converty integration.</p><details><summary>Developer setup</summary><p>The server requires <code>CONVERTY_CLIENT_ID</code>, <code>CONVERTY_CLIENT_SECRET</code>, <code>CONVERTY_REDIRECT_URI</code>, and <code>TOKEN_ENCRYPTION_KEY</code>.</p></details></div>

      ) : connected && store ? (

        <div className="stat-list" style={{ marginBottom: 16 }}>

          <div className="stat-row">

            <span>Store</span>

            <b>{store.name || "—"}</b>

          </div>

          {store.domain && (

            <div className="stat-row">

              <span>Domain</span>

              <a href={store.domain} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>

                {store.slug ? `${store.slug}.converty.shop` : store.domain}

              </a>

            </div>

          )}

          <div className="stat-row">

            <span>Currency</span>

            <b>{store.currency || "—"}</b>

          </div>

          <div className="stat-row">
            <span>Data health</span>
            <b style={{ color: status.health === "healthy" ? "var(--pos-fg)" : status.health === "attention" ? "#C2603C" : undefined }}>
              {status.health === "healthy" ? "Healthy" : status.health === "attention" ? "Needs attention" : "Sync overdue"}
            </b>
          </div>
          <div className="stat-row">
            <span>Latest data update</span>
            <b>{status.lastDataAt ? syncAgo(status.lastDataAt) : "Never"}</b>
          </div>
          <div className="stat-row">
            <span>Last full import</span>
            <b>{status.lastSyncAt ? `${status.lastSyncOrderCount} orders processed` : "Not run"}</b>
          </div>
          <div className="stat-row">
            <span>Last webhook received</span>
            <b>{status.lastWebhookAt ? syncAgo(status.lastWebhookAt) : "None yet"}</b>
          </div>
          <div className="stat-row">
            <span>Webhooks</span>
            <b>{status.webhooksActive ? "Active" : "Inactive"}</b>
          </div>
          {!status.webhookScopesGranted && (
            <div className="stat-row">
              <span>Webhook permissions</span>
              <b style={{ color: "#C2603C" }}>Reconnect required</b>
            </div>
          )}
          {(status.lastSyncError || status.lastWebhookError) && (
            <div className="stat-row">
              <span>Latest error</span>
              <b style={{ color: "#C2603C", maxWidth: 420, textAlign: "right" }}>{status.lastSyncError || status.lastWebhookError}</b>
            </div>
          )}

        </div>

      ) : (

        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 16 }}>

          Authorize Fidely Studio to read orders from your Converty store. After connecting, orders flow in automatically via webhooks.

        </p>

      )}



      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

        {!connected ? (

          <button className="btn btn-primary" onClick={connect} disabled={!status.configured || busy !== null}>

            {busy === "connect" ? "Redirecting…" : "Connect Converty store"}

          </button>

        ) : (

          <>

            <button className="btn btn-secondary" onClick={sync} disabled={busy !== null}>

              {busy === "sync" ? "Importing…" : "Backfill historical orders"}

            </button>

            {!status.webhookScopesGranted ? (
              <button className="btn btn-primary" onClick={connect} disabled={busy !== null}>
                {busy === "connect" ? "Redirecting…" : "Reconnect with webhook access"}
              </button>
            ) : !status.webhooksActive && (

              <button className="btn btn-secondary" onClick={repairWebhooks} disabled={busy !== null}>

                {busy === "webhooks" ? "Repairing…" : "Repair webhooks"}

              </button>

            )}

            <button className="btn btn-secondary" onClick={disconnect} disabled={busy !== null}>

              {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}

            </button>

          </>

        )}

      </div>

    </div>

  );

}


