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
 * Uses the found item description to create a question only the true owner would know
 *
 * @param {string} description - The found item's description
 * @param {string} category - The item category (electronics, wallet, keys, etc.)
 * @returns {Promise<{question: string, options: string[], correctIndex: number, hint: string}>}
 */
export async function generateVerificationQuestion(description, category) {
  const ai = getGenAI();

  // Fallback if no API key
  if (!ai) {
    return generateFallbackQuestion(category);
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a verification expert for a lost and found platform. Your job is to generate a multiple-choice question that helps verify the true owner of a found item.

FOUND ITEM DETAILS:
- Category: ${category}
- Description: ${description}

RULES:
1. Generate ONE question that only the true owner would likely know
2. The question should be about a specific detail NOT mentioned in the description
3. DO NOT reveal the answer in the question
4. Create 4 believable options where only one is correct
5. The question should be about: color variants, brand specifics, hidden features, personalization, purchase details, or unique marks

RESPOND ONLY WITH VALID JSON in this exact format:
{
  "question": "What is the [specific detail about the item]?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "hint": "Think about when you first got this item"
}

IMPORTANT: 
- correctIndex should be a number 0-3
- Make options realistic and similar in style
- Question should not be answerable from the description alone`;

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
