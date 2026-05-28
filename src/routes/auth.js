import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { requireAdmin } from "../middleware/auth.js";
import { Admin } from "../models/Admin.js";

export const authRouter = express.Router();

function signAdmin(admin) {
  return jwt.sign({ sub: admin._id.toString(), email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

authRouter.post("/bootstrap", async (req, res) => {
  const adminCount = await Admin.countDocuments();

  if (adminCount > 0) {
    return res.status(409).json({ message: "Admin already exists" });
  }

  if (!process.env.ADMIN_SETUP_KEY || req.body.setupKey !== process.env.ADMIN_SETUP_KEY) {
    return res.status(403).json({ message: "Invalid setup key" });
  }

  const { email, password, name } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ message: "Email and password with at least 8 chars are required" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await Admin.create({ email, name, passwordHash });

  res.status(201).json({
    token: signAdmin(admin),
    admin: { id: admin._id, email: admin.email, name: admin.name },
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: String(email || "").toLowerCase() });

  if (!admin || !(await bcrypt.compare(password || "", admin.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json({
    token: signAdmin(admin),
    admin: { id: admin._id, email: admin.email, name: admin.name },
  });
});

authRouter.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: { id: req.admin._id, email: req.admin.email, name: req.admin.name } });
});
