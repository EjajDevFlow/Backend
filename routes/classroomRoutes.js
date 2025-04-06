import express from "express";
import {
  createClassroom,
  joinClassroom,
  getUserClassrooms,
  updateAdminStatus,
  leaveClassroom,
  deleteClassroom,
  removeUserFromClassroom,
  updateClassroomDetails,
  getClassDetails
} from "../controllers/classroomControllers.js";

const router = express.Router();

router.post("/create", createClassroom); // Create classroom
router.post("/join", joinClassroom); // Join classroom using link
router.get("/user/:userId", getUserClassrooms); // Get all classrooms for a user
router.put("/update-admin", updateAdminStatus); // Promote/Demote secondary admins
router.put("/leave", leaveClassroom); // Leave a classroom
router.post("/delete", deleteClassroom); // Admin deletes classroom
router.post("/remove-user", removeUserFromClassroom); // Admin removes a user from classroom
router.put("/update-details", updateClassroomDetails); // Update classroom details
router.get("/:classId", getClassDetails); // Get classroom details

export default router;
