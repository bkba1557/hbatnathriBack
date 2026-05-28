import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../config/db.js";
import { Admin } from "../models/Admin.js";

await connectDb();

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
}

const exists = await Admin.findOne({ email: email.toLowerCase() });

if (exists) {
  console.log("Admin already exists");
  process.exit(0);
}

await Admin.create({
  email,
  name: "Admin",
  passwordHash: await bcrypt.hash(password, 12),
});

console.log("Admin created");
process.exit(0);
