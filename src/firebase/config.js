import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Your web app's Firebase configuration
// (Copy this object from Firebase Console > Project Settings > General > Your Apps)
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

// Initialize Services
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// 🛠️ CONNECT TO EMULATORS (The Magic Part)
// This code checks if you are running on localhost (npm run dev)
// and redirects traffic to the emulators you just started.
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  console.log("⚠️ TEST MODE: Using Local Firebase Emulators");

  // Connect to the ports shown in your terminal output
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export { app, auth, provider, db, storage, functions };
export default app;
