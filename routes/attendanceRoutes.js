import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  getMonthlyAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

// ✅ Route to mark attendance
router.post("/mark", markAttendance);

// ✅ Route to get attendance by date
router.get("/get/:date", getAttendanceByDate);

router.get("/monthly/:month", getMonthlyAttendance);

export default router;
