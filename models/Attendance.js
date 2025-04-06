import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  status: { type: String, enum: ["Present", "Absent"], default: "Absent" },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;