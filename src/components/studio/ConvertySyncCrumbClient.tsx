"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { syncAgo } from "@/lib/format";
import type { ConvertyStatus } from "@/lib/studio";

interface Props {
  detail?: string;
  className?: string;
}

export default function ConvertySyncCrumbClient({
  detail = "Customers, orders & COD statuses synced",
  className = "crumb sync",
}: Props) {
  const [status, setStatus] = useState<ConvertyStatus | null>(null);

  useEffect(() => {
    fetch("/api/studio/converty/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) {
    return (
      <div className={className}>
        <span className="sync-dot" style={{ background: "#A99E90", boxShadow: "0 0 0 3px rgba(169,158,144,.16)" }} />
        Checking Converty connection…
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className={className}>
        <span className="sync-dot" style={{ background: "#C98A2B", boxShadow: "0 0 0 3px rgba(201,138,43,.16)" }} />
        Converty integration pending server setup
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className={className}>
        <span className="sync-dot" style={{ background: "#A99E90", boxShadow: "0 0 0 3px rgba(169,158,144,.16)" }} />
        Converty not connected ·{" "}
        <Link href="/settings" style={{ fontWeight: 700 }}>
          Connect your store
        </Link>
      </div>
    );
  }

  const storeLabel = status.store?.name || "Converty store";
  const syncLabel = status.lastDataAt ? `Last update ${syncAgo(status.lastDataAt)}` : "Awaiting first import";

  return (
    <div className={className}>
      <span className="sync-dot" />
      Connected to {storeLabel} · <b>{detail}</b> · {syncLabel}
    </div>
  );
}
