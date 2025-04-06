import multer from "multer";
import sharp from "sharp";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { uploadToR2 as uploadToCloudflare } from "../config/cloudflareR2.js";
import s3 from "../config/cloudflareR2.js";

// Re-export uploadToR2 and s3
export { uploadToR2 } from "../config/cloudflareR2.js";
export { default as s3 } from "../config/cloudflareR2.js";

// Extend Express Request
declare global {
   namespace Express {
      interface Request {
         processedImages?: Array<{
            url: string;
            order: number;
         }>;
      }
   }
}

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (
   req: Request,
   file: Express.Multer.File,
   cb: multer.FileFilterCallback
) => {
   if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
   }
   cb(null, true);
};

// Configure multer
export const upload = multer({
   storage,
   limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 10, // Max 10 files
   },
   fileFilter,
});

// Process image with Sharp
export const processImage = async (buffer: Buffer): Promise<Buffer> => {
   return sharp(buffer)
      .resize(1200, 1200, {
         fit: "inside",
         withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
};

// Process images middleware
export const processImagesMiddleware = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      if (!req.files || !Array.isArray(req.files)) {
         return next();
      }

      const processedImages: Array<{ url: string; order: number }> = [];

      for (let i = 0; i < req.files.length; i++) {
         const file = req.files[i] as Express.Multer.File;

         // Process image with Sharp
         const processedBuffer = await processImage(file.buffer);

         // Update the file buffer with processed image
         file.buffer = processedBuffer;

         // Upload to Cloudflare R2
         const imageUrl = await uploadToCloudflare(file, "listings");

         // Store the processed image URL and order
         processedImages.push({
            url: imageUrl,
            order: i,
         });
      }

      // Attach processed images to request object
      req.processedImages = processedImages;
      next();
   } catch (error) {
      next(error);
   }
};
