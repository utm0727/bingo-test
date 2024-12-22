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
                this.startTime = savedProgress.startTime;
                this.totalPlayTime = savedProgress.totalPlayTime || 0;
                this.lastSaveTime = savedProgress.lastSaveTime;
                
                // 计算离线时间并添加到间
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
        if (this.currentUser) {
            const currentTime = Date.now();
            // 更新总游戏时间
            this.totalPlayTime += (currentTime - this.lastSaveTime);
            this.lastSaveTime = currentTime;

            try {
                await API.saveGameProgress(this.currentUser.teamName, {
                    board: this.board,
                    startTime: this.startTime,
                    totalPlayTime: this.totalPlayTime,
                    lastSaveTime: this.lastSaveTime
                });
            } catch (error) {
                console.error('Failed to save progress:', error);
            }
        }
    }

    shuffleQuestions(questions) {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, this.size * this.size).map(q => ({
            ...q,
            completed: false,
            flipped: false
        }));
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        // 动态设置列数
        gameBoard.style.gridTemplateColumns = `repeat(${this.size}, minmax(0, 1fr))`;

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
            if (cell.completed && cell.fileUrl) {
                const isImage = cell.fileUrl.startsWith('data:image');
                const isVideo = cell.fileUrl.startsWith('data:video');
                
                backSide.innerHTML = `
                    <div class="p-4">
                        <p class="text-sm mb-2">${cell.question}</p>
                        <div class="mt-2">
                            ${isImage ? 
                                `<img src="${cell.fileUrl}" alt="已上传" class="max-w-full h-auto">` :
                                isVideo ? 
                                `<video src="${cell.fileUrl}" controls class="max-w-full h-auto"></video>` :
                                `<p class="text-green-500">已上传: ${cell.fileName}</p>`
                            }
                        </div>
                    </div>
                `;
            } else {
                backSide.innerHTML = `
                    <div class="question-content h-full flex flex-col">
                        <p class="text-sm mb-4 flex-grow">${cell.question}</p>
                        ${!cell.completed ? `
                            <div class="mt-auto">
                                <input type="file" 
                                    class="w-full mb-2" 
                                    onchange="game.handleFileUpload(${index}, this)"
                                    accept="image/*,video/*"
                                >
                                <p class="text-xs text-gray-500">支持图片和视频文件</p>
                            </div>
                        ` : ''}
                    </div>
                `;
            }

            cellElement.appendChild(frontSide);
            cellElement.appendChild(backSide);

            if (cell.flipped) {
                cellElement.classList.add('flipped');
            }

            const wrapper = document.createElement('div');
            wrapper.className = 'aspect-square';
            wrapper.appendChild(cellElement);

            cellElement.onclick = () => this.handleCellClick(index);
            gameBoard.appendChild(wrapper);
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
        if (this.board[index].completed || this.isBingo) return;

        if (this.currentFlippedIndex !== null && 
            this.currentFlippedIndex !== index && 
            !this.board[this.currentFlippedIndex].completed) {
            alert('请先完成当前格子的任务');
            return;
        }

        if (this.currentFlippedIndex === index) {
            this.board[index].flipped = false;
            this.currentFlippedIndex = null;
        } else {
            this.board[index].flipped = true;
            this.currentFlippedIndex = index;
        }

        this.renderBoard();
        this.saveProgress();
    }

    async handleFileUpload(index, input) {
        const file = input.files[0];
        if (!file) return;

        try {
            // 检查文件大小（限制为5MB）
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('文件大小不能超过5MB');
            }

            // 检查文件类型
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                throw new Error('只支持图片和视频文件');
            }

            // 上传文件
            const result = await API.uploadFile(
                file,
                this.currentUser.teamName,
                this.board[index].id
            );

            // 更新格子状态
            this.board[index].completed = true;
            this.board[index].fileUrl = result.fileUrl;
            this.board[index].fileName = result.fileName;
            this.currentFlippedIndex = null;
            this.renderBoard();
            this.saveProgress();

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
            console.error('Failed to upload file:', error);
            alert(error.message || '上传失败，请重试');
        }
    }

    checkBingo() {
        // 检查行
        for (let i = 0; i < this.size; i++) {
            if (this.checkLine(i * this.size, 1, this.size)) return true;
        }

        // 检查列
        for (let i = 0; i < this.size; i++) {
            if (this.checkLine(i, this.size, this.size)) return true;
        }

        // 检查主对角线
        if (this.checkLine(0, this.size + 1, this.size)) return true;

        // 检查副对角线
        if (this.checkLine(this.size - 1, this.size - 1, this.size)) return true;

        return false;
    }

    checkLine(start, step, count) {
        for (let i = 0; i < count; i++) {
            if (!this.board[start + i * step].completed) return false;
        }
        return true;
    }

    // 设置自动保存
    setupAutoSave() {
        // 每30秒自动保存一次
        setInterval(() => this.saveProgress(), 30000);
    }
}

// 初始化游戏
const game = new BingoGame(); 