import crypto from "node:crypto";
import fs from "node:fs";
import readline from "node:readline";
import mongoose from "mongoose";

function loadLocalEnvironment() {
  if (process.env.MONGODB_URI || !fs.existsSync(".env.local")) return;
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function question(prompt, hidden = false) {
  if (!hidden || !process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(prompt, (answer) => { rl.close(); resolve(answer); }));
  }
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    const onData = (key) => {
      if (key === "\r" || key === "\n") { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off("data", onData); process.stdout.write("\n"); resolve(value); return; }
      if (key === "\u0003") process.exit(130);
      if (key === "\u007f" || key === "\b") { value = value.slice(0, -1); return; }
      value += key;
    };
    process.stdin.on("data", onData);
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}

loadLocalEnvironment();
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
const email = String(await question("Admin email: ")).trim().toLowerCase();
const password = String(await question("Admin password: ", true));
const confirmation = String(await question("Confirm password: ", true));
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address");
if (password.length < 12) throw new Error("Admin password must contain at least 12 characters");
if (password !== confirmation) throw new Error("Passwords do not match");

await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 10_000 });
const schema = new mongoose.Schema({ convertyStoreId: String, email: String, shopName: String, ownerName: String, role: String, passwordHash: { type: String, select: false } }, { timestamps: true });
const Admin = mongoose.models.StudioUser || mongoose.model("StudioUser", schema);
const existing = await Admin.findOne({ email }).select("role").lean();
if (existing && existing.role !== "admin") {
  await mongoose.disconnect();
  throw new Error("This email already belongs to a shop account; use a different administrator email");
}
await Admin.findOneAndUpdate(
  existing ? { _id: existing._id, role: "admin" } : { email, role: "admin" },
  { $set: { email, shopName: "Fidely Administration", ownerName: "Administrator", role: "admin", passwordHash: hashPassword(password) }, $setOnInsert: { convertyStoreId: `local:admin:${crypto.randomUUID()}` } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
await mongoose.disconnect();
process.stdout.write(`Administrator ${email} is stored in MongoDB.\n`);
