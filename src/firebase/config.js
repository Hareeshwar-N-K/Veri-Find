import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTuF42aPpB8TtaO37AUkBiH4YcsmzDEq8",
  authDomain: "veri-find.firebaseapp.com",
  projectId: "veri-find",
  storageBucket: "veri-find.firebasestorage.app",
  messagingSenderId: "185683499960",
  appId: "1:185683499960:web:f356238251fcdb3e450d4d",
  measurementId: "G-1LTK3VZC4V",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services (Free tier - no Cloud Functions)
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, provider, db, storage };
export default app;
