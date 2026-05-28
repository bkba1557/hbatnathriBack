import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
    return admin.credential.cert(JSON.parse(json));
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : "";

  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    throw new Error("Firebase credentials are missing");
  }

  return admin.credential.cert(credentialsPath);
}

export function getStorageBucket() {
  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error("FIREBASE_STORAGE_BUCKET is required for image uploads");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredential(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  return admin.storage().bucket();
}
