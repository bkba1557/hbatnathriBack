import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { getUploadsRoot } from "../config/uploads.js";

const uploadsRoot = getUploadsRoot();
const menuUploadsRoot = path.join(uploadsRoot, "menu");

function safeExtension(fileName) {
  return path.extname(fileName).slice(1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

export const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdir(menuUploadsRoot, { recursive: true }, (error) => cb(error, menuUploadsRoot));
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${safeExtension(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(Object.assign(new Error("Only image files are allowed"), { status: 400 }));
      return;
    }

    cb(null, true);
  },
});

export const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 700 * 1024,
  },
});
