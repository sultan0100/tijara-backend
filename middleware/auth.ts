import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prismaClient.js";
import { env } from "../config/env.js";

// Add JWT payload type
interface JWTPayload {
  id: string;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

// Rate limiters
export const loginLimiter = rateLimit({
  windowMs: env.NODE_ENV === 'development' ? 1000 : 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 100 : 5,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: env.NODE_ENV === 'development' 
        ? "Rate limit hit (development mode)"
        : "Too many login attempts, please try again after 15 minutes"
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: env.NODE_ENV === 'development' ? 1000 : 60 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 100 : 10,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: env.NODE_ENV === 'development' 
        ? "Rate limit hit (development mode)"
        : "Upload limit reached, please try again later"
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "No token provided"
        }
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User not found"
          }
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "Token has expired"
          }
        });
      }
      
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid token"
        }
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Internal server error"
      }
    });
  }
};

// Role middleware
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required"
      }
    });
  }

  next();
};

// Listing ownership middleware
export const isListingOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required"
        }
      });
    }

    const listingId = req.params.id;
    if (!listingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Listing ID is required"
        }
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Listing not found"
        }
      });
    }

    if (listing.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You don't have permission to modify this listing"
        }
      });
    }

    next();
  } catch (error) {
    console.error("isListingOwner middleware error:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Internal server error"
      }
    });
  }
};
