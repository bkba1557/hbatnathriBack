import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import morgan from "morgan";
import { connectDb } from "./config/db.js";
import { getUploadsRoot } from "./config/uploads.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";

const app = express();
const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, "");
const origins = (process.env.CLIENT_ORIGIN || "").split(",").map(normalizeOrigin).filter(Boolean);
const allowedOrigins = new Set(origins);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(normalizeOrigin(origin))) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      return url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    const allowed = isAllowedOrigin(origin);

    if (!allowed) {
      console.warn(`Blocked CORS origin: ${origin}`);
    }

    callback(null, allowed);
  },
};

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, uploadStorage: "local", uploadsRoot: getUploadsRoot() });
});

app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);
app.use("/uploads", express.static(getUploadsRoot()));

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message || "Upload failed" });
  }

  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const port = Number(process.env.PORT || 6031);

await connectDb();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
