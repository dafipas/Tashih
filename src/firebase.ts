/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize the root Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore on the custom high-performance database instance
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
