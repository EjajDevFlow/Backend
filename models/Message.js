import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String, // Stores the URL of the uploaded file (image, PDF, etc.)
      default: "",
    },
    fileType: {
      type: String, // Specifies the type of file (e.g., "image", "pdf", "video")
      enum: ["text", "image", "pdf", "video", "other"],
      default: "text",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
