// ---------------------------------------------------------------
// Get the Firebase project config from: Firebase Console → Project settings → General →
// "Your apps" → Web app → SDK setup and configuration.
// This is safe to make public — Firestore security rules (not this file) are what actually protect the data.
// ---------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOHJXcjkzTy7NAb9nRgKNIFMVSn152_4s",
  authDomain: "the-great-books-04.firebaseapp.com",
  projectId: "the-great-books-04",
  storageBucket: "the-great-books-04.firebasestorage.app",
  messagingSenderId: "656637126401",
  appId: "1:656637126401:web:d0524654f464519380dd00",
  measurementId: "G-7810RBLP96",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
