import mongoose from "mongoose";

const assignmentResponseSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assignment",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileUrl: { type: String, required: true }, // Student's submitted file
  submittedAt: { type: Date, default: Date.now },
  grade: { type: Number, default: null }, // AI-generated grade
  feedback: { type: String, default: "" }, // AI-generated feedback
});

export default mongoose.model("AssignmentResponse", assignmentResponseSchema);
