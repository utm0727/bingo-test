import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const login = async (req, res) => {
  try {
    const { teamName, leaderName } = req.body;
    
    let user = await User.findOne({ teamName });
    if (!user) {
      user = new User({ teamName, leaderName });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, teamName },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: '登录失败' });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await User.findOne({ teamName: username, isAdmin: true });
    if (!admin || !await bcrypt.compare(password, admin.password)) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: admin._id, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: '管理员登录失败' });
  }
}; 