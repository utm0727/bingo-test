const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { uploadToDrive } = require('./services/drive');

const app = express();
const upload = multer({ memory: true });

app.use(cors());

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { teamName, questionId } = req.body;
        
        const fileUrl = await uploadToDrive(file, teamName, questionId);
        res.json({ fileUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 