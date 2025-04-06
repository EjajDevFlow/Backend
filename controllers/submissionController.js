import Submission from '../models/Submission.js';
import Assignment from '../models/Assignment.js';

// Create a new submission
export const createSubmission = async (req, res) => {
  try {
    const { assignmentId, pdfUrl } = req.body;
    const studentId = req.user.uid; // Get student ID from Firebase auth

    // Check if assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if submission deadline has passed
    if (new Date() > new Date(assignment.dueDate)) {
      return res.status(400).json({ message: 'Submission deadline has passed' });
    }

    // Create new submission
    const submission = new Submission({
      assignmentId,
      studentId,
      pdfUrl
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission created successfully',
      submission
    });

  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }
    console.error('Error in createSubmission:', error);
    res.status(500).json({ message: 'Error creating submission', error: error.message });
  }
};

// Get submissions for an assignment (admin only)
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    // Verify assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only allow the assignment creator to view all submissions
    if (assignment.createdBy !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to view submissions' });
    }

    const submissions = await Submission.find({ assignmentId });
    res.status(200).json(submissions);

  } catch (error) {
    console.error('Error in getAssignmentSubmissions:', error);
    res.status(500).json({ message: 'Error retrieving submissions', error: error.message });
  }
};

// Get student's submission for an assignment
export const getStudentSubmission = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.uid;

    const submission = await Submission.findOne({ assignmentId, studentId });
    if (!submission) {
      return res.status(404).json({ message: 'No submission found' });
    }

    res.status(200).json(submission);

  } catch (error) {
    console.error('Error in getStudentSubmission:', error);
    res.status(500).json({ message: 'Error retrieving submission', error: error.message });
  }
};

// Update submission score and feedback (admin only)
export const gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { score, feedback } = req.body;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Verify the grader is the assignment creator
    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment || assignment.createdBy !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    submission.score = score;
    submission.feedback = feedback;
    await submission.save();

    res.status(200).json({
      message: 'Submission graded successfully',
      submission
    });

  } catch (error) {
    console.error('Error in gradeSubmission:', error);
    res.status(500).json({ message: 'Error grading submission', error: error.message });
  }
}; 