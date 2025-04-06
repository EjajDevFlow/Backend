import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  classrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }], // Classes the user is in
  photo: { type: String, default: "https://static.vecteezy.com/system/resources/previews/013/042/571/original/default-avatar-profile-icon-social-media-user-photo-in-flat-style-vector.jpg" },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
