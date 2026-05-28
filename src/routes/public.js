import express from "express";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Settings } from "../models/Settings.js";

export const publicRouter = express.Router();

async function getSettings() {
  return Settings.findOneAndUpdate(
    { singleton: "site" },
    { $setOnInsert: { singleton: "site" } },
    { upsert: true, new: true }
  ).lean();
}

publicRouter.get("/site-data", async (_req, res) => {
  const [settings, categories, items] = await Promise.all([
    getSettings(),
    Category.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    Item.find({ isAvailable: true }).populate("category").sort({ sortOrder: 1, createdAt: 1 }).lean(),
  ]);

  res.json({ settings, categories, items });
});
