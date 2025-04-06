import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import prisma from "./src/lib/prismaClient.js";
import dotenv from "dotenv";
import morgan from "morgan";
import errorHandler from "./middleware/errorHandler.js";
import { getDirname } from "./utils/path.utils.js";
const __dirname = getDirname(import.meta.url);

// Load environment variables
dotenv.config();

// Initialize app and HTTP server
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased limit to 200 requests per windowMs
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT",
      message: "Too many requests from this IP, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to specific routes only
app.use("/api/auth/login", limiter);
app.use("/api/auth/register", limiter);

// CORS Configuration
const corsOptions = {
  origin: [
    "https://tijara-frontend-ashk4pprf-darians-projects-e6352288.vercel.app",
    "https://tijara-frontend-production.up.railway.app",
    "http://localhost:3000", // For local development
    "http://localhost:5173", // For Vite's default port
    "http://localhost:3001", // Alternative port
    "http://127.0.0.1:3000", // Alternative localhost
    "http://127.0.0.1:5173", // Alternative localhost
    "http://127.0.0.1:3001", // Alternative localhost
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600, // Cache preflight request results for 10 minutes
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  next();
});

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Add before your routes
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📥 ${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
    query: req.query,
  });

  // Log response
  const originalSend = res.send;
  res.send = function (body: any) {
    console.log(`📤 Response ${res.statusCode}`, {
      body: body,
    });
    return originalSend.call(this, body);
  };

  next();
});

// Health check endpoint
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "development",
  });
});

// Import Routes
import authRoutes from "./routes/auth.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import uploadRoutes from "./routes/uploads.js";
import notificationRoutes from "./routes/notification.routes.js";

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

// Socket.io Setup
const io = new Server(httpServer, {
  serveClient: false,
  pingTimeout: 30000,
  pingInterval: 25000,
  cookie: false,
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Socket.io connection handling
io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId: string) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("leave", (userId: string) => {
    socket.leave(userId);
    console.log(`User ${userId} left their room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Connected to database");

    // Start server
    const port = process.env.PORT || 5000;

    httpServer.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log("Environment:", process.env.NODE_ENV);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
