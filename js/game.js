class BingoGame {
    constructor() {
        // 从 localStorage 获取用户信息
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) {
            console.log('未找到用户信息，重定向到登录页面');
            window.location.href = '../index.html';
            return;
        }

        try {
            this.currentUser = JSON.parse(userStr);
            console.log('当前用户信息:', this.currentUser);
        } catch (error) {
            console.error('解析用户数据失败:', error);
            window.location.href = '../index.html';
            return;
        }

        this.board = [];
        this.size = 3; // 默认大小
        this.startTime = Date.now();
        this.totalPlayTime = 0;
        this.lastSaveTime = Date.now();
        this.isBingo = false;

        // 等待 API 准备好再初始化
        if (window.API) {
            console.log('API 已就绪，初始化游戏...');
            this.initGame();
        } else {
            console.log('等待 API 准备...');
            window.addEventListener('APIReady', () => {
                console.log('API 就绪，初始化游戏...');
                this.initGame();
            });
        }
    }

    async initGame() {
        try {
            // 获取游戏设置
            const settings = await window.API.getGameSettings();
            this.size = settings.gridSize;
            console.log('游戏设置:', settings);

            // 检查是否已完成
            const isCompleted = await window.API.checkGameCompletion(this.currentUser.team_name);
            if (isCompleted) {
                console.log('游戏已完成');
                this.isBingo = true;
                const bingoModal = document.getElementById('bingoModal');
                if (bingoModal) {
                    bingoModal.classList.remove('hidden');
                }
                return;
            }

            // 尝试恢复进度
            const savedProgress = await window.API.getGameProgress(this.currentUser.team_name);
            console.log('保存的进度:', savedProgress);

            if (savedProgress) {
                this.board = savedProgress.board;
                this.startTime = savedProgress.startTime;
                this.totalPlayTime = savedProgress.totalPlayTime || 0;
                this.lastSaveTime = savedProgress.lastSaveTime;
                console.log('已恢复保存的进度');
            } else {
                console.log('没有找到保存的进度，创建新游戏');
                await this.createNewGame();
            }

            // 更新界面
            this.updateUI();
            this.setupAutoSave();
        } catch (error) {
            console.error('初始化游戏失败:', error);
            alert('初始化游戏失败，请刷新页面重试');
        }
    }

    async createNewGame() {
        try {
            // 获取随机题目
            const questions = await window.API.getRandomQuestions(this.size * this.size);
            console.log('获取到的随机题目:', questions);
            
            if (!questions || questions.length < this.size * this.size) {
                throw new Error('获取题目失败或题目数量不足');
            }
            
            // 创建新的游戏板
            this.board = questions.map(q => ({
                question: q.question || '题目加载失败',
                flipped: false
            }));
            
            console.log('创建的新游戏板:', this.board);
            
            // 重置时间
            this.startTime = Date.now();
            this.totalPlayTime = 0;
            this.lastSaveTime = Date.now();
            
            // 保存初始进度
            await this.saveProgress();
        } catch (error) {
            console.error('创建新游戏失败:', error);
            throw error;
        }
    }

    updateUI() {
        console.log('开始更新界面');
        // 更新团队信息
        const teamInfo = document.getElementById('teamInfo');
        if (teamInfo) {
            teamInfo.textContent = `团队：${this.currentUser.team_name}`;
        }

        // 更新游戏板
        const gameBoard = document.getElementById('gameBoard');
        if (!gameBoard) {
            console.error('找不到游戏板元素');
            return;
        }

        // 清空现有内容
        gameBoard.innerHTML = '';

        // 设置游戏板样式
        gameBoard.style.display = 'grid';
        gameBoard.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        gameBoard.style.gap = '1rem';
        gameBoard.style.padding = '1rem';

        // 渲染每个格子
        this.board.forEach((cell, index) => {
            const cellDiv = document.createElement('div');
            
            // 添加基础样式
            cellDiv.className = 'p-4 rounded shadow cursor-pointer transition-all duration-200 min-h-[120px] flex items-center justify-center text-center';
            
            // 根据状态添加额外样式
            if (cell.flipped) {
                cellDiv.classList.add('bg-indigo-100', 'text-indigo-900');
                cellDiv.textContent = cell.question;
            } else {
                cellDiv.classList.add('bg-white', 'hover:bg-gray-50');
                cellDiv.textContent = '点击查看题目';
            }

            // 添加点击事件
            cellDiv.onclick = () => {
                if (!cell.flipped && !this.isBingo) {
                    this.handleCellClick(index);
                }
            };

            gameBoard.appendChild(cellDiv);
        });

        console.log('界面更新完成，当前游戏板状态:', this.board);
    }

    async handleCellClick(index) {
        console.log('格子点击:', index, '当前格子状态:', this.board[index]);
        if (this.isBingo || this.board[index].flipped) {
            return;
        }

        try {
            // 翻转格子
            this.board[index].flipped = true;
            console.log('格子已翻转，新状态:', this.board[index]);

            // 更新界面
            this.updateUI();

            // 检查是否完成 Bingo
            if (this.checkBingo()) {
                this.isBingo = true;
                const totalTime = Date.now() - this.startTime + this.totalPlayTime;
                await this.handleGameComplete(totalTime);
            } else {
                // 保存进度
                await this.saveProgress();
            }
        } catch (error) {
            console.error('处理格子点击失败:', error);
        }
    }

    async saveProgress() {
        if (!this.currentUser) return;

        const progressData = {
            board: this.board,
            startTime: this.startTime,
            totalPlayTime: this.totalPlayTime,
            lastSaveTime: Date.now()
        };

        console.log('正在保存游戏进度:', {
            teamName: this.currentUser.team_name,
            progressData
        });

        try {
            await window.API.saveGameProgress(this.currentUser.team_name, progressData);
            this.lastSaveTime = Date.now();
            console.log('游戏进度已保存');
        } catch (error) {
            console.error('保存进度失败:', error);
        }
    }

    setupAutoSave() {
        // 每60秒自动保存一次
        setInterval(() => {
            if (!this.isBingo) {
                this.saveProgress();
            }
        }, 60000);
    }

    // 添加检查 Bingo 的方法
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

    // 添加检查线的方法
    checkLine(start, step, count) {
        for (let i = 0; i < count; i++) {
            if (!this.board[start + i * step]?.flipped) return false;
        }
        return true;
    }

    // 添加游戏完成处理方法
    async handleGameComplete(totalTime) {
        try {
            console.log('游戏完成！总用时:', totalTime);
            
            // 保存分数
            await window.API.updateScore(this.currentUser.team_name, totalTime);
            
            // 显示完成对话框
            const bingoModal = document.getElementById('bingoModal');
            if (bingoModal) {
                const timeDisplay = document.getElementById('completionTime');
                if (timeDisplay) {
                    const minutes = Math.floor(totalTime / 60000);
                    const seconds = Math.floor((totalTime % 60000) / 1000);
                    timeDisplay.textContent = `${minutes}分${seconds}秒`;
                }
                bingoModal.classList.remove('hidden');
            }
        } catch (error) {
            console.error('处理游戏完成失败:', error);
            alert('保存游戏记录失败，请刷新页面重试');
        }
    }
}

// 初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化游戏');
    window.game = new BingoGame();
}); 