import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

export function getUploadsRoot() {
  const configuredPath = process.env.UPLOADS_DIR;

  if (!configuredPath) {
    return path.join(projectRoot, "uploads");
  }

  return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(projectRoot, configuredPath);
}
