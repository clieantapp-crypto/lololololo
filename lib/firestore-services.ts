import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firestore";
import type { InsuranceApplication, ChatMessage } from "./firestore-types";

// Applications
export const createApplication = async (
  data: Omit<InsuranceApplication, "id" | "createdAt" | "updatedAt">
) => {
  const docRef = await addDoc(collection(db, "pays"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateApplication = async (
  id: string,
  data: Partial<InsuranceApplication>
) => {
  const docRef = doc(db, "pays", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const getApplication = async (id: string) => {
  const docRef = doc(db, "pays", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as InsuranceApplication;
  }
  return null;
};

export const getAllApplications = async () => {
  const q = query(collection(db, "pays"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as InsuranceApplication)
  );
};

export const getApplicationsByStatus = async (
  status: InsuranceApplication["status"]
) => {
  const q = query(
    collection(db, "pays"),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as InsuranceApplication)
  );
};

// Real-time listeners
export const subscribeToApplications = (
  callback: (applications: InsuranceApplication[]) => void
) => {
  const q = query(collection(db, "pays"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const applications = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as InsuranceApplication)
    );
    callback(applications);
  });
};

// Chat Messages
export const sendMessage = async (
  data: Omit<ChatMessage, "id" | "timestamp">
) => {
  const docRef = await addDoc(collection(db, "messages"), {
    ...data,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
};

export const getMessages = async (applicationId: string) => {
  const q = query(
    collection(db, "messages"),
    where("applicationId", "==", applicationId),
    orderBy("timestamp", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as ChatMessage)
  );
};

export const subscribeToMessages = (
  applicationId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const q = query(
    collection(db, "messages"),
    where("applicationId", "==", applicationId),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as ChatMessage)
    );
    callback(messages);
  });
};

export const markMessageAsRead = async (messageId: string) => {
  const docRef = doc(db, "messages", messageId);
  await updateDoc(docRef, { read: true });
};
