import Message from "../models/Message.js";
import multer from "multer";
import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

// Ensure "uploads" directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve uploaded files statically
router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Configure multer for file storage (✅ Saves Original Filename)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files in "uploads" directory
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Save file with original name
  },
});

const upload = multer({ storage });
export const uploadFile = upload.single("file");

// ✅ Helper Function to Get File Type
const getFileType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
};

// ✅ **Send Message API (FIXED)**
export const sendMessage = async (req, res) => {
  try {
    const { classroomId, senderId, content } = req.body;
    const file = req.file;

    if (!classroomId || !senderId) {
      return res
        .status(400)
        .json({ error: "Classroom ID and sender ID are required" });
    }

    const messageData = {
      classroomId,
      senderId,
      content,
      fileType: file ? getFileType(file.mimetype) : "text",
      fileUrl: file ? `/uploads/${file.originalname}` : "", // ✅ Store original filename in URL
    };

    const message = new Message(messageData);
    await message.save();

    // ✅ Populate sender details immediately after saving
    const populatedMessage = await Message.findById(message._id).populate(
      "senderId",
      "name email"
    );

    res
      .status(201)
      .json({ message: "Message sent successfully", data: populatedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ **Get Messages API (FIXED)**
export const getAllMessages = async (req, res) => {
  try {
    const { classroomId } = req.params;

    if (!classroomId) {
      return res.status(400).json({ error: "Classroom ID is required" });
    }

    const messages = await Message.find({ classroomId })
      .populate("senderId", "name email image") // ✅ Include image in sender details
      .sort({ createdAt: -1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default router;


