import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

// All notification routes should be protected
router.use(authenticate);

router.get("/", getNotifications as unknown as express.RequestHandler);
router.put("/:id/read", markAsRead as unknown as express.RequestHandler);
router.put("/read-all", markAllAsRead as unknown as express.RequestHandler);

export default router;
