import "dotenv/config";
import fs from "node:fs/promises";
import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { Admin } from "../models/Admin.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "").trim();

if (!email || email === "admin@example.com") {
  throw new Error("Set a real ADMIN_EMAIL in .env before running create:admin-file");
}

if (!password || password === "change-me") {
  throw new Error("Set a real ADMIN_PASSWORD in .env before running create:admin-file");
}

await connectDb();

const admin = await Admin.findOneAndUpdate(
  { email },
  {
    $set: {
      email,
      name: "Admin",
      passwordHash: await bcrypt.hash(password, 12),
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

await fs.writeFile(
  "admin-user.json",
  JSON.stringify(
    {
      role: "admin",
      email: admin.email,
      password,
      loginUrl: "http://127.0.0.1:5175/#admin",
      apiUrl: `http://localhost:${process.env.PORT || 5000}`,
      createdAt: new Date().toISOString(),
      note: "Local development admin credentials. Do not commit this file.",
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Admin ready: ${admin.email}`);
console.log("Credentials written to admin-user.json");
process.exit(0);
