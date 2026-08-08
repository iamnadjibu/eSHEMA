import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// eSHEMA Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC5AhtXIhwshn1sD4nsb9l-B_k9AMan9i8",
  authDomain: "e-shema.firebaseapp.com",
  projectId: "e-shema",
  storageBucket: "e-shema.firebasestorage.app",
  messagingSenderId: "429280092287",
  appId: "1:429280092287:web:1704c1c31355ea2c965f4a",
  measurementId: "G-Z2D1DE8JVY"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics conditionally
export let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(() => {
  console.log("Analytics not supported in current environment.");
});
