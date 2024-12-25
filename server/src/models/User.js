import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
  },
  leaderName: {
    type: String,
    required: true,
  },
  completionTime: {
    type: Number,
    default: null,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    required: function() {
      return this.isAdmin;
    },
  },
}, {
  timestamps: true,
});

export default mongoose.model('User', userSchema); 