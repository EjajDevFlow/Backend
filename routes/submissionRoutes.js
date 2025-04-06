import express from 'express';
import { verifyFirebaseToken } from '../middleware/firebaseAuth.js';
import {
  createSubmission,
  getAssignmentSubmissions,
  getStudentSubmission,
  gradeSubmission
} from '../controllers/submissionController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyFirebaseToken);

// Create a new submission
router.post('/create', createSubmission);

// Get all submissions for an assignment (admin only)
router.get('/assignment/:assignmentId', getAssignmentSubmissions);

// Get student's submission for an assignment
router.get('/student/:assignmentId', getStudentSubmission);

// Grade a submission (admin only)
router.put('/grade/:submissionId', gradeSubmission);

export default router; 