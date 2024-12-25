// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(
    'https://vwkkwthrkqyjmirsgqoo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2t3dGhya3F5am1pcnNncW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwOTc2OTcsImV4cCI6MjA1MDY3MzY5N30.YV3HewlxV2MYe4G30vEhh-06npmXQ1_c7C4E_BIHCEo'
);

// 改为全局变量
window.API = {
    // 登录相关方法
    async login(teamName, leaderName) {
        try {
            const { data: existingUser, error: selectError } = await supabase
                .from('users')
                .select()
                .eq('team_name', teamName)
                .single();

            if (selectError && selectError.code !== 'PGRST116') {
                throw selectError;
            }

            if (existingUser) {
                return existingUser;
            }

            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{
                    team_name: teamName,
                    leader_name: leaderName
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            return newUser;
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        }
    },

    // 获取题目列表
    async getQuestions() {
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('获取题目失败:', error);
            return [];
        }
    },

    // 添加新题目
    async addQuestion(question) {
        try {
            const { data, error } = await supabase
                .from('questions')
                .insert([{ question }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('添加题目失败:', error);
            throw error;
        }
    },

    // 删除题目
    async deleteQuestion(id) {
        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('删除题目失败:', error);
            throw error;
        }
    },

    // 更新游戏设置
    async updateGameSettings(gridSize) {
        try {
            const { error } = await supabase
                .from('game_settings')
                .upsert([{
                    id: 1, // 使用固定 ID，因为只需要一条设置记录
                    grid_size: parseInt(gridSize)
                }]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('更新游戏设置失败:', error);
            throw error;
        }
    },

    // 获取游戏设置
    async getGameSettings() {
        try {
            const { data, error } = await supabase
                .from('game_settings')
                .select('grid_size')
                .single();

            if (error) return { gridSize: 5 }; // 默认值
            return { gridSize: data.grid_size };
        } catch (error) {
            console.error('获取游戏设置失败:', error);
            return { gridSize: 5 }; // 默认值
        }
    },

    // 检查游戏完成状态
    async checkGameCompletion(teamName) {
        try {
            const { data, error } = await supabase
                .from('scores')
                .select('id')
                .eq('team_name', teamName)
                .single();

            if (error) return false;
            return !!data;
        } catch (error) {
            console.error('检查游戏完成状态失败:', error);
            return false;
        }
    },

    // 重置所有数据
    async resetAllData() {
        try {
            // 删除所有游戏相关数据，但保留管理员账户
            const tables = ['scores', 'game_progress', 'questions'];
            for (const table of tables) {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .neq('id', 0); // 删除所有记录

                if (error) throw error;
            }

            // 清除存储的文件
            const { error: storageError } = await supabase
                .storage
                .from('game-files')
                .remove(['*']);

            if (storageError) throw storageError;

            return true;
        } catch (error) {
            console.error('重置数据失败:', error);
            throw error;
        }
    }
};

// 不再需要初始化本地存储
// API.init(); 