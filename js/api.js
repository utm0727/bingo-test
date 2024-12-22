const API = {
    baseUrl: 'http://localhost:5000/api', // 添加基础 URL

    // 使用 localStorage 模拟数据存储
    storage: {
        questions: [],
        users: [],
        scores: []
    },

    // 初始化本地存储
    init() {
        if (!localStorage.getItem('bingo-data')) {
            localStorage.setItem('bingo-data', JSON.stringify(this.storage));
        }
        this.storage = JSON.parse(localStorage.getItem('bingo-data'));
    },

    // 保存数据到本地存储
    save() {
        localStorage.setItem('bingo-data', JSON.stringify(this.storage));
    },

    // 用户登录
    async login(teamName, leaderName) {
        const user = {
            id: Date.now(),
            teamName,
            leaderName,
            timestamp: new Date().toISOString()
        };
        this.storage.users.push(user);
        this.save();
        return user;
    },

    // 管理员登录
    async adminLogin(username, password) {
        // 获取保存的管理员凭据
        const savedCredentials = localStorage.getItem('admin-credentials');
        if (savedCredentials) {
            const admin = JSON.parse(savedCredentials);
            if (username === admin.username && password === admin.password) {
                return { isAdmin: true };
            }
        } else if (username === 'admin' && password === 'admin123') {
            // 首次登录使用默认凭据
            return { isAdmin: true };
        }
        throw new Error('Invalid credentials');
    },

    // 获取题目列表
    async getQuestions() {
        return this.storage.questions;
    },

    // 添加新题目
    async addQuestion(question) {
        const newQuestion = {
            id: Date.now(),
            question,
            timestamp: new Date().toISOString()
        };
        this.storage.questions.push(newQuestion);
        this.save();
        return newQuestion;
    },

    // 删除题目
    async deleteQuestion(id) {
        this.storage.questions = this.storage.questions.filter(q => q.id !== id);
        this.save();
    },

    // 更新分数
    async updateScore(teamName, score) {
        this.storage.scores.push({
            teamName,
            score,
            timestamp: new Date().toISOString()
        });
        this.save();
    },

    // 获取排行榜
    async getLeaderboard() {
        return this.storage.scores
            .sort((a, b) => a.score - b.score)
            .slice(0, 10);
    },

    // 更新管理员信息
    async updateAdminCredentials(newUsername, newPassword) {
        const admin = {
            username: newUsername,
            password: newPassword
        };
        try {
            localStorage.setItem('admin-credentials', JSON.stringify(admin));
            // 清除当前登录状态，强制重新登录
            localStorage.removeItem('isAdmin');
            return true;
        } catch (error) {
            throw new Error('Failed to update admin credentials');
        }
    },

    // 更新 Google Drive 设置
    async updateDriveSettings(folderId, apiKey) {
        const driveSettings = {
            folderId,
            apiKey
        };
        localStorage.setItem('drive-settings', JSON.stringify(driveSettings));
        return true;
    },

    // 获取 Google Drive 设置
    async getDriveSettings() {
        const settings = localStorage.getItem('drive-settings');
        return settings ? JSON.parse(settings) : null;
    },

    // 更新游戏设置
    async updateGameSettings(gridSize) {
        const settings = {
            gridSize: parseInt(gridSize)
        };
        localStorage.setItem('game-settings', JSON.stringify(settings));
        return true;
    },

    // 获取游戏设置
    async getGameSettings() {
        const settings = localStorage.getItem('game-settings');
        return settings ? JSON.parse(settings) : { gridSize: 5 }; // 默认 5x5
    },

    // 保存游戏进度
    async saveGameProgress(teamName, progress) {
        const gameProgress = {
            teamName,
            board: progress.board,
            startTime: progress.startTime,
            lastSaveTime: Date.now(),
            totalPlayTime: progress.totalPlayTime || 0,
            isActive: true
        };
        localStorage.setItem(`game-progress-${teamName}`, JSON.stringify(gameProgress));
        return true;
    },

    // 获取游戏进度
    async getGameProgress(teamName) {
        const progress = localStorage.getItem(`game-progress-${teamName}`);
        return progress ? JSON.parse(progress) : null;
    },

    // 清除游戏进度
    async clearGameProgress(teamName) {
        localStorage.removeItem(`game-progress-${teamName}`);
        return true;
    },

    // 添加检查游戏完成状态的方法
    async checkGameCompletion(teamName) {
        const scores = this.storage.scores;
        return scores.some(score => score.teamName === teamName);
    },

    // 添加重置所有游戏数据的方法
    async resetAllGames() {
        // 清除所有游戏进度和分数
        this.storage.scores = [];
        this.save();

        // 清除所有玩家的进度
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('game-progress-')) {
                localStorage.removeItem(key);
            }
        });

        return true;
    },

    // 修改文件上传方法
    async uploadFile(file, teamName, questionId) {
        return new Promise((resolve) => {
            // 使用 FileReader 读取文件
            const reader = new FileReader();
            reader.onload = (e) => {
                // 创建一个简单的文件URL
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result,
                    uploadTime: new Date().toISOString(),
                    teamName: teamName,
                    questionId: questionId
                };

                // 存储文件信息
                const uploads = JSON.parse(localStorage.getItem('file-uploads') || '[]');
                uploads.push(fileData);
                localStorage.setItem('file-uploads', JSON.stringify(uploads));

                // 返回一个模拟的文件URL
                resolve({
                    fileUrl: e.target.result,
                    fileName: file.name
                });
            };
            reader.readAsDataURL(file);
        });
    },

    // 获取上传的文件
    async getUploads(questionId) {
        const uploads = JSON.parse(localStorage.getItem('file-uploads') || '[]');
        return uploads.filter(upload => upload.questionId === questionId);
    }
};

// 初始化 API
API.init(); 