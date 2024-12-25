// 初始化 Supabase 客户端
const supabase = createClient(
    'https://vwkkwthrkqyjmirsgqoo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2t3dGhya3F5am1pcnNncW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwOTc2OTcsImV4cCI6MjA1MDY3MzY5N30.YV3HewlxV2MYe4G30vEhh-06npmXQ1_c7C4E_BIHCEo'
);

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
        try {
            // 检查用户是否存在
            const { data: existingUser } = await supabase
                .from('users')
                .select()
                .eq('team_name', teamName)
                .single();

            if (existingUser) {
                return existingUser;
            }

            // 创建新用户
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([
                    {
                        team_name: teamName,
                        leader_name: leaderName,
                        created_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return newUser;
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    },

    // 管理员登录
    async adminLogin(username, password) {
        try {
            const { data: admin, error } = await supabase
                .from('admins')
                .select()
                .eq('username', username)
                .single();

            if (error) throw error;

            // 这里应该使用proper密码比较，但为了演示先用简单判断
            if (admin && admin.password === password) {
                return { isAdmin: true };
            }
            throw new Error('Invalid credentials');
        } catch (error) {
            console.error('管理员登录失败:', error);
            throw error;
        }
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
        try {
            const { data, error } = await supabase
                .from('scores')
                .insert([
                    {
                        teamName,
                        score,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('更新分数失败:', error);
            throw error;
        }
    },

    // 获取排行榜
    async getLeaderboard() {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select(`
                    team_name,
                    score,
                    created_at,
                    users (
                        leader_name
                    )
                `)
                .order('score', { ascending: true })
                .limit(10);

            if (error) throw error;

            return data.map(score => ({
                teamName: score.team_name,
                score: score.score,
                leaderName: score.users?.leader_name,
                timestamp: score.created_at
            }));
        } catch (error) {
            console.error('获取排行榜失败:', error);
            return [];
        }
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
            const { data, error } = await supabase
                .from('game_progress')
                .upsert([
                    {
                        team_name: teamName,
                        progress: this.compressData(progress),
                        updated_at: new Date().toISOString()
                    }
                ], {
                    onConflict: 'team_name'
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('保存游戏进度失败:', error);
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
            const { data, error } = await supabase
                .from('game_progress')
                .select('progress')
                .eq('teamName', teamName)
                .single();

            if (error) return null;
            return data?.progress || null;
        } catch (error) {
            console.error('获取游戏进度失败:', error);
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

// 不再需要初始化本地存储
// API.init();

export default API; 