import express from 'express';
import { login, adminLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/admin/login', adminLogin);

export default router; 