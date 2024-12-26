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
                
                // 获取完成时间
                const { data: leaderboardData } = await window.API.getTeamLeaderboard(this.currentUser.team_name);
                if (leaderboardData) {
                    const minutes = Math.floor(leaderboardData.completion_time / 60000);
                    const seconds = Math.floor((leaderboardData.completion_time % 60000) / 1000);
                    document.getElementById('completedTime').textContent = `${minutes}m ${seconds}s`;
                }

                // 显示完成状态视图
                const completionView = document.getElementById('completionView');
                if (completionView) {
                    completionView.classList.remove('hidden');
                }
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
            
            // 创建新的游戏板，初始状态下所有格子都是未翻开的
            this.board = questions.map(q => ({
                id: q.id,
                question: q.question,
                flipped: false,  // 初始状态为未翻开
                completed: false
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
        gameBoard.style.maxWidth = '800px';
        gameBoard.style.margin = '0 auto';

        // 渲染每个格子
        this.board.forEach((cell, index) => {
            const cellDiv = document.createElement('div');
            
            // 添加基础样式 - 使用固定尺寸的正方形
            cellDiv.className = 'w-full relative rounded shadow cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden';
            cellDiv.style.aspectRatio = '1';
            cellDiv.style.minHeight = '150px';
            
            if (cell.completed) {
                // 已完成的格子
                cellDiv.classList.add('bg-green-100', 'text-green-900', 'hover:bg-green-200', 'p-4');
                let content = `
                    <div class="text-sm mb-2">${cell.question}</div>
                    <div class="text-xs text-green-700 mb-2">Completed</div>`;
                
                if (cell.submission) {
                    content += `
                        <button onclick="window.game.showSubmissionDetails(${index})" 
                                class="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                            View Submission
                        </button>`;
                }
                
                cellDiv.innerHTML = content;
            } else if (cell.flipped && !this.isBingo) {
                // 已翻开但未完成的格子
                cellDiv.classList.add('bg-white', 'hover:bg-gray-50', 'border', 'border-gray-200', 'p-4');
                cellDiv.innerHTML = `
                    <div class="text-sm">${cell.question}</div>
                    <button onclick="window.game.showTaskModal(${index})" 
                            class="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        Submit Answer
                    </button>
                `;
            } else if (!this.isBingo) {
                // 未翻开的格子
                cellDiv.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600', 'transform', 'hover:scale-105', 'transition-transform');
                cellDiv.innerHTML = `
                    <div class="text-sm opacity-70">Click to reveal</div>
                `;
            } else {
                // 游戏已完成，显示所有题目
                cellDiv.classList.add('bg-gray-100', 'text-gray-700', 'p-4');
                cellDiv.innerHTML = `
                    <div class="text-sm">${cell.question}</div>
                `;
            }

            // 添加点击事件
            if (!cell.completed && !this.isBingo) {
                if (!cell.flipped) {
                    cellDiv.onclick = () => this.handleCellClick(index);
                }
            }

            gameBoard.appendChild(cellDiv);
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

        // 如果还没翻开，先关闭其他已翻开但未完成的格子
        if (!this.board[index].flipped) {
            // 找到所有已翻开但未完成的格子
            const flippedCells = this.board.filter((cell, i) => 
                cell.flipped && !cell.completed && i !== index
            );

            // 如果有其他已翻开的格子，先关闭它们
            if (flippedCells.length > 0) {
                this.board.forEach((cell, i) => {
                    if (cell.flipped && !cell.completed && i !== index) {
                        cell.flipped = false;
                    }
                });
            }

            // 翻开当前格子
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

        // 确保关闭任何已打开的 SweetAlert2 对话框
        Swal.close();

        const modal = document.getElementById('taskModal');
        const question = document.getElementById('taskQuestion');
        const form = document.getElementById('taskForm');
        const message = document.getElementById('taskMessage');
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

        // 如果编辑模式，填充已有内容
        if (isEdit && this.board[index].submission) {
            const submission = this.board[index].submission;
            message.value = submission.description || '';
            
            // 清除文件输入
            const fileInput = document.getElementById('taskFile');
            fileInput.value = '';
            
            // 如果有已提交的文件，显示文件名
            if (submission.fileUrl) {
                filePreview.classList.remove('hidden');
                fileName.textContent = submission.fileName || '已上传文件';
                
                // 添加当前文件预览
                const currentFileInfo = document.createElement('div');
                currentFileInfo.className = 'mt-2 text-sm text-gray-600';
                currentFileInfo.innerHTML = `
                    当前文件: <a href="${submission.fileUrl}" target="_blank" class="text-blue-500 hover:text-blue-600">
                        ${submission.fileName}
                    </a>
                `;
                filePreview.appendChild(currentFileInfo);
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
            // 清理表单
            const form = document.getElementById('taskForm');
            if (form) {
                form.reset();
            }
            const filePreview = document.getElementById('filePreview');
            if (filePreview) {
                filePreview.classList.add('hidden');
            }
        }
        this.currentTaskIndex = null;
    }

    async handleTaskSubmit() {
        try {
            // 检查当前任务索引是否有效
            if (this.currentTaskIndex === null || this.currentTaskIndex === undefined) {
                console.error('Invalid task index:', this.currentTaskIndex);
                alert('Submission failed: Invalid task index');
                return;
            }

            // 检查当前格子是否存在
            if (!this.board || !this.board[this.currentTaskIndex]) {
                console.error('Cannot find corresponding cell:', {
                    currentTaskIndex: this.currentTaskIndex,
                    boardLength: this.board?.length
                });
                alert('Submission failed: Cannot find corresponding cell');
                return;
            }

            const description = document.getElementById('taskMessage').value.trim();
            const fileInput = document.getElementById('taskFile');
            const file = fileInput.files[0];

            // 检查是否至少有一项内容（文字说明或文件）
            if (!description && !file) {
                alert('Please provide either a message or upload a file');
                return;
            }

            // 创建提交对象
            const submission = {
                timestamp: new Date().toISOString(),
                description: description || null
            };

            // 如果有文件，处理文件上传
            if (file) {
                try {
                    // 添加文件大小检查
                    if (file.size > 50 * 1024 * 1024) { // 50MB 限制
                        throw new Error('File size cannot exceed 50MB');
                    }

                    // 检查文件类型
                    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                        throw new Error('Only image or video files are supported');
                    }

                    console.log('Processing file upload:', {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size
                    });

                    // 从原始文件名中获取扩展名
                    const originalExt = file.name.split('.').pop().toLowerCase();
                    // 从MIME类型获取文件类型
                    const mimeExt = file.type.split('/')[1];
                    // 使用MIME类型的扩展名，如果没有则使用原始扩展名
                    const fileExt = mimeExt || originalExt;
                    
                    // 生成安全的文件名
                    const timestamp = Date.now();
                    const safeFileName = `${this.currentUser.team_name}_${timestamp}.${fileExt}`;

                    // If in edit mode and there's an old file, delete it first
                    const oldSubmission = this.board[this.currentTaskIndex].submission;
                    if (oldSubmission && oldSubmission.storagePath) {
                        try {
                            await window.API.deleteFile(oldSubmission.storagePath);
                            console.log('Old file deleted:', oldSubmission.storagePath);
                        } catch (error) {
                            console.error('Failed to delete old file:', error);
                        }
                    }

                    // 直接上传原始文件
                    const { fileUrl, storagePath } = await window.API.uploadFile(safeFileName, file);

                    // 更新提交对象
                    submission.fileUrl = fileUrl;
                    submission.fileName = file.name;
                    submission.storagePath = storagePath;
                    submission.fileType = file.type;
                    submission.originalName = file.name;  // 保存原始文件名

                    console.log('File uploaded:', {
                        fileUrl,
                        fileName: file.name,
                        storagePath,
                        fileType: file.type,
                        originalExt
                    });
                } catch (error) {
                    console.error('File processing failed:', error);
                    alert(error.message);
                    return;
                }
            }

            console.log('Preparing to update cell status:', {
                index: this.currentTaskIndex,
                currentCell: this.board[this.currentTaskIndex]
            });

            // 更新格子状态
            this.board[this.currentTaskIndex] = {
                ...this.board[this.currentTaskIndex],
                completed: true,
                submission: submission
            };

            try {
                // 保存进度
                await this.saveProgress();
                console.log('Task submission successful, includes file:', !!file);

                // 关闭对话框
                this.closeTaskModal();

                // 更新界面
                this.updateUI();

                // 检查是否完成 Bingo
                if (this.checkBingo()) {
                    this.isBingo = true;
                    const totalTime = Date.now() - this.startTime + this.totalPlayTime;
                    await this.handleGameComplete(totalTime);
                }
            } catch (error) {
                console.error('Failed to save progress:', error);
                // 回滚状态
                this.board[this.currentTaskIndex] = {
                    ...this.board[this.currentTaskIndex],
                    completed: false,
                    submission: undefined
                };
                throw error;
            }
        } catch (error) {
            console.error('Task submission failed:', error);
            alert('Submission failed: ' + (error.message || 'Please try again'));
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
            console.log('没有找到提交内容');
            return;
        }

        try {
            if (cell.submission.fileUrl) {
                // 如果已经有 URL，直接使用
                window.open(cell.submission.fileUrl, '_blank');
            } else if (cell.submission.filePath) {
                // 否则尝试获取新的 URL
                const url = await window.API.getSubmissionFileUrl(cell.submission.filePath);
                if (url) {
                    window.open(url, '_blank');
                } else {
                    throw new Error('无法获取文件URL');
                }
            } else {
                console.log('该提交没有附件');
            }
        } catch (error) {
            console.error('查看文件失败:', error);
            alert('获取文件失败，请重试');
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

    // 添加显示提交详情的方法
    async showSubmissionDetails(index) {
        const cell = this.board[index];
        if (!cell || !cell.submission) return;

        let content = `
            <div class="max-h-[80vh] overflow-y-auto">
                <h3 class="text-lg font-bold mb-4">Submission Details</h3>
                <div class="mb-4">
                    <div class="font-medium mb-2">Task ${index + 1}:</div>
                    <div class="text-gray-700 mb-4">${cell.question}</div>
                </div>`;

        // 显示提交时间
        if (cell.submission.timestamp) {
            const submitTime = new Date(cell.submission.timestamp).toLocaleString('zh-CN');
            content += `
                <div class="mb-4">
                    <div class="font-medium mb-2">Submission Time:</div>
                    <div class="text-gray-700">${submitTime}</div>
                </div>`;
        }

        // 显示描述
        if (cell.submission.description) {
            content += `
                <div class="mb-4">
                    <div class="font-medium mb-2">Message:</div>
                    <div class="text-gray-700 whitespace-pre-wrap">${cell.submission.description}</div>
                </div>`;
        }

        // 显示文件（如果有）
        if (cell.submission.fileUrl) {
            const fileType = cell.submission.fileType || '';
            content += `
                <div class="mb-4">
                    <div class="font-medium mb-2">Submitted File:</div>
                    <div class="text-sm text-gray-600 mb-2">${cell.submission.fileName}</div>
                    <div class="border rounded-lg p-4 bg-gray-50">`;
            
            if (fileType.startsWith('image/')) {
                content += `
                    <img src="${cell.submission.fileUrl}" alt="Submitted Image" 
                         class="max-w-full h-auto rounded-lg mb-2 mx-auto">`;
            } else if (fileType.startsWith('video/')) {
                content += `
                    <video src="${cell.submission.fileUrl}" controls 
                           class="max-w-full h-auto rounded-lg mb-2 mx-auto">
                        Your browser does not support video playback
                    </video>`;
            }
            
            content += `
                    <a href="${cell.submission.fileUrl}" target="_blank" 
                       class="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        Download File
                    </a>
                </div>
            </div>`;
        }

        // 如果游戏未完成，添加编辑按钮
        if (!this.isBingo) {
            content += `
                <div class="mt-4 text-right">
                    <button onclick="Swal.close(); window.game.showTaskModal(${index}, true)" 
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Edit Submission
                    </button>
                </div>`;
        }

        content += '</div>'; // 关闭滚动容器

        // 使用 SweetAlert2 显示对话框
        Swal.fire({
            html: content,
            width: '600px',
            showConfirmButton: false,
            showCloseButton: true,
            customClass: {
                container: 'swal-wide',
                popup: 'swal-tall'
            }
        });
    }
}

// 初始化游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化游戏');
    window.game = new BingoGame();
}); 