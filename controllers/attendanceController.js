import Attendance from "../models/Attendance.js";

// ✅ Mark Attendance
export const markAttendance = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;

    // ✅ Validate input
    if (!studentId || !date || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Create and save attendance record
    const attendance = new Attendance({ student: studentId, date, status });
    await attendance.save();

    res
      .status(201)
      .json({ message: "Attendance marked successfully", attendance });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error marking attendance", error: error.message });
  }
};

// ✅ Get Attendance by Date
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;

    // ✅ Fetch attendance for the given date
    const attendance = await Attendance.find({ date }).populate("student");

    if (attendance.length === 0) {
      return res.status(200).json([]); // ✅ Return empty array instead of 404
    }

    res.status(200).json(attendance);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching attendance", error: error.message });
  }
};

export const getMonthlyAttendance = async (req, res) => {
  try {
    const { month } = req.params; // Get month name from request params
    const year = new Date().getFullYear(); // Get current year

    // Map month names to numbers
    const monthsMap = {
      January: "01",
      February: "02",
      March: "03",
      April: "04",
      May: "05",
      June: "06",
      July: "07",
      August: "08",
      September: "09",
      October: "10",
      November: "11",
      December: "12",
    };

    if (!monthsMap[month]) {
      return res.status(400).json({ message: "Invalid month name" });
    }

    const formattedMonth = monthsMap[month]; // Get month number (01-12)

    // Find attendance records for the given month
    const attendanceRecords = await Attendance.find({
      date: { $regex: `^${year}-${formattedMonth}` }, // Match YYYY-MM format
    }).populate("student");

    // Count attendance per student
    const attendanceCount = {};

    attendanceRecords.forEach((record) => {
      const studentId = record.student._id;
      if (!attendanceCount[studentId]) {
        attendanceCount[studentId] = {
          name: record.student.name,
          presentDays: 0,
        };
      }
      if (record.status === "Present") {
        attendanceCount[studentId].presentDays += 1;
      }
    });

    // Convert the map to an array
    const attendanceSummary = Object.entries(attendanceCount).map(
      ([id, data]) => ({
        _id: id,
        name: data.name,
        presentDays: data.presentDays,
      })
    );

    res.status(200).json(attendanceSummary);
  } catch (error) {
    console.error("Error fetching monthly attendance:", error);
    res.status(500).json({ message: "Server error while fetching attendance" });
  }
};


