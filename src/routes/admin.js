import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { getStorageBucket, hasFirebaseStorageConfig } from "../config/firebase.js";
import { requireAdmin } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Settings } from "../models/Settings.js";

export const adminRouter = express.Router();

adminRouter.use(requireAdmin);

const uploadsRoot = path.resolve(process.cwd(), "uploads");

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

  const extension = req.file.originalname.includes(".") ? req.file.originalname.split(".").pop().toLowerCase() : "jpg";
  const fileName = `menu/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;

  if (!hasFirebaseStorageConfig()) {
    if (process.env.LOCAL_UPLOADS !== "true") {
      return res.status(500).json({ message: "Firebase Storage is not configured for image uploads" });
    }

    const destination = path.join(uploadsRoot, fileName);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, req.file.buffer);

    return res.status(201).json({ url: `/uploads/${fileName}`, path: fileName, storage: "local" });
  }

  const bucket = getStorageBucket();
  const file = bucket.file(fileName);
  const downloadToken = crypto.randomUUID();

  await file.save(req.file.buffer, {
    metadata: {
      contentType: req.file.mimetype,
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const encodedPath = encodeURIComponent(fileName);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

  return res.status(201).json({ url, path: fileName, storage: "firebase" });
});
