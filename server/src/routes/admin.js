import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import { addQuestion, deleteQuestion, updateGridSize } from '../controllers/adminController.js';

const router = express.Router();

router.post('/questions', adminAuth, addQuestion);
router.delete('/questions/:id', adminAuth, deleteQuestion);
router.put('/settings', adminAuth, updateGridSize);

export default router; 