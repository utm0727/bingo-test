// 排行榜功能
// 保存得分
async function saveScore(score) {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    try {
        const { error } = await supabase
            .from('leaderboard')
            .insert({
                user_id: user.id,
                score: score
            });

        if (error) throw error;
    } catch (error) {
        console.error('保存得分失败:', error);
        throw error;
    }
}

// 获取排行榜
async function getLeaderboard() {
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select(`
                *,
                users (username)
            `)
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('获取排行榜失败:', error);
        return [];
    }
}