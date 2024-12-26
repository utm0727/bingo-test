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
            cellDiv.className = 'p-4 rounded shadow cursor-pointer transition-all duration-200 min-h-[120px] flex flex-col items-center justify-center text-center';
            
            // 根据状态添加额外样式
            if (cell.completed) {
                cellDiv.classList.add('bg-green-100', 'text-green-900', 'hover:bg-green-200');
                let content = `
                    <div class="text-lg font-medium mb-2">题目 ${index + 1}</div>
                    <div class="text-sm mb-2">${cell.question}</div>
                    <div class="text-xs text-green-700 mb-2">已完成</div>`;
                
                // 如果有提交记录，添加查看按钮
                if (cell.submission) {
                    content += `
                        <button onclick="window.game.showSubmissionDetails(${index})" 
                                class="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                            查看提交
                        </button>`;
                }
                
                cellDiv.innerHTML = content;
            } else {
                cellDiv.classList.add('bg-white', 'hover:bg-gray-50');
                cellDiv.innerHTML = `
                    <div class="text-lg font-medium mb-2">题目 ${index + 1}</div>
                    <div class="text-sm">${cell.question}</div>
                `;
            }

            // 添加点击事件
            if (!cell.completed && !this.isBingo) {
                cellDiv.onclick = () => this.handleCellClick(index);
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

        // 确保关闭任何已打开的 SweetAlert2 对话框
        Swal.close();

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

        // 如果编辑模式，填充已有内容
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
        if (this.currentTaskIndex === null) return;

        try {
            const description = document.getElementById('taskDescription').value.trim();
            const fileInput = document.getElementById('taskFile');
            const file = fileInput.files[0];

            // 检查是否至少有一项内容（文字说明或文件）
            if (!description && !file) {
                alert('请至少填写任务完成说明或上传文件');
                return;
            }

            // 创建提交对象
            const submission = {
                timestamp: new Date().toISOString()
            };

            // 如果有文字说明，添加到提交中
            if (description) {
                submission.description = description;
            }

            // 如果有文件，处理文件上传
            if (file) {
                try {
                    // 添加文件大小检查
                    if (file.size > 50 * 1024 * 1024) { // 50MB 限制
                        throw new Error('文件大小不能超过 50MB');
                    }

                    // 检查文件类型
                    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                        throw new Error('只支持图片或视频文件');
                    }

                    console.log('处理文件上传:', {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                        file: file
                    });

                    // 保存文件对象和相关信息
                    submission.file = file;
                    submission.fileName = file.name;
                    // 不需要单独存储 fileType，因为它包含在 file 对象中

                    console.log('文件已准备好上传:', {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size
                    });
                } catch (error) {
                    console.error('文件处理失败:', error);
                    alert(error.message);
                    return;
                }
            }

            // 更新格子状态
            this.board[this.currentTaskIndex].completed = true;
            this.board[this.currentTaskIndex].submission = submission;

            try {
                // 保存进度
                await this.saveProgress();
                console.log('任务提交成功，包含文件:', !!file);

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
                console.error('保存进度失败:', error);
                // 回滚状态
                this.board[this.currentTaskIndex].completed = false;
                delete this.board[this.currentTaskIndex].submission;
                throw error;
            }
        } catch (error) {
            console.error('提交任务失败:', error);
            alert('提交失败：' + (error.message || '请重试'));
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
                <h3 class="text-lg font-bold mb-4">提交详情</h3>
                <div class="mb-4">
                    <div class="font-medium mb-2">题目 ${index + 1}:</div>
                    <div class="text-gray-700 mb-4">${cell.question}</div>
                </div>`;

        // 显示提交时间
        if (cell.submission.timestamp) {
            const submitTime = new Date(cell.submission.timestamp).toLocaleString('zh-CN');
            content += `
                <div class="mb-4">
                    <div class="font-medium mb-2">提交时间:</div>
                    <div class="text-gray-700">${submitTime}</div>
                </div>`;
        }

        // 显示描述
        if (cell.submission.description) {
            content += `
                <div class="mb-4">
                    <div class="font-medium mb-2">完成说明:</div>
                    <div class="text-gray-700 whitespace-pre-wrap">${cell.submission.description}</div>
                </div>`;
        }

        // 显示文件（如果有）
        if (cell.submission.fileUrl) {
            const fileType = cell.submission.fileType || '';
            content += `
                <div class="mb-4">
                    <div class="font-medium mb-2">提交文件:</div>
                    <div class="text-sm text-gray-600 mb-2">${cell.submission.fileName}</div>
                    <div class="border rounded-lg p-4 bg-gray-50">`;
            
            if (fileType.startsWith('image/')) {
                content += `
                    <img src="${cell.submission.fileUrl}" alt="提交图片" 
                         class="max-w-full h-auto rounded-lg mb-2 mx-auto">`;
            } else if (fileType.startsWith('video/')) {
                content += `
                    <video src="${cell.submission.fileUrl}" controls 
                           class="max-w-full h-auto rounded-lg mb-2 mx-auto">
                        您的浏览器不支持视频播放
                    </video>`;
            }
            
            content += `
                    <a href="${cell.submission.fileUrl}" target="_blank" 
                       class="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        下载文件
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
                        编辑提交
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