import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
function normalizeFirebasePrivateKey(rawKey: string | undefined): string {
  if (!rawKey) return "";

  // Remove accidental wrapping quotes added by some CI systems or shell exports
  let key = rawKey.replace(/^['"]|['"]$/g, "").trim();

  // Convert JSON-escaped newlines to real newlines
  key = key.replace(/\\n/g, "\n");

  // Normalize CRLF to LF to satisfy OpenSSL decoding in some environments
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // If it's base64 without headers, attempt to decode and check for PEM header
  const base64Candidate = key.replace(/\s+/g, "");
  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(base64Candidate) && base64Candidate.length % 4 === 0;
  if (!/BEGIN (RSA )?PRIVATE KEY/.test(key) && looksBase64) {
    try {
      const decoded = Buffer.from(base64Candidate, "base64").toString("utf8");
      if (/BEGIN (RSA )?PRIVATE KEY/.test(decoded)) {
        key = decoded;
      }
    } catch {
      // fall through; we'll validate below
    }
  }

  return key;
}

let ADMIN_READY = false;
let ADMIN_BROKEN = false;

function initFirebaseAdmin() {
  // Validate required server env vars
  const required = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[firebase-admin] Missing env vars: ${missing.join(", ")}. ` +
        `Admin features that require credentials will fail until configured.`
    );
  }

  // Optional but recommended: ensure client and admin target the same project
  const publicProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (
    publicProjectId &&
    process.env.FIREBASE_PROJECT_ID &&
    publicProjectId !== process.env.FIREBASE_PROJECT_ID
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `Firebase project mismatch: NEXT_PUBLIC_FIREBASE_PROJECT_ID (${publicProjectId}) ` +
        `!= FIREBASE_PROJECT_ID (${process.env.FIREBASE_PROJECT_ID}). ` +
        `Auth requests may fail until these match.`
    );
  }

  const apps = getApps();

  if (!apps.length) {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    // Prefer ADC whenever GOOGLE_APPLICATION_CREDENTIALS is present
    const useADC = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (useADC) {
      console.info("[firebase-admin] Initializing with Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS)");
      try {
        initializeApp({
          credential: applicationDefault(),
        });
        ADMIN_READY = true;
      } catch (err) {
        console.warn("[firebase-admin] ADC initialization failed:", err);
      }
    } else if (serviceAccountEnv) {
      // Support providing the entire service account JSON via env
      let jsonString = serviceAccountEnv.trim();
      // Strip accidental wrapping quotes
      jsonString = jsonString.replace(/^['"]|['"]$/g, "");

      // Base64 decode if it looks like base64
      const base64Candidate = jsonString.replace(/\s+/g, "");
      const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(base64Candidate) && base64Candidate.length % 4 === 0;
      if (looksBase64 && !jsonString.includes("{")) {
        try {
          jsonString = Buffer.from(base64Candidate, "base64").toString("utf8");
        } catch {
          // ignore, we'll attempt JSON parse below
        }
      }

      // If the JSON was itself JSON-stringified, parse twice
      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }
      } catch (err) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64-encoded JSON.");
      }

      const projectId = parsed.project_id || process.env.FIREBASE_PROJECT_ID;
      const clientEmail = parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = normalizeFirebasePrivateKey(parsed.private_key);

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT JSON is missing required fields: project_id, client_email, private_key.");
      }

      if (privateKey.includes("BEGIN ENCRYPTED PRIVATE KEY")) {
        throw new Error("Encrypted private keys are not supported. Provide an unencrypted service account private key.");
      }

      if (!/BEGIN (RSA )?PRIVATE KEY/.test(privateKey)) {
        throw new Error("Invalid private key format in FIREBASE_SERVICE_ACCOUNT. Expected PEM with 'BEGIN PRIVATE KEY' or 'BEGIN RSA PRIVATE KEY'.");
      }

      console.info("[firebase-admin] Initializing with FIREBASE_SERVICE_ACCOUNT JSON. Project:", projectId);
      try {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        ADMIN_READY = true;
      } catch (err) {
        console.warn("[firebase-admin] Service account JSON initialization failed:", err);
      }
    } else {
      const privateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

      if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY is empty.");
      }

      if (privateKey.includes("BEGIN ENCRYPTED PRIVATE KEY")) {
        throw new Error("Encrypted private keys are not supported. Provide an unencrypted service account private key.");
      }

      if (!/BEGIN (RSA )?PRIVATE KEY/.test(privateKey)) {
        throw new Error(
          "Invalid FIREBASE_PRIVATE_KEY. Ensure it's a valid PEM starting with '-----BEGIN PRIVATE KEY-----' or '-----BEGIN RSA PRIVATE KEY-----'. " +
            "If you stored it JSON-escaped, keep the \n sequences; if it's base64-encoded, provide the raw PEM or set the base64 value—both are supported."
        );
      }

      console.info("[firebase-admin] Initializing with service account key (PEM detected). Project:", process.env.FIREBASE_PROJECT_ID);
      try {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
        });
        ADMIN_READY = true;
      } catch (err) {
        console.warn("[firebase-admin] PEM initialization failed:", err);
      }
    }
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export const { auth, db } = initFirebaseAdmin();
export const isAdminReady = () => ADMIN_READY;
export const disableAdminAuth = () => {
  ADMIN_READY = false;
  ADMIN_BROKEN = true;
};
