class BingoGame {
    constructor() {
        this.board = [];
        this.size = 5;
        this.startTime = Date.now();
        this.totalPlayTime = 0;
        this.lastSaveTime = Date.now();
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.currentFlippedIndex = null;
        this.initGame();
        this.setupAutoSave();
    }

    async initGame() {
        try {
            if (!this.currentUser) {
                window.location.href = '../index.html';
                return;
            }

            // 获取游戏设置
            const settings = await API.getGameSettings();
            this.size = settings.gridSize;

            // 尝试恢复进度
            const savedProgress = await API.getGameProgress(this.currentUser.teamName);
            if (savedProgress) {
                this.board = savedProgress.board;
                // 确保棋盘大小正确
                if (this.board.length < this.size * this.size) {
                    // 补充空格子
                    while (this.board.length < this.size * this.size) {
                        this.board.push({
                            id: Date.now() + Math.random(),
                            question: '待添加题目',
                            completed: false,
                            flipped: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                } else if (this.board.length > this.size * this.size) {
                    // 裁剪多余的格子
                    this.board = this.board.slice(0, this.size * this.size);
                }

                this.startTime = savedProgress.startTime;
                this.totalPlayTime = savedProgress.totalPlayTime || 0;
                this.lastSaveTime = savedProgress.lastSaveTime;
                
                // 恢复当前翻转的格子状态
                this.currentFlippedIndex = null;
                for (let i = 0; i < this.board.length; i++) {
                    if (this.board[i].flipped && !this.board[i].completed) {
                        this.currentFlippedIndex = i;
                        break;
                    }
                }
                
                // 计算离线时间并添加到总时间
                if (savedProgress.lastSaveTime) {
                    const offlineTime = Date.now() - savedProgress.lastSaveTime;
                    this.totalPlayTime += offlineTime;
                }
                
                this.renderBoard();
                this.updateTimeDisplay();
            } else {
                // 初始化新游戏
                const questions = await API.getQuestions();
                if (questions.length < this.size * this.size) {
                    alert(`题目数量不足，需要至少 ${this.size * this.size} 个题目`);
                    window.location.href = '../index.html';
                    return;
                }
                this.board = this.shuffleQuestions(questions);
                this.renderBoard();
                this.saveProgress();
            }

            // 启动时间更新
            this.startTimeUpdate();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('初始化游戏失败，请重试');
        }
    }

    // 启动时间更新
    startTimeUpdate() {
        this.timeUpdateInterval = setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
    }

    // 更新时间显示
    updateTimeDisplay() {
        const currentTime = Date.now();
        const totalTime = this.totalPlayTime + (currentTime - this.lastSaveTime);
        const seconds = Math.floor(totalTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const timeElement = document.getElementById('gameTime');
        if (timeElement) {
            timeElement.textContent = `游戏时间：${hours}时${minutes % 60}分${seconds % 60}秒`;
        }
    }

    // 修改保存进度方法
    async saveProgress() {
        if (!this.currentUser) {
            console.error('无法保存进度：未找到当前用户');
            return;
        }

        try {
            const currentTime = Date.now();
            this.totalPlayTime += (currentTime - this.lastSaveTime);
            this.lastSaveTime = currentTime;

            const progressData = {
                board: this.board.map(cell => ({
                    ...cell,
                    preview: cell.preview || null,
                    fileType: cell.fileType || null,
                    completed: cell.completed || false,
                    flipped: cell.flipped || false,
                    question: cell.question,
                    timestamp: cell.timestamp,
                    id: cell.id
                })),
                startTime: this.startTime,
                totalPlayTime: this.totalPlayTime,
                lastSaveTime: this.lastSaveTime,
                currentFlippedIndex: this.currentFlippedIndex
            };

            console.log('正在保存游戏进度:', {
                teamName: this.currentUser.teamName,
                progressData: progressData
            });

            await API.saveGameProgress(this.currentUser.teamName, progressData);
            
            // 验证保存是否成功
            const savedProgress = await API.getGameProgress(this.currentUser.teamName);
            console.log('保存后的进度验证:', savedProgress);

            if (!savedProgress || !savedProgress.board) {
                throw new Error('进度保存验证失败');
            }

            // 触发数据更新通知
            await this.notifyDataUpdate();
            console.log('游戏进度保存成功');
        } catch (error) {
            console.error('保存进度失败:', error);
            alert('保存进度失败，请检查网络连接');
        }
    }

    shuffleQuestions(questions) {
        // 确保题目数量足够
        if (questions.length < this.size * this.size) {
            alert(`题目数量不足，需要至少 ${this.size * this.size} 个题目`);
            window.location.href = '../index.html';
            return [];
        }

        // 深拷贝题目数组并打乱顺序
        const shuffled = [...questions]
            .map(q => ({ ...q }))  // 深拷贝每个题目��象
            .sort(() => Math.random() - 0.5);

        // 创建一个Set来跟踪已选择的题目
        const selectedQuestions = new Set();
        const result = [];

        // 从打乱的题目中选择不重复的题目
        for (const question of shuffled) {
            if (!selectedQuestions.has(question.question)) {
                selectedQuestions.add(question.question);
                result.push({
                    ...question,
                    completed: false,
                    flipped: false
                });
            }
            // 如果已经收集够了足够的不重复题目，就停止
            if (result.length === this.size * this.size) {
                break;
            }
        }

        // 再次检查是否有足够的不重复题目
        if (result.length < this.size * this.size) {
            alert(`不重复题目数量不足，需要至少 ${this.size * this.size} 个不同的题目`);
            window.location.href = '../index.html';
            return [];
        }

        return result;
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        // 动态设置列数
        gameBoard.style.gridTemplateColumns = `repeat(${this.size}, minmax(0, 1fr))`;
        
        // 确保 board 数组长度正确
        if (this.board.length < this.size * this.size) {
            console.error('棋盘数据不完整，需要补充空格子');
            // 补充空格子直到达到所需数量
            while (this.board.length < this.size * this.size) {
                this.board.push({
                    question: '待添加题目',
                    completed: false,
                    flipped: false,
                    id: Date.now() + Math.random(),
                    timestamp: new Date().toISOString()
                });
            }
        } else if (this.board.length > this.size * this.size) {
            console.error('棋盘数据过多，需要裁剪');
            // 裁剪多余的格子
            this.board = this.board.slice(0, this.size * this.size);
        }

        this.board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.className = `bingo-cell ${cell.completed ? 'completed' : ''}`;

            // 创建正面
            const frontSide = document.createElement('div');
            frontSide.className = 'cell-front';
            frontSide.innerHTML = `
                <span class="text-gray-400 text-center">
                    ${cell.completed ? '已完成' : '点击翻转'}
                </span>
            `;

            // 创建背面
            const backSide = document.createElement('div');
            backSide.className = 'cell-back';

            if (cell.completed) {
                console.log(`渲染第 ${index} 个格子:`, {
                    question: cell.question,
                    preview: cell.preview ? cell.preview.slice(0, 50) + '...' : 'no preview',
                    fileType: cell.fileType,
                    completed: cell.completed
                });

                backSide.innerHTML = `
                    <div class="question-content h-full flex flex-col">
                        <p class="text-sm mb-2 text-center font-medium">${cell.question}</p>
                        <div class="preview-container flex-grow flex items-center justify-center">
                            ${cell.preview ? this.renderPreview(cell, index) : '<span class="text-gray-500">已完成</span>'}
                        </div>
                    </div>
                `;
            } else {
                backSide.innerHTML = `
                    <div class="question-content h-full flex flex-col">
                        <p class="text-sm mb-4 flex-grow text-center font-medium">${cell.question}</p>
                        <div class="mt-auto space-y-2">
                            <div class="flex flex-col gap-2">
                                <textarea 
                                    class="w-full p-2 text-sm border rounded resize-none" 
                                    rows="2"
                                    placeholder="输入文字内容..."
                                    id="textInput-${index}"
                                    onclick="event.stopPropagation()"
                                ></textarea>
                                <button 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                    onclick="event.stopPropagation(); game.handleTextInput(${index}, document.getElementById('textInput-${index}'))"
                                >
                                    提交文字
                                </button>
                                <p class="text-xs text-gray-500">或者</p>
                            </div>
                            <div>
                                <input type="file" 
                                    class="w-full mb-2" 
                                    onchange="game.handleFileUpload(${index}, this)"
                                    onclick="event.stopPropagation()"
                                    accept="image/*,video/*"
                                >
                                <p class="text-xs text-gray-500">支持图片和视频文件</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            cellElement.appendChild(frontSide);
            cellElement.appendChild(backSide);

            // 如果格子已完成或者是当前翻转的格子，保持翻转状态
            if (cell.completed || (this.currentFlippedIndex === index && cell.flipped)) {
                cellElement.classList.add('flipped');
                cell.flipped = true;
            } else if (index !== this.currentFlippedIndex) {
                // 如果不是当前翻转的格子，确保它是未翻转状态
                cell.flipped = false;
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'aspect-square';
            wrapper.appendChild(cellElement);

            // 只有未完成的格子才能点击
            if (!cell.completed) {
                cellElement.onclick = () => this.handleCellClick(index);
            }

            gameBoard.appendChild(wrapper);
        });

        this.updateProgress();
    }

    // 添加进度显示
    updateProgress() {
        const completedCount = this.board.filter(cell => cell.completed).length;
        const totalCells = this.size * this.size;
        const progressElement = document.getElementById('gameProgress');
        if (progressElement) {
            progressElement.textContent = `进度：${completedCount}/${totalCells}`;
        }
    }

    handleCellClick(index) {
        try {
            // 检查索引是否有效
            if (index < 0 || index >= this.board.length) {
                console.error('无效的格子索��:', index);
                return;
            }

            // 检查当前格子
            const currentCell = this.board[index];
            if (!currentCell) {
                console.error('格子数据不存在:', index);
                return;
            }

            // 如果已经完成，不允许点击
            if (currentCell.completed) {
                return;
            }

            // 检查当前翻转的格子
            if (this.currentFlippedIndex !== null) {
                const flippedCell = this.board[this.currentFlippedIndex];
                // 确保 flippedCell 存在且未完成时才阻止点击
                if (flippedCell && 
                    this.currentFlippedIndex !== index && 
                    !flippedCell.completed) {
                    alert('请先完成当前格子的任务');
                    return;
                }
            }

            // 更新格子状态
            currentCell.flipped = !currentCell.flipped;
            this.currentFlippedIndex = currentCell.flipped ? index : null;

            // 重新渲染棋盘
            this.renderBoard();
            this.saveProgress();
        } catch (error) {
            console.error('处理格子点击失败:', error, {
                index,
                currentFlippedIndex: this.currentFlippedIndex,
                boardLength: this.board.length
            });
        }
    }

    // 修改文件上传处理方法
    async handleFileUpload(index, input) {
        const file = input.files[0];
        if (!file) return;

        try {
            if (file.size > 20 * 1024 * 1024) {
                throw new Error('文件大小不能超过 20MB');
            }

            console.log('开始处理文件:', file.type);
            const cell = this.board[index];

            // 创建提交对象
            const submission = {
                question: cell.question,
                fileType: file.type,
                preview: null
            };

            // 处理文件上传
            if (file.type.startsWith('text/')) {
                const text = await file.text();
                submission.preview = text;
                
                // 缓存提交
                await API.cacheSubmission(this.currentUser.teamName, index, submission);
                
                cell.preview = text;
                cell.fileType = 'text/plain';
                cell.completed = true;
                cell.timestamp = new Date().toISOString();

                this.currentFlippedIndex = null;
                this.renderBoard();
                await this.saveProgress();
                await this.checkAndHandleBingo();
            } else {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    submission.preview = e.target.result;
                    
                    // 缓存提交
                    await API.cacheSubmission(this.currentUser.teamName, index, submission);
                    
                    cell.preview = e.target.result;
                    cell.fileType = file.type;
                    cell.completed = true;
                    cell.timestamp = new Date().toISOString();

                    this.currentFlippedIndex = null;
                    this.renderBoard();
                    await this.saveProgress();
                    await this.checkAndHandleBingo();
                };
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error('文件上传失败:', error);
            alert('上传失败，请重试');
        }
    }

    // 添加数据更新通知方法
    async notifyDataUpdate() {
        try {
            // 创建一个更新标记
            const updateMark = {
                teamName: this.currentUser.teamName,
                timestamp: Date.now()
            };

            // 保存到 localStorage
            const updates = JSON.parse(localStorage.getItem('gameUpdates') || '[]');
            updates.push(updateMark);
            localStorage.setItem('gameUpdates', JSON.stringify(updates));

            // 触发自定义事件
            const event = new CustomEvent('gameDataUpdate', { detail: updateMark });
            window.dispatchEvent(event);

            // 设置更新标志
            localStorage.setItem('needsUpdate', 'true');
            
            console.log('已通知数据更新:', updateMark);
        } catch (error) {
            console.error('通知数据更新失败:', error);
        }
    }

    // 添加新方法：检查和处理 Bingo
    async checkAndHandleBingo() {
        console.log('检查 Bingo 状态');
        if (this.checkBingo()) {
            console.log('Bingo 成功！');
            const currentTime = Date.now();
            const finalTotalTime = this.totalPlayTime + (currentTime - this.lastSaveTime);
            const duration = Math.floor(finalTotalTime / 1000);

            try {
                await API.updateScore(this.currentUser.teamName, duration);
                await API.clearGameProgress(this.currentUser.teamName);
                clearInterval(this.timeUpdateInterval);
                document.getElementById('bingoModal').classList.remove('hidden');
                console.log('Bingo 处理完成');
            } catch (error) {
                console.error('Bingo 处理失败:', error);
            }
        } else {
            console.log('未达成 Bingo');
        }
    }

    // 修改检查 Bingo 的方法，添加调试日志
    checkBingo() {
        console.log('开始检查 Bingo 条件');
        
        // 检查行
        for (let i = 0; i < this.size; i++) {
            if (this.checkLine(i * this.size, 1, this.size)) {
                console.log(`找到完整的行: ${i}`);
                return true;
            }
        }

        // 检查列
        for (let i = 0; i < this.size; i++) {
            if (this.checkLine(i, this.size, this.size)) {
                console.log(`找到完整的列: ${i}`);
                return true;
            }
        }

        // 检查主对角线
        if (this.checkLine(0, this.size + 1, this.size)) {
            console.log('找到完整的主对角线');
            return true;
        }

        // 检查副对角线
        if (this.checkLine(this.size - 1, this.size - 1, this.size)) {
            console.log('找到完整的副对角线');
            return true;
        }

        console.log('未找到完整的线');
        return false;
    }

    // 修改检查线的方法，添加调试日志
    checkLine(start, step, count) {
        console.log(`检查线: 起点=${start}, 步长=${step}, 数量=${count}`);
        for (let i = 0; i < count; i++) {
            const index = start + i * step;
            const cell = this.board[index];
            console.log(`检查格子 ${index}: completed=${cell?.completed}`);
            if (!cell || !cell.completed) {
                return false;
            }
        }
        return true;
    }

    // 设置自动保存
    setupAutoSave() {
        // 每30秒自动保存一次
        setInterval(() => this.saveProgress(), 30000);
    }

    // 修改 renderPreview 方法
    renderPreview(cell, index) {
        if (!cell.preview) return '';

        if (cell.fileType.startsWith('image/')) {
            return `
                <div class="w-full h-full flex items-center justify-center">
                    <img src="${cell.preview}" 
                        class="max-w-full max-h-[100px] object-contain rounded cursor-pointer" 
                        alt="预览"
                        onclick="game.showPreview(${index})"
                    >
                </div>
            `;
        } else if (cell.fileType.startsWith('video/')) {
            return `
                <div class="w-full h-full flex items-center justify-center">
                    <div class="relative cursor-pointer" onclick="game.showPreview(${index})">
                        <video class="max-w-full max-h-[100px] rounded">
                            <source src="${cell.preview}" type="${cell.fileType}">
                        </video>
                        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20">
                            <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                </div>
            `;
        } else if (cell.fileType.startsWith('text/')) {
            return `
                <div class="w-full h-full overflow-auto p-2 text-sm">
                    ${cell.preview}
                </div>
            `;
        }
        return `<p class="text-center">${cell.preview}</p>`;
    }

    // 修改 showPreview 方法
    showPreview(index) {
        const cell = this.board[index];
        if (!cell.preview) return;

        // 创建预览弹窗
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        modal.onclick = () => modal.remove();

        const content = document.createElement('div');
        content.className = 'max-w-4xl max-h-[90vh] p-4';
        content.onclick = (e) => e.stopPropagation();

        if (cell.fileType.startsWith('image/')) {
            content.innerHTML = `
                <img src="${cell.preview}" class="max-w-full max-h-[80vh] object-contain" alt="预览">
            `;
        } else if (cell.fileType.startsWith('video/')) {
            content.innerHTML = `
                <div class="flex flex-col items-center gap-4">
                    <video class="max-w-full max-h-[80vh]" controls autoplay>
                        <source src="${cell.preview}" type="${cell.fileType}">
                    </video>
                    <a href="${cell.preview}" 
                       download="video${index}.${cell.fileType.split('/')[1]}"
                       class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                       onclick="event.stopPropagation()"
                    >
                        下载视��
                    </a>
                </div>
            `;
        }

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // 添加处理文字输入的方法
    async handleTextInput(index, textarea) {
        const text = textarea.value.trim();
        if (!text) return;

        try {
            console.log('处理文字输入:', text);

            this.board[index] = {
                ...this.board[index],
                completed: true,
                preview: text,
                fileType: 'text/plain',
                question: this.board[index].question
            };

            this.currentFlippedIndex = null;
            this.renderBoard();
            await this.saveProgress();

            if (this.checkBingo()) {
                const currentTime = Date.now();
                const finalTotalTime = this.totalPlayTime + (currentTime - this.lastSaveTime);
                const duration = Math.floor(finalTotalTime / 1000);
                await API.updateScore(this.currentUser.teamName, duration);
                await API.clearGameProgress(this.currentUser.teamName);
                clearInterval(this.timeUpdateInterval);
                document.getElementById('bingoModal').classList.remove('hidden');
            }
        } catch (error) {
            console.error('文字处理失败:', error);
            alert(error.message || '处理失败，请重试');
        }
    }
}

// 初始化游戏
const game = new BingoGame(); 