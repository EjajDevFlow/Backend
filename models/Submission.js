import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  pdfUrl: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to ensure one submission per student per assignment
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission; 