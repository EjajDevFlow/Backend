import mongoose from "mongoose";

const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String },
  description: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  secondaryAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who are secondary admins
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Students in the classroom
  joinLink: { type: String, unique: true, required: true }, // Unique join link
  assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }], // Assignments in the class
  attendance: [{ type: mongoose.Schema.Types.ObjectId, ref: "Attendance" }], // Attendance tracking
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }], // Messages in the class
},{timestamps: true});

export default mongoose.model("Classroom", classroomSchema);
