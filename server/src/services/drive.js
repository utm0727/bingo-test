const { google } = require('googleapis');
const stream = require('stream');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

async function uploadToDrive(file, teamName, questionId) {
    const fileMetadata = {
        name: `${teamName}_${questionId}_${file.originalname}`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };

    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);

    const media = {
        mimeType: file.mimetype,
        body: bufferStream
    };

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });

        return response.data.webViewLink;
    } catch (error) {
        console.error('Drive upload error:', error);
        throw error;
    }
}

module.exports = { uploadToDrive }; 