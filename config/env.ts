import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRY: z.string().default("604800"), // 7 days in seconds
  REFRESH_TOKEN_EXPIRY: z.string().default("2592000"), // 30 days in seconds
  BCRYPT_SALT_ROUNDS: z.string().default("12"),
  CORS_ORIGIN: z.string().default("*"),
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error("❌ Invalid environment variables:", envParse.error.format());
  throw new Error("Invalid environment variables");
}

export const env = envParse.data;
