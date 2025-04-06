import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import type { Multer } from "multer";

export interface AuthRequest extends Request {
   user: {
      id: string;
      email: string;
      username: string;
      role: string;
   };
   file?: Express.Multer.File;
   files?: {
      [fieldname: string]: Express.Multer.File[];
   };
   processedImages?: Array<{ url: string; order: number }>;
}

export const auth = async (
   req: Request,
   res: Response,
   next: NextFunction
): Promise<void> => {
   try {
      const token = req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
         throw new Error();
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
         id: string;
         email: string;
         username: string;
         role: string;
      };

      (req as AuthRequest).user = decoded;
      next();
   } catch (error) {
      res.status(401).json({
         success: false,
         error: "Please authenticate",
         status: 401,
         data: null,
      });
   }
};
