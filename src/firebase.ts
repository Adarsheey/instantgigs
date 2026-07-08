import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDscu4vmvoGo4STjItkeFtzqzMQZ9C2KHc",
  authDomain: "gen-lang-client-0713365361.firebaseapp.com",
  projectId: "gen-lang-client-0713365361",
  storageBucket: "gen-lang-client-0713365361.firebasestorage.app",
  messagingSenderId: "649663397533",
  appId: "1:649663397533:web:9534fb1f674aa9a8b7de74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore with the custom database ID provided in the configuration
const firestoreDatabaseId = "ai-studio-studentparttimej-8ea0ed73-3775-4390-83a8-13424b74ad3d";
export const db = getFirestore(app, firestoreDatabaseId);

export default app;
