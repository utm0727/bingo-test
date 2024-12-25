import express from 'express';
import multer from 'multer';
import { getQuestions, uploadFile } from '../controllers/questionController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, getQuestions);
router.post('/:questionId/upload', auth, upload.single('file'), uploadFile);

export default router; 