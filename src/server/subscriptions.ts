import { StudioSubscription } from "./models";

export async function ensureSubscription(userId: string) {
  const subscription = await StudioSubscription.findOneAndUpdate(
    { user: userId },
    {
      $set: { plan: "fidely" },
      $setOnInsert: {
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 7 * 86_400_000),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (subscription.status === "pending_payment") {
    subscription.status = "trialing";
    subscription.trialEndsAt = new Date(Date.now() + 7 * 86_400_000);
    await subscription.save();
  }
  return subscription;
}
