import express from 'express';
import {
  createAssignment,
  getClassroomAssignments,
  submitAssignment,
  evaluateSubmission,
  getAssignmentSubmissions,
  getAssignmentById,
  updateAssignment,
  evaluateAllSubmissions
} from '../controllers/assignmentController.js';
import { verifyFirebaseToken } from '../middleware/firebaseAuth.js';

const router = express.Router();

// Apply Firebase auth middleware to all routes
router.use(verifyFirebaseToken);

// Create new assignment (admin only)
router.post('/create', createAssignment);

// Get all assignments for a classroom
router.get('/classroom/:classroomId', getClassroomAssignments);

// Get single assignment by ID
router.get('/:assignmentId', getAssignmentById);

// Update assignment (admin only)
router.put('/:assignmentId', updateAssignment);

// Submit assignment (student)
router.post('/:assignmentId/submit', submitAssignment);

// Evaluate all submissions (admin only)
router.post('/:assignmentId/evaluate-all', evaluateAllSubmissions);

// Evaluate single submission (admin only)
router.post('/:assignmentId/submissions/:submissionId/evaluate', evaluateSubmission);

// Get all submissions for an assignment (admin only)
router.get('/:assignmentId/submissions', getAssignmentSubmissions);

export default router; 