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
        this.size = 5;
        this.startTime = Date.now();
        this.totalPlayTime = 0;
        this.lastSaveTime = Date.now();
        this.currentFlippedIndex = null;
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

    // 添加渲染游戏板方法
    renderBoard() {
        console.log('开始渲染游戏板');
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
            cellDiv.className = `game-cell ${cell.flipped ? 'flipped' : ''} 
                p-4 bg-white rounded shadow cursor-pointer 
                hover:bg-gray-50 transition-colors duration-200`;
            cellDiv.textContent = cell.question;
            cellDiv.dataset.index = index;

            // 添加点击事件
            cellDiv.addEventListener('click', () => this.handleCellClick(index));

            gameBoard.appendChild(cellDiv);
        });

        console.log('游戏板渲染完成');
    }

    // 添加处理格子点击的方法
    async handleCellClick(index) {
        console.log('格子点击:', index);
        if (this.isBingo || this.board[index].flipped) {
            return;
        }

        // 翻转格子
        this.board[index].flipped = true;
        this.renderBoard();

        // 检查是否完成 Bingo
        if (this.checkBingo()) {
            this.isBingo = true;
            const totalTime = Date.now() - this.startTime + this.totalPlayTime;
            await this.handleGameComplete(totalTime);
        } else {
            // 保存进度
            await this.saveProgress();
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

    async initGame() {
        try {
            // 再次检查用户信息
            if (!this.currentUser || !this.currentUser.team_name) {
                console.error('用户信息无效:', this.currentUser);
                window.location.href = '../index.html';
                return;
            }

            console.log('开始初始化游戏，团队名称:', this.currentUser.team_name);

            // 更新界面显示
            const teamInfoElement = document.getElementById('teamInfo');
            if (teamInfoElement) {
                teamInfoElement.textContent = `团队：${this.currentUser.team_name}`;
            }

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

            this.renderBoard();
            this.setupAutoSave();
        } catch (error) {
            console.error('初始化游戏失败:', error);
            alert('初始化游戏失败，请刷新页面重试');
        }
    }

    // 添加创建新游戏的方法
    async createNewGame() {
        try {
            // 获取随机题目
            const questions = await window.API.getRandomQuestions(this.size * this.size);
            
            // 创建新的游戏板
            this.board = questions.map(q => ({
                question: q.question,
                flipped: false
            }));
            
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

    // ... 其他方法保持不变
}

// 初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化游戏');
    window.game = new BingoGame();
}); 