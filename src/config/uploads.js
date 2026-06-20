import path from "node:path";

export function getUploadsRoot() {
  const configuredPath = process.env.UPLOADS_DIR;

  if (!configuredPath) {
    return path.resolve(process.cwd(), "uploads");
  }

  return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(process.cwd(), configuredPath);
}
