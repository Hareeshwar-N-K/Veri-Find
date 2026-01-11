/**
 * VeriFind - Client-Side Matching Service
 *
 * AI-like matching algorithm that runs on the frontend
 * to match lost items with found items based on multiple criteria.
 *
 * This replaces Cloud Functions for Firebase free tier.
 */

import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { COLLECTIONS, createNotification } from "./firestore";
import { generateVerificationQuestion } from "../utils/ai";

/**
 * Calculate similarity score between two strings using Jaccard similarity
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
 * Calculate location similarity
 */
function calculateLocationScore(loc1, loc2) {
  if (!loc1?.name || !loc2?.name) return 0;

  // Exact match
  if (loc1.name.toLowerCase() === loc2.name.toLowerCase()) return 1;

  // Partial match
  if (
    loc1.name.toLowerCase().includes(loc2.name.toLowerCase()) ||
    loc2.name.toLowerCase().includes(loc1.name.toLowerCase())
  ) {
    return 0.7;
  }

  // Word overlap
  return calculateTextSimilarity(loc1.name, loc2.name);
}

/**
 * Calculate date proximity score
 * Items found within 7 days of being lost score higher
 */
function calculateDateScore(dateLost, dateFound) {
  if (!dateLost || !dateFound) return 0.5; // Neutral if no date

  const lostDate = dateLost.toDate ? dateLost.toDate() : new Date(dateLost);
  const foundDate = dateFound.toDate ? dateFound.toDate() : new Date(dateFound);

  const daysDiff = Math.abs((foundDate - lostDate) / (1000 * 60 * 60 * 24));

  // Found after lost (good)
  if (foundDate >= lostDate) {
    if (daysDiff <= 1) return 1;
    if (daysDiff <= 3) return 0.9;
    if (daysDiff <= 7) return 0.7;
    if (daysDiff <= 14) return 0.5;
    if (daysDiff <= 30) return 0.3;
    return 0.1;
  }

  // Found before lost (unlikely but possible)
  return 0.2;
}

/**
 * Calculate category match score
 */
function calculateCategoryScore(cat1, cat2) {
  if (!cat1 || !cat2) return 0;
  return cat1.toLowerCase() === cat2.toLowerCase() ? 1 : 0;
}

/**
 * Calculate overall match score between a lost item and found item
 * Returns a score between 0 and 1
 */
export function calculateMatchScore(lostItem, foundItem) {
  const weights = {
    category: 0.3, // Must match category
    title: 0.2, // Title similarity
    description: 0.2, // Description similarity
    location: 0.2, // Location proximity
    date: 0.1, // Date proximity
  };

  const scores = {
    category: calculateCategoryScore(lostItem.category, foundItem.category),
    title: calculateTextSimilarity(lostItem.title, foundItem.title),
    description: calculateTextSimilarity(
      lostItem.description,
      foundItem.description
    ),
    location: calculateLocationScore(
      lostItem.locationLost,
      foundItem.locationFound
    ),
    date: calculateDateScore(lostItem.dateLost, foundItem.dateFound),
  };

  // If category doesn't match, score is 0
  if (scores.category === 0) return { score: 0, breakdown: scores };

  const totalScore = Object.keys(weights).reduce((sum, key) => {
    return sum + scores[key] * weights[key];
  }, 0);

  return {
    score: Math.round(totalScore * 100) / 100,
    breakdown: scores,
  };
}

/**
 * Find potential matches for a lost item
 */
export async function findMatchesForLostItem(lostItem, minScore = 0.4) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Get all pending found items in the same category
  const q = query(
    collection(db, COLLECTIONS.FOUND_ITEMS),
    where("category", "==", lostItem.category),
    where("status", "==", "pending")
  );

  const snapshot = await getDocs(q);
  const matches = [];

  snapshot.docs.forEach((doc) => {
    const foundItem = { id: doc.id, ...doc.data() };

    // Don't match with own found items
    if (foundItem.finderId === currentUser.uid) return;

    const matchResult = calculateMatchScore(lostItem, foundItem);

    if (matchResult.score >= minScore) {
      matches.push({
        foundItem,
        score: matchResult.score,
        breakdown: matchResult.breakdown,
      });
    }
  });

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Find potential matches for a found item
 */
export async function findMatchesForFoundItem(foundItem, minScore = 0.4) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Get all searching lost items in the same category
  const q = query(
    collection(db, COLLECTIONS.LOST_ITEMS),
    where("category", "==", foundItem.category),
    where("status", "==", "searching")
  );

  const snapshot = await getDocs(q);
  const matches = [];

  snapshot.docs.forEach((doc) => {
    const lostItem = { id: doc.id, ...doc.data() };

    // Don't match with own lost items
    if (lostItem.ownerId === currentUser.uid) return;

    const matchResult = calculateMatchScore(lostItem, foundItem);

    if (matchResult.score >= minScore) {
      matches.push({
        lostItem,
        score: matchResult.score,
        breakdown: matchResult.breakdown,
      });
    }
  });

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Create a match record between a lost item and found item
 */
export async function createMatch(lostItem, foundItem, scoreData) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Validate required fields exist
  if (!lostItem?.id || !lostItem?.ownerId) {
    console.error("Invalid lostItem:", lostItem);
    throw new Error("Lost item must have id and ownerId");
  }
  if (!foundItem?.id || !foundItem?.finderId) {
    console.error("Invalid foundItem:", foundItem);
    throw new Error("Found item must have id and finderId");
  }

  // Verify the current user is involved
  const isOwner = currentUser.uid === lostItem.ownerId;
  const isFinder = currentUser.uid === foundItem.finderId;

  console.log("Creating match:", {
    currentUserId: currentUser.uid,
    lostItemOwnerId: lostItem.ownerId,
    foundItemFinderId: foundItem.finderId,
    isOwner,
    isFinder,
  });

  if (!isOwner && !isFinder) {
    throw new Error("You must be the owner or finder to create a match");
  }

  // Extract score and breakdown from scoreData
  const score =
    typeof scoreData === "number"
      ? scoreData
      : scoreData.score || scoreData.aiScore || 0;
  const breakdown = scoreData.breakdown || {
    category: 0,
    title: 0,
    description: 0,
    location: 0,
    date: 0,
  };

  console.log("Score data received:", scoreData);
  console.log("Extracted score:", score);
  console.log("Extracted breakdown:", breakdown);

  // Generate AI verification quiz using comprehensive item data
  console.log("Generating AI verification questions (3 MCQs)...");
  let verificationQuiz;
  try {
    // Pass complete item data for better question generation
    const aiQuiz = await generateVerificationQuestion({
      title: foundItem.title || lostItem.title,
      description: foundItem.description,
      category: foundItem.category || lostItem.category,
      locationFound: foundItem.locationFound,
      locationLost: lostItem.locationLost,
      dateFound: foundItem.dateFound,
      dateLost: lostItem.dateLost,
      currentStorageLocation: foundItem.currentStorageLocation,
      images: foundItem.images || [],
    });

    // Use all 3 questions for verification
    verificationQuiz = {
      questions: aiQuiz.allQuestions || [
        {
          question: aiQuiz.question,
          options: aiQuiz.options,
          correctIndex: aiQuiz.correctIndex,
          difficulty: "medium",
        },
      ],
      hint: aiQuiz.hint,
      generatedByAI: aiQuiz.generatedByAI,
      sentAt: new Date().toISOString(),
      submittedAt: null,
      userAnswers: null,
    };
    console.log(
      `AI quiz generated with ${verificationQuiz.questions.length} questions`
    );
  } catch (error) {
    console.error("Failed to generate AI quiz, using fallback:", error);
    verificationQuiz = {
      questions: [
        {
          question:
            lostItem.ownershipHints?.question ||
            "Please describe a unique identifying feature of your item",
          options: ["Feature A", "Feature B", "Feature C", "Feature D"],
          correctIndex: 0,
          difficulty: "medium",
        },
      ],
      hint: "Think about what makes your item unique",
      generatedByAI: false,
      sentAt: new Date().toISOString(),
      submittedAt: null,
      userAnswers: null,
    };
  }

  const matchData = {
    lostItemId: lostItem.id,
    foundItemId: foundItem.id,
    ownerId: lostItem.ownerId,
    ownerName: lostItem.ownerName || "Anonymous",
    finderId: foundItem.finderId,
    finderName: foundItem.finderName || "Anonymous",
    aiScore: score,
    breakdown: breakdown,
    status: "pending_verification",
    verificationQuiz,
    ownerAnswer: null,
    itemCategory: lostItem.category,
    itemTitle: lostItem.title,
    lostItemTitle: lostItem.title,
    lostItemDescription: lostItem.description,
    foundItemTitle: foundItem.title,
    foundItemDescription: foundItem.description,
    lostLocation: lostItem.locationLost,
    foundLocation: foundItem.locationFound,
    lostDate: lostItem.dateLost,
    foundDate: foundItem.dateFound,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log("Match data to create:", matchData);

  const docRef = await addDoc(collection(db, COLLECTIONS.MATCHES), matchData);
  const matchId = docRef.id;

  // Create notification for owner
  try {
    await createNotification({
      userId: lostItem.ownerId,
      type: "match_found",
      message: `🎯 Potential match found for your ${lostItem.category}: "${lostItem.title}"`,
      link: `/match/${matchId}`,
      matchId: matchId,
    });
  } catch (error) {
    console.error("Failed to create owner notification:", error);
  }

  // Create notification for finder
  try {
    await createNotification({
      userId: foundItem.finderId,
      type: "match_created",
      message: `✨ Your found ${foundItem.category} matched with a lost item report`,
      link: `/match/${matchId}`,
      matchId: matchId,
    });
  } catch (error) {
    console.error("Failed to create finder notification:", error);
  }

  // Update both items status to "matched"
  await updateDoc(doc(db, COLLECTIONS.LOST_ITEMS, lostItem.id), {
    status: "matched",
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, COLLECTIONS.FOUND_ITEMS, foundItem.id), {
    status: "matched",
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, ...matchData };
}

/**
 * Verify match with owner's answers to 3 MCQ questions
 * @param {string} matchId - The match ID
 * @param {Array<number>} answers - Array of selected option indices for each question
 * @param {object} result - Verification result {correctCount, total, passed}
 */
export async function verifyMatch(matchId, answers, result) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);

  if (result.passed) {
    await updateDoc(matchRef, {
      "verificationQuiz.userAnswers": answers,
      "verificationQuiz.correctCount": result.correctCount,
      "verificationQuiz.totalQuestions": result.total,
      "verificationQuiz.submittedAt": serverTimestamp(),
      status: "verified",
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(matchRef, {
      "verificationQuiz.userAnswers": answers,
      "verificationQuiz.correctCount": result.correctCount,
      "verificationQuiz.totalQuestions": result.total,
      "verificationQuiz.submittedAt": serverTimestamp(),
      status: "verification_failed",
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Mark a match as recovered (item returned to owner)
 * Also awards reputation points to the finder
 */
export async function markAsRecovered(matchId, lostItemId, foundItemId) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Get the match to find the finder's ID
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("Match not found");
  }

  const matchData = matchSnap.data();
  const finderId = matchData.finderId;

  // Update match status
  await updateDoc(matchRef, {
    status: "recovered",
    recoveredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update lost item status
  await updateDoc(doc(db, COLLECTIONS.LOST_ITEMS, lostItemId), {
    status: "recovered",
    updatedAt: serverTimestamp(),
  });

  // Update found item status
  await updateDoc(doc(db, COLLECTIONS.FOUND_ITEMS, foundItemId), {
    status: "claimed",
    updatedAt: serverTimestamp(),
  });

  // Award reputation points to the finder (50 points for successful recovery)
  if (finderId) {
    try {
      const finderRef = doc(db, COLLECTIONS.USERS, finderId);
      await updateDoc(finderRef, {
        reputationPoints: increment(50),
        itemsReturned: increment(1),
        updatedAt: serverTimestamp(),
      });
      console.log(`Awarded 50 reputation points to finder: ${finderId}`);
    } catch (error) {
      console.error("Failed to update finder reputation:", error);
      // Don't throw - the recovery was still successful
    }
  }

  // Also award a smaller amount to the owner for using the platform
  if (matchData.ownerId) {
    try {
      const ownerRef = doc(db, COLLECTIONS.USERS, matchData.ownerId);
      await updateDoc(ownerRef, {
        reputationPoints: increment(10),
        itemsRecovered: increment(1),
        updatedAt: serverTimestamp(),
      });
      console.log(
        `Awarded 10 reputation points to owner: ${matchData.ownerId}`
      );
    } catch (error) {
      console.error("Failed to update owner reputation:", error);
    }
  }
}

/**
 * Create a recovery ledger entry (public success story)
 */
export async function createRecoveryEntry(match, lostItem, foundItem) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const recoveryEntry = {
    matchId: match.id,
    ownerId: match.ownerId,
    finderId: match.finderId,
    itemCategory: lostItem.category,
    itemTitle: lostItem.title,
    itemValue: lostItem.estimatedValue || 0,
    locationLost: lostItem.locationLost?.name || "Unknown",
    locationFound: foundItem.locationFound?.name || "Unknown",
    daysToRecover: Math.ceil(
      (new Date() - (lostItem.dateLost?.toDate?.() || new Date())) /
        (1000 * 60 * 60 * 24)
    ),
    recoveredAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.RECOVERY_LEDGER),
    recoveryEntry
  );
  return { id: docRef.id, ...recoveryEntry };
}

/**
 * Create a chat channel for verified match
 */
export async function createChatChannel(match) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const channelData = {
    matchId: match.id,
    participants: [match.ownerId, match.finderId],
    isActive: true,
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, COLLECTIONS.CHAT_CHANNELS),
    channelData
  );
  return { id: docRef.id, ...channelData };
}

export default {
  calculateMatchScore,
  findMatchesForLostItem,
  findMatchesForFoundItem,
  createMatch,
  verifyMatch,
  markAsRecovered,
  createRecoveryEntry,
  createChatChannel,
};
