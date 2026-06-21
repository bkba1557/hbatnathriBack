import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import { getUploadsRoot } from "../config/uploads.js";
import { requireAdmin } from "../middleware/auth.js";
import { chunkUpload, imageUpload } from "../middleware/upload.js";
import { Category } from "../models/Category.js";
import { Item } from "../models/Item.js";
import { Settings } from "../models/Settings.js";

export const adminRouter = express.Router();

adminRouter.use(requireAdmin);

const uploadsRoot = getUploadsRoot();
const chunkUploadsRoot = path.join(uploadsRoot, ".chunks");

function safeExtension(fileName) {
  return path.extname(fileName || "").slice(1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function safeUploadId(uploadId) {
  const normalized = String(uploadId || "");
  return /^[a-zA-Z0-9_-]{8,100}$/.test(normalized) ? normalized : "";
}

function chunkPath(uploadId, chunkIndex) {
  return path.join(chunkUploadsRoot, uploadId, `${chunkIndex}.part`);
}

async function updateItemImage(itemId, imageUrl) {
  if (!itemId) {
    return null;
  }

  return Item.findByIdAndUpdate(itemId, { imageUrl }, { new: true, runValidators: true });
}

async function assembleChunks({ uploadId, totalChunks, originalName }) {
  const extension = safeExtension(originalName);
  const fileName = `menu/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
  const destination = path.join(uploadsRoot, fileName);

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, "");

  for (let index = 0; index < totalChunks; index += 1) {
    const partPath = chunkPath(uploadId, index);
    const part = await fs.readFile(partPath);
    await fs.appendFile(destination, part);
  }

  await fs.rm(path.join(chunkUploadsRoot, uploadId), { recursive: true, force: true });

  return { fileName, url: `/uploads/${fileName}` };
}

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

  const fileName = `menu/${req.file.filename}`;
  const url = `/uploads/${fileName}`;

  if (req.body.itemId) {
    const item = await updateItemImage(req.body.itemId, url);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
  }

  return res.status(201).json({ url, path: fileName, storage: "local" });
});

adminRouter.post("/upload-chunk", chunkUpload.single("chunk"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image chunk is required" });
  }

  const uploadId = safeUploadId(req.body.uploadId);
  const chunkIndex = Number(req.body.chunkIndex);
  const totalChunks = Number(req.body.totalChunks);

  if (!uploadId || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks < 1 || chunkIndex < 0 || chunkIndex >= totalChunks) {
    return res.status(400).json({ message: "Invalid upload chunk metadata" });
  }

  await fs.mkdir(path.join(chunkUploadsRoot, uploadId), { recursive: true });
  await fs.writeFile(chunkPath(uploadId, chunkIndex), req.file.buffer);

  if (chunkIndex < totalChunks - 1) {
    return res.status(202).json({ done: false, chunkIndex });
  }

  for (let index = 0; index < totalChunks; index += 1) {
    try {
      await fs.access(chunkPath(uploadId, index));
    } catch {
      return res.status(202).json({ done: false, chunkIndex, waitingForChunks: true });
    }
  }

  const result = await assembleChunks({
    uploadId,
    totalChunks,
    originalName: req.body.originalName || req.file.originalname,
  });

  if (req.body.itemId) {
    const item = await updateItemImage(req.body.itemId, result.url);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
  }

  return res.status(201).json({ done: true, url: result.url, path: result.fileName, storage: "local" });
});
