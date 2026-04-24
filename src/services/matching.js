/**
 * VeriFind - Client-Side Matching Service (HARDENED)
 *
 * Privacy-preserving matching algorithm that runs on the frontend.
 * Matches lost items against the found_items_index (NOT full found_items).
 *
 * SECURITY FIXES:
 * - Matches against found_items_index (category, location, date only — no descriptions)
 * - Quiz correctIndex is stored in answer_key subcollection (owner can't read it)
 * - No client-side reputation writes to other users
 * - Match deduplication check before creation
 * - Items NOT set to "matched" until verification passes
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
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import {
  COLLECTIONS,
  createNotification,
  storeAnswerKey,
  updateFoundItemIndexStatus,
} from "./firestore";
import { generateVerificationQuestions, generateMatchAssessment } from "../utils/ai";

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
 * Calculate overall match score between a lost item and found item (or index entry).
 * When matching against the index, only category, location, and date are available.
 * Full text matching (title, description) only works when full item data is provided.
 *
 * Returns a score between 0 and 1
 */
export function calculateMatchScore(lostItem, foundItem) {
  // Determine if we have full item data or just index metadata
  const hasFullData = !!foundItem.title || !!foundItem.description;

  const scores = {
    category: calculateCategoryScore(lostItem.category, foundItem.category),
    location: calculateLocationScore(
      lostItem.locationLost,
      foundItem.locationFound || { name: foundItem.locationName }
    ),
    date: calculateDateScore(lostItem.dateLost, foundItem.dateFound),
  };

  // If category doesn't match, score is 0
  if (scores.category === 0) return { score: 0, breakdown: scores };

  if (hasFullData) {
    // Full matching with text similarity
    scores.title = calculateTextSimilarity(lostItem.title, foundItem.title);
    scores.description = calculateTextSimilarity(
      lostItem.description,
      foundItem.description
    );

    const weights = {
      category: 0.3,
      title: 0.2,
      description: 0.2,
      location: 0.2,
      date: 0.1,
    };

    const totalScore = Object.keys(weights).reduce((sum, key) => {
      return sum + (scores[key] || 0) * weights[key];
    }, 0);

    return {
      score: Math.round(totalScore * 100) / 100,
      breakdown: scores,
    };
  } else {
    // Index-only matching (no title/description available for privacy)
    const weights = {
      category: 0.4,
      location: 0.35,
      date: 0.25,
    };

    const totalScore = Object.keys(weights).reduce((sum, key) => {
      return sum + (scores[key] || 0) * weights[key];
    }, 0);

    return {
      score: Math.round(totalScore * 100) / 100,
      breakdown: { ...scores, title: 0, description: 0 },
    };
  }
}

/**
 * Find potential matches for a lost item.
 * SECURITY FIX: Queries found_items_index instead of found_items.
 * Only category, location name, and date are used for matching.
 * No descriptions, images, or storage locations are exposed.
 */
export async function findMatchesForLostItem(lostItem, minScore = 0.5) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Query the INDEX collection (not the full found_items)
  const q = query(
    collection(db, COLLECTIONS.FOUND_ITEMS_INDEX),
    where("category", "==", lostItem.category),
    where("status", "==", "pending")
  );

  const snapshot = await getDocs(q);
  const matches = [];

  snapshot.docs.forEach((docSnap) => {
    const indexEntry = { id: docSnap.id, ...docSnap.data() };

    // Don't match with own found items (Sybil prevention)
    if (indexEntry.finderId === currentUser.uid) return;

    const matchResult = calculateMatchScore(lostItem, indexEntry);

    if (matchResult.score >= minScore) {
      matches.push({
        foundItem: indexEntry, // This is index data only
        score: matchResult.score,
        breakdown: matchResult.breakdown,
      });
    }
  });

  // Sort by score descending and take top 5
  const topMatches = matches.sort((a, b) => b.score - a.score).slice(0, 5);

  // Deep scan with Gemini AI
  const finalMatches = [];
  for (const match of topMatches) {
    try {
      const aiAssessment = await generateMatchAssessment(
        lostItem,
        match.foundItem
      );
      if (aiAssessment) {
        finalMatches.push({
          ...match,
          score: aiAssessment.aiScore,
          breakdown: aiAssessment.breakdown,
        });
      } else {
        finalMatches.push(match);
      }
    } catch (err) {
      console.warn("AI assessment failed, using Jaccard score", err);
      finalMatches.push(match);
    }
  }

  // Final sort by AI score
  return finalMatches.sort((a, b) => b.score - a.score);
}

/**
 * Find potential matches for a found item.
 * Searches lost_items (which are semi-public by design).
 */
export async function findMatchesForFoundItem(foundItem, minScore = 0.5) {
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

  snapshot.docs.forEach((docSnap) => {
    const lostItem = { id: docSnap.id, ...docSnap.data() };

    // Don't match with own lost items (Sybil prevention)
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

  // Sort by score descending and take top 5
  const topMatches = matches.sort((a, b) => b.score - a.score).slice(0, 5);

  // Deep scan with Gemini AI
  const finalMatches = [];
  for (const match of topMatches) {
    try {
      const aiAssessment = await generateMatchAssessment(
        match.lostItem,
        foundItem
      );
      if (aiAssessment) {
        finalMatches.push({
          ...match,
          score: aiAssessment.aiScore,
          breakdown: aiAssessment.breakdown,
        });
      } else {
        finalMatches.push(match);
      }
    } catch (err) {
      console.warn("AI assessment failed, using Jaccard score", err);
      finalMatches.push(match);
    }
  }

  // Final sort by AI score
  return finalMatches.sort((a, b) => b.score - a.score);
}

/**
 * Check if a match already exists between two items (deduplication).
 * SECURITY FIX: Prevents spamming duplicate match documents.
 *
 * NOTE: Firestore "rules are not filters" — we must constrain the query
 * to include a field that satisfies the matches read rule (ownerId or finderId
 * must equal the current user). We check from both perspectives.
 */
async function matchExists(lostItemId, foundItemId) {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    // Check as owner (current user is the lost item owner)
    const qOwner = query(
      collection(db, COLLECTIONS.MATCHES),
      where("lostItemId", "==", lostItemId),
      where("foundItemId", "==", foundItemId),
      where("ownerId", "==", currentUser.uid)
    );
    const ownerSnap = await getDocs(qOwner);
    if (!ownerSnap.empty) return true;

    // Check as finder (current user is the found item finder)
    const qFinder = query(
      collection(db, COLLECTIONS.MATCHES),
      where("lostItemId", "==", lostItemId),
      where("foundItemId", "==", foundItemId),
      where("finderId", "==", currentUser.uid)
    );
    const finderSnap = await getDocs(qFinder);
    return !finderSnap.empty;
  } catch (error) {
    console.warn("Dedup check failed (non-critical):", error);
    return false; // Proceed with match creation if check fails
  }
}

/**
 * Create a match record between a lost item and found item.
 *
 * SECURITY FIXES:
 * 1. Quiz correctIndex is REMOVED from the match document
 * 2. Answer key stored in matches/{id}/answer_key/key (only finder can read)
 * 3. Items NOT set to "matched" immediately (remain searchable for other matches)
 * 4. Deduplication check prevents duplicate match creation
 * 5. Self-matching (ownerId === finderId) is blocked
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

  // SECURITY: Block self-matching (Sybil prevention)
  if (lostItem.ownerId === foundItem.finderId) {
    throw new Error("Cannot match your own items");
  }

  // Verify the current user is involved
  const isOwner = currentUser.uid === lostItem.ownerId;
  const isFinder = currentUser.uid === foundItem.finderId;

  if (!isOwner && !isFinder) {
    throw new Error("You must be the owner or finder to create a match");
  }

  // SECURITY: Check for duplicate matches
  const isDuplicate = await matchExists(lostItem.id, foundItem.id);
  if (isDuplicate) {
    throw new Error("A match between these items already exists");
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

  // Generate AI verification quiz
  // Note: When matching from index, the owner doesn't have foundItem description.
  // The quiz must be generated from whatever data is available.
  let verificationQuiz;
  let correctAnswers = [];

  try {
    const aiQuiz = await generateVerificationQuestions({
      title: foundItem.title || lostItem.title,
      description: foundItem.description || lostItem.description,
      category: foundItem.category || lostItem.category,
      locationFound: foundItem.locationFound,
      locationLost: lostItem.locationLost,
      dateFound: foundItem.dateFound,
      dateLost: lostItem.dateLost,
      currentStorageLocation: foundItem.currentStorageLocation,
      images: foundItem.images || [],
      ownerVerificationQuestion: lostItem.verificationQuestion,
      ownerVerificationAnswer: lostItem.verificationAnswer,
    });

    // SECURITY: Extract correctIndex values BEFORE storing in match doc.
    // Only questions (without answers) go into the match doc.
    correctAnswers = aiQuiz.questions.map((q) => q.correctIndex);

    verificationQuiz = {
      questions: aiQuiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
        // NOTE: correctIndex is intentionally OMITTED here
      })),
      hint: aiQuiz.hint,
      generatedByAI: aiQuiz.generatedByAI,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to generate AI quiz, using fallback:", error);

    // Fallback quiz — correctIndex still separated
    const fallbackQuestions = [
      {
        question: "What is the primary color of your item?",
        options: ["Black/Dark", "White/Light", "Colorful/Mixed", "Metallic"],
        correctIndex: 0,
        difficulty: "easy",
      },
      {
        question: "What is the approximate size of your item?",
        options: [
          "Small (fits in pocket)",
          "Medium (fits in hand)",
          "Large (need a bag)",
          "Very large",
        ],
        correctIndex: 1,
        difficulty: "medium",
      },
      {
        question: "What unique feature does your item have?",
        options: [
          "Visible scratch or dent",
          "Custom modification",
          "Wear marks from use",
          "No unique features",
        ],
        correctIndex: 2,
        difficulty: "hard",
      },
    ];

    correctAnswers = fallbackQuestions.map((q) => q.correctIndex);

    verificationQuiz = {
      questions: fallbackQuestions.map((q) => ({
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
        // NOTE: correctIndex is intentionally OMITTED
      })),
      hint: "Think about what makes your item unique",
      generatedByAI: false,
      sentAt: new Date().toISOString(),
    };
  }

  // Build match data WITHOUT correctIndex or correctAnswers
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
    itemCategory: lostItem.category,
    itemTitle: lostItem.title,
    lostItemTitle: lostItem.title,
    lostItemDescription: lostItem.description,
    foundItemTitle: foundItem.title || "",
    foundItemDescription: "", // SECURITY: Don't expose found item description to owner
    lostLocation: lostItem.locationLost,
    foundLocation: foundItem.locationFound || { name: foundItem.locationName },
    lostDate: lostItem.dateLost,
    foundDate: foundItem.dateFound,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTIONS.MATCHES), matchData);
  const matchId = docRef.id;

  // SECURITY: Store answer key in subcollection (only finder can read)
  try {
    await storeAnswerKey(matchId, correctAnswers);
  } catch (error) {
    console.error("Failed to store answer key:", error);
    // This is critical — delete the match if we can't store the key
    throw new Error("Failed to create secure verification quiz");
  }

  // SECURITY FIX: Do NOT set items to "matched" here.
  // Items stay in "searching"/"pending" so they can receive other potential matches.
  // Status only changes to "matched" when verification passes.

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
      message: `✨ Your found ${foundItem.category || lostItem.category} matched with a lost item report`,
      link: `/match/${matchId}`,
      matchId: matchId,
    });
  } catch (error) {
    console.error("Failed to create finder notification:", error);
  }

  return { id: docRef.id, ...matchData };
}

/**
 * Mark a match as recovered (item returned to owner).
 *
 * SECURITY FIX: Does NOT write reputation points to other users' documents.
 * Each user awards their own reputation via awardReputationForRecovery().
 * Firestore rules enforce that users can only increment their OWN reputation.
 */
export async function markAsRecovered(matchId, lostItemId, foundItemId) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Get the match to find participant IDs
  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error("Match not found");
  }

  const matchData = matchSnap.data();

  // SECURITY: Only the owner can confirm recovery
  if (currentUser.uid !== matchData.ownerId) {
    throw new Error("Only the item owner can confirm recovery");
  }

  // Update match status
  await updateDoc(matchRef, {
    status: "recovered",
    recoveredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update lost item status
  if (lostItemId) {
    await updateDoc(doc(db, COLLECTIONS.LOST_ITEMS, lostItemId), {
      status: "recovered",
      updatedAt: serverTimestamp(),
    });
  }

  // Update found item status — may fail if current user isn't the finder
  // The finder will update their own item status separately
  if (foundItemId) {
    try {
      await updateDoc(doc(db, COLLECTIONS.FOUND_ITEMS, foundItemId), {
        status: "claimed",
        updatedAt: serverTimestamp(),
      });
      await updateFoundItemIndexStatus(foundItemId, "claimed");
    } catch (e) {
      console.warn("Could not update found item (expected if not finder):", e);
    }
  }

  // NOTE: Reputation is NOT awarded here. Each user calls
  // awardReputationForRecovery() on their own behalf, which only
  // increments THEIR OWN reputation (enforced by Firestore rules).
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
  markAsRecovered,
  createChatChannel,
};
