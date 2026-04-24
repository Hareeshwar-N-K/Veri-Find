/**
 * VeriFind - Fairness & Bias Detection Utilities
 *
 * Implements bias-aware checks across the matching engine,
 * quiz generation, and reward system to ensure equitable
 * automated decision-making for all campus users.
 *
 * Concepts applied:
 * - Algorithmic Fairness
 * - Disparate Impact Detection
 * - Readability / Accessibility Scoring
 * - Category-Level Equity Monitoring
 * - Reputation Inflation Prevention
 */

// ============================================
// 1. DESCRIPTION QUALITY NORMALIZER
// ============================================

/**
 * Counts only meaningful physical-attribute keywords in a text.
 * Used to prevent long descriptions from unfairly outscoring short ones.
 *
 * Physical keywords: color, brand, size, material, model, condition marks.
 * These are the only words that should influence match score.
 */
const PHYSICAL_KEYWORDS = [
  // Colors
  "black","white","red","blue","green","yellow","orange","purple","pink",
  "grey","gray","brown","silver","gold","navy","cyan","maroon","beige",
  // Materials
  "leather","fabric","metal","plastic","rubber","glass","wood","canvas",
  "silicone","nylon","cotton","denim","synthetic",
  // Conditions / marks
  "scratch","crack","broken","dent","sticker","worn","torn","faded",
  "engraved","marked","damaged","repaired","bent","chipped",
  // Size descriptors
  "small","large","medium","big","mini","compact","thin","thick","heavy","light",
  // Common brands (campus-relevant)
  "apple","samsung","oneplus","redmi","realme","oppo","vivo","nokia","sony",
  "hp","dell","lenovo","asus","acer","boat","jbl","nike","adidas","puma",
  // Item-specific
  "strap","case","cover","bag","pouch","chain","ring","band","clip","hook",
  "zipper","button","buckle","lock","key","card","slot","pocket","compartment",
];

/**
 * Extracts meaningful physical-attribute word count from a description.
 * Returns a normalized score (0-1) based on keyword density, not raw length.
 *
 * @param {string} text
 * @returns {number} 0-1 quality score
 */
export function getDescriptionQualityScore(text) {
  if (!text || text.trim().length === 0) return 0;

  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return 0;

  const keywordMatches = words.filter((w) =>
    PHYSICAL_KEYWORDS.some((kw) => w.includes(kw))
  ).length;

  // Keyword density: how many physical words out of total words
  const density = keywordMatches / words.length;

  // Bonus for having at least some content (prevents empty descriptions scoring 0)
  const lengthBonus = Math.min(words.length / 10, 0.3);

  return Math.min(density + lengthBonus, 1);
}

/**
 * Normalizes two description scores so that a short but keyword-rich
 * description is not penalized against a long but vague one.
 *
 * Returns a fairness-adjusted similarity score (0-1).
 *
 * @param {string} text1
 * @param {string} text2
 * @param {number} rawJaccardScore - original Jaccard similarity
 * @returns {number} adjusted score
 */
export function normalizeDescriptionScore(text1, text2, rawJaccardScore) {
  const q1 = getDescriptionQualityScore(text1);
  const q2 = getDescriptionQualityScore(text2);

  // If both descriptions are low quality, don't penalize — give neutral score
  if (q1 < 0.1 && q2 < 0.1) return 0.4;

  // If one is high quality and one is low, boost the raw score slightly
  // so the low-quality reporter isn't completely excluded
  const qualityGap = Math.abs(q1 - q2);
  if (qualityGap > 0.4) {
    // Large gap — one person described well, other didn't
    // Boost raw score by up to 0.15 to reduce unfair penalty
    return Math.min(rawJaccardScore + 0.15, 1);
  }

  return rawJaccardScore;
}

// ============================================
// 2. BIAS FLAG DETECTOR
// ============================================

/**
 * Analyzes a match result and flags potential bias reasons.
 * Called after calculateMatchScore() to attach a fairness audit.
 *
 * @param {object} lostItem
 * @param {object} foundItem
 * @param {object} breakdown - score breakdown {category, title, description, location, date}
 * @returns {object} { isFlagged: boolean, reasons: string[], suggestion: string }
 */
export function detectMatchBias(lostItem, foundItem, breakdown) {
  const reasons = [];

  const lostDesc = lostItem.description || "";
  const foundDesc = foundItem.description || "";

  // Flag 1: Category + location match but description score is very low
  // This likely means both items are the same but described differently
  if (
    breakdown.category === 1 &&
    breakdown.location >= 0.7 &&
    breakdown.description < 0.1
  ) {
    reasons.push(
      "Low description similarity despite matching category and location — possible language/detail gap"
    );
  }

  // Flag 2: One description is significantly shorter than the other
  const lostWords = lostDesc.trim().split(/\s+/).length;
  const foundWords = foundDesc.trim().split(/\s+/).length;
  if (lostWords > 0 && foundWords > 0) {
    const ratio = Math.min(lostWords, foundWords) / Math.max(lostWords, foundWords);
    if (ratio < 0.3) {
      reasons.push(
        "Large description length gap — one reporter may have provided less detail due to language barrier"
      );
    }
  }

  // Flag 3: Title matches well but description doesn't
  if (breakdown.title >= 0.5 && breakdown.description < 0.15) {
    reasons.push(
      "Title similarity is high but description similarity is low — consider manual review"
    );
  }

  // Flag 4: Date and location match but overall score is low
  if (breakdown.date >= 0.7 && breakdown.location >= 0.7 && breakdown.description < 0.2) {
    reasons.push(
      "Strong time and location match with weak description — likely same item with different reporting styles"
    );
  }

  const isFlagged = reasons.length > 0;
  const suggestion = isFlagged
    ? "This match may be affected by description quality disparity. Consider lowering the rejection threshold or flagging for manual review."
    : "No bias indicators detected.";

  return { isFlagged, reasons, suggestion };
}

// ============================================
// 3. QUIZ READABILITY CHECKER
// ============================================

/**
 * Estimates the reading difficulty of a question string.
 * Uses average word length as a simple proxy for complexity.
 * (No external library needed — works offline.)
 *
 * Grade levels:
 *   easy   → avg word length ≤ 4.5  (simple English)
 *   medium → avg word length ≤ 6.0
 *   hard   → avg word length > 6.0  (complex / jargon)
 *
 * @param {string} text
 * @returns {{ level: 'easy'|'medium'|'hard', avgWordLength: number, isFair: boolean }}
 */
export function checkQuestionReadability(text) {
  if (!text) return { level: "easy", avgWordLength: 0, isFair: true };

  const words = text.replace(/[^a-zA-Z\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return { level: "easy", avgWordLength: 0, isFair: true };

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  let level;
  if (avgWordLength <= 4.5) level = "easy";
  else if (avgWordLength <= 6.0) level = "medium";
  else level = "hard";

  // A question is "fair" if it's easy or medium difficulty
  const isFair = level !== "hard";

  return { level, avgWordLength: Math.round(avgWordLength * 10) / 10, isFair };
}

/**
 * Validates all 3 quiz questions for fairness/accessibility.
 * Returns a report with per-question readability and an overall pass/fail.
 *
 * @param {Array<{question: string, options: string[]}>} questions
 * @returns {{ passed: boolean, report: Array, unfairCount: number }}
 */
export function validateQuizFairness(questions) {
  if (!questions || questions.length === 0) {
    return { passed: true, report: [], unfairCount: 0 };
  }

  const report = questions.map((q, idx) => {
    const readability = checkQuestionReadability(q.question);

    // Also check options for complexity
    const optionReadability = (q.options || []).map((opt) =>
      checkQuestionReadability(opt)
    );
    const hasComplexOptions = optionReadability.some((r) => !r.isFair);

    return {
      questionIndex: idx + 1,
      question: q.question,
      readability,
      hasComplexOptions,
      isFair: readability.isFair && !hasComplexOptions,
    };
  });

  const unfairCount = report.filter((r) => !r.isFair).length;

  // Quiz passes fairness check if at most 1 question is hard
  const passed = unfairCount <= 1;

  return { passed, report, unfairCount };
}

// ============================================
// 4. CATEGORY EQUITY MONITOR
// ============================================

/**
 * Calculates recovery rate per item category.
 * Used in the admin Fairness Dashboard to detect if certain
 * categories are systematically under-recovered.
 *
 * The "80% Rule": if any category's recovery rate is less than
 * 80% of the best-performing category, it is flagged as inequitable.
 *
 * @param {Array} matches - all match documents from Firestore
 * @returns {object} { categoryRates, flaggedCategories, bestRate }
 */
export function calculateCategoryEquity(matches) {
  if (!matches || matches.length === 0) {
    return { categoryRates: {}, flaggedCategories: [], bestRate: 0 };
  }

  // Count total and recovered per category
  const categoryData = {};

  matches.forEach((match) => {
    const cat = match.itemCategory || "other";
    if (!categoryData[cat]) {
      categoryData[cat] = { total: 0, recovered: 0 };
    }
    categoryData[cat].total += 1;
    if (match.status === "recovered") {
      categoryData[cat].recovered += 1;
    }
  });

  // Calculate recovery rate per category
  const categoryRates = {};
  Object.entries(categoryData).forEach(([cat, data]) => {
    categoryRates[cat] = {
      total: data.total,
      recovered: data.recovered,
      rate: data.total > 0 ? Math.round((data.recovered / data.total) * 100) : 0,
    };
  });

  // Find best recovery rate
  const rates = Object.values(categoryRates).map((d) => d.rate);
  const bestRate = Math.max(...rates, 0);

  // Flag categories below 80% of best rate (the "80% Rule")
  const threshold = bestRate * 0.8;
  const flaggedCategories = Object.entries(categoryRates)
    .filter(([, data]) => data.total >= 3 && data.rate < threshold)
    .map(([cat, data]) => ({
      category: cat,
      rate: data.rate,
      total: data.total,
      recovered: data.recovered,
      gap: Math.round(bestRate - data.rate),
    }));

  return { categoryRates, flaggedCategories, bestRate };
}

// ============================================
// 5. REPUTATION FAIRNESS CAP
// ============================================

/**
 * Weekly reputation points cap per user.
 * Prevents power users from accumulating unfair advantages
 * through repeated activity in a short period.
 */
export const WEEKLY_REPUTATION_CAP = 150;

/**
 * Checks if awarding points to a user would exceed the weekly cap.
 * Returns how many points can actually be awarded.
 *
 * @param {number} currentWeeklyPoints - points earned this week so far
 * @param {number} pointsToAward - points about to be awarded
 * @returns {{ allowed: number, capped: boolean }}
 */
export function applyReputationCap(currentWeeklyPoints, pointsToAward) {
  const remaining = Math.max(WEEKLY_REPUTATION_CAP - currentWeeklyPoints, 0);
  const allowed = Math.min(pointsToAward, remaining);
  return {
    allowed,
    capped: allowed < pointsToAward,
  };
}

export default {
  getDescriptionQualityScore,
  normalizeDescriptionScore,
  detectMatchBias,
  checkQuestionReadability,
  validateQuizFairness,
  calculateCategoryEquity,
  applyReputationCap,
  WEEKLY_REPUTATION_CAP,
};
