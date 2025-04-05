import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  sendMessage,
  getMessages,
  deleteMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(authenticate);

router.post("/", sendMessage as unknown as express.RequestHandler);
router.get("/:conversationId", getMessages as unknown as express.RequestHandler);
router.delete("/:messageId", deleteMessage as unknown as express.RequestHandler);

export default router;
