import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, onSnapshot, setDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getDatabase, ref, set, get, onValue, push, remove, child } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1vFbD8Q8bUCbzPOVZjkgL1PtAKsP4a5s",
  authDomain: "outrach-crm.firebaseapp.com",
  projectId: "outrach-crm",
  storageBucket: "outrach-crm.firebasestorage.app",
  messagingSenderId: "106217035980",
  appId: "1:106217035980:web:637f74425ab7b97fa6ca69",
  databaseURL: "https://outrach-crm-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

export { 
    app, auth, db, database, provider, 
    signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    collection, addDoc, getDocs, updateDoc, doc, deleteDoc, onSnapshot, setDoc, query, orderBy, getDoc,
    ref, set, get, onValue, push, remove, child
};
