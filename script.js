// 初始化 Supabase 客户端
const supabaseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2t3dGhya3F5am1pcnNncW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwOTc2OTcsImV4cCI6MjA1MDY3MzY5N30.YV3HewlxV2MYe4G30vEhh-06npmXQ1_c7C4E_BIHCEo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 生成随机用户ID
const userId = localStorage.getItem('userId') || 
    Math.random().toString(36).substring(2, 15);
localStorage.setItem('userId', userId);

// 保存游戏状态，包括上传的内容
async function saveGameState() {
    const gameState = {
        cells: cells.map(cell => ({
            number: cell.textContent,
            selected: cell.classList.contains('selected'),
            content: {
                type: cell.dataset.contentType || 'text',  // 'text', 'image', 'video'
                value: cell.dataset.contentValue || cell.textContent,
                url: cell.dataset.contentUrl || ''
            }
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

// 加载游戏状态，包括上传的内容
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
            
            // 恢复上传的内容
            if (cellData.content) {
                cell.dataset.contentType = cellData.content.type;
                cell.dataset.contentValue = cellData.content.value;
                cell.dataset.contentUrl = cellData.content.url;

                // 根据内容类型恢复显示
                switch (cellData.content.type) {
                    case 'image':
                        const img = document.createElement('img');
                        img.src = cellData.content.url;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        cell.appendChild(img);
                        break;
                    case 'video':
                        const video = document.createElement('video');
                        video.src = cellData.content.url;
                        video.controls = true;
                        video.style.width = '100%';
                        video.style.height = '100%';
                        cell.appendChild(video);
                        break;
                    default:
                        cell.textContent = cellData.content.value;
                }
            }

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

// 修改文件上传处理函数
async function handleFileUpload(cell, file) {
    try {
        // 上传文件到 Supabase Storage
        const { data, error } = await supabase.storage
            .from('bingo-uploads')
            .upload(`${userId}/${file.name}`, file);

        if (error) throw error;

        // 获取文件的公共URL
        const { data: { publicUrl } } = supabase.storage
            .from('bingo-uploads')
            .getPublicUrl(data.path);

        // 更新单元格内容
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = publicUrl;
            img.style.width = '100%';
            img.style.height = '100%';
            cell.innerHTML = '';
            cell.appendChild(img);
            cell.dataset.contentType = 'image';
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = publicUrl;
            video.controls = true;
            video.style.width = '100%';
            video.style.height = '100%';
            cell.innerHTML = '';
            cell.appendChild(video);
            cell.dataset.contentType = 'video';
        }

        cell.dataset.contentUrl = publicUrl;
        cell.dataset.contentValue = file.name;

        // 保存游戏状态
        await saveGameState();

    } catch (error) {
        console.error('文件上传失败:', error);
        alert('文件上传失败，请重试');
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