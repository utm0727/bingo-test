import mongoose from 'mongoose';

const gameSettingsSchema = new mongoose.Schema({
  gridSize: {
    type: Number,
    default: 5,
    min: 3,
    max: 7,
  },
}, {
  timestamps: true,
});

export default mongoose.model('GameSettings', gameSettingsSchema); 