import Question from '../models/Question.js';
import { uploadToGoogleDrive } from '../services/googleDrive.js';

export const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: '获取题目失败' });
  }
};

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

export const uploadFile = async (req, res) => {
  try {
    const { questionId } = req.params;
    const file = req.file;

    const fileUrl = await uploadToGoogleDrive(file);
    const question = await Question.findByIdAndUpdate(
      questionId,
      { fileUrl },
      { new: true }
    );

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: '文件上传失败' });
  }
}; 