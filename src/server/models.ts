import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    convertyStoreId: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null, lowercase: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    ownerName: { type: String, default: null, trim: true },
    logoUrl: { type: String, default: null },
    currency: { type: String, default: "DZD" },
    country: { type: String, default: null },
    role: { type: String, enum: ["shop", "admin"], default: "shop" },
    passwordHash: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

const SessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

const OAuthStateSchema = new Schema(
  {
    stateHash: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", default: null },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

const ConvertyConnectionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, unique: true, index: true },
    convertyStoreId: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    scopes: { type: [String], default: [] },
    storeName: { type: String, default: null },
    storeSlug: { type: String, default: null },
    storeDomain: { type: String, default: null },
    currency: { type: String, default: "DZD" },
    country: { type: String, default: null },
    webhookIds: { type: [String], default: [] },
    webhookSecret: { type: String, required: true },
    webhookSecretHash: { type: String, required: true, unique: true, index: true },
    lastSyncAt: { type: Date, default: null },
    lastSyncStartedAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null },
    lastSyncOrderCount: { type: Number, default: 0 },
    lastWebhookAt: { type: Date, default: null },
    lastWebhookError: { type: String, default: null },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WhatsAppConnectionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, unique: true, index: true },
    instanceName: { type: String, required: true, unique: true, index: true },
    instanceId: { type: String, default: null },
    status: { type: String, enum: ["disconnected", "connecting", "connected"], default: "disconnected" },
    phone: { type: String, default: null },
    webhookSecretHash: { type: String, required: true, unique: true, index: true },
    lastStatusAt: { type: Date, default: null },
    lastWebhookAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    connectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const CustomerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: null },
    points: { type: Number, default: 0 },
    tier: { type: String, default: "Member" },
    note: { type: String, default: null },
    tags: { type: [String], default: [] },
    lastDeliveredAt: { type: Date, default: null },
    source: { type: Schema.Types.Mixed, default: { type: "direct" } },
    marketingConsent: {
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
    lastMessagedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
CustomerSchema.index({ user: 1, phone: 1 }, { unique: true });

const OrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "StudioCustomer", required: true, index: true },
    convertyOrderId: { type: String, required: true },
    reference: { type: String, default: null },
    status: { type: String, required: true },
    paymentStatus: { type: String, default: null },
    amount: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    raw: { type: Schema.Types.Mixed, default: null },
    placedAt: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
    sourceUpdatedAt: { type: Date, default: null },
    attributedCampaign: { type: Schema.Types.ObjectId, ref: "StudioCampaign", default: null, index: true },
  },
  { timestamps: true }
);
OrderSchema.index({ user: 1, convertyOrderId: 1 }, { unique: true });

const CampaignSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    type: { type: String, default: "loyalty" },
    state: { type: String, default: "scheduled" },
    goal: { type: String, default: "Repeat purchase" },
    budget: { type: Number, default: 0 },
    customerDiscountPct: { type: Number, default: 0 },
    commissionPct: { type: Number, default: 0 },
    durationLabel: { type: String, default: null },
    channels: { type: [String], default: [] },
    segmentKey: { type: String, default: null },
    incentiveType: { type: String, default: null },
    message: { type: String, default: null },
    scheduledAt: { type: Date, default: null },
    attributionDays: { type: Number, default: 14 },
    audienceCount: { type: Number, default: 0 },
    eligibleCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
CampaignSchema.index({ user: 1, slug: 1 }, { unique: true });

const CampaignRecipientSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    campaign: { type: Schema.Types.ObjectId, ref: "StudioCampaign", required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "StudioCustomer", required: true, index: true },
    channel: { type: String, enum: ["whatsapp"], required: true },
    destination: { type: String, required: true },
    status: { type: String, enum: ["queued", "excluded_consent", "excluded_frequency", "sent", "delivered", "failed"], required: true },
    providerMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);
CampaignRecipientSchema.index({ campaign: 1, customer: 1, channel: 1 }, { unique: true });

const InfluencerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    handle: { type: String, required: true },
    platform: { type: String, default: "instagram" },
    code: { type: String, required: true },
    link: { type: String, default: null },
    commissionPct: { type: Number, default: 8 },
    paidOut: { type: Number, default: 0 },
  },
  { timestamps: true }
);
InfluencerSchema.index({ user: 1, code: 1 }, { unique: true });

const ConfigSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    key: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);
ConfigSchema.index({ user: 1, key: 1 }, { unique: true });

const SubscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, unique: true, index: true },
    plan: { type: String, enum: ["fidely"], default: "fidely" },
    status: { type: String, enum: ["trialing", "active", "past_due", "cancelled"], default: "trialing" },
    trialEndsAt: { type: Date, required: true },
    currentPeriodEndsAt: { type: Date, default: null },
    providerCustomerId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },
  },
  { timestamps: true }
);

const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "StudioUser", required: true, index: true },
    action: { type: String, required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: "StudioUser", default: null, index: true },
    details: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export const StudioUser =
  mongoose.models.StudioUser || mongoose.model("StudioUser", UserSchema);
export const StudioSession =
  mongoose.models.StudioSession || mongoose.model("StudioSession", SessionSchema);
export const StudioOAuthState =
  mongoose.models.StudioOAuthState || mongoose.model("StudioOAuthState", OAuthStateSchema);
export const StudioConvertyConnection =
  mongoose.models.StudioConvertyConnection ||
  mongoose.model("StudioConvertyConnection", ConvertyConnectionSchema);
export const StudioWhatsAppConnection =
  mongoose.models.StudioWhatsAppConnection ||
  mongoose.model("StudioWhatsAppConnection", WhatsAppConnectionSchema);
export const StudioCustomer =
  mongoose.models.StudioCustomer || mongoose.model("StudioCustomer", CustomerSchema);
export const StudioOrder =
  mongoose.models.StudioOrder || mongoose.model("StudioOrder", OrderSchema);
export const StudioCampaign =
  mongoose.models.StudioCampaign || mongoose.model("StudioCampaign", CampaignSchema);
export const StudioInfluencer =
  mongoose.models.StudioInfluencer || mongoose.model("StudioInfluencer", InfluencerSchema);
export const StudioConfig =
  mongoose.models.StudioConfig || mongoose.model("StudioConfig", ConfigSchema);
export const StudioSubscription =
  mongoose.models.StudioSubscription || mongoose.model("StudioSubscription", SubscriptionSchema);
export const StudioCampaignRecipient =
  mongoose.models.StudioCampaignRecipient || mongoose.model("StudioCampaignRecipient", CampaignRecipientSchema);
export const StudioAuditLog =
  mongoose.models.StudioAuditLog || mongoose.model("StudioAuditLog", AuditLogSchema);
