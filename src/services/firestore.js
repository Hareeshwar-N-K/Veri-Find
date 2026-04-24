/**
 * VeriFind - Firestore Service Layer (HARDENED)
 *
 * Handles all CRUD operations for collections:
 * - users / users_public
 * - found_items / found_items_index
 * - lost_items
 * - matches / matches/{id}/answer_key
 * - recovery_ledger
 * - chat_channels
 *
 * SECURITY: No Cloud Functions. All security enforced via Firestore rules
 * and architectural patterns (finder-validates quiz, index collection).
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
import { generateHandshakePhrase } from "../utils/helpers";
import { applyReputationCap } from "../utils/fairness";

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  USERS_PUBLIC: "users_public",
  FOUND_ITEMS: "found_items",
  FOUND_ITEMS_INDEX: "found_items_index",
  LOST_ITEMS: "lost_items",
  MATCHES: "matches",
  RECOVERY_LEDGER: "recovery_ledger",
  AUDIT_LOGS: "audit_logs",
  CHAT_CHANNELS: "chat_channels",
  SYSTEM_SETTINGS: "systemSettings",
  NOTIFICATIONS: "notifications",
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
      reputationPoints: 0,
      badges: [],
      stats: {
        itemsLost: 0,
        itemsFound: 0,
        successfulRecoveries: 0,
      },
      itemsReturned: 0,
      itemsRecovered: 0,
      isSuspended: false,
      createdAt: serverTimestamp(),
    });

    // Create public profile projection
    await syncUserPublic(user.uid, {
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || null,
      reputationPoints: 0,
      badges: [],
      tier: "Beginner",
      itemsReturned: 0,
      itemsRecovered: 0,
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

    // Sync public projection
    const profile = userSnap.data();
    await syncUserPublic(user.uid, {
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || null,
      reputationPoints: profile.reputationPoints || 0,
      badges: profile.badges || [],
      tier: profile.tier || "Beginner",
      itemsReturned: profile.itemsReturned || 0,
      itemsRecovered: profile.itemsRecovered || 0,
    });

    return { isNew: false };
  }
}

/**
 * Sync public user profile (world-readable projection)
 * Contains ONLY display-safe fields: no email, no role, no suspension status.
 */
export async function syncUserPublic(userId, publicData) {
  try {
    const publicRef = doc(db, COLLECTIONS.USERS_PUBLIC, userId);
    await setDoc(publicRef, {
      ...publicData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to sync users_public:", error);
    // Non-critical — don't break the login flow
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

/**
 * Get user rank based on reputation points
 * Returns rank number and total users count
 */
export async function getUserRank(userId) {
  if (!userId) return { rank: null, totalUsers: 0 };

  try {
    // Get current user's reputation points
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return { rank: null, totalUsers: 0 };

    const userPoints = userDoc.data().reputationPoints || 0;

    // Count users with higher reputation points
    const higherRankQuery = query(
      collection(db, COLLECTIONS.USERS),
      where("reputationPoints", ">", userPoints)
    );
    const higherRankSnapshot = await getDocs(higherRankQuery);
    const rank = higherRankSnapshot.size + 1;

    // Get total users count
    const totalUsersQuery = query(collection(db, COLLECTIONS.USERS));
    const totalUsersSnapshot = await getDocs(totalUsersQuery);
    const totalUsers = totalUsersSnapshot.size;

    return { rank, totalUsers, reputationPoints: userPoints };
  } catch (error) {
    console.error("Error getting user rank:", error);
    return { rank: null, totalUsers: 0, reputationPoints: 0 };
  }
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

  const locationFound = {
    name: itemData.locationName,
    coordinates: itemData.coordinates || null,
    address: itemData.address || null,
  };
  const dateFound = Timestamp.fromDate(new Date(itemData.dateFound));

  const foundItem = {
    finderId: currentUser.uid,
    finderName: currentUser.displayName || "Anonymous",
    category: itemData.category,
    title: itemData.title,
    description: itemData.description,
    locationFound,
    dateFound,
    currentStorageLocation: itemData.storageLocation || "With finder",
    images: itemData.images || [],
    aiAnalysis: null,
    isPrivate: true, // ALWAYS private
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.FOUND_ITEMS),
    foundItem
  );

  // SECURITY FIX: Create a minimal index entry for privacy-preserving matching.
  // This index contains ONLY category, location name, and date — no description,
  // images, or storage location. Other users match against this index, not the
  // full found_items document.
  try {
    await setDoc(doc(db, COLLECTIONS.FOUND_ITEMS_INDEX, docRef.id), {
      category: itemData.category,
      locationName: itemData.locationName || "",
      dateFound,
      finderId: currentUser.uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create found_items_index entry:", error);
    // Non-critical: the item is still created, matching may be limited
  }

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
  
  // Format location if provided
  const updateData = { ...data };
  if (updateData.locationName) {
    updateData.locationFound = { name: updateData.locationName };
    delete updateData.locationName;
  }
  
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
  
  // Also update the index if location changed
  if (updateData.locationFound) {
    try {
      const indexRef = doc(db, COLLECTIONS.FOUND_ITEMS_INDEX, itemId);
      await updateDoc(indexRef, {
        locationName: updateData.locationFound.name,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn("Could not update index", error);
    }
  }
}

/**
 * Delete found item
 */
export async function deleteFoundItem(itemId) {
  // Delete the main item
  await deleteDoc(doc(db, COLLECTIONS.FOUND_ITEMS, itemId));
  // Delete the index entry
  await deleteDoc(doc(db, COLLECTIONS.FOUND_ITEMS_INDEX, itemId));
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
  const updateData = { ...data };
  
  // Format location if provided
  if (updateData.locationName) {
    updateData.locationLost = { name: updateData.locationName };
    delete updateData.locationName;
  }
  
  await updateDoc(docRef, {
    ...updateData,
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
// ⚙️ SYSTEM SETTINGS OPERATIONS
// ============================================

/**
 * Get system settings
 */
export async function getSystemSettings() {
  const settingsRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, "global");
  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    return { id: settingsSnap.id, ...settingsSnap.data() };
  }

  // Return default settings if not exists
  return {
    matchThreshold: 0.7,
    aiScanEnabled: true,
    autoMatchEnabled: true,
    maintenanceMode: false,
    siteTitle: "VeriFind",
    siteDescription: "Lost and Found Platform",
  };
}

/**
 * Update system settings (admin only)
 */
export async function updateSystemSettings(settings) {
  const settingsRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, "global");
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    // Create with defaults
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "system",
    });
  } else {
    await updateDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid || "system",
    });
  }
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
 * Update match status.
 * NOTE: adminNotes is ONLY written when explicitly provided.
 * Writing it as empty string violates the strict onlyUpdating() Firestore rule
 * for non-admin transitions (rejection, recovery, etc.)
 */
export async function updateMatchStatus(matchId, status, notes = "") {
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  const updateData = {
    status: status,
    updatedAt: serverTimestamp(),
  };

  // Only include adminNotes if explicitly provided (admin use only)
  if (notes) {
    updateData.adminNotes = notes;
  }

  // Add recoveredAt timestamp if status is recovered
  if (status === "recovered") {
    updateData.recoveredAt = serverTimestamp();
  }

  await updateDoc(matchRef, updateData);
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

// ============================================
// 🔔 NOTIFICATION OPERATIONS
// ============================================

/**
 * Get user's notifications
 */
export async function getUserNotifications(userId, limitCount = 10) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Create a notification
 */
export async function createNotification(notificationData) {
  const notification = {
    ...notificationData,
    isRead: false,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    notification
  );
  return { id: docRef.id, ...notification };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId);
  await updateDoc(notificationRef, {
    isRead: true,
    readAt: serverTimestamp(),
  });
}

/**
 * Mark all user notifications as read
 */
export async function markAllNotificationsAsRead(userId) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where("userId", "==", userId),
    where("isRead", "==", false)
  );

  const snapshot = await getDocs(q);
  const updatePromises = snapshot.docs.map((doc) =>
    updateDoc(doc.ref, {
      isRead: true,
      readAt: serverTimestamp(),
    })
  );

  await Promise.all(updatePromises);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId) {
  await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId));
}

/**
 * Subscribe to user notifications in real-time
 */
export function subscribeToNotifications(userId, callback, onError = null) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(notifications);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error("Error in notifications subscription:", error);
      }
    }
  );
}

// ============================================
// 🔐 QUIZ ANSWER KEY OPERATIONS (Security Layer)
// ============================================

/**
 * Store the quiz answer key in a subcollection that ONLY the finder can read.
 * The match document will contain questions WITHOUT correctIndex.
 * This prevents the owner from seeing answers via DevTools.
 *
 * @param {string} matchId - The match document ID
 * @param {Array<number>} correctAnswers - Array of correct answer indices [0, 2, 1]
 */
export async function storeAnswerKey(matchId, correctAnswers) {
  const keyRef = doc(db, COLLECTIONS.MATCHES, matchId, "answer_key", "key");
  await setDoc(keyRef, {
    correctAnswers,
    createdAt: serverTimestamp(),
  });
}

/**
 * Get the quiz answer key (only callable by the finder).
 * Firestore rules enforce that only the finder can read this subcollection.
 *
 * @param {string} matchId - The match document ID
 * @returns {Promise<Array<number>|null>} Array of correct answer indices or null
 */
export async function getAnswerKey(matchId) {
  try {
    const keyRef = doc(db, COLLECTIONS.MATCHES, matchId, "answer_key", "key");
    const keySnap = await getDoc(keyRef);
    if (!keySnap.exists()) return null;
    return keySnap.data().correctAnswers;
  } catch (error) {
    console.error("Cannot read answer key (expected if you're the owner):", error);
    return null;
  }
}

/**
 * Owner submits quiz answers. Sets status to "quiz_submitted".
 * The answers are stored in the match doc for the finder to validate.
 * Firestore rules enforce: only owner, only from pending_verification.
 *
 * @param {string} matchId - The match document ID
 * @param {Array<number>} answers - Array of selected answer indices
 */
export async function submitQuizAnswers(matchId, answers) {
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  await updateDoc(matchRef, {
    quizSubmission: answers,
    status: "quiz_submitted",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Finder validates quiz answers and sets match result.
 * Reads the answer_key subcollection (only finder can read),
 * compares with the owner's submission, and updates the match status.
 *
 * @param {string} matchId - The match document ID
 * @returns {Promise<{passed: boolean, correctCount: number, total: number}>}
 */
export async function validateAndSetQuizResult(matchId) {
  // 1. Get the match document to read the submission
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) throw new Error("Match not found");

  const matchData = matchSnap.data();
  const submission = matchData.quizSubmission;

  if (!submission || !Array.isArray(submission)) {
    throw new Error("No quiz submission found");
  }

  // 2. Get the answer key (only finder can read this)
  const answerKey = await getAnswerKey(matchId);
  if (!answerKey) throw new Error("Cannot read answer key");

  // 3. Compare answers
  let correctCount = 0;
  const total = answerKey.length;
  answerKey.forEach((correctIdx, i) => {
    if (submission[i] === correctIdx) correctCount++;
  });

  const passed = correctCount >= Math.ceil(total * 0.66);

  // 4. Update match status based on result
  if (passed) {
    // Create a chat channel for verified matches
    const channelRef = await addDoc(collection(db, COLLECTIONS.CHAT_CHANNELS), {
      matchId,
      participants: [matchData.ownerId, matchData.finderId],
      isActive: true,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessage: "Match verified! You can now chat.",
    });

    await updateDoc(matchRef, {
      status: "verified",
      quizResult: { correctCount, total, passed: true },
      chatChannelId: channelRef.id,
      handshakePhrase: generateHandshakePhrase(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(matchRef, {
      status: "verification_failed",
      quizResult: { correctCount, total, passed: false },
      updatedAt: serverTimestamp(),
    });
  }

  return { passed, correctCount, total };
}

// ============================================
// 🏆 REPUTATION OPERATIONS (Self-increment only)
// ============================================

/**
 * Award reputation points after a successful recovery.
 * Called by the FINDER when they confirm the owner received the item,
 * or by the OWNER when they confirm recovery.
 *
 * Firestore rules ensure users can only increment their OWN reputation.
 * The increment values are enforced client-side (50 for finder, 10 for owner).
 *
 * @param {string} matchId - The match ID for audit trail
 * @param {string} role - "finder" or "owner"
 */
export async function awardReputationForRecovery(matchId, role) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const points = role === "finder" ? 50 : 10;
  const field = role === "finder" ? "itemsReturned" : "itemsRecovered";

  const userRef = doc(db, COLLECTIONS.USERS, currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() || {};
  const currentWeeklyPoints = userData.weeklyReputationPoints || 0;

  const { allowed, capped } = applyReputationCap(currentWeeklyPoints, points);

  if (allowed > 0) {
    await updateDoc(userRef, {
      reputationPoints: increment(allowed),
      weeklyReputationPoints: increment(allowed),
      [field]: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Re-fetch to sync
    const updatedUserSnap = await getDoc(userRef);
    const updatedUserData = updatedUserSnap.data();
    
    await syncUserPublic(currentUser.uid, {
      displayName: updatedUserData.displayName,
      photoURL: updatedUserData.photoURL,
      reputationPoints: updatedUserData.reputationPoints,
      badges: updatedUserData.badges || [],
      [field]: updatedUserData[field],
    });
  }

  // Audit log
  try {
    await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
      action: "REPUTATION_AWARDED",
      userId: currentUser.uid,
      details: { matchId, role, points },
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

// ============================================
// 🔍 FOUND_ITEMS_INDEX OPERATIONS
// ============================================

/**
 * Get found items index entries for client-side matching.
 * Returns ONLY metadata (category, location, date) — no descriptions or images.
 */
export async function getFoundItemsIndex() {
  const q = query(
    collection(db, COLLECTIONS.FOUND_ITEMS_INDEX),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Update found item index status (e.g., when item is matched/recovered).
 */
export async function updateFoundItemIndexStatus(itemId, status) {
  try {
    const indexRef = doc(db, COLLECTIONS.FOUND_ITEMS_INDEX, itemId);
    await updateDoc(indexRef, { status, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Failed to update found_items_index:", error);
  }
}

// ============================================
// ⏰ STALE MATCH DETECTION (Hostage Prevention)
// ============================================

/**
 * Find matches that have been in "verified" status for more than 7 days.
 * Called client-side (e.g., from Dashboard or Admin) to detect hostage situations.
 *
 * @returns {Promise<Array>} Stale matches needing attention
 */
export async function getStaleVerifiedMatches() {
  const sevenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  const q = query(
    collection(db, COLLECTIONS.MATCHES),
    where("status", "==", "verified"),
    where("updatedAt", "<", sevenDaysAgo)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Report an issue on a verified match (hostage prevention).
 * Creates a notification for admin and flags the match.
 */
export async function reportMatchIssue(matchId, reason) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  await updateDoc(matchRef, {
    ownerReportedIssue: {
      reason,
      reportedBy: currentUser.uid,
      reportedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  // Create admin notification
  try {
    await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
      userId: currentUser.uid,  // Self-notification (rules allow this)
      type: "issue_reported",
      title: "Issue Reported on Match",
      message: `Issue reported on match ${matchId}: ${reason}`,
      matchId,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

// ============================================
// 🔄 ITEM STATUS REVERSION
// ============================================

/**
 * Revert item statuses when a match is rejected.
 * Sets the lost item back to "searching" and found item back to "pending"
 * so they re-enter the matching pool.
 */
export async function revertItemStatuses(lostItemId, foundItemId) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  try {
    // Revert lost item
    if (lostItemId) {
      const lostRef = doc(db, COLLECTIONS.LOST_ITEMS, lostItemId);
      await updateDoc(lostRef, {
        status: "searching",
        updatedAt: serverTimestamp(),
      });
    }

    // Revert found item (only finder can update their own item)
    // This may fail if the current user isn't the finder — that's OK,
    // the found item status will be handled by the finder's client.
    if (foundItemId) {
      try {
        const foundRef = doc(db, COLLECTIONS.FOUND_ITEMS, foundItemId);
        await updateDoc(foundRef, {
          status: "pending",
          updatedAt: serverTimestamp(),
        });
        // Also update the index
        await updateFoundItemIndexStatus(foundItemId, "pending");
      } catch (e) {
        console.warn("Could not revert found item (may not be the finder):", e);
      }
    }
  } catch (error) {
    console.error("Error reverting item statuses:", error);
  }
}

/**
 * Create a recovery ledger entry for the public Wall of Fame.
 */
export async function createRecoveryEntry(matchData) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const entry = {
    matchId: matchData.matchId || matchData.id,
    ownerId: matchData.ownerId,
    finderId: matchData.finderId,
    ownerName: matchData.ownerName || "Anonymous",
    finderName: matchData.finderName || "Anonymous",
    itemCategory: matchData.itemCategory || matchData.category || "other",
    itemTitle: matchData.lostItemTitle || matchData.itemTitle || "Item",
    locationFound: matchData.foundLocation?.name || "Unknown",
    reputationAwarded: 50,
    recoveredAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, COLLECTIONS.RECOVERY_LEDGER), entry);
  return entry;
}

export default {
  // Collections
  COLLECTIONS,
  // Users
  createOrUpdateUser,
  syncUserPublic,
  getUser,
  updateUserProfile,
  getAllUsers,
  getUserRank,
  // Found Items
  createFoundItem,
  getMyFoundItems,
  getFoundItem,
  updateFoundItem,
  deleteFoundItem,
  // Found Items Index
  getFoundItemsIndex,
  updateFoundItemIndexStatus,
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
  // Quiz Security
  storeAnswerKey,
  getAnswerKey,
  submitQuizAnswers,
  validateAndSetQuizResult,
  // Recovery
  getRecoveryStories,
  getRecoveryStats,
  createRecoveryEntry,
  awardReputationForRecovery,
  // Hostage Prevention
  getStaleVerifiedMatches,
  reportMatchIssue,
  revertItemStatuses,
  // System Settings
  getSystemSettings,
  updateSystemSettings,
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
