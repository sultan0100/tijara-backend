import express from "express";
import { authenticate } from "../middleware/auth";
import {
  updateProfile,
  getUserProfile,
  getUserListings,
  getUserSettings,
  updateUserSettings,
} from "../controllers/user.controller";
import {
  upload,
  processImage,
  uploadToR2,
} from "../middleware/upload.middleware";

// Define AuthRequest type for type safety
interface AuthRequest extends express.Request {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  file?: Express.Multer.File;
}

const router = express.Router();

// Type-safe request handler wrapper
const asyncHandler = <T>(
  fn: (req: AuthRequest, res: express.Response, next: express.NextFunction) => Promise<T>
) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    try {
      await fn(req as AuthRequest, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to process profile picture
const processProfilePicture = asyncHandler(
  async (req: AuthRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
    if (req.file) {
      // Upload processed image to R2
      req.body.profilePicture = await uploadToR2(req.file, "avatar");
    }
    next();
  }
);

// ✅ Ensure all routes require authentication
router.use(authenticate);

// ✅ Get user profile
router.get("/profile", asyncHandler(getUserProfile));

// ✅ Update profile (optional profile picture upload)
router.put(
  "/profile",
  upload.single("profilePicture"),
  processProfilePicture,
  asyncHandler(updateProfile),
);

// ✅ Get user settings
router.get("/settings", asyncHandler(getUserSettings));

// ✅ Update settings
router.post("/settings", asyncHandler(updateUserSettings));

// Get user's listings
router.get("/listings", asyncHandler(getUserListings));

export default router;
