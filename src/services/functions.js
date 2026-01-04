/**
 * VeriFind - Cloud Functions Service
 *
 * Frontend interface to call Firebase Cloud Functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

// Initialize Functions
const functions = getFunctions(app);

/**
 * Approve a match (admin only)
 * @param {string} matchId - The match ID to approve
 * @param {boolean} approved - Whether to approve or reject
 * @param {string} notes - Admin notes
 */
export async function approveMatch(matchId, approved, notes = "") {
  const approveMatchFn = httpsCallable(functions, "approveMatch");
  const result = await approveMatchFn({ matchId, approved, notes });
  return result.data;
}

/**
 * Send verification quiz to owner
 * @param {string} matchId - The match ID
 */
export async function sendVerificationQuiz(matchId) {
  const sendQuizFn = httpsCallable(functions, "sendVerificationQuiz");
  const result = await sendQuizFn({ matchId });
  return result.data;
}

export default {
  approveMatch,
  sendVerificationQuiz,
};
