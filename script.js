// 初始化 Supabase 客户端
const supabaseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2t3dGhya3F5am1pcnNncW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwOTc2OTcsImV4cCI6MjA1MDY3MzY5N30.YV3HewlxV2MYe4G30vEhh-06npmXQ1_c7C4E_BIHCEo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 生成随机用户ID
const userId = localStorage.getItem('userId') || 
    Math.random().toString(36).substring(2, 15);
localStorage.setItem('userId', userId);

// 保存游戏状态
async function saveGameState() {
    const gameState = {
        cells: cells.map(cell => ({
            number: cell.textContent,
            selected: cell.classList.contains('selected')
        })),
        bingoCount: bingoCount
    };

    try {
        const { data, error } = await supabase
            .from('game_states')
            .upsert({
                user_id: userId,
                game_data: gameState
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;
        console.log('游戏状态已保存');
    } catch (error) {
        console.error('保存失败:', error);
    }
}

// 加载游戏状态
async function loadGameState() {
    try {
        const { data, error } = await supabase
            .from('game_states')
            .select('game_data')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return initGame();
            }
            throw error;
        }

        const gameState = data.game_data;
        
        const board = document.querySelector('.board');
        board.innerHTML = '';
        cells.length = 0;
        
        gameState.cells.forEach(cellData => {
            const cell = createCell(cellData.number);
            if (cellData.selected) {
                cell.classList.add('selected');
            }
            cells.push(cell);
            board.appendChild(cell);
        });
        
        bingoCount = gameState.bingoCount;
        updateBingoDisplay();
        
    } catch (error) {
        console.error('加载失败:', error);
        initGame();
    }
}

// 修改点击处理函数
function handleCellClick(cell) {
    cell.classList.toggle('selected');
    checkBingo();
    saveGameState(); // 每次点击后保存状态
}

// 修改初始化函数
window.onload = loadGameState; 