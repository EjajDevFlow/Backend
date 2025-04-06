import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import fs from "fs";
import userRoutes from "./routes/userRoutes.js";
import classroomRoutes from "./routes/classroomRoutes.js";
import messageRoutes from "./routes/messageRoutes.js"; 
import assignmentRoutes from "./routes/assignmentRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";


dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(
  cors({
    origin: "https://aiclassroom.netlify.app",
    credentials: true,
  })
);

// ✅ Ensure "uploads" directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ Serve uploaded files as static assets
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

try {
  mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
} catch (error) {
  console.log("Error: ", error);
}
// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/attendance", attendanceRoutes);


// ✅ Health Check Route
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
