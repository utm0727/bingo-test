// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化 Supabase 客户端
    const supabaseClient = window.supabase.createClient(
        'https://vwkkwthrkqyjmirsgqoo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2t3dGhya3F5am1pcnNncW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwOTc2OTcsImV4cCI6MjA1MDY3MzY5N30.YV3HewlxV2MYe4G30vEhh-06npmXQ1_c7C4E_BIHCEo'
    );

    // 定义为全局变量
    window.API = {
        // 登录相关方法
        async login(teamName, leaderName) {
            try {
                const { data: existingUser, error: selectError } = await supabaseClient
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

                const { data: newUser, error: insertError } = await supabaseClient
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
                const { data, error } = await supabaseClient
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
                const { data, error } = await supabaseClient
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
                const { error } = await supabaseClient
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
                const { error } = await supabaseClient
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
                const { data, error } = await supabaseClient
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
                const { data, error } = await supabaseClient
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
                    const { error } = await supabaseClient
                        .from(table)
                        .delete()
                        .neq('id', 0); // 删除所有记录

                    if (error) throw error;
                }

                // 清除存储的文件
                const { error: storageError } = await supabaseClient
                    .storage
                    .from('game-files')
                    .remove(['*']);

                if (storageError) throw storageError;

                return true;
            } catch (error) {
                console.error('重置数据失败:', error);
                throw error;
            }
        },

        // 获取排行榜
        async getLeaderboard() {
            try {
                const { data, error } = await supabaseClient
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
        }
    };

    // 触发一个事件表示 API 已经准备好
    window.dispatchEvent(new Event('APIReady'));
}); 