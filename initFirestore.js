// initFirestore.js - Firestore Initialization Script
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, Timestamp } = require("firebase/firestore");

// ⚠️ REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG ⚠️
// Get it from: Firebase Console → Project Settings → General → Your apps → Firebase SDK snippet
const firebaseConfig = {
  apiKey: "AIzaSyCTuF42aPpB8TtaO37AUkBiH4YcsmzDEq8",
  authDomain: "veri-find.firebaseapp.com",
  projectId: "veri-find",
  storageBucket: "veri-find.firebasestorage.app",
  messagingSenderId: "185683499960",
  appId: "1:185683499960:web:f356238251fcdb3e450d4d",
  measurementId: "G-1LTK3VZC4V",
};

async function initializeFirestore() {
  console.log("🚀 Starting Firestore initialization...");
  console.log("Project ID:", firebaseConfig.projectId);
  
  try {
    // 1. Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log("✅ Firebase initialized");
    
    // 2. Create systemSettings/global document
    const settingsRef = doc(db, "systemSettings", "global");
    
    await setDoc(settingsRef, {
      loginMode: "multiple", // "single" or "multiple"
      singleLoginAction: "notify", // "block" or "notify"
      maxSessionsPerUser: 5,
      aiScanEnabled: true,
      autoMatchEnabled: true,
      matchThreshold: 0.7,
      maintenanceMode: false,
      siteTitle: "VeriFind",
      siteDescription: "Lost and Found Platform",
      enableEmailNotifications: true,
      enablePushNotifications: true,
      rewardSystemEnabled: true,
      defaultRewardPercentage: 10,
      updatedAt: Timestamp.now(),
      updatedBy: "system"
    });
    
    console.log("✅ systemSettings/global document created!");
    
    // 3. Create categories document
    const categoriesRef = doc(db, "systemSettings", "categories");
    
    await setDoc(categoriesRef, {
      itemCategories: [
        "Electronics",
        "Documents",
        "Jewelry",
        "Keys",
        "Wallet/Purse",
        "Clothing",
        "Bags",
        "Books",
        "Toys",
        "Sports Equipment",
        "Pets",
        "Other"
      ],
      locationTypes: [
        "Home/Residence",
        "Office/Workplace",
        "School/University",
        "Public Transport",
        "Restaurant/Cafe",
        "Park/Recreation",
        "Shopping Mall",
        "Hospital/Clinic",
        "Airport/Train Station",
        "Other"
      ],
      updatedAt: Timestamp.now()
    });
    
    console.log("✅ systemSettings/categories document created!");
    
    console.log("\n🎉 Firestore initialization COMPLETE!");
    console.log("\n📊 Collections created:");
    console.log("   • systemSettings/global");
    console.log("   • systemSettings/categories");
    
    console.log("\n💡 Next steps:");
    console.log("   1. Go to Firebase Console → Firestore Database");
    console.log("   2. Verify the collections were created");
    console.log("   3. Start your React app: npm run dev");
    
    return true;
    
  } catch (error) {
    console.error("\n❌ Error during initialization:");
    console.error("Message:", error.message);
    console.error("\n⚠️ Common issues:");
    console.error("   • Incorrect Firebase config");
    console.error("   • Firestore not enabled in Firebase Console");
    console.error("   • No internet connection");
    return false;
  }
}

// Run the function
initializeFirestore().then(success => {
  if (success) {
    console.log("\n✨ Script executed successfully!");
    process.exit(0);
  } else {
    console.log("\n❌ Script failed!");
    process.exit(1);
  }
});