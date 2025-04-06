import express from "express";
import { sendMessage, uploadFile, getAllMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/send", uploadFile, sendMessage);
router.get("/:classroomId", getAllMessages);

export default router;