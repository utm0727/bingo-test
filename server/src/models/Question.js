import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Question', questionSchema); 