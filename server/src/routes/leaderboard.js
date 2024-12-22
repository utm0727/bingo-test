import express from 'express';
import { getLeaderboard, updateScore } from '../controllers/leaderboardController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getLeaderboard);
router.post('/score', auth, updateScore);

export default router; 