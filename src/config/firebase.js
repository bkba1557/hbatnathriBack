import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

const credentialSources = {
  base64: "FIREBASE_SERVICE_ACCOUNT_BASE64",
  json: "FIREBASE_SERVICE_ACCOUNT_JSON",
  envParts: "FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY",
  serviceAccountPath: "FIREBASE_SERVICE_ACCOUNT_PATH",
  file: "GOOGLE_APPLICATION_CREDENTIALS",
};

function resolveServiceAccountPath(inputPath) {
  if (!inputPath) {
    return "";
  }

  return path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
}

function normalizeServiceAccount(serviceAccount) {
  if (serviceAccount?.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  return serviceAccount;
}

function serviceAccountFromEnvParts() {
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY ||
    (process.env.FIREBASE_PRIVATE_KEY_BASE64
      ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, "base64").toString("utf8")
      : "");

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    return null;
  }

  return normalizeServiceAccount({
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey,
  });
}

export function getFirebaseConfigStatus() {
  const serviceAccountPath = resolveServiceAccountPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  const credentialsPath = resolveServiceAccountPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  return {
    storageBucket: Boolean(process.env.FIREBASE_STORAGE_BUCKET),
    serviceAccountBase64: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
    serviceAccountJson: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    serviceAccountEnvParts: Boolean(serviceAccountFromEnvParts()),
    serviceAccountPath: Boolean(serviceAccountPath && fs.existsSync(serviceAccountPath)),
    credentialsFile: Boolean(credentialsPath && fs.existsSync(credentialsPath)),
  };
}

export function hasFirebaseStorageConfig() {
  const status = getFirebaseConfigStatus();

  return Boolean(
    status.storageBucket &&
      (status.serviceAccountBase64 ||
        status.serviceAccountJson ||
        status.serviceAccountEnvParts ||
        status.serviceAccountPath ||
        status.credentialsFile)
  );
}

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
    return admin.credential.cert(normalizeServiceAccount(JSON.parse(json)));
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.credential.cert(normalizeServiceAccount(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)));
  }

  const envPartsAccount = serviceAccountFromEnvParts();
  if (envPartsAccount) {
    return admin.credential.cert(envPartsAccount);
  }

  const serviceAccountPath = resolveServiceAccountPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    return admin.credential.cert(serviceAccountPath);
  }

  const credentialsPath = resolveServiceAccountPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    throw new Error(
      `Firebase credentials are missing. Configure one of: ${Object.values(credentialSources).join(", ")}`
    );
  }

  return admin.credential.cert(credentialsPath);
}

export function getStorageBucket() {
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error("FIREBASE_STORAGE_BUCKET is required for image uploads");
  }

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET.replace(/^gs:\/\//, "");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
      storageBucket,
    });
  }

  return admin.storage().bucket();
}
