/**
 * VeriFind - Cloud Functions
 *
 * Privacy-First Lost & Found Matcher Engine
 *
 * FUNCTIONS:
 * 1. onFoundItemCreate - Sanitize input, trigger matching
 * 2. onLostItemCreate - Sanitize input, trigger matching
 * 3. runMatcherEngine - Find potential matches
 * 4. onMatchStatusChange - Handle verification flow
 * 5. createRecoveryEntry - Add to public wall of fame
 * 6. cleanupOldItems - Scheduled cleanup
 */

const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
  Timestamp,
} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Collection names
const COLLECTIONS = {
  USERS: "users",
  FOUND_ITEMS: "found_items",
  LOST_ITEMS: "lost_items",
  MATCHES: "matches",
  RECOVERY_LEDGER: "recovery_ledger",
  AUDIT_LOGS: "audit_logs",
  CHAT_CHANNELS: "chat_channels",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize text input - remove PII patterns
 */
function sanitizeText(text) {
  if (!text) return "";

  // Remove phone numbers
  let sanitized = text.replace(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    "[PHONE REMOVED]"
  );

  // Remove email addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL REMOVED]"
  );

  // Remove addresses (basic pattern)
  sanitized = sanitized.replace(
    /\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct)/gi,
    "[ADDRESS REMOVED]"
  );

  return sanitized.trim();
}

/**
 * Calculate text similarity score (Jaccard similarity)
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Calculate location proximity score
 */
function calculateLocationScore(loc1, loc2) {
  // If same location name, high score
  if (
    loc1.name &&
    loc2.name &&
    loc1.name.toLowerCase() === loc2.name.toLowerCase()
  ) {
    return 1.0;
  }

  // If coordinates available, calculate distance
  if (loc1.coordinates && loc2.coordinates) {
    const lat1 = loc1.coordinates.latitude;
    const lon1 = loc1.coordinates.longitude;
    const lat2 = loc2.coordinates.latitude;
    const lon2 = loc2.coordinates.longitude;

    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Score based on distance (max 10km radius)
    if (distance <= 0.5) return 1.0;
    if (distance <= 1) return 0.9;
    if (distance <= 2) return 0.7;
    if (distance <= 5) return 0.5;
    if (distance <= 10) return 0.3;
    return 0;
  }

  return 0.5; // Default if no coordinates
}

/**
 * Calculate date proximity score
 */
function calculateDateScore(foundDate, lostDate) {
  if (!foundDate || !lostDate) return 0.5;

  const foundTime = foundDate.toMillis
    ? foundDate.toMillis()
    : new Date(foundDate).getTime();
  const lostTime = lostDate.toMillis
    ? lostDate.toMillis()
    : new Date(lostDate).getTime();

  // Found date should be after or close to lost date
  const daysDiff = (foundTime - lostTime) / (1000 * 60 * 60 * 24);

  if (daysDiff < -1) return 0; // Found before lost - unlikely match
  if (daysDiff <= 0) return 1.0; // Same day
  if (daysDiff <= 1) return 0.9;
  if (daysDiff <= 3) return 0.7;
  if (daysDiff <= 7) return 0.5;
  if (daysDiff <= 14) return 0.3;
  return 0.1;
}

/**
 * Generate verification question from found item
 */
function generateVerificationQuestion(foundItem) {
  const questions = [
    "What is a distinctive feature or mark on this item?",
    "Can you describe something unique about this item that only the owner would know?",
    "What was inside or attached to this item?",
    "What color/pattern details can you describe?",
    "Are there any scratches, stickers, or modifications on this item?",
  ];

  // Random question for now - in production, AI would generate context-specific questions
  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Create audit log entry
 */
async function createAuditLog(action, userId, details) {
  try {
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      action,
      userId,
      timestamp: FieldValue.serverTimestamp(),
      details,
      ipAddress: null, // Would be populated in production
    });
  } catch (error) {
    logger.error("Failed to create audit log:", error);
  }
}

// ============================================
// 1️⃣ ON FOUND ITEM CREATE
// ============================================

exports.onFoundItemCreate = onDocumentCreated(
  "found_items/{itemId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const foundItem = snapshot.data();
    const itemId = event.params.itemId;

    logger.info(`New found item created: ${itemId}`);

    // Sanitize description
    const sanitizedDescription = sanitizeText(foundItem.description);
    const sanitizedTitle = sanitizeText(foundItem.title);

    // Update with sanitized data and mark as processed
    await snapshot.ref.update({
      title: sanitizedTitle,
      description: sanitizedDescription,
      status: "verified",
      processedAt: FieldValue.serverTimestamp(),
    });

    // Create audit log
    await createAuditLog("FOUND_ITEM_CREATED", foundItem.finderId, {
      itemId,
      category: foundItem.category,
    });

    // Trigger matcher engine
    await runMatcher(itemId, "found", foundItem);
  }
);

// ============================================
// 2️⃣ ON LOST ITEM CREATE
// ============================================

exports.onLostItemCreate = onDocumentCreated(
  "lost_items/{itemId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const lostItem = snapshot.data();
    const itemId = event.params.itemId;

    logger.info(`New lost item created: ${itemId}`);

    // Sanitize description (but keep ownershipHints intact)
    const sanitizedDescription = sanitizeText(lostItem.description);
    const sanitizedTitle = sanitizeText(lostItem.title);

    // Update with sanitized data
    await snapshot.ref.update({
      title: sanitizedTitle,
      description: sanitizedDescription,
      processedAt: FieldValue.serverTimestamp(),
    });

    // Create audit log
    await createAuditLog("LOST_ITEM_CREATED", lostItem.ownerId, {
      itemId,
      category: lostItem.category,
    });

    // Trigger matcher engine
    await runMatcher(itemId, "lost", lostItem);
  }
);

// ============================================
// 3️⃣ MATCHER ENGINE
// ============================================

async function runMatcher(itemId, itemType, item) {
  logger.info(`Running matcher for ${itemType} item: ${itemId}`);

  try {
    let potentialMatches = [];

    if (itemType === "found") {
      // Search for matching lost items
      const lostItemsQuery = await db
        .collection(COLLECTIONS.LOST_ITEMS)
        .where("category", "==", item.category)
        .where("status", "==", "searching")
        .get();

      for (const doc of lostItemsQuery.docs) {
        const lostItem = doc.data();
        const score = calculateMatchScore(item, lostItem, "found");

        if (score.overall >= 0.5) {
          // Threshold for potential match
          potentialMatches.push({
            lostItemId: doc.id,
            foundItemId: itemId,
            ownerId: lostItem.ownerId,
            finderId: item.finderId,
            score,
          });
        }
      }
    } else {
      // Search for matching found items
      const foundItemsQuery = await db
        .collection(COLLECTIONS.FOUND_ITEMS)
        .where("category", "==", item.category)
        .where("status", "in", ["verified", "pending"])
        .get();

      for (const doc of foundItemsQuery.docs) {
        const foundItem = doc.data();
        const score = calculateMatchScore(foundItem, item, "lost");

        if (score.overall >= 0.5) {
          potentialMatches.push({
            lostItemId: itemId,
            foundItemId: doc.id,
            ownerId: item.ownerId,
            finderId: foundItem.finderId,
            score,
          });
        }
      }
    }

    // Sort by score and create matches
    potentialMatches.sort((a, b) => b.score.overall - a.score.overall);

    // Create match documents for top matches
    for (const match of potentialMatches.slice(0, 5)) {
      // Top 5 matches
      await createMatchDocument(match);
    }

    logger.info(
      `Found ${potentialMatches.length} potential matches for ${itemId}`
    );
  } catch (error) {
    logger.error("Matcher engine error:", error);
  }
}

function calculateMatchScore(foundItem, lostItem, triggerType) {
  const categoryScore = 1.0; // Already filtered by category
  const textScore = calculateTextSimilarity(
    `${foundItem.title} ${foundItem.description}`,
    `${lostItem.title} ${lostItem.description}`
  );
  const locationScore = calculateLocationScore(
    foundItem.locationFound,
    lostItem.locationLost
  );
  const dateScore = calculateDateScore(foundItem.dateFound, lostItem.dateLost);

  // Weighted average
  const overall =
    categoryScore * 0.3 +
    textScore * 0.3 +
    locationScore * 0.25 +
    dateScore * 0.15;

  return {
    category: categoryScore,
    text: textScore,
    location: locationScore,
    date: dateScore,
    overall: Math.round(overall * 100) / 100,
  };
}

async function createMatchDocument(matchData) {
  // Check if match already exists
  const existingMatch = await db
    .collection(COLLECTIONS.MATCHES)
    .where("lostItemId", "==", matchData.lostItemId)
    .where("foundItemId", "==", matchData.foundItemId)
    .get();

  if (!existingMatch.empty) {
    logger.info("Match already exists, skipping");
    return;
  }

  // Get found item for verification question generation
  const foundItemDoc = await db
    .collection(COLLECTIONS.FOUND_ITEMS)
    .doc(matchData.foundItemId)
    .get();
  const foundItem = foundItemDoc.data();

  const match = {
    lostItemId: matchData.lostItemId,
    foundItemId: matchData.foundItemId,
    ownerId: matchData.ownerId,
    finderId: matchData.finderId,
    scores: matchData.score,
    status: "pending_verification",
    verificationQuiz: {
      question: generateVerificationQuestion(foundItem),
      generatedAt: FieldValue.serverTimestamp(),
      submittedAt: null,
    },
    ownerAnswer: null,
    chatChannelId: null,
    adminNotes: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const matchRef = await db.collection(COLLECTIONS.MATCHES).add(match);
  logger.info(`Created match: ${matchRef.id}`);

  // Create audit log
  await createAuditLog("MATCH_CREATED", "system", {
    matchId: matchRef.id,
    score: matchData.score.overall,
  });
}

// ============================================
// 4️⃣ ON MATCH STATUS CHANGE
// ============================================

exports.onMatchStatusChange = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const matchId = event.params.matchId;

    // Only process if status changed
    if (before.status === after.status) return;

    logger.info(
      `Match ${matchId} status changed: ${before.status} -> ${after.status}`
    );

    // Handle quiz submission
    if (
      before.status === "quiz_sent" &&
      after.ownerAnswer &&
      !before.ownerAnswer
    ) {
      // Quiz was answered, move to admin review
      await event.data.after.ref.update({
        status: "pending_admin_review",
        updatedAt: FieldValue.serverTimestamp(),
      });

      await createAuditLog("QUIZ_SUBMITTED", after.ownerId, { matchId });
    }

    // Handle verification approval
    if (after.status === "verified" && before.status !== "verified") {
      // Create chat channel for verified match
      const chatChannel = await db.collection(COLLECTIONS.CHAT_CHANNELS).add({
        matchId: matchId,
        participants: [after.ownerId, after.finderId],
        isActive: true,
        lastMessage: null,
        lastMessageAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });

      // Update match with chat channel ID
      await event.data.after.ref.update({
        chatChannelId: chatChannel.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update item statuses
      await db
        .collection(COLLECTIONS.LOST_ITEMS)
        .doc(after.lostItemId)
        .update({ status: "matched" });

      await db
        .collection(COLLECTIONS.FOUND_ITEMS)
        .doc(after.foundItemId)
        .update({ status: "matched" });

      await createAuditLog("MATCH_VERIFIED", "admin", { matchId });
    }

    // Handle recovery completion
    if (after.status === "recovered" && before.status !== "recovered") {
      await createRecoveryEntry(matchId, after);
    }
  }
);

// ============================================
// 5️⃣ CREATE RECOVERY ENTRY
// ============================================

async function createRecoveryEntry(matchId, matchData) {
  try {
    // Get item details
    const lostItemDoc = await db
      .collection(COLLECTIONS.LOST_ITEMS)
      .doc(matchData.lostItemId)
      .get();
    const foundItemDoc = await db
      .collection(COLLECTIONS.FOUND_ITEMS)
      .doc(matchData.foundItemId)
      .get();

    const lostItem = lostItemDoc.data();
    const foundItem = foundItemDoc.data();

    // Get user details
    const ownerDoc = await db
      .collection(COLLECTIONS.USERS)
      .doc(matchData.ownerId)
      .get();
    const finderDoc = await db
      .collection(COLLECTIONS.USERS)
      .doc(matchData.finderId)
      .get();

    const entry = {
      matchId: matchId,
      itemTitle: lostItem.title,
      itemCategory: lostItem.category,
      itemValue: lostItem.estimatedValue || null,
      ownerDisplayName: ownerDoc.data()?.displayName || "Anonymous",
      finderDisplayName: finderDoc.data()?.displayName || "Good Samaritan",
      story: null, // Can be added by users later
      recoveredAt: FieldValue.serverTimestamp(),
      locationCity: lostItem.locationLost?.name || "Unknown",
    };

    await db.collection(COLLECTIONS.RECOVERY_LEDGER).add(entry);

    // Update user stats
    const batch = db.batch();

    batch.update(db.collection(COLLECTIONS.USERS).doc(matchData.ownerId), {
      "stats.successfulRecoveries": FieldValue.increment(1),
      reputationScore: FieldValue.increment(10),
    });

    batch.update(db.collection(COLLECTIONS.USERS).doc(matchData.finderId), {
      "stats.successfulRecoveries": FieldValue.increment(1),
      reputationScore: FieldValue.increment(25), // Finder gets more points
      badges: FieldValue.arrayUnion("good_samaritan"),
    });

    // Update item statuses to recovered
    batch.update(
      db.collection(COLLECTIONS.LOST_ITEMS).doc(matchData.lostItemId),
      {
        status: "recovered",
      }
    );

    batch.update(
      db.collection(COLLECTIONS.FOUND_ITEMS).doc(matchData.foundItemId),
      {
        status: "recovered",
      }
    );

    await batch.commit();

    await createAuditLog("RECOVERY_COMPLETED", "system", { matchId });

    logger.info(`Recovery entry created for match: ${matchId}`);
  } catch (error) {
    logger.error("Failed to create recovery entry:", error);
  }
}

// ============================================
// 6️⃣ SCHEDULED CLEANUP
// ============================================

exports.cleanupOldItems = onSchedule(
  {
    schedule: "every day 02:00",
    timeZone: "UTC",
  },
  async (event) => {
    logger.info("Running scheduled cleanup");

    const thirtyDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // Archive old unmatched lost items
    const oldLostItems = await db
      .collection(COLLECTIONS.LOST_ITEMS)
      .where("status", "==", "searching")
      .where("createdAt", "<", thirtyDaysAgo)
      .get();

    let archivedCount = 0;
    for (const doc of oldLostItems.docs) {
      await doc.ref.update({ status: "expired" });
      archivedCount++;
    }

    // Archive old unmatched found items
    const oldFoundItems = await db
      .collection(COLLECTIONS.FOUND_ITEMS)
      .where("status", "==", "verified")
      .where("createdAt", "<", thirtyDaysAgo)
      .get();

    for (const doc of oldFoundItems.docs) {
      await doc.ref.update({ status: "expired" });
      archivedCount++;
    }

    logger.info(`Cleanup complete. Archived ${archivedCount} items.`);
  }
);

// ============================================
// 7️⃣ CALLABLE: ADMIN APPROVE MATCH
// ============================================

exports.approveMatch = onCall(async (request) => {
  // Verify admin
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  if (userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const { matchId, approved, notes } = request.data;

  const matchRef = db.collection(COLLECTIONS.MATCHES).doc(matchId);
  const matchDoc = await matchRef.get();

  if (!matchDoc.exists) {
    throw new HttpsError("not-found", "Match not found");
  }

  await matchRef.update({
    status: approved ? "verified" : "rejected",
    adminNotes: notes || "",
    updatedAt: FieldValue.serverTimestamp(),
  });

  await createAuditLog(approved ? "MATCH_APPROVED" : "MATCH_REJECTED", userId, {
    matchId,
    notes,
  });

  return { success: true, status: approved ? "verified" : "rejected" };
});

// ============================================
// 8️⃣ CALLABLE: SEND VERIFICATION QUIZ
// ============================================

exports.sendVerificationQuiz = onCall(async (request) => {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const { matchId } = request.data;

  const matchRef = db.collection(COLLECTIONS.MATCHES).doc(matchId);
  const matchDoc = await matchRef.get();

  if (!matchDoc.exists) {
    throw new HttpsError("not-found", "Match not found");
  }

  const match = matchDoc.data();

  // Only admin or finder can send quiz
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  const isAdmin = userDoc.data()?.role === "admin";
  const isFinder = match.finderId === userId;

  if (!isAdmin && !isFinder) {
    throw new HttpsError("permission-denied", "Not authorized");
  }

  await matchRef.update({
    status: "quiz_sent",
    "verificationQuiz.sentAt": FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await createAuditLog("QUIZ_SENT", userId, { matchId });

  return { success: true };
});
