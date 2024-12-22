import Question from '../models/Question.js';
import GameSettings from '../models/GameSettings.js';

export const addQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const newQuestion = new Question({ question });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: '添加题目失败' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    await Question.findByIdAndDelete(id);
    res.json({ message: '题目删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除题目失败' });
  }
};

export const updateGridSize = async (req, res) => {
  try {
    const { gridSize } = req.body;
    const settings = await GameSettings.findOne();
    
    if (settings) {
      settings.gridSize = gridSize;
      await settings.save();
    } else {
      await new GameSettings({ gridSize }).save();
    }
    
    res.json({ gridSize });
  } catch (error) {
    res.status(500).json({ message: '更新格子大小失败' });
  }
}; 