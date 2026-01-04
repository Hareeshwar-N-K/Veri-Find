/**
 * VeriFind - Firestore Data Models
 * Trust-based Lost & Found Platform Schema
 * 
 * This file defines TypeScript interfaces for all Firestore collections.
 * Use these types for type-safe database operations.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// 1️⃣ USERS COLLECTION
// ============================================
export interface UserStats {
  itemsReported: number;
  itemsReturned: number;
  successfulMatches: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin' | 'moderator';
  
  // Gamification & Trust
  reputationScore: number;
  badges: string[];
  stats: UserStats;
  
  isSuspended: boolean;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

// Default user data for new registrations
export const DEFAULT_USER: Omit<User, 'uid' | 'email' | 'displayName' | 'photoURL' | 'createdAt' | 'lastActiveAt'> = {
  role: 'user',
  reputationScore: 0,
  badges: [],
  stats: {
    itemsReported: 0,
    itemsReturned: 0,
    successfulMatches: 0,
  },
  isSuspended: false,
};

// ============================================
// 2️⃣ FOUND_ITEMS COLLECTION (The Vault)
// ============================================
export interface AIAnalysis {
  labels: string[];           // AI-generated labels/tags
  embeddings: number[];       // Vector embeddings for semantic search
  processedAt: Timestamp;
  confidence: number;
}

export type FoundItemStatus = 'pending' | 'matched' | 'returned' | 'claimed_by_owner' | 'expired';

export interface FoundItem {
  id?: string;
  finderId: string;
  
  // Basic Info
  category: string;
  title: string;
  description: string;
  
  // AI & Search Metadata
  aiAnalysis: AIAnalysis | null;
  
  // Logistics
  locationFound: string;
  dateFound: Timestamp;
  currentStorageLocation: string;
  status: FoundItemStatus;
  
  // Media
  images: string[];
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Privacy flag - found items are PRIVATE by default
  isPrivate: true;
}

// ============================================
// 3️⃣ LOST_ITEMS COLLECTION (The Query)
// ============================================
export type LostItemStatus = 'searching' | 'potential_match' | 'recovered' | 'expired';

export interface LostItem {
  id?: string;
  ownerId: string;
  ownerEmail: string;
  
  // Basic Info
  category: string;
  title: string;
  description: string;
  
  // Secret Verification Hints (NOT shown to public)
  ownershipHints: string[];
  
  // Location & Time
  locationLost: string;
  dateLost: Timestamp;
  
  // Media (optional - owner may not have photo)
  images: string[];
  
  // Status
  status: LostItemStatus;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// 4️⃣ MATCHES COLLECTION (The Intelligence Layer)
// ============================================
export interface MatchScores {
  textSimilarity: number;     // 0-1: Description match score
  categoryMatch: number;      // 0-1: Category match (1.0 if exact)
  locationMatch: number;      // 0-1: Location proximity score
  dateMatch: number;          // 0-1: Date proximity score
  imageMatch: number;         // 0-1: Image similarity (future scope)
  totalConfidence: number;    // Weighted average of all scores
}

export type QuizStatus = 'waiting_for_answer' | 'answered' | 'expired';
export type MatchStatus = 'pending_verification' | 'quiz_sent' | 'approved' | 'rejected' | 'expired';

export interface VerificationQuiz {
  question: string;
  generatedFrom: 'found_item.description' | 'found_item.aiAnalysis' | 'manual';
  status: QuizStatus;
  sentAt: Timestamp | null;
  answeredAt: Timestamp | null;
  expiresAt: Timestamp | null;
}

export interface Match {
  id?: string;
  lostId: string;
  foundId: string;
  finderId: string;
  ownerId: string;
  
  // Scoring Logic (Explainable AI)
  scores: MatchScores;
  
  // The AI Verification Quiz
  verificationQuiz: VerificationQuiz | null;
  
  // Owner's Response
  ownerAnswer: string | null;
  aiAnswerEvaluationScore: number | null; // 0-1: How well answer matched truth
  
  // Post-Match Logistics
  status: MatchStatus;
  chatChannelId: string | null; // Created ONLY if status == 'approved'
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Admin notes
  adminNotes: string | null;
  reviewedBy: string | null;
}

// ============================================
// 5️⃣ RECOVERY_LEDGER (Public Wall of Fame)
// ============================================
export interface RecoveryLedgerEntry {
  id?: string;
  finderName: string;         // Obfuscated: "John D."
  ownerName: string;          // Obfuscated: "Jane S."
  itemCategory: string;
  itemTitle: string;          // Generic: "Laptop" not "Black Dell Laptop"
  recoveredAt: Timestamp;
  matchId: string;
  
  // Optional gamification
  reputationPointsAwarded: number;
}

// ============================================
// 6️⃣ AUDIT_LOGS (Cybersecurity Mandatory)
// ============================================
export type AuditAction = 
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'ITEM_DELETED'
  | 'MATCH_CREATED'
  | 'MATCH_APPROVED'
  | 'MATCH_REJECTED'
  | 'QUIZ_SENT'
  | 'QUIZ_ANSWERED'
  | 'VIEW_MATCH_DETAILS'
  | 'VIEW_FOUND_ITEM'
  | 'STATUS_CHANGE'
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'ADMIN_DELETE'
  | 'CHAT_CREATED'
  | 'ITEM_RETURNED';

export interface AuditLog {
  id?: string;
  actorId: string;
  actorEmail: string;
  actorRole: 'user' | 'admin' | 'moderator' | 'system';
  
  action: AuditAction;
  targetId: string;
  targetType: 'user' | 'found_item' | 'lost_item' | 'match' | 'chat';
  
  // Additional context
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  
  timestamp: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
}

// ============================================
// 7️⃣ CHAT_CHANNELS (Post-Verification Communication)
// ============================================
export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Timestamp;
  isRead: boolean;
}

export interface ChatChannel {
  id?: string;
  matchId: string;
  participants: string[]; // [ownerId, finderId]
  participantNames: Record<string, string>;
  
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  lastMessage: string;
  
  isActive: boolean;
  closedAt: Timestamp | null;
  closedReason: 'item_returned' | 'dispute' | 'expired' | null;
}

// ============================================
// COLLECTION NAMES (Constants)
// ============================================
export const COLLECTIONS = {
  USERS: 'users',
  FOUND_ITEMS: 'found_items',
  LOST_ITEMS: 'lost_items',
  MATCHES: 'matches',
  RECOVERY_LEDGER: 'recovery_ledger',
  AUDIT_LOGS: 'audit_logs',
  CHAT_CHANNELS: 'chat_channels',
  CHAT_MESSAGES: 'chat_messages',
} as const;

// ============================================
// HELPER TYPES
// ============================================
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// For creating new documents (without id and timestamps)
export type CreateFoundItem = Omit<FoundItem, 'id' | 'createdAt' | 'updatedAt' | 'aiAnalysis'>;
export type CreateLostItem = Omit<LostItem, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateMatch = Omit<Match, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateAuditLog = Omit<AuditLog, 'id' | 'timestamp'>;
