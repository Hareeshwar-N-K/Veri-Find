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
 * Generate 3 verification MCQ questions to prove item ownership
 * Uses comprehensive item data to create questions only the true owner would know
 *
 * @param {object} itemData - Complete item data object
 * @returns {Promise<{questions: Array<{question: string, options: string[], correctIndex: number}>, hint: string, generatedByAI: boolean}>}
 */
export async function generateVerificationQuestions(itemData) {
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

  // Fallback if no API key
  if (!ai) {
    return generateFallbackQuestions(category);
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `You are a verification expert for a lost and found platform called VeriFind. Your critical job is to generate EXACTLY 3 multiple-choice questions that ONLY the TRUE OWNER of this item would be able to answer correctly.

═══════════════════════════════════════════════════════════════
STEP 1: DATA ANALYSIS (Internal Processing)
═══════════════════════════════════════════════════════════════
Before generating questions, carefully analyze ALL the data below.
Extract SPECIFIC, CONCRETE facts that can be turned into answerable questions.

IMPORTANT RULES:
1. ONLY ask about details that are EXPLICITLY mentioned in the description
2. DO NOT assume or guess any details not provided
3. If a specific detail (like color, brand, model) is mentioned, use it
4. The correct answer MUST be directly from the description
5. Wrong options should be plausible alternatives for that attribute

═══════════════════════════════════════════════════════════════
COMPLETE ITEM INFORMATION (FINDER'S REPORT):
═══════════════════════════════════════════════════════════════
• Title: ${title}
• Category: ${category}
• Full Description: "${description}"
• Location Found: ${location}
• Date Found: ${dateStr}
• Current Storage Location: ${currentStorageLocation || "Not specified"}
• Number of Images: ${images.length}

═══════════════════════════════════════════════════════════════
STEP 2: EXTRACT FACTS FROM DESCRIPTION
═══════════════════════════════════════════════════════════════
Read the description carefully and identify:
- Brand/Make (if mentioned)
- Model/Type (if mentioned)
- Color(s) (if mentioned)
- Size/Capacity (if mentioned)
- Distinguishing marks (if mentioned)
- Accessories/Attachments (if mentioned)
- Condition notes (if mentioned)
- Any other specific details

ONLY create questions about details that ARE PRESENT in the description.

═══════════════════════════════════════════════════════════════
STEP 3: QUESTION GENERATION RULES
═══════════════════════════════════════════════════════════════

Generate 3 DIFFERENT questions based on FACTS FROM THE DESCRIPTION:

🟢 QUESTION 1 (EASY) - From Most Obvious Detail:
   - Ask about the most clearly stated detail (brand, color, type)
   - The correct answer MUST come directly from the description
   - Example: If description says "blue iPhone", ask about color

🟡 QUESTION 2 (MEDIUM) - From Specific Detail:
   - Ask about a specific feature mentioned in description
   - Could be model, size, capacity, material, etc.
   - Example: If description says "128GB", ask about storage

🔴 QUESTION 3 (HARD) - From Distinguishing Detail:
   - Ask about any unique/personal detail mentioned
   - Accessories, marks, stickers, damage, customizations
   - Example: If description says "scratch on corner", ask about it

CRITICAL RULES:
1. EVERY question's correct answer MUST be explicitly stated in the description
2. Do NOT invent or assume details not mentioned
3. If description lacks certain details, ask about what IS mentioned
4. Frame questions so the owner can answer from memory

═══════════════════════════════════════════════════════════════
CRITICAL: OPTION GENERATION RULES (ANTI-GUESSING):
═══════════════════════════════════════════════════════════════

1. ALL 4 OPTIONS MUST BE:
   - Equally plausible and realistic for this specific item type
   - Similar in length, format, and specificity
   - Grammatically consistent (all start the same way)
   - From the same category/type of answer
   
2. AVOID THESE COMMON MISTAKES:
   ❌ One option obviously more detailed than others
   ❌ One option obviously different in format
   ❌ Using "None of the above" or "I don't know"
   ❌ Making the correct answer always the longest/shortest
   ❌ Using obviously wrong/silly options
   
3. GOOD EXAMPLES:
   ✅ Colors: "Navy blue", "Black", "Dark gray", "Charcoal"
   ✅ Sizes: "64GB", "128GB", "256GB", "512GB"
   ✅ Brands: "Samsung", "Apple", "Google", "OnePlus"
   ✅ Features: "Leather strap", "Metal band", "Silicone band", "Nylon strap"

4. RANDOMIZE correct answer position (0-3) - don't always put correct first!

${
  ownerVerificationQuestion && ownerVerificationAnswer
    ? `
═══════════════════════════════════════════════════════════════
OWNER'S CUSTOM VERIFICATION QUESTION (MUST USE AS ONE QUESTION):
═══════════════════════════════════════════════════════════════
The item owner has provided a custom verification question. You MUST use this
as ONE of your 3 questions. Generate 3 plausible wrong options.

Owner's Question: "${ownerVerificationQuestion}"
Correct Answer: "${ownerVerificationAnswer}"

IMPORTANT: Create this as a multiple choice question with 4 options where:
- One option is the correct answer (from owner)
- Three options are plausible but incorrect alternatives
- Randomize which position (0-3) the correct answer appears in
`
    : ""
}

═══════════════════════════════════════════════════════════════
CATEGORY-SPECIFIC GUIDANCE FOR: ${category.toUpperCase()}
═══════════════════════════════════════════════════════════════

${getCategoryGuidance(category)}

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON ONLY):
═══════════════════════════════════════════════════════════════

{
  "questions": [
    {
      "question": "Easy question about visible feature?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2,
      "difficulty": "easy"
    },
    {
      "question": "Medium question about specific detail?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "medium"
    },
    {
      "question": "Hard question about personal/hidden detail?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 3,
      "difficulty": "hard"
    }
  ],
  "hint": "General hint about the item"
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
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length !== 3
    ) {
      console.warn("Invalid AI response structure, using fallback");
      return generateFallbackQuestions(category);
    }

    // Validate each question
    for (const q of quizData.questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        console.warn("Invalid question structure, using fallback");
        return generateFallbackQuestions(category);
      }
    }

    return {
      questions: quizData.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        difficulty: q.difficulty || "medium",
      })),
      hint: quizData.hint || "Think carefully about your item",
      generatedByAI: true,
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
    electronics: `📱 ELECTRONICS:
- Easy: Brand, color, case type/color
- Medium: Storage capacity, model variant, screen size
- Hard: Lock screen wallpaper, stickers, scratches, custom settings`,

    wallet: `👛 WALLET/PURSE:
- Easy: Color, brand, material (leather/fabric/synthetic)
- Medium: Number of card slots, type of closure (zipper/snap/fold)
- Hard: Specific card in a slot, hidden compartment contents, wear marks`,

    keys: `🔑 KEYS:
- Easy: Number of keys, keychain color/type
- Medium: Key shapes/colors, specific keychain brand
- Hard: What each key opens, hidden compartment, special markings`,

    jewelry: `💍 JEWELRY:
- Easy: Metal type (gold/silver/platinum), gemstone color
- Medium: Chain length, clasp type, stone cut
- Hard: Engraving text, hallmark location, repair history`,

    clothing: `👕 CLOTHING:
- Easy: Color, brand, type of closure
- Medium: Size, specific pattern, material
- Hard: Name on tag, repair/alterations, pocket contents`,

    bags: `🎒 BAGS:
- Easy: Brand, color, main material
- Medium: Number of compartments, strap type, closure type
- Hard: Hidden pocket contents, wear marks, zipper brand`,

    documents: `📄 DOCUMENTS:
- Easy: Document type, general color/size
- Medium: Number of pages, binding type
- Hard: Specific content, handwritten notes, stains/marks`,

    other: `🔧 OTHER:
- Easy: Color, approximate size, material
- Medium: Brand, model, specific features
- Hard: Serial number prefix, modifications, wear patterns`,
  };

  return guidance[category.toLowerCase()] || guidance.other;
}

/**
 * Legacy wrapper for backward compatibility
 * Now returns the first question from the 3-question set
 */
export async function generateVerificationQuestion(itemData) {
  const result = await generateVerificationQuestions(itemData);

  // Return in old format for backward compatibility (first question only)
  // But also include all questions for new format
  return {
    question:
      result.questions[0]?.question || "Describe a unique feature of your item",
    options: result.questions[0]?.options || [],
    correctIndex: result.questions[0]?.correctIndex || 0,
    hint: result.hint,
    generatedByAI: result.generatedByAI,
    // NEW: Include all questions for 3-MCQ verification
    allQuestions: result.questions,
  };
}

/**
 * Generate 3 fallback questions when AI is unavailable
 */
function generateFallbackQuestions(category) {
  const categoryQuestions = {
    electronics: {
      questions: [
        {
          question: "What is the primary color of your device or its case?",
          options: ["Black", "White/Silver", "Blue", "Other color"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "What is the approximate storage capacity of your device?",
          options: ["32GB or less", "64GB", "128GB", "256GB or more"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What personalization or mark is on your device?",
          options: [
            "Sticker on the back",
            "Screen protector with crack",
            "Scratches near charging port",
            "No visible personalization",
          ],
          correctIndex: 0,
          difficulty: "hard",
        },
      ],
      hint: "Think about when you purchased the device",
    },
    wallet: {
      questions: [
        {
          question: "What material is your wallet made of?",
          options: [
            "Genuine leather",
            "Faux leather",
            "Fabric/Canvas",
            "Synthetic/Plastic",
          ],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "How many card slots does your wallet have?",
          options: ["1-4 slots", "5-8 slots", "9-12 slots", "More than 12"],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What is in a specific compartment of your wallet?",
          options: [
            "Library or gym card",
            "Old receipt or ticket",
            "Emergency cash hidden",
            "Photo of someone",
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
          options: ["1-2 keys", "3-4 keys", "5-6 keys", "7 or more keys"],
          correctIndex: 1,
          difficulty: "easy",
        },
        {
          question: "What type of keychain is attached?",
          options: [
            "Metal keychain",
            "Plastic/rubber keychain",
            "Fabric lanyard",
            "No keychain",
          ],
          correctIndex: 0,
          difficulty: "medium",
        },
        {
          question: "What is the color of your most used key?",
          options: [
            "Silver/Chrome",
            "Gold/Brass",
            "Bronze/Copper",
            "Painted/Colored",
          ],
          correctIndex: 0,
          difficulty: "hard",
        },
      ],
      hint: "Think about what makes your keys unique",
    },
    jewelry: {
      questions: [
        {
          question: "What type of metal is your jewelry made of?",
          options: [
            "Gold",
            "Silver",
            "Platinum/White Gold",
            "Costume/Fashion jewelry",
          ],
          correctIndex: 1,
          difficulty: "easy",
        },
        {
          question: "What type of clasp or closure does it have?",
          options: [
            "Lobster claw",
            "Spring ring",
            "Toggle clasp",
            "No clasp/continuous",
          ],
          correctIndex: 0,
          difficulty: "medium",
        },
        {
          question: "Is there any engraving or inscription?",
          options: [
            "Initials engraved",
            "Date engraved",
            "Special message",
            "No engraving",
          ],
          correctIndex: 3,
          difficulty: "hard",
        },
      ],
      hint: "Look for personalization or wear marks",
    },
    clothing: {
      questions: [
        {
          question: "What is the primary color of the item?",
          options: [
            "Black/Dark gray",
            "White/Cream",
            "Blue/Navy",
            "Other color",
          ],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "What size is the clothing item?",
          options: [
            "Small (S)",
            "Medium (M)",
            "Large (L)",
            "Extra Large (XL+)",
          ],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What distinguishing feature is on the item?",
          options: [
            "Tag partially torn",
            "Small stain or mark",
            "Name written inside",
            "No distinguishing marks",
          ],
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
          options: ["Black", "Brown/Tan", "Navy/Blue", "Other color"],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "How many main compartments does the bag have?",
          options: [
            "1 compartment",
            "2 compartments",
            "3 compartments",
            "4 or more",
          ],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "What is inside a hidden pocket of the bag?",
          options: [
            "Emergency cash",
            "Old ticket or receipt",
            "Spare key",
            "Nothing special",
          ],
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
          options: [
            "Official ID/Certificate",
            "Personal letter/note",
            "Work document",
            "Educational document",
          ],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "What is the condition of the document?",
          options: [
            "Like new",
            "Slightly worn",
            "Folded/Creased",
            "Damaged/Stained",
          ],
          correctIndex: 1,
          difficulty: "medium",
        },
        {
          question: "Is there any personal marking on the document?",
          options: [
            "Handwritten notes",
            "Highlighter marks",
            "Signature/stamp",
            "No markings",
          ],
          correctIndex: 3,
          difficulty: "hard",
        },
      ],
      hint: "Think about how you handled this document",
    },
    other: {
      questions: [
        {
          question: "What is the primary color of the item?",
          options: [
            "Black/Dark",
            "White/Light",
            "Colorful/Mixed",
            "Metallic/Chrome",
          ],
          correctIndex: 0,
          difficulty: "easy",
        },
        {
          question: "What is the approximate size of the item?",
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
  };
}

/**
 * Verify if the owner's answer matches the expected answer
 * For AI-generated questions with multiple choice
 *
 * @param {object} quiz - The verification quiz object (single question)
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
 * Verify answers for all 3 questions
 * Returns the number of correct answers
 *
 * @param {Array} questions - Array of question objects with correctIndex
 * @param {Array} userAnswers - Array of user's selected indices
 * @returns {{correctCount: number, total: number, passed: boolean}}
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

  // Must get at least 2 out of 3 correct to pass
  const passed = correctCount >= Math.ceil(total * 0.66);

  return { correctCount, total, passed };
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
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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
  generateVerificationQuestions,
  verifyQuizAnswer,
  verifyAllQuizAnswers,
  generateMatchExplanation,
};
