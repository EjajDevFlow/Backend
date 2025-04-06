import Classroom from "../models/Classroom.js";
import User from "../models/user.js";
import { v4 as uuidv4 } from "uuid"; // To generate unique join links

// ✅ Create a new classroom
export const createClassroom = async (req, res) => {
  try {
    const { name, adminId, description = "" } = req.body;

    if (!name || !adminId) {
      return res.status(400).json({ error: "Name and Admin ID are required" });
    }

    // Ensure the user exists by ID
    const adminUser = await User.findById(adminId);
    if (!adminUser) {
      return res.status(404).json({ error: "Admin user not found" });
    }

    // Generate a unique join link
    const joinLink = `classroom-${uuidv4()}`;

    // Create new classroom
    const classroom = new Classroom({
      name,
      description,
      admin: adminUser._id, // Assign the user ID
      joinLink,
      image: adminUser.photo,
    });

    await classroom.save();

    // Add classroom ID to admin's classrooms array
    if (!adminUser.classrooms.includes(classroom._id)) {
      adminUser.classrooms.push(classroom._id);
      await adminUser.save();
    }

    res
      .status(201)
      .json({ message: "Classroom created successfully", classroom });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Join a classroom using the unique join link
export const joinClassroom = async (req, res) => {
  try {
    const { userId, joinLink } = req.body;

    if (!userId || !joinLink) {
      return res
        .status(400)
        .json({ error: "User ID and join link are required" });
    }

    // Find the classroom by joinLink
    const classroom = await Classroom.findOne({ joinLink });
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Ensure the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already in the classroom
    if (
      classroom.students.includes(userId) ||
      classroom.admin.toString() === userId ||
      classroom.secondaryAdmins.includes(userId)
    ) {
      return res
        .status(400)
        .json({ error: "User is already in the classroom" });
    }

    // Add user to the classroom
    classroom.students.push(userId);
    await classroom.save();

    // Add classroom ID to user's classrooms array
    if (!user.classrooms.includes(classroom._id)) {
      user.classrooms.push(classroom._id);
      await user.save();
    }

    res
      .status(200)
      .json({ message: "Joined classroom successfully", classroom });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get all classrooms where the user is admin, secondary admin, or student
export const getUserClassrooms = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const classrooms = await Classroom.find({
      $or: [
        { admin: userId },
        { secondaryAdmins: userId },
        { students: userId },
      ],
    })
      .populate("admin", "name email photo")
      .populate("students", "name email photo")
      .populate("secondaryAdmins", "name email photo")
      .select("name admin students photo secondaryAdmins joinLink");

    res.status(200).json({ classrooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Promote or demote a user as a secondary admin
export const updateAdminStatus = async (req, res) => {
  try {
    const { classroomId, userId, action, adminId } = req.body; // action = "promote" or "demote"

    if (!classroomId || !userId || !action || !adminId) {
      return res.status(400).json({
        error: "Classroom ID, User ID, Action, and Admin ID are required",
      });
    }

    const classroom = await Classroom.findById(classroomId)
      .populate("admin", "name email photo") // Fetch admin details
      .populate("students", "name email photo")
      .populate("secondaryAdmins", "name email photo");

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Only the main admin can promote/demote users
    if (classroom.admin._id.toString() !== adminId) {
      return res.status(403).json({ error: "Only the main admin can modify admin roles" });
    }

    if (action === "promote") {
      if (!classroom.secondaryAdmins.some((admin) => admin._id.toString() === userId)) {
        classroom.secondaryAdmins.push(userId);
      }
      // Remove user from students list after promotion
      classroom.students = classroom.students.filter(
        (student) => student._id.toString() !== userId
      );
    } else if (action === "demote") {
      classroom.secondaryAdmins = classroom.secondaryAdmins.filter(
        (admin) => admin._id.toString() !== userId
      );
      // Add user back to students list after demotion
      if (!classroom.students.some((student) => student._id.toString() === userId)) {
        classroom.students.push(userId);
      }
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    await classroom.save();
    res.status(200).json({
      message: `User ${action}d successfully`,
      classroom: {
        _id: classroom._id,
        admin: classroom.admin,
        secondaryAdmins: classroom.secondaryAdmins,
        students: classroom.students,
        adminName: classroom.admin?.name || "Unknown Admin",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};


// ✅ Leave a classroom

export const leaveClassroom = async (req, res) => {
  try {
    const { classroomId, userId } = req.body;

    if (!classroomId || !userId) {
      return res
        .status(400)
        .json({ error: "Classroom ID and User ID are required" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Prevent main admin from leaving
    if (classroom.admin.toString() === userId) {
      return res.status(403).json({
        error: "Main admin cannot leave. Delete the classroom instead.",
      });
    }

    // Remove user from students & secondaryAdmins
    classroom.students = classroom.students.filter(
      (id) => id.toString() !== userId
    );
    classroom.secondaryAdmins = classroom.secondaryAdmins.filter(
      (id) => id.toString() !== userId
    );

    // Remove classroom from user's classrooms array
    await User.findByIdAndUpdate(userId, {
      $pull: { classrooms: classroomId },
    });

    await classroom.save();
    res
      .status(200)
      .json({ message: "You have left the classroom successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Delete a classroom

export const deleteClassroom = async (req, res) => {
  try {
    const { classroomId, adminId } = req.body;

    if (!classroomId || !adminId) {
      return res
        .status(400)
        .json({ error: "Classroom ID and Admin ID are required" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Only the main admin can delete the classroom
    if (classroom.admin.toString() !== adminId) {
      return res
        .status(403)
        .json({ error: "Only the main admin can delete this classroom" });
    }

    // Remove classroom from all users' classroom array
    await User.updateMany(
      { classrooms: classroomId },
      { $pull: { classrooms: classroomId } }
    );

    // Delete classroom
    await Classroom.findByIdAndDelete(classroomId);

    res.status(200).json({ message: "Classroom deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Remove a user from a classroom

export const removeUserFromClassroom = async (req, res) => {
  try {
    const { classroomId, userId, adminId } = req.body;

    if (!classroomId || !userId || !adminId) {
      return res
        .status(400)
        .json({ error: "Classroom ID, User ID, and Admin ID are required" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Only main admin can remove users
    if (classroom.admin.toString() !== adminId) {
      return res
        .status(403)
        .json({ error: "Only the main admin can remove users" });
    }

    // Prevent admin from removing themselves
    if (userId === adminId) {
      return res.status(403).json({
        error: "Admin cannot remove themselves. Delete the classroom instead.",
      });
    }

    // Remove user from students & secondaryAdmins
    classroom.students = classroom.students.filter(
      (id) => id.toString() !== userId
    );
    classroom.secondaryAdmins = classroom.secondaryAdmins.filter(
      (id) => id.toString() !== userId
    );

    // Remove classroom from user's classrooms array
    await User.findByIdAndUpdate(userId, {
      $pull: { classrooms: classroomId },
    });

    await classroom.save();
    res
      .status(200)
      .json({ message: "User removed from classroom successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Update classroom details

export const updateClassroomDetails = async (req, res) => {
  try {
    const { classroomId, adminId, name, description } = req.body; // All inputs from req.body

    if (!classroomId || !adminId) {
      return res
        .status(400)
        .json({ error: "Classroom ID and Admin ID are required" });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    // Only the main admin can update details
    if (classroom.admin.toString() !== adminId) {
      return res
        .status(403)
        .json({ error: "Only the main admin can update classroom details." });
    }

    // Update only the provided fields
    if (name) classroom.name = name;
    if (description) classroom.description = description;

    await classroom.save();
    res
      .status(200)
      .json({ message: "Classroom details updated successfully", classroom });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get class details by ID
export const getClassDetails = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.classId)
      .populate("admin", "name email photo") // Fetch admin details
      .populate("students", "name email photo")
      .populate("secondaryAdmins", "name email photo");

    if (!classroom) {
      return res.status(404).json({ message: "Classroom not found" });
    }

    res.json({
      ...classroom._doc,
      adminName: classroom.admin?.name || "Unknown Admin",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching class details" });
  }
};