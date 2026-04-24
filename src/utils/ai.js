/**
 * VeriFind - AI Utilities
 *
 * Uses Google Gemini API for intelligent verification question generation.
 * Generates ownership verification quizzes without revealing sensitive details.
 *
 * Fairness upgrades:
 * - Plain language enforcement in prompt (no jargon, max 10 words/question)
 * - Quiz readability validation after generation
 * - Fallback to simpler questions if AI output fails fairness check
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateQuizFairness } from "./fairness";

// Initialize the Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;

function getGenAI() {
  if (!genAI) {
    if (!API_KEY) {
      console.warn(
        "VITE_GEMINI_API_KEY not found. AI features will be limited."
      );
      return null;
    }
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

/**
 * Generate 3 verification MCQ questions to prove item ownership.
 * Uses comprehensive item data to create questions only the true owner would know.
 * Enforces plain language so non-native English speakers are not disadvantaged.
 *
 * @param {object} itemData - Complete item data object
 * @returns {Promise<{questions: Array, hint: string, generatedByAI: boolean, fairnessReport: object}>}
 */
export async function generateVerificationQuestions(itemData) {
  const ai = getGenAI();

  const {
    description = "",
    category = "other",
    title = "",
    locationFound = {},
    locationLost = {},
    dateFound = null,
    dateLost = null,
    currentStorageLocation = "",
    images = [],
    ownerVerificationQuestion = null,
    ownerVerificationAnswer = null,
  } = itemData;

  const location =
    locationFound?.name || locationLost?.name || "Unknown location";
  const date = dateFound || dateLost;
  const dateStr = date
    ? date.toDate
      ? date.toDate().toLocaleDateString()
      : new Date(date).toLocaleDateString()
    : "Unknown date";

  if (!ai) {
    return generateFallbackQuestions(category);
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `You are a verification expert for a lost and found platform called VeriFind. Generate EXACTLY 3 multiple-choice questions that ONLY the TRUE OWNER of this item would answer correctly.

FAIRNESS RULES - MANDATORY:
1. Use SIMPLE, PLAIN ENGLISH only. Maximum 10 words per question.
2. NO technical jargon, complex vocabulary, or idioms.
3. Questions must be clear to non-native English speakers.
4. Use everyday words: say "color" not "chromatic shade", "broken" not "fractured".
5. All 4 options must be similar in length and difficulty.
6. Never use words longer than 3 syllables unless it is a brand name.

BAD: "What was the approximate chromatic shade of the exterior casing?"
GOOD: "What color is the outside of your item?"

ITEM INFORMATION:
- Title: ${title}
- Category: ${category}
- Description: "${description}"
- Location Found: ${location}
- Date Found: ${dateStr}
- Storage Location: ${currentStorageLocation || "Not specified"}
- Images: ${images.length}

RULES:
1. ONLY ask about details EXPLICITLY in the description.
2. The correct answer MUST come directly from the description.
3. Wrong options must be equally plausible alternatives.
4. Randomize correct answer position (0-3).

QUESTION LEVELS:
- Q1 (easy): Most obvious detail — color, brand, type
- Q2 (medium): Specific feature — model, size, material
- Q3 (hard): Unique/personal detail — scratch, sticker, mark

${
  ownerVerificationQuestion && ownerVerificationAnswer
    ? `OWNER CUSTOM QUESTION (use as one of the 3):
Question: "${ownerVerificationQuestion}"
Correct Answer: "${ownerVerificationAnswer}"
Generate 3 plausible wrong options. Randomize correct answer position.`
    : ""
}

CATEGORY GUIDANCE FOR ${category.toUpperCase()}:
${getCategoryGuidance(category)}

OUTPUT FORMAT (JSON only, no other text):
{
  "questions": [
    {
      "question": "Simple plain question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2,
      "difficulty": "easy"
    },
    {
      "question": "Simple plain question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "medium"
    },
    {
      "question": "Simple plain question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 3,
      "difficulty": "hard"
    }
  ],
  "hint": "Short plain hint about the item"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    let jsonText = text;
    if (text.includes("```json")) {
      jsonText = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonText = text.split("```")[1].split("```")[0].trim();
    }

    const quizData = JSON.parse(jsonText);

    // Validate structure
    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length !== 3
    ) {
      console.warn("Invalid AI response structure, using fallback");
      return generateFallbackQuestions(category);
    }

    for (const q of quizData.questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        console.warn("Invalid question structure, using fallback");
        return generateFallbackQuestions(category);
      }
    }

    const questions = quizData.questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      difficulty: q.difficulty || "medium",
    }));

    // Run fairness validation on generated questions
    const fairnessReport = validateQuizFairness(questions);

    // If quiz fails fairness check (more than 1 hard question), use fallback
    if (!fairnessReport.passed) {
      console.warn(
        `Quiz failed fairness check (${fairnessReport.unfairCount} complex questions). Using fallback.`
      );
      const fallback = generateFallbackQuestions(category);
      return { ...fallback, fairnessReport };
    }

    return {
      questions,
      hint: quizData.hint || "Think carefully about your item",
      generatedByAI: true,
      fairnessReport,
    };
  } catch (error) {
    console.error("Error generating AI questions:", error);
    return generateFallbackQuestions(category);
  }
}

/**
 * Get category-specific guidance for question generation
 */
function getCategoryGuidance(category) {
  const guidance = {
    electronics: `ELECTRONICS:
- Easy: Brand, color, case color
- Medium: Storage size, model, screen size
- Hard: Stickers, scratches, custom settings`,

    wallet: `WALLET:
- Easy: Color, brand, material
- Medium: Number of card slots, closure type
- Hard: What is in a specific slot, wear marks`,

    keys: `KEYS:
- Easy: Number of keys, keychain color
- Medium: Key colors, keychain brand
- Hard: What each key opens, special marks`,

    jewelry: `JEWELRY:
- Easy: Metal type, stone color
- Medium: Chain length, clasp type
- Hard: Engraving text, repair marks`,

    clothing: `CLOTHING:
- Easy: Color, brand
- Medium: Size, pattern, material
- Hard: Name on tag, stains, repairs`,

    bags: `BAGS:
- Easy: Brand, color, material
- Medium: Number of pockets, strap type
- Hard: Hidden pocket contents, wear marks`,

    documents: `DOCUMENTS:
- Easy: Document type, color
- Medium: Number of pages, binding
- Hard: Handwritten notes, stains`,

    other: `OTHER:
- Easy: Color, size, material
- Medium: Brand, model, features
- Hard: Serial number, modifications, wear`,
  };

  return guidance[category.toLowerCase()] || guidance.other;
}

/**
 * Legacy wrapper for backward compatibility
 */
export async function generateVerificationQuestion(itemData) {
  const result = await generateVerificationQuestions(itemData);

  return {
    question:
      result.questions[0]?.question || "Describe a unique feature of your item",
    options: result.questions[0]?.options || [],
    correctIndex: result.questions[0]?.correctIndex || 0,
    hint: result.hint,
    generatedByAI: result.generatedByAI,
    allQuestions: result.questions,
    fairnessReport: result.fairnessReport,
  };
}

/**
 * Generate 3 fallback questions when AI is unavailable.
 * All fallback questions are pre-validated for plain language.
 */
function generateFallbackQuestions(category) {
  const categoryQuestions = {
    electronics: {
      questions: [
        {
          question: "What color is your device or its case?",
          options: ["Black", "White or Silver", "Blue", "Other color"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "How much storage does your device have?",
          options: ["32GB or less", "64GB", "128GB", "256GB or more"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What mark or sticker is on your device?",
          options: [
            "Sticker on the back",
            "Cracked screen protector",
            "Scratch near charger port",
            "No mark or sticker",
          ],
          correctIndex: 0,
          difficulty: "hard",
        },
      ],
      hint: "Think about when you bought the device",
    },
    wallet: {
      questions: [
        {
          question: "What is your wallet made of?",
          options: ["Leather", "Fake leather", "Fabric", "Plastic"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "How many card slots does your wallet have?",
          options: ["1 to 4", "5 to 8", "9 to 12", "More than 12"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What do you keep in a hidden part of your wallet?",
          options: [
            "Library or gym card",
            "Old receipt",
            "Emergency cash",
            "A photo",
          ],
          correctIndex: 2,
          difficulty: "hard",
        },
      ],
      hint: "Think about what you always keep in your wallet",
    },
    keys: {
      questions: [
        {
          question: "How many keys are on your keyring?",
          options: ["1 or 2", "3 or 4", "5 or 6", "7 or more"],
          correctIndex: 1,
          difficulty: "easy",
        },
        {
          question: "What type of keychain do you have?",
          options: ["Metal", "Plastic or rubber", "Fabric", "No keychain"],
          correctIndex: 0,
          difficulty: "medium",
        },
        {
          question: "What color is your main key?",
          options: ["Silver", "Gold", "Bronze", "Painted color"],
          correctIndex: 0,
          difficulty: "hard",
        },
      ],
      hint: "Think about what makes your keys unique",
    },
    jewelry: {
      questions: [
        {
          question: "What metal is your jewelry made of?",
          options: ["Gold", "Silver", "White gold", "Fashion metal"],
          correctIndex: 1,
          difficulty: "easy",
        },
        {
          question: "What type of clasp does it have?",
          options: ["Lobster claw", "Spring ring", "Toggle", "No clasp"],
          correctIndex: 0,
          difficulty: "medium",
        },
        {
          question: "Is there any writing on your jewelry?",
          options: ["Initials", "A date", "A message", "No writing"],
          correctIndex: 3,
          difficulty: "hard",
        },
      ],
      hint: "Look for personal marks or writing",
    },
    clothing: {
      questions: [
        {
          question: "What is the main color of the item?",
          options: ["Black or dark gray", "White or cream", "Blue or navy", "Other color"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "What size is the clothing?",
          options: ["Small", "Medium", "Large", "Extra large"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What special mark is on the item?",
          options: ["Torn tag", "Small stain", "Name written inside", "No mark"],
          correctIndex: 3,
          difficulty: "hard",
        },
      ],
      hint: "Think about unique marks or repairs",
    },
    bags: {
      questions: [
        {
          question: "What is the main color of the bag?",
          options: ["Black", "Brown or tan", "Blue or navy", "Other color"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "How many main pockets does the bag have?",
          options: ["1", "2", "3", "4 or more"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What is in a hidden pocket of the bag?",
          options: ["Cash", "Old ticket", "Spare key", "Nothing"],
          correctIndex: 3,
          difficulty: "hard",
        },
      ],
      hint: "Think about what you always keep in your bag",
    },
    documents: {
      questions: [
        {
          question: "What type of document is this?",
          options: ["ID or certificate", "Personal letter", "Work paper", "School paper"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "What is the condition of the document?",
          options: ["Like new", "Slightly worn", "Folded", "Damaged or stained"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "Is there any writing on the document?",
          options: ["Handwritten notes", "Highlighter marks", "Signature", "No writing"],
          correctIndex: 3,
          difficulty: "hard",
        },
      ],
      hint: "Think about how you used this document",
    },
    other: {
      questions: [
        {
          question: "What is the main color of the item?",
          options: ["Black or dark", "White or light", "Colorful", "Silver or metal"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "How big is the item?",
          options: ["Fits in pocket", "Fits in hand", "Needs a bag", "Very large"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What makes your item unique?",
          options: ["Scratch or dent", "Custom change", "Wear marks", "Nothing special"],
          correctIndex: 2,
          difficulty: "hard",
        },
      ],
      hint: "Think about what makes your item unique",
    },
  };

  const fallback =
    categoryQuestions[category.toLowerCase()] || categoryQuestions.other;

  return {
    questions: fallback.questions,
    hint: fallback.hint,
    generatedByAI: false,
    fairnessReport: { passed: true, report: [], unfairCount: 0 },
  };
}

/**
 * Verify if the owner's answer matches the expected answer
 */
export function verifyQuizAnswer(quiz, userAnswer) {
  if (!quiz || quiz.correctIndex === undefined) return true;

  if (typeof userAnswer === "number") {
    return userAnswer === quiz.correctIndex;
  }

  if (typeof userAnswer === "string") {
    const selectedIndex = quiz.options?.findIndex(
      (opt) => opt.toLowerCase().trim() === userAnswer.toLowerCase().trim()
    );
    return selectedIndex === quiz.correctIndex;
  }

  return false;
}

/**
 * Verify answers for all 3 questions.
 * Must get at least 2 out of 3 correct to pass.
 */
export function verifyAllQuizAnswers(questions, userAnswers) {
  if (!questions || !Array.isArray(questions) || !userAnswers) {
    return { correctCount: 0, total: 0, passed: false };
  }

  let correctCount = 0;
  const total = questions.length;

  questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctIndex) {
      correctCount++;
    }
  });

  const passed = correctCount >= Math.ceil(total * 0.66);

  return { correctCount, total, passed };
}

/**
 * Generate a match confidence explanation using AI
 */
export async function generateMatchExplanation(lostItem, foundItem, score) {
  const ai = getGenAI();

  if (!ai) {
    return `Match confidence: ${Math.round(
      score * 100
    )}%. Category and description similarities detected.`;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `As a lost and found assistant, briefly explain (2-3 sentences) why these items might be a match:

Lost Item: ${lostItem.title} - ${lostItem.description}
Found Item: ${foundItem.title} - ${foundItem.description}
Match Score: ${Math.round(score * 100)}%

Use simple plain English. Be helpful but cautious. Do not confirm it is definitely the same item.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating explanation:", error);
    return `Match confidence: ${Math.round(
      score * 100
    )}%. The items share similar characteristics in category, location, and description.`;
  }
}

export default {
  generateVerificationQuestion,
  generateVerificationQuestions,
  verifyQuizAnswer,
  verifyAllQuizAnswers,
  generateMatchExplanation,
};
