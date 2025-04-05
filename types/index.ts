import { Request } from "express";
import { Prisma } from "@prisma/client";

// Re-export all shared types
export * from "./shared";

// Prisma-specific types
export type InputJsonValue = Prisma.InputJsonValue;

// Auth types
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

// User preferences types
export interface UserPreferences {
  [key: string]: any; // Add index signature for Prisma JSON compatibility
  language: string;
  theme: "light" | "dark";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    enabledTypes?: string[];
    emailNotifications: {
      newMessage: boolean;
      listingUpdates: boolean;
      promotions: boolean;
    };
  };
  currency: string;
  timezone: string;
  dateFormat: string;
}

// Message types
export interface MessageData {
  senderId: string;
  recipientId: string;
  content: string;
  listingId?: string;
}

// Conversation types
export interface ConversationData {
  userId: string;
  listingId?: string;
}
