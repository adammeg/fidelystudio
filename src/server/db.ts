import mongoose from "mongoose";

const globalMongo = globalThis as typeof globalThis & {
  __fidelyMongo?: Promise<typeof mongoose>;
};

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");

  if (!globalMongo.__fidelyMongo) {
    globalMongo.__fidelyMongo = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  return globalMongo.__fidelyMongo;
}
