import User from "../models/user.js";

export const addUser = async (req, res) => {
  try {
    const { name, email, photo } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(200).json({ message: "User already exists", user }); // ✅ Return 200 instead of 400
    }

    // Create new user
    user = new User({ name, email, photo });
    await user.save();

    res.status(201).json({ message: "User added successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ➤ Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
