"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createInfluencer, updateCampaign } from "@/lib/studio-client";

interface Props {
  campaignSlug?: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export default function AddInfluencerModal({
  campaignSlug,
  triggerLabel = "Add influencer",
  triggerClassName = "btn btn-secondary",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [code, setCode] = useState("");
  const [commissionPct, setCommissionPct] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
      const res = await createInfluencer({
        handle: normalizedHandle,
        platform,
        code: code.toUpperCase(),
        commissionPct,
      });
      const influencerId = res.influencer?._id || res.influencer?.id;
      if (campaignSlug && influencerId) {
        await updateCampaign(campaignSlug, { addInfluencerIds: [String(influencerId)] });
      }
      setOpen(false);
      setHandle("");
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add influencer");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(43,36,30,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => !busy && setOpen(false)}
        >
          <form
            className="panel"
            style={{ width: "100%", maxWidth: 440, padding: "22px 24px" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Add influencer</h3>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 18 }}>
              Create a tracking code for a new influencer{campaignSlug ? " and attach them to this campaign" : ""}.
            </p>

            <div className="field">
              <label>Handle</label>
              <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@sarra" required />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Platform</label>
              <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Discount code</label>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SARRA10" required />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Commission %</label>
              <input className="input" type="number" min={0} max={100} value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} />
            </div>

            {error && <div className="login-error" style={{ marginTop: 14 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Adding…" : "Add influencer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
