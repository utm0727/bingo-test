import User from '../models/User.js';

export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.find({ completionTime: { $ne: null } })
      .sort({ completionTime: 1 })
      .select('teamName leaderName completionTime')
      .limit(10);
    
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: '获取排行榜失败' });
  }
};

export const updateScore = async (req, res) => {
  try {
    const { completionTime } = req.body;
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, { completionTime });
    res.json({ message: '分数更新成功' });
  } catch (error) {
    res.status(500).json({ message: '更新分数失败' });
  }
}; 