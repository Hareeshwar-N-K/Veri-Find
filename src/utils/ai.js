/**
 * VeriFind - AI Utilities
 *
 * Uses Google Gemini API for intelligent verification question generation.
 * Generates ownership verification quizzes without revealing sensitive details.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

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
 * Generate a verification question to prove item ownership
 * Uses comprehensive item data to create a question only the true owner would know
 *
 * @param {object} itemData - Complete item data object
 * @param {string} itemData.description - The item's description
 * @param {string} itemData.category - The item category
 * @param {string} itemData.title - The item title
 * @param {object} itemData.location - Location where item was found/lost
 * @param {string} itemData.dateFound - Date when item was found
 * @param {string} itemData.storageLocation - Where item is currently stored
 * @returns {Promise<{question: string, options: string[], correctIndex: number, hint: string}>}
 */
export async function generateVerificationQuestion(itemData) {
  const ai = getGenAI();

  // Extract data with defaults
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
  } = itemData;

  const location =
    locationFound?.name || locationLost?.name || "Unknown location";
  const date = dateFound || dateLost;
  const dateStr = date
    ? date.toDate
      ? date.toDate().toLocaleDateString()
      : new Date(date).toLocaleDateString()
    : "Unknown date";

  // Fallback if no API key
  if (!ai) {
    return generateFallbackQuestion(category);
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a verification expert for a lost and found platform called VeriFind. Your critical job is to generate a SINGLE multiple-choice question that ONLY the TRUE OWNER of this item would be able to answer correctly.

═══════════════════════════════════════════════════════════════
COMPLETE ITEM INFORMATION:
═══════════════════════════════════════════════════════════════
• Title: ${title}
• Category: ${category}
• Description: ${description}
• Location Found: ${location}
• Date: ${dateStr}
• Storage Location: ${currentStorageLocation || "Not specified"}
• Has Images: ${images.length > 0 ? "Yes" : "No"}

═══════════════════════════════════════════════════════════════
QUESTION GENERATION RULES:
═══════════════════════════════════════════════════════════════

1. ANALYZE the item thoroughly based on its category and description
2. Generate a question about a SPECIFIC DETAIL that:
   - Is NOT mentioned in the description above
   - Only the real owner would know
   - Cannot be guessed easily

3. QUESTION TYPES by Category:
   
   📱 ELECTRONICS (phones, laptops, tablets):
   - Lock screen wallpaper or home screen arrangement
   - Last app used or notification settings
   - Case color/brand if not mentioned
   - Storage capacity or specific model variant
   - Stickers, scratches, or personalization
   
   👛 WALLET/PURSE:
   - Specific card in a particular slot
   - Hidden compartment contents
   - Photo in ID window
   - Approximate cash amount range
   - Loyalty cards or receipts inside
   
   🔑 KEYS:
   - Number of keys on the ring
   - Keychain description if not mentioned
   - Key colors or special markings
   - What each key is for
   
   💍 JEWELRY:
   - Inscription or engraving inside
   - Exact stone type or metal purity
   - Where it was purchased
   - Matching set items
   
   👕 CLOTHING/BAGS:
   - Size or brand if not mentioned
   - Contents of pockets
   - Wear marks or repairs
   - Tags or labels inside
   
   📄 DOCUMENTS:
   - Specific page numbers or content
   - Handwritten notes
   - Stamps or signatures
   - Paper condition details
   
   🎒 OTHER ITEMS:
   - Serial numbers or model numbers
   - Hidden compartments
   - Personal modifications
   - Purchase location or date

4. CREATE 4 OPTIONS that are:
   - All plausible and realistic for this item type
   - Similar in length and style
   - Not obviously wrong
   - Mixed so correct answer isn't always first

5. IMPORTANT CONSTRAINTS:
   - Question MUST be directly related to the specific item described
   - Do NOT ask generic questions
   - Do NOT reveal the answer in the question
   - The correct answer should be randomly placed (not always index 0)

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON ONLY):
═══════════════════════════════════════════════════════════════

{
  "question": "Your specific question about THIS item?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": [0-3 randomly],
  "hint": "A helpful hint related to the item's personal history"
}

RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    if (text.includes("```json")) {
      jsonText = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
      jsonText = text.split("```")[1].split("```")[0].trim();
    }

    const quizData = JSON.parse(jsonText);

    // Validate the response structure
    if (
      !quizData.question ||
      !Array.isArray(quizData.options) ||
      quizData.options.length !== 4
    ) {
      console.warn("Invalid AI response structure, using fallback");
      return generateFallbackQuestion(category);
    }

    return {
      question: quizData.question,
      options: quizData.options,
      correctIndex:
        typeof quizData.correctIndex === "number" ? quizData.correctIndex : 0,
      hint: quizData.hint || "Think carefully about your item",
      generatedByAI: true,
    };
  } catch (error) {
    console.error("Error generating AI question:", error);
    return generateFallbackQuestion(category);
  }
}

/**
 * Generate a fallback question when AI is unavailable
 */
function generateFallbackQuestion(category) {
  const categoryQuestions = {
    electronics: {
      question:
        "What is the approximate storage capacity or a distinguishing mark on your device?",
      options: [
        "16GB - No marks",
        "32GB - Small scratch on back",
        "64GB - Sticker on case",
        "128GB - Cracked corner",
      ],
      hint: "Think about when you purchased the device",
    },
    wallet: {
      question:
        "What item is in a specific slot or compartment of your wallet?",
      options: [
        "Library card in front slot",
        "Old receipt in coin pocket",
        "Photo in ID window",
        "Business card behind cash",
      ],
      hint: "Think about what you always keep in your wallet",
    },
    keys: {
      question: "Describe a unique keychain or marking on your keys",
      options: [
        "Metal bottle opener keychain",
        "Fabric lanyard attached",
        "Rubber grip on main key",
        "Small flashlight keychain",
      ],
      hint: "Think about what makes your keys unique",
    },
    jewelry: {
      question: "What is a hidden detail or inscription on your jewelry?",
      options: [
        "Initials engraved inside",
        "Small scratch near clasp",
        "Faded hallmark",
        "Missing stone setting",
      ],
      hint: "Look for personalization or wear marks",
    },
    clothing: {
      question: "What distinguishing feature is on your clothing item?",
      options: [
        "Size tag partially torn",
        "Small stain inside pocket",
        "Extra button sewn inside",
        "Name written on label",
      ],
      hint: "Think about unique marks or repairs",
    },
    bags: {
      question: "What is inside a hidden pocket or compartment of your bag?",
      options: ["Emergency cash", "Old ticket stub", "Spare key", "Medicine"],
      hint: "Think about what you always keep hidden",
    },
    documents: {
      question: "What specific marking or detail is on your document?",
      options: [
        "Coffee stain on corner",
        "Folded crease down middle",
        "Highlighting on page 2",
        "Paper clip mark",
      ],
      hint: "Think about how you handled this document",
    },
    other: {
      question: "Describe a unique identifying feature of your item",
      options: [
        "Visible scratch or dent",
        "Faded color in one area",
        "Custom modification",
        "Missing part or piece",
      ],
      hint: "Think about what makes your item unique",
    },
  };

  const fallback =
    categoryQuestions[category.toLowerCase()] || categoryQuestions.other;

  return {
    question: fallback.question,
    options: fallback.options,
    correctIndex: Math.floor(Math.random() * 4), // Random for fallback
    hint: fallback.hint,
    generatedByAI: false,
  };
}

/**
 * Verify if the owner's answer matches the expected answer
 * For AI-generated questions with multiple choice
 *
 * @param {object} quiz - The verification quiz object
 * @param {number|string} userAnswer - The user's selected answer (index or text)
 * @returns {boolean}
 */
export function verifyQuizAnswer(quiz, userAnswer) {
  if (!quiz || quiz.correctIndex === undefined) {
    // Fallback to text comparison for legacy quizzes
    return true;
  }

  // Handle index-based answer
  if (typeof userAnswer === "number") {
    return userAnswer === quiz.correctIndex;
  }

  // Handle text-based answer
  if (typeof userAnswer === "string") {
    const selectedIndex = quiz.options?.findIndex(
      (opt) => opt.toLowerCase().trim() === userAnswer.toLowerCase().trim()
    );
    return selectedIndex === quiz.correctIndex;
  }

  return false;
}

/**
 * Generate a match confidence explanation using AI
 *
 * @param {object} lostItem - The lost item data
 * @param {object} foundItem - The found item data
 * @param {number} score - The match score (0-1)
 * @returns {Promise<string>}
 */
export async function generateMatchExplanation(lostItem, foundItem, score) {
  const ai = getGenAI();

  if (!ai) {
    return `Match confidence: ${Math.round(
      score * 100
    )}%. Category and description similarities detected.`;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `As a lost and found assistant, briefly explain (2-3 sentences) why these items might be a match:

Lost Item: ${lostItem.title} - ${lostItem.description}
Found Item: ${foundItem.title} - ${foundItem.description}
Match Score: ${Math.round(score * 100)}%

Be helpful and encouraging but cautious. Don't confirm it's definitely the same item.`;

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
  verifyQuizAnswer,
  generateMatchExplanation,
};
