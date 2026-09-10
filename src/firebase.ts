import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);

// Configured AI Studio database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Default database alias pointing to the configured database
// (avoids calling getFirestore(app) without databaseId which triggers "Database '(default)' not found")
export const defaultDb = db;

export const allDatabases = [db];

export const auth = getAuth(app);

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Try to get a non-existent doc to test connection
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

testConnection();

