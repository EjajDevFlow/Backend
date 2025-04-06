import express from 'express';
import { uploadFile, uploadMiddleware } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/', uploadMiddleware, uploadFile);

export default router; 