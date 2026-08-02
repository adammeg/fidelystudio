import { StudioSubscription } from "./models";

export function ensureSubscription(userId: string) {
  return StudioSubscription.findOneAndUpdate(
    { user: userId },
    {
      $set: { plan: "fidely" },
      $setOnInsert: {
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}
