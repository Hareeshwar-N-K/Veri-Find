/**
 * VeriFind - Firestore Service Layer
 *
 * Handles all CRUD operations for collections:
 * - users
 * - found_items
 * - lost_items
 * - matches
 * - recovery_ledger
 * - chat_channels
 */

import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  FOUND_ITEMS: "found_items",
  LOST_ITEMS: "lost_items",
  MATCHES: "matches",
  RECOVERY_LEDGER: "recovery_ledger",
  AUDIT_LOGS: "audit_logs",
  CHAT_CHANNELS: "chat_channels",
};

// ============================================
// 👤 USER OPERATIONS
// ============================================

/**
 * Create or update user profile on login
 */
export async function createOrUpdateUser(user) {
  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const userSnap = await getDoc(userRef);

  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "Anonymous",
    photoURL: user.photoURL || null,
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!userSnap.exists()) {
    // New user - create profile
    await setDoc(userRef, {
      ...userData,
      role: "user",
      reputationScore: 0,
      badges: [],
      stats: {
        itemsLost: 0,
        itemsFound: 0,
        successfulRecoveries: 0,
      },
      isSuspended: false,
      createdAt: serverTimestamp(),
    });
    return { isNew: true };
  } else {
    // Existing user - update only allowed fields
    await updateDoc(userRef, {
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || null,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { isNew: false };
  }
}

/**
 * Get user profile by ID
 */
export async function getUser(userId) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, data) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(limitCount = 50) {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ============================================
// 📦 FOUND ITEMS OPERATIONS
// ============================================

/**
 * Create a new found item report
 */
export async function createFoundItem(itemData) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const foundItem = {
    finderId: currentUser.uid,
    finderName: currentUser.displayName || "Anonymous",
    category: itemData.category,
    title: itemData.title,
    description: itemData.description,
    locationFound: {
      name: itemData.locationName,
      coordinates: itemData.coordinates || null,
      address: itemData.address || null,
    },
    dateFound: Timestamp.fromDate(new Date(itemData.dateFound)),
    currentStorageLocation: itemData.storageLocation || "With finder",
    images: itemData.images || [],
    aiAnalysis: null, // Will be populated by Cloud Function
    isPrivate: true, // ALWAYS private
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.FOUND_ITEMS),
    foundItem
  );

  // Note: User stats are updated by Cloud Functions (onFoundItemCreate trigger)
  // This keeps the frontend simpler and stats secure from manipulation

  return { id: docRef.id, ...foundItem };
}

/**
 * Get found items by current user (finder)
 */
export async function getMyFoundItems() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const q = query(
    collection(db, COLLECTIONS.FOUND_ITEMS),
    where("finderId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get found item by ID (only if owner or admin)
 */
export async function getFoundItem(itemId) {
  const docRef = doc(db, COLLECTIONS.FOUND_ITEMS, itemId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

/**
 * Update found item
 */
export async function updateFoundItem(itemId, data) {
  const docRef = doc(db, COLLECTIONS.FOUND_ITEMS, itemId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// 🔍 LOST ITEMS OPERATIONS
// ============================================

/**
 * Create a new lost item report
 */
export async function createLostItem(itemData) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const lostItem = {
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || "Anonymous",
    category: itemData.category,
    title: itemData.title,
    description: itemData.description,
    locationLost: {
      name: itemData.locationName,
      coordinates: itemData.coordinates || null,
      address: itemData.address || null,
    },
    dateLost: Timestamp.fromDate(new Date(itemData.dateLost)),
    estimatedValue: itemData.estimatedValue || null,
    reward: itemData.reward || null,
    images: itemData.images || [],
    ownershipHints: {
      question: itemData.verificationQuestion || "",
      expectedAnswer: itemData.verificationAnswer || "",
    },
    status: "searching",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.LOST_ITEMS), lostItem);

  // Note: User stats are updated by Cloud Functions (onLostItemCreate trigger)
  // This keeps the frontend simpler and stats secure from manipulation

  return { id: docRef.id, ...lostItem };
}

/**
 * Get all lost items (public browsing)
 * Note: ownershipHints are excluded in display
 */
export async function getAllLostItems(filters = {}, limitCount = 20) {
  let q = query(
    collection(db, COLLECTIONS.LOST_ITEMS),
    where("status", "==", "searching"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  // Apply category filter
  if (filters.category) {
    q = query(
      collection(db, COLLECTIONS.LOST_ITEMS),
      where("status", "==", "searching"),
      where("category", "==", filters.category),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    // Exclude ownership hints from public view
    const { ownershipHints, ...publicData } = data;
    return { id: doc.id, ...publicData };
  });
}

/**
 * Get lost items by current user
 */
export async function getMyLostItems() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const q = query(
    collection(db, COLLECTIONS.LOST_ITEMS),
    where("ownerId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get lost item by ID
 */
export async function getLostItem(itemId) {
  const docRef = doc(db, COLLECTIONS.LOST_ITEMS, itemId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

/**
 * Update lost item
 */
export async function updateLostItem(itemId, data) {
  const docRef = doc(db, COLLECTIONS.LOST_ITEMS, itemId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete lost item
 */
export async function deleteLostItem(itemId) {
  const docRef = doc(db, COLLECTIONS.LOST_ITEMS, itemId);
  await deleteDoc(docRef);
}

// ============================================
// 🔗 MATCHES OPERATIONS
// ============================================

/**
 * Get matches for current user (as owner or finder)
 */
export async function getMyMatches() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Get matches where user is owner
  const ownerQuery = query(
    collection(db, COLLECTIONS.MATCHES),
    where("ownerId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  // Get matches where user is finder
  const finderQuery = query(
    collection(db, COLLECTIONS.MATCHES),
    where("finderId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const [ownerSnap, finderSnap] = await Promise.all([
    getDocs(ownerQuery),
    getDocs(finderQuery),
  ]);

  const ownerMatches = ownerSnap.docs.map((doc) => ({
    id: doc.id,
    role: "owner",
    ...doc.data(),
  }));

  const finderMatches = finderSnap.docs.map((doc) => ({
    id: doc.id,
    role: "finder",
    ...doc.data(),
  }));

  // Combine and sort by date
  return [...ownerMatches, ...finderMatches].sort(
    (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()
  );
}

/**
 * Get match by ID
 */
export async function getMatch(matchId) {
  const docRef = doc(db, COLLECTIONS.MATCHES, matchId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

/**
 * Submit verification quiz answer (owner only)
 */
export async function submitQuizAnswer(matchId, answer) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  await updateDoc(matchRef, {
    ownerAnswer: answer,
    "verificationQuiz.submittedAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Subscribe to match updates in real-time
 */
export function subscribeToMatch(matchId, callback) {
  const docRef = doc(db, COLLECTIONS.MATCHES, matchId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
}

// ============================================
// 🏆 RECOVERY LEDGER OPERATIONS
// ============================================

/**
 * Get recovery success stories (public)
 */
export async function getRecoveryStories(limitCount = 10) {
  const q = query(
    collection(db, COLLECTIONS.RECOVERY_LEDGER),
    orderBy("recoveredAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get recovery stats
 */
export async function getRecoveryStats() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.RECOVERY_LEDGER));

  let totalValue = 0;
  const stories = snapshot.docs.map((doc) => {
    const data = doc.data();
    totalValue += data.itemValue || 0;
    return data;
  });

  return {
    totalRecoveries: stories.length,
    totalValueRecovered: totalValue,
  };
}

// ============================================
// 💬 CHAT OPERATIONS
// ============================================

/**
 * Get chat channels for current user
 */
export async function getMyChatChannels() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const q = query(
    collection(db, COLLECTIONS.CHAT_CHANNELS),
    where("participants", "array-contains", currentUser.uid),
    where("isActive", "==", true),
    orderBy("lastMessageAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get messages for a chat channel
 */
export async function getChatMessages(channelId, limitCount = 50) {
  const q = query(
    collection(db, COLLECTIONS.CHAT_CHANNELS, channelId, "messages"),
    orderBy("sentAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse(); // Reverse to show oldest first
}

/**
 * Send a message in a chat channel
 */
export async function sendMessage(channelId, messageText) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const message = {
    senderId: currentUser.uid,
    senderName: currentUser.displayName || "Anonymous",
    text: messageText,
    type: "text",
    sentAt: serverTimestamp(),
  };

  // Add message to subcollection
  await addDoc(
    collection(db, COLLECTIONS.CHAT_CHANNELS, channelId, "messages"),
    message
  );

  // Update channel's last message
  await updateDoc(doc(db, COLLECTIONS.CHAT_CHANNELS, channelId), {
    lastMessage: messageText.substring(0, 100),
    lastMessageAt: serverTimestamp(),
  });

  return message;
}

/**
 * Subscribe to chat messages in real-time
 */
export function subscribeToChatMessages(channelId, callback) {
  const q = query(
    collection(db, COLLECTIONS.CHAT_CHANNELS, channelId, "messages"),
    orderBy("sentAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
}

// ============================================
// 📊 ADMIN OPERATIONS
// ============================================

/**
 * Get all found items (admin only)
 */
export async function getAllFoundItems(limitCount = 50) {
  const q = query(
    collection(db, COLLECTIONS.FOUND_ITEMS),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get all matches (admin only)
 */
export async function getAllMatches(limitCount = 50) {
  const q = query(
    collection(db, COLLECTIONS.MATCHES),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Update match status (admin only)
 */
export async function updateMatchStatus(matchId, status, notes = "") {
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  await updateDoc(matchRef, {
    status: status,
    adminNotes: notes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get dashboard stats (admin)
 */
export async function getDashboardStats() {
  const [users, lostItems, foundItems, matches] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.LOST_ITEMS)),
    getDocs(collection(db, COLLECTIONS.FOUND_ITEMS)),
    getDocs(collection(db, COLLECTIONS.MATCHES)),
  ]);

  return {
    totalUsers: users.size,
    totalLostItems: lostItems.size,
    totalFoundItems: foundItems.size,
    totalMatches: matches.size,
    pendingMatches: matches.docs.filter(
      (d) => d.data().status === "pending_verification"
    ).length,
    verifiedMatches: matches.docs.filter((d) => d.data().status === "verified")
      .length,
  };
}

export default {
  // Users
  createOrUpdateUser,
  getUser,
  updateUserProfile,
  getAllUsers,
  // Found Items
  createFoundItem,
  getMyFoundItems,
  getFoundItem,
  updateFoundItem,
  // Lost Items
  createLostItem,
  getAllLostItems,
  getMyLostItems,
  getLostItem,
  updateLostItem,
  deleteLostItem,
  // Matches
  getMyMatches,
  getMatch,
  submitQuizAnswer,
  subscribeToMatch,
  // Recovery
  getRecoveryStories,
  getRecoveryStats,
  // Chat
  getMyChatChannels,
  getChatMessages,
  sendMessage,
  subscribeToChatMessages,
  // Admin
  getAllFoundItems,
  getAllMatches,
  updateMatchStatus,
  getDashboardStats,
};
