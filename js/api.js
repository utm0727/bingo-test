const API = {
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
        const scores = this.storage.scores
            .map(score => {
                const user = this.storage.users.find(u => u.teamName === score.teamName);
                return {
                    ...score,
                    leaderName: user?.leaderName
                };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, 10);
        return scores;
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
        try {
            console.log('API: 开始保存游戏进度', {
                teamName: teamName,
                progress: progress
            });

            const gameProgress = {
                teamName,
                board: progress.board,
                startTime: progress.startTime,
                lastSaveTime: Date.now(),
                totalPlayTime: progress.totalPlayTime || 0,
                isActive: true
            };

            // 保存到 localStorage
            const key = `game-progress-${teamName}`;
            localStorage.setItem(key, JSON.stringify(gameProgress));
            
            // 设置更新标记
            localStorage.setItem('needsUpdate', 'true');
            
            // 触发自定义事件
            const event = new CustomEvent('gameProgressUpdate', {
                detail: { teamName, timestamp: Date.now() }
            });
            window.dispatchEvent(event);

            return true;
        } catch (error) {
            console.error('API: 保存游戏进度失败:', error);
            throw error;
        }
    },

    // 获取游戏进度
    async getGameProgress(teamName) {
        try {
            const key = `game-progress-${teamName}`;
            const progressData = localStorage.getItem(key);
            console.log('API: 获取游戏进度', {
                teamName: teamName,
                data: progressData ? JSON.parse(progressData) : null
            });
            return progressData ? JSON.parse(progressData) : null;
        } catch (error) {
            console.error('API: 获取游戏进度失败:', error);
            return null;
        }
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

    // 添加重置所有数据的方法
    async resetAllData() {
        // 重置存储数据
        this.storage = {
            questions: [],
            users: [],
            scores: []
        };
        this.save();

        // 清除所有游戏进度
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('game-progress-')) {
                localStorage.removeItem(key);
            }
        });

        // 保留管理员凭据和游戏设置
        const adminCredentials = localStorage.getItem('admin-credentials');
        const gameSettings = localStorage.getItem('game-settings');
        
        // 清除其他所有数据
        localStorage.clear();
        
        // 恢复管理员凭据和游戏设置
        if (adminCredentials) {
            localStorage.setItem('admin-credentials', adminCredentials);
        }
        if (gameSettings) {
            localStorage.setItem('game-settings', gameSettings);
        }
        localStorage.setItem('isAdmin', 'true');

        return true;
    },

    // 修改获取所有团队进度的方法
    async getAllTeamsProgress() {
        try {
            const teams = [];
            const storage = JSON.parse(localStorage.getItem('bingo-data')) || this.storage;
            const keys = Object.keys(localStorage);
            
            for (const key of keys) {
                if (key.startsWith('game-progress-')) {
                    try {
                        const teamName = key.replace('game-progress-', '');
                        const progressData = localStorage.getItem(key);
                        if (!progressData) continue;

                        const progress = JSON.parse(progressData);
                        if (!progress || !progress.board) continue;

                        // 确保每个格子的数据完整
                        progress.board = progress.board.map(cell => ({
                            ...cell,
                            preview: cell.preview || null,
                            fileType: cell.fileType || null,
                            completed: cell.completed || false,
                            flipped: cell.flipped || false
                        }));

                        const isCompleted = await this.checkGameCompletion(teamName);
                        const score = storage.scores.find(s => s.teamName === teamName)?.score;
                        const user = storage.users.find(u => u.teamName === teamName);

                        teams.push({
                            teamName,
                            progress,
                            timestamp: progress.lastSaveTime,
                            isCompleted,
                            score,
                            leaderName: user?.leaderName
                        });
                    } catch (err) {
                        console.error(`处理团队 ${key} 数据失败:`, err);
                        continue;
                    }
                }
            }

            console.log('获取到的所有团队数据:', teams); // 调试日志
            return teams;
        } catch (error) {
            console.error('获取团队进度失败:', error);
            throw error;
        }
    },

    // 添��删除团队分数的方法
    async deleteTeamScore(teamName) {
        this.storage.scores = this.storage.scores.filter(score => score.teamName !== teamName);
        this.save();
        return true;
    },

    // 添加提交缓存相关的方法
    submissionCache: new Map(),

    // 保存提交到缓存
    async cacheSubmission(teamName, cellIndex, submission) {
        try {
            const cacheKey = `submission-cache-${teamName}`;
            let teamCache = this.submissionCache.get(teamName) || [];
            
            teamCache.push({
                cellIndex,
                question: submission.question,
                preview: submission.preview,
                fileType: submission.fileType,
                timestamp: new Date().toISOString(),
                completed: true
            });

            this.submissionCache.set(teamName, teamCache);
            
            // 触发更新通知
            localStorage.setItem('needsUpdate', 'true');
            console.log('已缓存新的提交:', {teamName, cellIndex, submission});
            
            return true;
        } catch (error) {
            console.error('缓存提交失败:', error);
            return false;
        }
    },

    // 获取并清除缓存的提交
    async getAndClearCache(teamName) {
        const submissions = this.submissionCache.get(teamName) || [];
        this.submissionCache.delete(teamName);
        return submissions;
    }
};

// 初始化 API
API.init(); 