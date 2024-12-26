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
                id: q.id,  // 添加题目ID
                question: q.question,
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
        if (teamInfo && this.currentUser) {
            teamInfo.textContent = `Team: ${this.currentUser.team_name}`;
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
            const cellElement = document.createElement('div');
            cellElement.className = `bingo-cell ${cell.completed ? 'completed' : ''} ${cell.flipped ? 'flipped' : ''}`;
            
            // 创建正面
            const front = document.createElement('div');
            front.className = 'cell-front';
            front.innerHTML = `
                <div class="number">${index + 1}</div>
                <div class="question">${cell.question}</div>
            `;
            
            // 创建背面
            const back = document.createElement('div');
            back.className = 'cell-back';
            
            // 添加题目内容
            const questionContent = document.createElement('div');
            questionContent.className = 'question-content';
            questionContent.innerHTML = `
                <div class="text-lg font-medium mb-2">Question ${index + 1}</div>
                <div class="text-gray-700">${cell.question}</div>
            `;
            back.appendChild(questionContent);

            // 如果已完成，添加提交内容预览
            if (cell.completed && cell.submission) {
                const submission = cell.submission;
                const preview = document.createElement('div');
                preview.className = 'mt-4 space-y-2';
                
                // 添加文字说明预览
                if (submission.description) {
                    const description = document.createElement('div');
                    description.className = 'text-sm text-gray-600';
                    description.textContent = submission.description;
                    preview.appendChild(description);
                }

                // 添加文件预览
                if (submission.fileUrl) {
                    const fileInfo = document.createElement('div');
                    fileInfo.className = 'text-sm text-indigo-600 cursor-pointer hover:text-indigo-500';
                    fileInfo.innerHTML = `
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View Submission</span>
                        </div>
                    `;
                    fileInfo.onclick = (e) => {
                        e.stopPropagation();
                        this.viewSubmission(index);
                    };
                    preview.appendChild(fileInfo);
                }

                back.appendChild(preview);

                // 如果游戏未完成，添加编辑按钮
                if (!this.isBingo) {
                    const editButton = document.createElement('button');
                    editButton.className = 'mt-4 text-sm text-blue-600 hover:text-blue-700';
                    editButton.textContent = 'Edit Submission';
                    editButton.onclick = (e) => {
                        e.stopPropagation();
                        this.showTaskModal(index, true);
                    };
                    back.appendChild(editButton);
                }
            }

            // 添加正反面到格子
            cellElement.appendChild(front);
            cellElement.appendChild(back);

            // 添加点击事件
            if (!this.isBingo) {
                cellElement.onclick = () => this.handleCellClick(index);
            }

            // 添加到游戏板
            gameBoard.appendChild(cellElement);
        });

        console.log('界面更新完成，当前游戏板状态:', this.board);
    }

    async handleCellClick(index) {
        console.log('格子点击:', index, '当前格子状态:', this.board[index]);
        
        // 如果游戏已完成，不允许任何修改
        if (this.isBingo) {
            return;
        }

        if (!this.board[index]) return;

        // 如果已完成但游戏未结束，允许修改
        if (this.board[index].completed) {
            this.showTaskModal(index, true); // 传入 true 表示是修改模式
            return;
        }

        // 如果还没翻开，翻开并显示提交对话框
        if (!this.board[index].flipped) {
            this.board[index].flipped = true;
            await this.saveProgress();  // 保存翻开状态
            this.updateUI();
            setTimeout(() => this.showTaskModal(index), 100);
            return;
        }

        // 如果已经翻开但未完成，显示提交对话框
        this.showTaskModal(index);
    }

    showTaskModal(index, isEdit = false) {
        console.log('显示任务提交对话框', { index, isEdit });
        const modal = document.getElementById('taskModal');
        const question = document.getElementById('taskQuestion');
        const form = document.getElementById('taskForm');
        const description = document.getElementById('taskDescription');
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        
        if (!modal || !question || !form) {
            console.error('找不到必要的DOM元素');
            return;
        }

        // 设置当前任务索引
        this.currentTaskIndex = index;

        // 显示题目
        question.textContent = this.board[index].question;

        // 如果是编辑模式，填充已有内容
        if (isEdit && this.board[index].submission) {
            const submission = this.board[index].submission;
            description.value = submission.description || '';
            
            // 清除文件输入
            const fileInput = document.getElementById('taskFile');
            fileInput.value = '';
            
            // 如果有已提交的文件，显示文件名
            if (submission.filePath) {
                filePreview.classList.remove('hidden');
                fileName.textContent = submission.fileName || '已上传文件';
            } else {
                filePreview.classList.add('hidden');
            }
        } else {
            // 新提交时清空表单
            form.reset();
            filePreview.classList.add('hidden');
        }

        // 显示对话框
        modal.classList.remove('hidden');

        // 绑定提交事件
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.handleTaskSubmit();
        };
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.add('hidden');
            // 重置表单
            const form = document.getElementById('taskForm');
            if (form) {
                form.reset();
            }
            // 隐藏文件预览
            const filePreview = document.getElementById('filePreview');
            if (filePreview) {
                filePreview.classList.add('hidden');
            }
        }
    }

    async handleTaskSubmit() {
        try {
            const description = document.getElementById('taskDescription')?.value.trim();
            const fileInput = document.getElementById('taskFile');
            const file = fileInput?.files[0];

            // 检查是否至少有一项内容
            if (!description && !file) {
                alert('Please provide either a description or upload a file');
                return;
            }

            // 准备提交数据
            const submission = {
                timestamp: Date.now(),
                description: description || null
            };

            // 如果有文件，处理文件上传
            if (file) {
                try {
                    // 生成唯一的文件名
                    const fileExt = file.name.split('.').pop();
                    const uniqueFileName = `${this.currentUser.team_name}_${Date.now()}.${fileExt}`;

                    // 上传文件
                    const fileUrl = await window.API.uploadFile(file, uniqueFileName);
                    submission.fileUrl = fileUrl;
                    submission.fileName = file.name;
                    submission.fileType = file.type;

                    console.log('File uploaded successfully:', {
                        fileName: file.name,
                        fileUrl: fileUrl
                    });
                } catch (error) {
                    console.error('File upload failed:', error);
                    throw new Error('Failed to upload file');
                }
            }

            // 更新格子状态
            if (this.currentTaskIndex !== undefined && this.board[this.currentTaskIndex]) {
                this.board[this.currentTaskIndex].completed = true;
                this.board[this.currentTaskIndex].submission = submission;

                // 保存进度
                await this.saveProgress();
                
                // 更新界面
                this.updateUI();

                // 检查是否完成 Bingo
                if (this.checkBingo()) {
                    this.isBingo = true;
                    const totalTime = Date.now() - this.startTime + this.totalPlayTime;
                    await this.handleGameComplete(totalTime);
                }

                // 关闭对话框
                this.closeTaskModal();
            }
        } catch (error) {
            console.error('提交任务失败:', error);
            alert('Failed to submit: ' + (error.message || 'Please try again'));
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
            const cell = this.board[start + i * step];
            if (!cell?.completed) return false;
        }
        return true;
    }

    // 添加游戏完成处理方法
    async handleGameComplete(totalTime) {
        try {
            console.log('Game completed! Total time:', totalTime);
            
            // 保存分数
            await window.API.updateScore(this.currentUser.team_name, totalTime);
            
            // 显示完成对话框
            const bingoModal = document.getElementById('bingoModal');
            if (bingoModal) {
                const timeDisplay = document.getElementById('completionTime');
                if (timeDisplay) {
                    const minutes = Math.floor(totalTime / 60000);
                    const seconds = Math.floor((totalTime % 60000) / 1000);
                    timeDisplay.textContent = `${minutes}m ${seconds}s`;
                }
                bingoModal.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Failed to handle game completion:', error);
            alert('Failed to save game record, please refresh and try again');
        }
    }

    // 添加查看提交文件的方法
    async viewSubmission(index) {
        const cell = this.board[index];
        if (!cell?.submission) {
            console.log('No submission found');
            return;
        }

        try {
            if (cell.submission.fileUrl) {
                console.log('Opening file URL:', cell.submission.fileUrl);
                window.open(cell.submission.fileUrl, '_blank');
            } else {
                console.log('No file URL found in submission');
                alert('No file available for viewing');
            }
        } catch (error) {
            console.error('Failed to view file:', error);
            alert('Failed to retrieve file, please try again');
        }
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                resolve(base64String);
            };
            reader.onerror = (event) => {
                reject(event);
            };
            reader.readAsDataURL(file);
        });
    }
}

// 初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化游戏');
    window.game = new BingoGame();
}); 