import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "./firestore";

export const getLoginMode = async () => {
  try {
    const settingsDoc = await getDoc(doc(db, COLLECTIONS.SYSTEM_SETTINGS, "loginMode"));
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
    // Default settings if none exist
    return {
      mode: "any", // "any" or "organization"
      domain: "cit.edu.in",
    };
  } catch (error) {
    console.error("Error fetching login mode:", error);
    // Return default settings on error
    return {
      mode: "any",
      domain: "cit.edu.in",
    };
  }
};

export const validateEmailForLogin = async (email) => {
  const settings = await getLoginMode();
  
  if (settings.mode === "organization") {
    // Check if email ends with the organization domain
    const domain = settings.domain.toLowerCase();
    const userEmail = email.toLowerCase();
    
    if (userEmail.endsWith(`@${domain}`)) {
      return { valid: true, reason: "Organization email" };
    } else {
      return { 
        valid: false, 
        reason: `Only @${domain} emails are allowed` 
      };
    }
  }
  
  // "any" mode - all Gmail accounts are allowed
  if (email.endsWith("@gmail.com")) {
    return { valid: true, reason: "Gmail account" };
  }
  
  return { 
    valid: false, 
    reason: "Only Gmail accounts are allowed" 
  };
};