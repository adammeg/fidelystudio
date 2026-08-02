export const CAMPAIGN_CHANNELS = ["whatsapp"] as const;
export type CampaignChannel = typeof CAMPAIGN_CHANNELS[number];
export type RecipientStatus = "queued" | "excluded_consent" | "excluded_frequency";

export type CampaignAudienceCustomer = {
  id: string;
  phone: string | null;
  email: string | null;
  marketingConsent?: Partial<Record<CampaignChannel, boolean>> | null;
  lastMessagedAt?: Date | string | null;
};

export function snapshotAudience(
  audience: CampaignAudienceCustomer[],
  channels: CampaignChannel[],
  now = new Date(),
  frequencyDays = 7
) {
  const cutoff = now.getTime() - frequencyDays * 86_400_000;
  const recipients = audience.flatMap((customer) => channels.map((channel) => {
    const destination = customer.phone;
    const consent = customer.marketingConsent?.[channel] === true;
    const lastMessage = customer.lastMessagedAt ? new Date(customer.lastMessagedAt).getTime() : 0;
    const status: RecipientStatus = !consent || !destination
      ? "excluded_consent"
      : lastMessage > cutoff
        ? "excluded_frequency"
        : "queued";
    return { customerId: customer.id, channel, destination: destination || "unavailable", status };
  }));
  const eligibleCustomerCount = new Set(recipients.filter((recipient) => recipient.status === "queued").map((recipient) => recipient.customerId)).size;
  return {
    recipients,
    eligibleCustomerCount,
    queuedMessageCount: recipients.filter((recipient) => recipient.status === "queued").length,
    excludedConsentCount: recipients.filter((recipient) => recipient.status === "excluded_consent").length,
    excludedFrequencyCount: recipients.filter((recipient) => recipient.status === "excluded_frequency").length,
  };
}
