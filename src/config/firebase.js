import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

const credentialSources = {
  base64: "FIREBASE_SERVICE_ACCOUNT_BASE64",
  json: "FIREBASE_SERVICE_ACCOUNT_JSON",
  envParts: "FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY",
  file: "GOOGLE_APPLICATION_CREDENTIALS",
};

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
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : "";

  return {
    storageBucket: Boolean(process.env.FIREBASE_STORAGE_BUCKET),
    serviceAccountBase64: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
    serviceAccountJson: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    serviceAccountEnvParts: Boolean(serviceAccountFromEnvParts()),
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

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : "";

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
