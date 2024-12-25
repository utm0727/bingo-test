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

    // 修改数据压缩方法
    compressData(data) {
        try {
            // 移除不必要的数据
            const compressedBoard = data.board.map(cell => ({
                id: cell.id,
                question: cell.question,
                completed: cell.completed,
                flipped: cell.flipped,
                fileType: cell.fileType,
                // 保存所有类型的预览内容
                preview: cell.preview,
                timestamp: cell.timestamp
            }));

            return {
                ...data,
                board: compressedBoard
            };
        } catch (error) {
            console.error('压缩数据失败:', error);
            return data;
        }
    },

    // 修改 saveGameProgress 方法
    async saveGameProgress(teamName, progress) {
        try {
            // 压缩数据
            const compressedProgress = this.compressData(progress);
            
            try {
                // 尝试直接保存
                localStorage.setItem(`game-progress-${teamName}`, JSON.stringify(compressedProgress));
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.log('存储空间不足，尝试清理...');
                    
                    // 清理旧数据
                    const keys = Object.keys(localStorage);
                    for (const key of keys) {
                        // 清理超过24小时的游戏进度
                        if (key.startsWith('game-progress-')) {
                            try {
                                const savedData = JSON.parse(localStorage.getItem(key));
                                const timestamp = new Date(savedData.lastSaveTime).getTime();
                                if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
                                    localStorage.removeItem(key);
                                }
                            } catch (err) {
                                // 如果数据解析失败，直接删除
                                localStorage.removeItem(key);
                            }
                        }
                    }

                    // 再次尝试保存
                    try {
                        localStorage.setItem(`game-progress-${teamName}`, JSON.stringify(compressedProgress));
                    } catch (finalError) {
                        // 如果还是失败，清理当前团队的进度并保存
                        localStorage.removeItem(`game-progress-${teamName}`);
                        localStorage.setItem(`game-progress-${teamName}`, JSON.stringify(compressedProgress));
                    }
                } else {
                    throw e;
                }
            }
            
            return true;
        } catch (error) {
            console.error('API: 保存游戏进度失败:', error);
            throw error;
        }
    },

    // 获取游戏进度
    async getGameProgress(teamName) {
        if (!teamName) {
            console.error('teamName 不能为空');
            return null;
        }
        try {
            const key = `game-progress-${teamName}`;
            const progressData = localStorage.getItem(key);
            
            if (progressData) {
                const progress = JSON.parse(progressData);
                
                // 如果有完成时间戳，检查是否超过24小时
                if (progress.completedAt) {
                    const now = Date.now();
                    const hoursSinceCompletion = (now - progress.completedAt) / (1000 * 60 * 60);
                    
                    if (hoursSinceCompletion >= 24) {
                        // 如果超过24小时，删除进度
                        localStorage.removeItem(key);
                        return null;
                    }
                }
                
                return progress;
            }
            return null;
        } catch (error) {
            console.error('API: 获取游戏进度失败:', error);
            return null;
        }
    },

    // 清除游戏进度
    async clearGameProgress(teamName) {
        // 不立即删除，而是标记删除时间
        const progress = await this.getGameProgress(teamName);
        if (progress) {
            progress.completedAt = Date.now(); // 添加完成时间戳
            localStorage.setItem(`game-progress-${teamName}`, JSON.stringify(progress));
        }
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

    // 添加缓存相关的方法
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
            
            // 设置更新标记
            localStorage.setItem('needsUpdate', 'true');
            
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