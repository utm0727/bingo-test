// 1. 添加错误处理
async function initGame() {
    try {
        showLoading(true);  // 添加加载状态
        const settings = await getGameSettings();
        const questions = await getQuestions();
        
        if (!questions || questions.length === 0) {
            throw new Error('没有可用的题目');
        }

        const gridSize = settings?.grid_size || 5;  // 添加默认值
        createGameBoard(gridSize, questions);
    } catch (error) {
        console.error('初始化游戏失败:', error);
        alert('加载游戏失败，请刷新重试');
    } finally {
        showLoading(false);  // 移除加载状态
    }
}

// 2. 改进游戏状态保存
async function saveGameState() {
    if (!sessionStorage.getItem('currentUser')) {
        console.warn('用户未登录，不保存状态');
        return;
    }

    try {
        const gameState = {
            cells: cells.map(cell => ({
                number: cell.textContent,
                selected: cell.classList.contains('selected'),
                content: {
                    type: cell.dataset.contentType || 'text',
                    value: cell.dataset.contentValue || cell.textContent,
                    url: cell.dataset.contentUrl || ''
                }
            })),
            bingoCount: bingoCount,
            lastUpdated: new Date().toISOString()
        };

        const { error } = await supabase
            .from('game_states')
            .upsert({
                user_id: JSON.parse(sessionStorage.getItem('currentUser')).id,
                game_data: gameState
            });

        if (error) throw error;
    } catch (error) {
        console.error('保存游戏状态失败:', error);
    }
}

// 3. 添加用户验证
window.onload = async function() {
    try {
        // 检查用户登录状态
        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = '/login.html';
            return;
        }

        await initGame();
    } catch (error) {
        console.error('初始化失败:', error);
    }
}; 