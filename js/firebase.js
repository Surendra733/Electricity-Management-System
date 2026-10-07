// =====================================================
// FIREBASE CONFIGURATION
// =====================================================


import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";


import {
  getAuth,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  deleteDoc,
  limit,
  runTransaction
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";



// =====================================================
// YOUR FIREBASE PROJECT
// =====================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyDFxc5tUA6MkDtVABFIPnMh7kdtTOkOPPA",

  authDomain:
    "electricity-management-s-152ad.firebaseapp.com",

  databaseURL:
    "https://electricity-management-s-152ad-default-rtdb.firebaseio.com",

  projectId:
    "electricity-management-s-152ad",

  storageBucket:
    "electricity-management-s-152ad.firebasestorage.app",

  messagingSenderId:
    "422962145272",

  appId:
    "1:422962145272:web:5807c49cf269c98010580d"

};



// =====================================================
// INITIALIZE FIREBASE
// =====================================================

const app =
  initializeApp(firebaseConfig);



// =====================================================
// AUTHENTICATION
// =====================================================

const auth =
  getAuth(app);



// =====================================================
// FIRESTORE
// =====================================================

const db =
  getFirestore(app);



// =====================================================
// EXPORT
// =====================================================

export {

  app,

  auth,

  db,

  // Authentication
  onAuthStateChanged,

  signOut,

  createUserWithEmailAndPassword,

  signInWithEmailAndPassword,

  sendPasswordResetEmail,


  // Firestore
  doc,

  setDoc,

  getDoc,

  updateDoc,

  addDoc,

  collection,

  query,

  where,

  orderBy,

  getDocs,

  serverTimestamp,

  deleteDoc,

  limit,

  runTransaction

};