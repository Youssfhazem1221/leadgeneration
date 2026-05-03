import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, onSnapshot, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1vFbD8Q8bUCbzPOVZjkgL1PtAKsP4a5s",
  authDomain: "outrach-crm.firebaseapp.com",
  projectId: "outrach-crm",
  storageBucket: "outrach-crm.firebasestorage.app",
  messagingSenderId: "106217035980",
  appId: "1:106217035980:web:637f74425ab7b97fa6ca69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, onSnapshot, setDoc, query, orderBy };
