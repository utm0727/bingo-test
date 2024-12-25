class BingoGame {
    constructor() {
        // 从 localStorage 获取用户信息
        const currentUser = localStorage.getItem('currentUser');
        this.currentUser = currentUser ? JSON.parse(currentUser) : null;
        
        this.board = [];
        this.size = 5;
        this.startTime = Date.now();
        this.totalPlayTime = 0;
        this.lastSaveTime = Date.now();
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
            // 检查用户是否登录
            if (!this.currentUser || !this.currentUser.team_name) {
                console.log('用户未登录，重定向到登录页面');
                window.location.href = '../index.html';
                return;
            }

            // 更新界面显示
            document.getElementById('teamInfo').textContent = 
                `团队：${this.currentUser.team_name}`;

            // 首先检查是否已经完成 Bingo
            const isCompleted = await window.API.checkGameCompletion(this.currentUser.team_name);
            if (isCompleted) {
                this.isBingo = true;
                document.getElementById('bingoModal').classList.remove('hidden');
                return;
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