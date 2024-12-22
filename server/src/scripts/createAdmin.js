import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const password = 'admin123'; // 默认密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await User.create({
      teamName: 'admin',
      leaderName: 'Administrator',
      isAdmin: true,
      password: hashedPassword
    });
    
    console.log('Admin account created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error);
    process.exit(1);
  }
};

createAdmin(); 