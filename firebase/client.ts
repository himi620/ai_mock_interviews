// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
// Soft-validate envs: warn instead of throwing to keep app booting even if not configured yet
const missingEnvVars: string[] = [];
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missingEnvVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missingEnvVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingEnvVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) missingEnvVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) missingEnvVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID) missingEnvVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');

if (missingEnvVars.length > 0) {
  console.warn(
    '[firebase-client] Missing Firebase envs:', missingEnvVars.join(', '),
    '\nThe app UI will load, but authentication may fail until these are set.'
  );
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
