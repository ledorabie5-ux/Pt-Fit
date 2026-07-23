import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testRead() {
  console.log("Database ID:", firebaseConfig.firestoreDatabaseId);
  try {
    const snap = await getDocs(collection(db, "users"));
    console.log("Users count:", snap.size);
    snap.forEach(doc => {
      console.log("User doc:", doc.id, doc.data());
    });
  } catch (err) {
    console.error("Error reading users:", err);
  }

  try {
    const snap = await getDocs(collection(db, "programs"));
    console.log("Programs count:", snap.size);
    snap.forEach(doc => {
      console.log("Program doc:", doc.id);
    });
  } catch (err) {
    console.error("Error reading programs:", err);
  }
}

testRead();
