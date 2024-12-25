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

        // 等待 API 准备好再初始化
        if (window.API) {
            this.initGame();
        } else {
            window.addEventListener('APIReady', () => this.initGame());
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
            if (!this.currentUser) {
                window.location.href = '../index.html';
                return;
            }

            // 首先检查是否已经完成 Bingo
            const isCompleted = await window.API.checkGameCompletion(this.currentUser.team_name);
            if (isCompleted) {
                this.isBingo = true;
            }

            // 获取游戏设置
            const settings = await window.API.getGameSettings();
            this.size = settings.gridSize;

            // 尝试恢复进度
            const savedProgress = await window.API.getGameProgress(this.currentUser.team_name);
            if (savedProgress) {
                this.board = savedProgress.board;
                this.startTime = savedProgress.startTime;
                this.totalPlayTime = savedProgress.totalPlayTime || 0;
                this.lastSaveTime = savedProgress.lastSaveTime;
            } else {
                // 如果没有保存的进度，创建新游戏
                await this.createNewGame();
            }

            this.renderBoard();
            this.setupAutoSave();
        } catch (error) {
            console.error('初始化游戏失败:', error);
        }
    }

    // ... 其他方法保持不变
} 