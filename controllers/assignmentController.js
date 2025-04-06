import dotenv from 'dotenv';
dotenv.config();
// console.log('Environment Variables Loaded:', process.env); // Remove this line
//console.log('GOOGLE_GENERATIVE_AI_KEY:', process.env.GOOGLE_GENERATIVE_AI_KEY);
import Assignment from '../models/Assignment.js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import Submission from '../models/Submission.js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini AI with safety settings
if (!process.env.GOOGLE_GENERATIVE_AI_KEY) {
  console.error('Google Generative AI API key is missing. Please set GOOGLE_GENERATIVE_AI_KEY in the .env file.');
  throw new Error('Google Generative AI API key is missing.');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_KEY, {
  apiVersion: 'v1'
});

// Helper function to download PDF
const downloadPDF = async (url) => {
  const tempPath = path.join(__dirname, '..', 'temp.pdf');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download PDF: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(tempPath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve(tempPath);
      });

      file.on('error', (err) => {
        fs.unlink(tempPath, () => reject(err));
      });
    }).on('error', reject);
  });
};

// Create new assignment
export const createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      contentPdfUrl,
      contentType,
      primaryPdfUrl,
      classroomId,
      dueDate
    } = req.body;

    // Get Firebase UID from the verified token
    const firebaseUid = req.user.uid;

    // Validate required fields
    if (!title || !description || !classroomId || !primaryPdfUrl || !dueDate) {
      return res.status(400).json({
        message: 'Missing required fields: title, description, classroomId, primaryPdfUrl, and dueDate are required'
      });
    }

    // Validate content based on contentType
    if (contentType === 'text' && !content) {
      return res.status(400).json({
        message: 'Content is required when contentType is text'
      });
    }

    // Create new assignment without submissions array
    const assignment = new Assignment({
      title,
      description,
      content,
      contentPdfUrl,
      contentType,
      primaryPdfUrl,
      classroomId,
      dueDate: new Date(dueDate),
      createdBy: firebaseUid
    });

    // Save the assignment
    await assignment.save();
    
    // Return the created assignment
    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: assignment.toObject()
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating assignment',
      error: error.toString()
    });
  }
};

// Get all assignments for a classroom
export const getClassroomAssignments = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const assignments = await Assignment.find({ classroomId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit assignment
export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { pdfUrl } = req.body;
    const studentId = req.user._id;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if student has already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.studentId.toString() === studentId.toString()
    );
    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }

    // Add new submission
    assignment.submissions.push({
      studentId,
      pdfUrl
    });

    await assignment.save();
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Evaluate submission using Gemini AI
export const evaluateSubmission = async (req, res) => {
  try {
    const { assignmentId, submissionId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Initialize Gemini AI model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Prepare prompt for evaluation
    const prompt = `Evaluate this student's submission for the assignment "${assignment.title}". 
Primary PDF URL: ${assignment.primaryPdfUrl}
Student's PDF URL: ${submission.pdfUrl}

As an expert evaluator, provide a concise evaluation using these criteria (100 points total):

Content & Understanding (40pts)
Technical Accuracy (30pts)
Presentation (30pts)

Format your response EXACTLY like this:
Score: [X]/100

Content: [X]/40
[One clear sentence about content quality]

Technical: [X]/30
[One clear sentence about technical accuracy]

Presentation: [X]/30
[One clear sentence about presentation]

Key Strength: [One specific strength in 10-15 words]
To Improve: [One specific suggestion in 10-15 words]

Important:
- Keep each feedback point to exactly one clear, specific sentence
- Vary scores based on actual quality (avoid defaulting to 75/100)
- Make feedback actionable and specific to the submission
- Ensure feedback tone is constructive and professional`;

    // Generate evaluation
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const evaluation = response.text();

    // Parse the evaluation more accurately
    const lines = evaluation.split('\n');
    let score = 75; // default score
    let feedback = '';

    // Extract the main score
    const scoreMatch = lines[0].match(/Score:\s*(\d{1,3})\/100/);
    if (scoreMatch) {
      score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
    }

    // Format the feedback with proper line breaks and structure
    feedback = lines
      .slice(1) // Skip the first line (Score)
      .filter(line => line.trim()) // Remove empty lines
      .join('\n'); // Join with newlines

    // Update submission with evaluation
    submission.score = score;
    submission.feedback = feedback;

    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all submissions for an assignment (admin only)
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId)
      .populate('submissions.studentId', 'name email')
      .populate('createdBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment.submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single assignment by ID
export const getAssignmentById = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    console.log('Fetching assignment with ID:', assignmentId);
    
    if (!assignmentId) {
      console.log('No assignment ID provided');
      return res.status(400).json({ message: 'Assignment ID is required' });
    }

    const assignment = await Assignment.findById(assignmentId);
    console.log('Assignment found:', assignment ? 'Yes' : 'No');
    
    if (!assignment) {
      console.log('Assignment not found for ID:', assignmentId);
      return res.status(404).json({ message: 'Assignment not found' });
    }

    console.log('Successfully retrieved assignment');
    res.status(200).json(assignment);
  } catch (error) {
    console.error('Error in getAssignmentById:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update assignment
export const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, dueDate } = req.body;
    const updatedBy = req.user.uid;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if the user is the assignment creator
    if (assignment.createdBy !== updatedBy) {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    // Update the assignment
    assignment.title = title;
    assignment.description = description;
    assignment.dueDate = new Date(dueDate);

    await assignment.save();

    res.status(200).json({
      message: 'Assignment updated successfully',
      assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: error.message });
  }
};

// Evaluate all submissions using Gemini AI
export const evaluateAllSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const adminId = req.user.uid;

    console.log('Starting evaluation process for assignment:', assignmentId);

    // Find the assignment and verify admin
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      console.log('Assignment not found:', assignmentId);
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user is the assignment creator
    if (assignment.createdBy !== adminId) {
      console.log('Unauthorized evaluation attempt by:', adminId);
      return res.status(403).json({ message: 'Not authorized to evaluate submissions' });
    }

    // Initialize Gemini AI model
    console.log('Initializing Gemini AI model...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Get all submissions for this assignment
    const submissions = await Submission.find({ assignmentId });
    console.log(`Found ${submissions.length} submissions to evaluate`);
    const evaluatedSubmissions = [];

    // Evaluate each submission
    for (const submission of submissions) {
      try {
        console.log(`\nEvaluating submission ${submission._id}:`);

        // Download and read the PDF file
        console.log('Downloading PDF from:', submission.pdfUrl);
        const pdfPath = await downloadPDF(submission.pdfUrl);
        console.log('PDF downloaded to:', pdfPath);
        
        const pdfContent = fs.readFileSync(pdfPath, 'base64');
        console.log('PDF content read successfully');

        // Clean up the temporary file
        fs.unlink(pdfPath, (err) => {
          if (err) console.error('Error deleting temporary PDF:', err);
        });

        // Create evaluation prompt
        const prompt = `Evaluate this student's submission for the assignment "${assignment.title}". 
Primary PDF URL: ${assignment.primaryPdfUrl}
Student's PDF URL: ${submission.pdfUrl}

As an expert evaluator, provide a concise evaluation using these criteria (100 points total):

Content & Understanding (40pts)
Technical Accuracy (30pts)
Presentation (30pts)

Format your response EXACTLY like this:
Score: [X]/100

Content: [X]/40
[One clear sentence about content quality]

Technical: [X]/30
[One clear sentence about technical accuracy]

Presentation: [X]/30
[One clear sentence about presentation]

Key Strength: [One specific strength in 10-15 words]
To Improve: [One specific suggestion in 10-15 words]

Important:
- Keep each feedback point to exactly one clear, specific sentence
- Vary scores based on actual quality (avoid defaulting to 75/100)
- Make feedback actionable and specific to the submission
- Ensure feedback tone is constructive and professional`;

        // Generate evaluation
        console.log('Sending request to Gemini API...');
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfContent
            }
          }
        ]);

        const response = await result.response;
        const evaluation = response.text();
        
        // Parse the evaluation more accurately
        const lines = evaluation.split('\n');
        let score = 75; // default score
        let feedback = '';

        // Extract the main score
        const scoreMatch = lines[0].match(/Score:\s*(\d{1,3})\/100/);
        if (scoreMatch) {
          score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
        }

        // Format the feedback with proper line breaks and structure
        feedback = lines
          .slice(1) // Skip the first line (Score)
          .filter(line => line.trim()) // Remove empty lines
          .join('\n'); // Join with newlines

        // Update submission with evaluation
        submission.score = score;
        submission.feedback = feedback;
        await submission.save();
        
        console.log(`Successfully evaluated submission ${submission._id} with score ${score}`);
        evaluatedSubmissions.push({ id: submission._id, score, feedback });
      } catch (evalError) {
        console.error('Error evaluating submission', submission._id, ':', evalError);
        console.error('Error stack:', evalError.stack);
      }
    }

    // Mark assignment as evaluated
    assignment.isEvaluated = true;
    await assignment.save();
    console.log('Assignment marked as evaluated');

    res.status(200).json({
      message: 'All submissions evaluated successfully',
      evaluatedCount: evaluatedSubmissions.length,
      evaluations: evaluatedSubmissions
    });
  } catch (error) {
    if (error.message.includes('API key not valid')) {
      console.error('Invalid Google Generative AI API key. Please verify the key in the .env file.');
    }
    console.error('Fatal error in evaluateAllSubmissions:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};