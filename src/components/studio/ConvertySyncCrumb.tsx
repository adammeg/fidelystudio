import Link from "next/link";
import { getConvertyStatus } from "@/lib/studio";
import { syncAgo } from "@/lib/format";

interface Props {
  detail?: string;
  className?: string;
}

export default async function ConvertySyncCrumb({
  detail = "Customers, orders & COD statuses synced",
  className = "crumb sync",
}: Props) {
  const status = await getConvertyStatus();

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
