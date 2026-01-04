import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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

// Initialize Authentication
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
export default app;
