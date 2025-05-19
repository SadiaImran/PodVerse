// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD9YH5pD9ZqrQSV1CFt42KL_SIydC1fayU",
    authDomain: "podverse-auth.firebaseapp.com",
    projectId: "podverse-auth",
    storageBucket: "podverse-auth.firebasestorage.app",
    messagingSenderId: "300048378637",
    appId: "1:300048378637:web:b3142aac686d39d91f9e44",
    measurementId: "G-W8RMTH2WED"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
