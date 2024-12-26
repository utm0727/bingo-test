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
        
        // 加载题目列表和游戏设置
        this.loadQuestions();
        this.loadGameSettings();

        // 添加全选和批量删除的事件监听器
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.addEventListener('change', () => this.handleSelectAll());
        }
        if (this.batchDeleteBtn) {
            this.batchDeleteBtn.addEventListener('click', () => this.handleBatchDelete());
        }

        // 绑定复选框事件
        this.bindSelectAllEvents();
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
            alert('用户名和密码不能为空');
            return;
        }

        try {
            console.log('尝试登录:', { username, password });
            const success = await window.API.adminLogin(username, password);
            
            if (success) {
                console.log('登录成功，显示管理面板');
                this.showAdminPanel();
                // 添加登录成功的会话存储
                sessionStorage.setItem('isAdmin', 'true');
                sessionStorage.setItem('adminLastActivity', Date.now().toString());
            } else {
                console.error('登录失败：验证未通过');
                alert('登录失败：用户名或密码错误');
            }
        } catch (error) {
            console.error('登录失败:', error);
            alert('登录失败，请稍后重试');
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
            infoText.textContent = `当前有 ${uniqueQuestions} 个不重复题目，可支持最大 ${maxPossibleSize}x${maxPossibleSize} 的格子`;
            
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
            alert('请先选择要删除的题目');
            return;
        }

        const confirmMessage = checkedBoxes.length === 1 
            ? '确定要删除选中的题目吗？' 
            : `确定要删除选中的 ${checkedBoxes.length} 个题目吗？`;

        if (!confirm(confirmMessage)) return;

        try {
            // 获取所有选中题目的 ID
            const questionIds = Array.from(checkedBoxes).map(cb => cb.dataset.id);
            
            // 使用批量删除方法一次性删除所有选中的题目
            await window.API.batchDeleteQuestions(questionIds);
            
            // 重新加载题目列表
            await this.loadQuestions();
            alert('选中的题目已删除');
        } catch (error) {
            console.error('批量删除失败:', error);
            alert('删除失败，请重试');
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

    async handleReset() {
        const confirmed = confirm(
            '警告：这将清除所有数据，包括：\n' +
            '- 所有游戏进度和玩家数据\n' +
            '- 所有玩家提交的答案记录\n' +
            '- 所有题目数据\n' +
            '- 所有排行榜记录\n' +
            '- Supabase 数据库中的所有相关数据\n\n' +
            '此操作不可撤销！是否确定继续？'
        );

        if (!confirmed) return;

        const doubleConfirmed = confirm(
            '最后确认：\n' +
            '您确定要重置所有数据吗？\n' +
            '这将删除所有玩家的游戏记录和排行榜数据！'
        );

        if (!doubleConfirmed) return;

        try {
            // 调用 API 重置所有数据
            await API.resetAllData();
            alert('所有数据已重置成功！');
            
            // 重新加载题目列表和游戏设置
            await this.loadQuestions();
            await this.loadGameSettings();
        } catch (error) {
            console.error('重置数据失败:', error);
            alert('重置数据失败，请重试');
        }
    }

    // 清理方法
    cleanup() {
        // 移除所有事件监听器
        if (this.loginForm) {
            this.loginForm.removeEventListener('submit', this.handleLogin);
        }
        if (this.addQuestionForm) {
            this.addQuestionForm.removeEventListener('submit', this.handleAddQuestion);
        }
        if (this.adminSettingsForm) {
            this.adminSettingsForm.removeEventListener('submit', this.handleUpdateAdmin);
        }
        if (this.gameSettingsForm) {
            this.gameSettingsForm.removeEventListener('submit', this.handleUpdateGameSettings);
        }
        
        // 移除批量删除相关的事件监听器
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.removeEventListener('change', this.handleSelectAll);
        }
        if (this.batchDeleteBtn) {
            this.batchDeleteBtn.removeEventListener('click', this.handleBatchDelete);
        }

        // 移除页面可见性和历史记录监听器
        document.removeEventListener('visibilitychange', this.clearAdminSession);
        window.removeEventListener('popstate', this.clearAdminSession);
    }
}

// 修改登出函数
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        // 清理定时器
        if (window.adminPanel) {
            window.adminPanel.cleanup();
        }
        // 清除所有管理员相关的状态
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