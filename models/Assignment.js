import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  contentPdfUrl: {
    type: String,
    required: false
  },
  primaryPdfUrl: {
    type: String,
    required: true
  },
  classroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  isEvaluated: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Enable virtuals in JSON
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add submissions as a virtual to prevent index creation
assignmentSchema.virtual('submissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'assignmentId'
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;