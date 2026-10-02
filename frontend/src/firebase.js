import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBGemwiwPUSmCY7PJTkPCqFffqjnXYes6s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "farmflow-cc670.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "farmflow-cc670",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "farmflow-cc670.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "320774020488",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:320774020488:web:61702982e0fb7af00f2e3d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-NSRBRG23ZF"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth & Google Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Analytics if supported
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

// Singleton state to ensure getRedirectResult is handled exactly once per navigation/mount
let redirectResultPromise = null;
let redirectResultHandled = false;

export const signInWithGoogleRedirect = async () => {
  redirectResultPromise = null;
  redirectResultHandled = false;
  await signInWithRedirect(auth, googleProvider);
};

export const checkGoogleRedirectResult = async () => {
  if (redirectResultHandled) {
    return null;
  }
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .then((result) => {
        redirectResultHandled = true;
        return result ? result.user : null;
      })
      .catch((error) => {
        redirectResultHandled = true;
        throw error;
      });
  }
  return redirectResultPromise;
};

// Reliable redirect flow is the default Google sign-in to eliminate COOP window.closed warnings and popup blocker issues
export const signInWithGoogle = signInWithGoogleRedirect;

// Optional popup flow with proper error handling if ever needed
export const signInWithGooglePopup = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export { app, auth, googleProvider, analytics };
export default app;
