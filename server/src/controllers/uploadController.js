import { google } from 'googleapis';
import { Readable } from 'stream';

export const uploadFile = async (req, res) => {
    try {
        const { file } = req.files;
        const { teamName, questionId } = req.body;

        // 获取 Google Drive 设置
        const driveSettings = await getDriveSettings();
        if (!driveSettings) {
            throw new Error('Google Drive settings not found');
        }

        // 初始化 Google Drive API
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        const drive = google.drive({ version: 'v3', auth });

        // 创建文件元数据
        const fileMetadata = {
            name: `${teamName}_${questionId}_${file.name}`,
            parents: [driveSettings.folderId]
        };

        // 创建媒体对象
        const media = {
            mimeType: file.mimetype,
            body: Readable.from(file.data)
        };

        // 上传到 Google Drive
        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        // 返回文件链接
        res.json({
            fileId: driveResponse.data.id,
            fileUrl: driveResponse.data.webViewLink
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
}; 