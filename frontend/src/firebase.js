import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

let app = null;
let auth = null;
let googleProvider = null;

try {
  if (firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
} catch (err) {
  console.warn("Firebase initialization skipped or failed:", err);
}

export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    // If Firebase config is not provided in env, provide helpful guidance
    throw new Error(
      "Firebase is not configured yet. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_AUTH_DOMAIN in frontend/.env"
    );
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export { app, auth, googleProvider };
export default app;
