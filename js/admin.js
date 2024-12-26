class AdminPanel {
    constructor() {
        this.loginForm = document.getElementById('adminLoginForm');
        this.loginSection = document.getElementById('loginSection');
        this.adminPanel = document.getElementById('adminPanel');
        this.addQuestionForm = document.getElementById('addQuestionForm');
        this.questionsList = document.getElementById('questionsList');
        this.adminSettingsForm = document.getElementById('adminSettingsForm');
        this.gameSettingsForm = document.getElementById('gameSettingsForm');
        
        // 添加批量删除相关的元素引用
        this.selectAllCheckbox = document.getElementById('selectAllQuestions');
        this.batchDeleteBtn = document.getElementById('batchDeleteBtn');
        
        // 等待 API 准备好再初始化
        if (window.API) {
            console.log('API 已就绪，开始初始化管理面板');
            this.init();
        } else {
            console.log('等待 API 准备...');
            window.addEventListener('APIReady', () => {
                console.log('API 就绪，开始初始化管理面板');
                this.init();
            });
        }
    }

    // 首先定义基础的状态更新方法
    updateSelectAllState() {
        if (!this.selectAllCheckbox) return;

        const checkboxes = document.querySelectorAll('.question-checkbox');
        const checkedBoxes = document.querySelectorAll('.question-checkbox:checked');
        
        // 如果所有复选框都被选中，则全选框也应该被选中
        this.selectAllCheckbox.checked = checkboxes.length > 0 && 
            checkboxes.length === checkedBoxes.length;
        
        // 如果没有复选框，禁用全选
        this.selectAllCheckbox.disabled = checkboxes.length === 0;
    }

    updateBatchDeleteButton() {
        if (!this.batchDeleteBtn) return;
        const checkedBoxes = document.querySelectorAll('.question-checkbox:checked');
        this.batchDeleteBtn.disabled = checkedBoxes.length === 0;
        if (this.batchDeleteBtn.disabled) {
            this.batchDeleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            this.batchDeleteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }

    handleSelectAll() {
        const isChecked = this.selectAllCheckbox.checked;
        const checkboxes = document.querySelectorAll('.question-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        this.updateBatchDeleteButton();
    }

    // 然后是其他方法
    init() {
        // 修改登录检查逻辑
        const isAdmin = sessionStorage.getItem('isAdmin');
        const lastActivity = sessionStorage.getItem('adminLastActivity');
        const currentTime = Date.now();
        const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟超时

        // 检查是否登录以及会话是否过期
        if (isAdmin === 'true' && lastActivity && (currentTime - parseInt(lastActivity)) < SESSION_TIMEOUT) {
            this.showAdminPanel();
            // 更新最后活动时间
            sessionStorage.setItem('adminLastActivity', currentTime.toString());
        } else {
            // 清除所有管理员相关的状态
            this.clearAdminSession();
            this.showLoginForm();
        }

        // 绑定事件
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.addQuestionForm.addEventListener('submit', (e) => this.handleAddQuestion(e));
        this.adminSettingsForm.addEventListener('submit', (e) => this.handleUpdateAdmin(e));
        this.gameSettingsForm.addEventListener('submit', (e) => this.handleUpdateGameSettings(e));
        
        // 加载题目列表
        this.loadQuestions();
        this.loadGameSettings();
        
        // 初始载排行榜
        this.refreshLeaderboard();

        // 添加全选和批量删除的事件监听器
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        }
        if (this.batchDeleteBtn) {
            this.batchDeleteBtn.addEventListener('click', () => this.handleBatchDelete());
        }
    }

    initPanels() {
        // 只隐藏管理员设置面板
        document.getElementById('adminSettings-panel').classList.add('hidden');
    }

    setupHistoryListener() {
        // 监听浏览器的后退事件
        window.addEventListener('popstate', () => {
            this.clearAdminSession();
            window.location.href = '../index.html';
        });

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.clearAdminSession();
            }
        });
    }

    clearAdminSession() {
        sessionStorage.removeItem('isAdmin');
        sessionStorage.removeItem('adminLastActivity');
        localStorage.removeItem('isAdmin');
    }

    showLoginForm() {
        this.loginSection.classList.remove('hidden');
        this.adminPanel.classList.add('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            alert('Username and password cannot be empty');
            return;
        }

        try {
            console.log('Attempting login:', { username, password });
            const success = await window.API.adminLogin(username, password);
            
            if (success) {
                console.log('Login successful, showing admin panel');
                this.showAdminPanel();
                // Add login success session storage
                sessionStorage.setItem('isAdmin', 'true');
                sessionStorage.setItem('adminLastActivity', Date.now().toString());
            } else {
                console.error('Login failed: Authentication failed');
                alert('Login failed: Invalid username or password');
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed, please try again later');
        }
    }

    showAdminPanel() {
        this.loginSection.classList.add('hidden');
        this.adminPanel.classList.remove('hidden');
        this.loadQuestions();
        
        // 添加这行，防止后退到登录页面
        history.pushState(null, '', window.location.href);
    }

    async loadQuestions() {
        try {
            const questions = await window.API.getQuestions();
            this.renderQuestions(questions);
        } catch (error) {
            console.error('加载题目失败:', error);
        }
    }

    async handleAddQuestion(e) {
        e.preventDefault();
        const input = document.getElementById('newQuestion');
        const question = input.value.trim();

        if (!question) return;

        try {
            await API.addQuestion(question);
            input.value = '';
            this.loadQuestions();
        } catch (error) {
            alert('添加题目失败，请重试');
        }
    }

    renderQuestions(questions) {
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '';

        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'flex items-center gap-4 p-4 bg-gray-50 rounded';
            questionDiv.innerHTML = `
                <input type="checkbox" 
                    class="question-checkbox rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    data-id="${question.id}">
                <span class="flex-1">${question.question}</span>
                <button class="delete-btn text-red-600 hover:text-red-700"
                    data-id="${question.id}">
                    删除
                </button>
            `;

            // 添加删除按钮的点击事件
            const deleteBtn = questionDiv.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async () => {
                try {
                    console.log('正在删除题目:', question.id);
                    await window.API.deleteQuestion(question.id);
                    console.log('题目删除成功');
                    questionDiv.remove();
                    
                    // 更新全选按钮状态
                    this.updateSelectAllState();
                    // 更新批量删除按钮状态
                    this.updateBatchDeleteButton();
                } catch (error) {
                    console.error('删除题目失败:', error);
                    alert('删除题目失败，请重试');
                }
            });

            // 添加复选框的变化事件
            const checkbox = questionDiv.querySelector('.question-checkbox');
            checkbox.addEventListener('change', () => {
                this.updateBatchDeleteButton();
                this.updateSelectAllState();
            });

            questionsList.appendChild(questionDiv);
        });

        // 重新绑定全选和批量删除事件
        this.bindSelectAllEvents();
    }

    async handleDeleteQuestion(id) {
        if (!confirm('确定要删除这个题目吗？')) return;

        try {
            await API.deleteQuestion(id);
            await this.loadQuestions();
            await this.updateGridSizeOptions(); // 删除后更新选项
        } catch (error) {
            alert('删除题目失败，请重试');
        }
    }

    async handleUpdateAdmin(e) {
        e.preventDefault();
        const newUsername = document.getElementById('newUsername').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        if (!newUsername || !newPassword || !confirmPassword) {
            alert('所有字段都不能为空');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            await API.updateAdminCredentials(newUsername, newPassword);
            alert('管理员信息更新成功，请使用新的用户名和密码新登录');
            handleLogout();
        } catch (error) {
            alert('更新管理员信息失败');
        }
    }

    async handleUpdateGameSettings(e) {
        e.preventDefault();
        const gridSize = document.getElementById('gridSize').value;
        const requiredQuestions = gridSize * gridSize;

        try {
            // 先检查题目数量是否足够
            const questions = await API.getQuestions();
            const uniqueQuestions = Array.from(new Set(questions.map(q => q.question)));
            
            if (uniqueQuestions.length < requiredQuestions) {
                alert(`题目数量不足！当前有 ${uniqueQuestions.length} 个不重复题目，` +
                      `${gridSize}x${gridSize} 的格子需要 ${requiredQuestions} 个不重复题目。\n\n` +
                      `请先添加更多题目，或减小格子大小。`);
                return;
            }

            await API.updateGameSettings(gridSize);
            alert('游戏设置更新成功');
        } catch (error) {
            alert('更新游戏设置失败');
        }
    }

    async loadGameSettings() {
        try {
            const settings = await API.getGameSettings();
            let gridSize = settings ? settings.gridSize : 5;
            
            // 更新选择器值
            const gridSizeSelector = document.getElementById('gridSize');
            gridSizeSelector.value = gridSize.toString();

            // 更新选项可用性
            await this.updateGridSizeOptions();
        } catch (error) {
            console.error('Failed to load game settings:', error);
        }
    }

    // 开始定时刷新排行榜
    startLeaderboardRefresh() {
        // 每30秒新一次排行榜
        this.leaderboardInterval = setInterval(() => {
            this.refreshLeaderboard();
        }, 30000);
    }

    // 刷新排行榜
    async refreshLeaderboard() {
        try {
            const leaderboard = await API.getLeaderboard();
            this.renderLeaderboard(leaderboard);
        } catch (error) {
            console.error('Failed to refresh leaderboard:', error);
        }
    }

    // 修改渲染排行榜的方法
    renderLeaderboard(leaderboard) {
        const leaderboardElement = document.getElementById('adminLeaderboard');
        if (!leaderboardElement) return;

        leaderboardElement.innerHTML = leaderboard.map((team, index) => {
            const completionDate = new Date(team.timestamp);
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${index + 1}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${team.teamName}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${team.leaderName || '-'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatTime(team.score)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${completionDate.toLocaleString()}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 格式化时间
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours}时${minutes}分${remainingSeconds}秒`;
    }

    // 在组件销毁时清理定时器
    cleanup() {
        if (this.leaderboardInterval) {
            clearInterval(this.leaderboardInterval);
        }
    }

    async handleReset() {
        const confirmed = confirm(
            'Warning: This will clear all data, including:\n' +
            '- All game progress\n' +
            '- All leaderboard records\n' +
            '- All tasks\n\n' +
            'This action cannot be undone! Are you sure you want to continue?'
        );

        if (!confirmed) return;

        const doubleConfirmed = confirm(
            'Final confirmation:\n' +
            'Are you sure you want to reset all data?'
        );

        if (!doubleConfirmed) return;

        try {
            await API.resetAllData();
            alert('All data has been reset');
            window.location.reload(); // Refresh page to show reset state
        } catch (error) {
            console.error('Failed to reset data:', error);
            alert('Reset failed, please try again');
        }
    }

    // 添加新方法：更新格子大小选项
    async updateGridSizeOptions() {
        try {
            const questions = await API.getQuestions();
            const uniqueQuestions = Array.from(new Set(questions.map(q => q.question))).length;
            const maxPossibleSize = Math.floor(Math.sqrt(uniqueQuestions));
            
            const gridSizeSelector = document.getElementById('gridSize');
            
            // 更新选项可用性
            Array.from(gridSizeSelector.options).forEach(option => {
                const size = parseInt(option.value);
                option.disabled = size * size > uniqueQuestions;
                if (option.disabled) {
                    option.textContent = `${size} x ${size} (需要 ${size * size} 个题目)`;
                } else {
                    option.textContent = `${size} x ${size}`;
                }
            });

            // 更新提示信息
            const infoText = document.createElement('p');
            infoText.className = 'mt-2 text-sm text-gray-500';
            infoText.textContent = `Currently have ${uniqueQuestions} unique tasks, supporting maximum grid size of ${maxPossibleSize}x${maxPossibleSize}`;
            
            const existingInfo = gridSizeSelector.parentElement.querySelector('p:last-child');
            if (existingInfo) {
                existingInfo.replaceWith(infoText);
            } else {
                gridSizeSelector.parentElement.appendChild(infoText);
            }
        } catch (error) {
            console.error('Failed to update grid size options:', error);
        }
    }

    // 修改处理批量删除的方法
    async handleBatchDelete() {
        const checkedBoxes = document.querySelectorAll('.question-checkbox:checked');
        if (checkedBoxes.length === 0) {
            alert('Please select tasks to delete');
            return;
        }

        const confirmMessage = checkedBoxes.length === 1 
            ? 'Are you sure you want to delete the selected task?' 
            : `Are you sure you want to delete ${checkedBoxes.length} selected tasks?`;

        if (!confirm(confirmMessage)) return;

        try {
            // Get all selected task IDs
            const questionIds = Array.from(checkedBoxes).map(cb => cb.dataset.id);
            
            // Use batch delete method to delete all selected tasks at once
            await window.API.batchDeleteQuestions(questionIds);
            
            // Reload task list
            await this.loadQuestions();
            alert('Selected tasks have been deleted');
        } catch (error) {
            console.error('Batch delete failed:', error);
            alert('Delete failed, please try again');
        }
    }

    // 修改绑定全选相关事件的方法
    bindSelectAllEvents() {
        // 绑定全选复选框事件
        if (this.selectAllCheckbox) {
            const handleSelectAllChange = () => {
                const checkboxes = document.querySelectorAll('.question-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = this.selectAllCheckbox.checked;
                });
                this.updateBatchDeleteButton();
            };
            
            this.selectAllCheckbox.removeEventListener('change', handleSelectAllChange);
            this.selectAllCheckbox.addEventListener('change', handleSelectAllChange);
        }

        // 绑定批量删除按钮事件
        if (this.batchDeleteBtn) {
            const handleBatchDelete = () => this.handleBatchDelete();
            this.batchDeleteBtn.removeEventListener('click', handleBatchDelete);
            this.batchDeleteBtn.addEventListener('click', handleBatchDelete);
        }

        // 绑定单个复选框的变化事件
        const checkboxes = document.querySelectorAll('.question-checkbox');
        checkboxes.forEach(checkbox => {
            const handleCheckboxChange = () => {
                this.updateSelectAllState();
                this.updateBatchDeleteButton();
            };
            
            checkbox.removeEventListener('change', handleCheckboxChange);
            checkbox.addEventListener('change', handleCheckboxChange);
        });
    }
}

// 修改登出函数
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear timers
        if (window.adminPanel) {
            window.adminPanel.cleanup();
        }
        // Clear all admin-related states
        window.adminPanel.clearAdminSession();
        window.location.href = '../index.html';
    }
}

// 初始化管理员面板
window.adminPanel = new AdminPanel();

// 添加全局折叠面板控制函数
function togglePanel(panelId) {
    const panel = document.getElementById(`${panelId}-panel`);
    const arrow = document.getElementById(`${panelId}-arrow`);
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        arrow.classList.add('rotate-180');
    } else {
        panel.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
} 