/**
 * VeriFind - Admin Functions Service
 *
 * Client-side implementations for admin functions
 * (Replaces Cloud Functions for Firebase free tier)
 */

import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { COLLECTIONS } from "./firestore";

/**
 * Get current user role from database
 * @returns {Promise<string|null>} User role ('admin', 'moderator', 'user') or null
 */
export async function getCurrentUserRole() {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, currentUser.uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return null;
}

/**
 * Approve or reject a match (admin/moderator only)
 * @param {string} matchId - The match ID to approve
 * @param {boolean} approved - Whether to approve or reject
 * @param {string} notes - Admin notes
 */
export async function approveMatch(matchId, approved, notes = "") {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const role = await getCurrentUserRole();
  if (!role || !["admin", "moderator"].includes(role)) {
    throw new Error("Unauthorized: Admin or moderator access required");
  }

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);

  await updateDoc(matchRef, {
    status: approved ? "approved" : "rejected",
    adminNotes: notes,
    reviewedBy: currentUser.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, approved };
}

/**
 * Send verification quiz to owner (marks match as ready for verification)
 * @param {string} matchId - The match ID
 */
export async function sendVerificationQuiz(matchId) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
  const matchDoc = await getDoc(matchRef);

  if (!matchDoc.exists()) {
    throw new Error("Match not found");
  }

  const matchData = matchDoc.data();

  // Only finder or admin can send quiz
  const role = await getCurrentUserRole();
  if (
    currentUser.uid !== matchData.finderId &&
    !["admin", "moderator"].includes(role)
  ) {
    throw new Error(
      "Unauthorized: Only finder or admin can send verification quiz"
    );
  }

  await updateDoc(matchRef, {
    status: "quiz_sent",
    "verificationQuiz.sentAt": serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true, matchId };
}

/**
 * Update match status (admin only)
 */
export async function updateMatchStatus(matchId, status, notes = "") {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const role = await getCurrentUserRole();
  if (!role || !["admin", "moderator"].includes(role)) {
    throw new Error("Unauthorized: Admin or moderator access required");
  }

  const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);

  await updateDoc(matchRef, {
    status,
    adminNotes: notes,
    updatedAt: serverTimestamp(),
  });

  return { success: true, status };
}

export default {
  approveMatch,
  sendVerificationQuiz,
  updateMatchStatus,
};
