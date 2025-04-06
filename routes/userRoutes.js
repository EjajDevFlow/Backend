import express from "express";
import { addUser, getAllUsers } from "../controllers/userControllers.js";

const router = express.Router();

router.post("/add", addUser);
router.get("/all", getAllUsers);

export default router;
