class BingoGame {
    constructor() {
        this.board = [];
        this.size = 5;
        this.startTime = Date.now();
        this.totalPlayTime = 0;
        this.lastSaveTime = Date.now();
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.currentFlippedIndex = null;
        this.isBingo = false;

        // 直接初始化，因为在创建实例前已经确保 API 可用
        this.initGame();
        this.setupAutoSave();
    }

    async initGame() {
        try {
            if (!this.currentUser) {
                window.location.href = '../index.html';
                return;
            }

            // 首先检查是否已经完成 Bingo
            const isCompleted = await API.checkGameCompletion(this.currentUser.teamName);
            if (isCompleted) {
                this.isBingo = true; // 设置 Bingo 状态为 true
            }

            // 获取游戏设置
            const settings = await API.getGameSettings();
            this.size = settings.gridSize;

            // 尝试恢复进度
            const savedProgress = await API.getGameProgress(this.currentUser.teamName);
            if (savedProgress) {
                this.board = savedProgress.board;
                this.startTime = savedProgress.startTime;
                this.totalPlayTime = savedProgress.totalPlayTime || 0;
                this.lastSaveTime = savedProgress.lastSaveTime;
                
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

                // 如果已经完成 Bingo，显示所有格子
                if (this.isBingo) {
                    this.board = this.board.map(cell => ({
                        ...cell,
                        flipped: true // 显示所有格子的内容
                    }));
                    this.renderBoard();
                    return;
                }
                
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

                // 如果已经完成 Bingo，不恢复翻转状态
                if (!this.isBingo) {
                    this.currentFlippedIndex = null;
                    for (let i = 0; i < this.board.length; i++) {
                        if (this.board[i].flipped && !this.board[i].completed) {
                            this.currentFlippedIndex = i;
                            break;
                        }
                    }
                }
                
                // 计算离线时间并添加到总时间
                if (savedProgress.lastSaveTime && !this.isBingo) {
                    const offlineTime = Date.now() - savedProgress.lastSaveTime;
                    this.totalPlayTime += offlineTime;
                }
                
                this.renderBoard();
                if (!this.isBingo) {
                    this.updateTimeDisplay();
                }
            } else {
                // 如果已经完成 Bingo 但没有保存的进度（可能已经过期）
                if (this.isBingo) {
                    // 获取所有题目并创建新棋盘
                    const questions = await API.getQuestions();
                    this.board = this.shuffleQuestions(questions).map(cell => ({
                        ...cell,
                        flipped: true // 显示所有格子的内容
                    }));
                    this.renderBoard();
                    return;
                }
                
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

            // 只在未完成 Bingo 时启动时间更新
            if (!this.isBingo) {
                this.startTimeUpdate();
            }
        } catch (error) {
            console.error('初始化游戏失败:', error);
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
            .map(q => ({ ...q }))  // 深拷贝每个题目对象
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
        gameBoard.className = `grid grid-cols-${this.size} gap-4`;

        // 添加顶部导航栏
        const navBar = document.querySelector('.mb-6.flex');
        if (navBar) {
            // 检查是否已经存在返回按钮
            if (!navBar.querySelector('.home-button')) {
                const homeButton = document.createElement('a');
                homeButton.href = '../index.html';
                homeButton.className = 'home-button text-indigo-600 hover:text-indigo-500 ml-4';
                homeButton.textContent = '返回首页';
                
                // 将返回按钮添加到导航栏的右侧
                const rightSection = navBar.querySelector('div.flex');
                if (rightSection) {
                    rightSection.insertBefore(homeButton, rightSection.firstChild);
                }
            }
        }

        this.board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.className = `bingo-cell ${cell.completed ? 'completed' : ''} ${cell.flipped ? 'flipped' : ''}`;
            
            // 创建格子的内容
            if (cell.completed && !this.isBingo) {
                // 已完成但未 Bingo，允许修改
                cellElement.innerHTML = `
                    <div class="cell-front">
                        <span class="text-green-600">✓</span>
                    </div>
                    <div class="cell-back">
                        <div class="question-content">
                            <p class="text-sm mb-2">${cell.question}</p>
                            ${this.renderPreview(cell, index)}
                            <div class="mt-2 border-t pt-2">
                                <p class="text-xs text-gray-500 mb-2">重新提交：</p>
                                <div class="flex flex-col gap-2">
                                    <textarea class="w-full p-2 border rounded text-sm input-field" 
                                        placeholder="输入新的文字答案..."
                                        onclick="event.stopPropagation()"></textarea>
                                    <input type="file" class="file-input" 
                                        data-cell-index="${index}"
                                        accept="image/*,video/*"
                                        onclick="event.stopPropagation()">
                                    <button class="submit-text bg-blue-500 text-white px-2 py-1 rounded text-sm"
                                        onclick="event.stopPropagation()">
                                        重新提交
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // 绑定文件上传事件
                const fileInput = cellElement.querySelector('.file-input');
                if (fileInput) {
                    fileInput.addEventListener('change', (e) => {
                        e.stopPropagation();
                        // 使用 data-cell-index 来获取正确的索引
                        const cellIndex = parseInt(e.target.getAttribute('data-cell-index'));
                        this.currentFlippedIndex = cellIndex; // 设置当前翻转的格子索引
                        this.handleFileUpload(e, cell.id);
                    });
                }

                // 绑定文字提交事件
                const submitButton = cellElement.querySelector('.submit-text');
                const textarea = cellElement.querySelector('textarea');
                if (submitButton && textarea) {
                    submitButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleTextInput(index, textarea);
                    });
                    
                    textarea.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                }
            } else if (cell.completed && this.isBingo) {
                // Bingo 后的已完成格子，只显示内容不允许修改
                cellElement.innerHTML = `
                    <div class="cell-front">
                        <span class="text-green-600">✓</span>
                    </div>
                    <div class="cell-back">
                        <div class="question-content">
                            <p class="text-sm mb-2">${cell.question}</p>
                            ${this.renderPreview(cell, index)}
                        </div>
                    </div>
                `;
            } else if (cell.flipped && !this.isBingo) {
                // 未完成的翻转格子，显示输入界面
                cellElement.innerHTML = `
                    <div class="cell-front"></div>
                    <div class="cell-back">
                        <div class="question-content">
                            <p class="text-sm mb-2">${cell.question}</p>
                            <div class="flex flex-col gap-2">
                                <textarea class="w-full p-2 border rounded text-sm input-field" 
                                    placeholder="输入文字答案..."
                                    onclick="event.stopPropagation()"></textarea>
                                <input type="file" class="file-input" 
                                    accept="image/*,video/*"
                                    onclick="event.stopPropagation()">
                                <button class="submit-text bg-blue-500 text-white px-2 py-1 rounded text-sm"
                                    onclick="event.stopPropagation()">
                                    提交文字
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                // 绑定文件上传事件
                const fileInput = cellElement.querySelector('.file-input');
                if (fileInput) {
                    fileInput.addEventListener('change', (e) => {
                        e.stopPropagation();
                        this.handleFileUpload(e, cell.id);
                    });
                }

                // 绑定文字提交事件
                const submitButton = cellElement.querySelector('.submit-text');
                const textarea = cellElement.querySelector('textarea');
                if (submitButton && textarea) {
                    submitButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.handleTextInput(index, textarea);
                    });
                    
                    // 添加textarea的点击事件阻止冒泡
                    textarea.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                }
            } else {
                // 未翻转的格子 - 移除序号显示
                cellElement.innerHTML = `
                    <div class="cell-front">
                        <span class="text-sm"></span>
                    </div>
                    <div class="cell-back">
                        <div class="question-content">
                            <p class="text-sm">${cell.question}</p>
                        </div>
                    </div>
                `;
            }

            // 只在非 Bingo 状态下添加点击事件
            if (!this.isBingo) {
                cellElement.addEventListener('click', () => this.handleCellClick(index));
            }

            gameBoard.appendChild(cellElement);
        });

        // 更新进度显示
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
        // 如果已经 Bingo，阻止任何修改
        if (this.isBingo) return;

        // 如果有其他格子已经翻开，先将其关闭（除非是已完成的格子）
        if (this.currentFlippedIndex !== null && this.currentFlippedIndex !== index) {
            // 只关闭未完成的格子
            if (!this.board[this.currentFlippedIndex].completed) {
                this.board[this.currentFlippedIndex].flipped = false;
            }
        }

        this.currentFlippedIndex = index;
        
        // 更新当前点击的格子状态
        this.board[index].flipped = true;
        
        // 重新渲染棋盘
        this.renderBoard();
    }

    // 修改文件上传处理方法
    async handleFileUpload(event, questionId) {
        if (this.isBingo) {
            event.preventDefault();
            return;
        }

        try {
            const file = event.target.files[0];
            if (!file) {
                console.error('没有选择文件');
                return;
            }

            // 修改文件大小限制为 5MB
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
            if (file.size > MAX_FILE_SIZE) {
                alert('文件大小超过限制（最大5MB），请选择更小的文件');
                event.target.value = '';
                return;
            }

            console.log('开始处理文件:', file.type);

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const fileContent = e.target.result;
                    // 获取正确的格子索引
                    let cellIndex;
                    if (this.currentFlippedIndex !== null) {
                        cellIndex = this.currentFlippedIndex;
                    } else {
                        // 从事件目标向上查找到格子元素，获取其索引
                        const cellElement = event.target.closest('.bingo-cell');
                        const allCells = Array.from(document.querySelectorAll('.bingo-cell'));
                        cellIndex = allCells.indexOf(cellElement);
                    }
                    
                    if (cellIndex === -1) {
                        throw new Error('找不到对应的格子');
                    }

                    // 更新格子状态
                    this.board[cellIndex] = {
                        ...this.board[cellIndex],
                        completed: true,
                        preview: fileContent,
                        fileType: file.type,
                        timestamp: new Date().toISOString()
                    };

                    // 缓存提交
                    await API.cacheSubmission(
                        this.currentUser.teamName,
                        cellIndex,
                        {
                            question: this.board[cellIndex].question,
                            preview: fileContent,
                            fileType: file.type
                        }
                    );

                    // 清空文件输入
                    event.target.value = '';

                    // 重置当前翻转的格子
                    this.currentFlippedIndex = null;
                    
                    // 保存进度并重新渲染
                    await this.saveProgress();
                    this.renderBoard();

                    // 检查是否完成 Bingo
                    if (this.checkBingo()) {
                        const currentTime = Date.now();
                        const finalTotalTime = this.totalPlayTime + (currentTime - this.lastSaveTime);
                        const duration = Math.floor(finalTotalTime / 1000);
                        
                        this.isBingo = true;
                        await API.updateScore(this.currentUser.teamName, duration);
                        await API.clearGameProgress(this.currentUser.teamName);
                        clearInterval(this.timeUpdateInterval);
                        
                        this.showBingoDialog(duration);
                    }
                } catch (error) {
                    console.error('处理文件内容失败:', error);
                    alert('处理文件失败，请重试');
                }
            };

            if (file.type.startsWith('text/')) {
                reader.readAsText(file);
            } else {
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
                <div class="flex flex-col items-center">
                    <img src="${cell.preview}" 
                        class="max-w-full max-h-[200px] object-contain rounded cursor-pointer" 
                        alt="预览"
                        onclick="game.showPreview(${index})"
                    >
                    <span class="text-xs text-gray-500 mt-1">点击查看大图</span>
                </div>
            `;
        } else if (cell.fileType.startsWith('video/')) {
            return `
                <div class="flex flex-col items-center">
                    <div class="relative cursor-pointer" onclick="game.showPreview(${index})">
                        <video class="max-w-full max-h-[200px] rounded">
                            <source src="${cell.preview}" type="${cell.fileType}">
                        </video>
                        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-20">
                            <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                            </svg>
                        </div>
                    </div>
                    <span class="text-xs text-gray-500 mt-1">点击播放视频</span>
                </div>
            `;
        } else if (cell.fileType.startsWith('text/')) {
            return `
                <div class="bg-gray-50 p-3 rounded">
                    <p class="text-sm text-gray-700">${cell.preview}</p>
                </div>
            `;
        }
        return '<span class="text-gray-500">未知类型的内容</span>';
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
                        下载视频
                    </a>
                </div>
            `;
        }

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // 修改 handleTextInput 方法
    async handleTextInput(index, textarea) {
        if (this.isBingo) return; // 如果已经 Bingo，阻止提交
        
        const text = textarea.value.trim();
        if (!text) return;

        try {
            console.log('处理文字输入:', text);

            // 更新当前格子的状态
            this.board[index] = {
                ...this.board[index],
                completed: true,
                preview: text,
                fileType: 'text/plain',
                timestamp: new Date().toISOString()
            };

            // 缓存提交
            await API.cacheSubmission(
                this.currentUser.teamName,
                index,
                {
                    question: this.board[index].question,
                    preview: text,
                    fileType: 'text/plain'
                }
            );

            // 清空输入框
            textarea.value = '';

            // 重置当前翻转的格子
            this.currentFlippedIndex = null;
            
            // 保存进度并重新渲染
            await this.saveProgress();
            this.renderBoard();

            // 检查是否完成 Bingo
            if (this.checkBingo()) {
                const currentTime = Date.now();
                const finalTotalTime = this.totalPlayTime + (currentTime - this.lastSaveTime);
                const duration = Math.floor(finalTotalTime / 1000);
                
                this.isBingo = true;
                await API.updateScore(this.currentUser.teamName, duration);
                await API.clearGameProgress(this.currentUser.teamName);
                clearInterval(this.timeUpdateInterval);
                
                this.showBingoDialog(duration);
            }
        } catch (error) {
            console.error('文字处理失败:', error);
            alert(error.message || '处理失败，请重试');
        }
    }

    // 添加新方法：显示 Bingo 提示对话框
    showBingoDialog(duration) {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-8 rounded-lg max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold text-center mb-4">恭喜！BINGO!</h2>
                <p class="text-center text-gray-600 mb-6">
                    完成用时：${minutes}分${seconds}秒
                </p>
                <div class="flex justify-center gap-4">
                    <button onclick="window.location.href='leaderboard.html'"
                        class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                        查看排行榜
                    </button>
                    <button onclick="document.querySelector('.fixed').remove()"
                        class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                        继续浏览
                    </button>
                </div>
                <p class="text-center text-sm text-gray-500 mt-4">
                    注意：您已无法修改已提交的内容
                </p>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// 初始化游戏
const game = new BingoGame(); 