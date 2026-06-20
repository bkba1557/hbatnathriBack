import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { getUploadsRoot } from "../config/uploads.js";
import { requireAdmin } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Settings } from "../models/Settings.js";

export const adminRouter = express.Router();

adminRouter.use(requireAdmin);

const uploadsRoot = getUploadsRoot();

async function getSettings() {
  return Settings.findOneAndUpdate(
    { singleton: "site" },
    { $setOnInsert: { singleton: "site" } },
    { upsert: true, new: true }
  );
}

adminRouter.get("/settings", async (_req, res) => {
  res.json(await getSettings());
});

adminRouter.put("/settings", async (req, res) => {
  const allowed = {
    restaurantName: req.body.restaurantName,
    locationUrl: req.body.locationUrl,
    phones: req.body.phones,
    socialLinks: req.body.socialLinks,
  };

  const settings = await Settings.findOneAndUpdate(
    { singleton: "site" },
    { $set: allowed },
    { upsert: true, new: true, runValidators: true }
  );

  res.json(settings);
});

adminRouter.get("/categories", async (_req, res) => {
  res.json(await Category.find().sort({ sortOrder: 1, createdAt: 1 }));
});

adminRouter.post("/categories", async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

adminRouter.put("/categories/:id", async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  res.json(category);
});

adminRouter.delete("/categories/:id", async (req, res) => {
  const used = await Item.exists({ category: req.params.id });

  if (used) {
    return res.status(409).json({ message: "Cannot delete a category that has items" });
  }

  await Category.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

adminRouter.get("/items", async (_req, res) => {
  res.json(await Item.find().populate("category").sort({ sortOrder: 1, createdAt: 1 }));
});

adminRouter.get("/upload-config", (_req, res) => {
  res.json({
    provider: "local",
    uploadsPath: "/uploads",
  });
});

adminRouter.post("/items", async (req, res) => {
  const item = await Item.create(req.body);
  res.status(201).json(await item.populate("category"));
});

adminRouter.put("/items/:id", async (req, res) => {
  const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate("category");

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json(item);
});

adminRouter.delete("/items/:id", async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

adminRouter.post("/upload", imageUpload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image is required" });
  }

  const extension = path.extname(req.file.originalname).slice(1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `menu/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
  const destination = path.join(uploadsRoot, fileName);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, req.file.buffer);

  const url = `/uploads/${fileName}`;

  if (req.body.itemId) {
    const item = await Item.findByIdAndUpdate(req.body.itemId, { imageUrl: url }, { new: true, runValidators: true });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
  }

  return res.status(201).json({ url, path: fileName, storage: "local" });
});
