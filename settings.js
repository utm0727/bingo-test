// 获取游戏设置
async function getGameSettings() {
    try {
        const { data, error } = await supabase
            .from('game_settings')
            .select()
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // 如果没有设置，创建默认设置
                return createDefaultSettings();
            }
            throw error;
        }

        return data;

    } catch (error) {
        console.error('获取游戏设置失败:', error);
        throw error;
    }
}

// 更新游戏设置
async function updateGameSettings(gridSize) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    try {
        const { data, error } = await supabase
            .from('game_settings')
            .insert({
                grid_size: gridSize,
                updated_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('更新游戏设置失败:', error);
        throw error;
    }
} 