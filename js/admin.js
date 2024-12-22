class AdminPanel {
    constructor() {
        this.loginForm = document.getElementById('adminLoginForm');
        this.loginSection = document.getElementById('loginSection');
        this.adminPanel = document.getElementById('adminPanel');
        this.addQuestionForm = document.getElementById('addQuestionForm');
        this.questionsList = document.getElementById('questionsList');
        this.adminSettingsForm = document.getElementById('adminSettingsForm');
        this.driveSettingsForm = document.getElementById('driveSettingsForm');
        this.gameSettingsForm = document.getElementById('gameSettingsForm');
        
        this.init();
        this.initPanels();
        
        // 添加排行榜刷新定时器
        this.startLeaderboardRefresh();
    }

    init() {
        // 检查是否已登录
        const isAdmin = localStorage.getItem('isAdmin');
        if (isAdmin === 'true') {
            this.showAdminPanel();
        }

        // 绑定事件
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.addQuestionForm.addEventListener('submit', (e) => this.handleAddQuestion(e));
        this.adminSettingsForm.addEventListener('submit', (e) => this.handleUpdateAdmin(e));
        this.driveSettingsForm.addEventListener('submit', (e) => this.handleUpdateDrive(e));
        this.gameSettingsForm.addEventListener('submit', (e) => this.handleUpdateGameSettings(e));
        
        // 加载题目列表
        this.loadQuestions();
        this.loadDriveSettings();
        this.loadGameSettings();
        
        // 初始加载排行榜
        this.refreshLeaderboard();
    }

    initPanels() {
        // 初始时隐藏所有面板
        document.getElementById('adminSettings-panel').classList.add('hidden');
        document.getElementById('driveSettings-panel').classList.add('hidden');

        // 如果有保存的 Drive 设置，显示掩码
        this.updateDriveSettingsDisplay();
    }

    async updateDriveSettingsDisplay() {
        const settings = await API.getDriveSettings();
        const savedDisplay = document.getElementById('savedDriveSettings');
        if (settings && (settings.folderId || settings.apiKey)) {
            savedDisplay.innerHTML = `
                <p class="text-sm text-gray-600">
                    Folder ID: <span class="text-gray-900">****${settings.folderId.slice(-4)}</span><br>
                    API Key: <span class="text-gray-900">****${settings.apiKey.slice(-4)}</span>
                </p>
            `;
        } else {
            savedDisplay.innerHTML = '<p class="text-sm text-gray-600">未设置</p>';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            await API.adminLogin(username, password);
            localStorage.setItem('isAdmin', 'true');
            this.showAdminPanel();
        } catch (error) {
            alert('登录失败，请检查用户名和密码');
        }
    }

    showAdminPanel() {
        this.loginSection.classList.add('hidden');
        this.adminPanel.classList.remove('hidden');
        this.loadQuestions();
    }

    async loadQuestions() {
        try {
            const questions = await API.getQuestions();
            this.renderQuestions(questions);
        } catch (error) {
            console.error('Failed to load questions:', error);
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
        this.questionsList.innerHTML = questions.map(q => `
            <div class="flex justify-between items-center border-b pb-2">
                <span>${q.question}</span>
                <button
                    onclick="adminPanel.handleDeleteQuestion(${q.id})"
                    class="text-red-600 hover:text-red-700"
                >
                    删除
                </button>
            </div>
        `).join('');
    }

    async handleDeleteQuestion(id) {
        if (!confirm('确定要删除这个题目吗？')) return;

        try {
            await API.deleteQuestion(id);
            this.loadQuestions();
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
            alert('管理员信息更新成功，请使用新的用户名和密码重新登录');
            handleLogout();
        } catch (error) {
            alert('更新管理员信息失败');
        }
    }

    async handleUpdateDrive(e) {
        e.preventDefault();
        const folderId = document.getElementById('driveFolderId').value.trim();
        const apiKey = document.getElementById('driveApiKey').value.trim();

        if (!folderId || !apiKey) {
            alert('请填写完整的 Google Drive 设置信息');
            return;
        }

        try {
            await API.updateDriveSettings(folderId, apiKey);
            alert('Google Drive 设置更新成功');
            // 清空输入框
            document.getElementById('driveFolderId').value = '';
            document.getElementById('driveApiKey').value = '';
            // 更新显示
            this.updateDriveSettingsDisplay();
            // 关闭面板
            togglePanel('driveSettings');
        } catch (error) {
            alert('更新 Google Drive 设置失败');
        }
    }

    async loadDriveSettings() {
        try {
            const settings = await API.getDriveSettings();
            if (settings) {
                document.getElementById('driveFolderId').value = settings.folderId || '';
                document.getElementById('driveApiKey').value = settings.apiKey || '';
            }
        } catch (error) {
            console.error('Failed to load drive settings:', error);
        }
    }

    async handleUpdateGameSettings(e) {
        e.preventDefault();
        const gridSize = document.getElementById('gridSize').value;

        try {
            await API.updateGameSettings(gridSize);
            alert('游戏设置更新成功');
        } catch (error) {
            alert('更新游戏设置失败');
        }
    }

    async loadGameSettings() {
        try {
            const settings = await API.getGameSettings();
            if (settings) {
                document.getElementById('gridSize').value = settings.gridSize.toString();
            }
        } catch (error) {
            console.error('Failed to load game settings:', error);
        }
    }

    // 开始定时刷新排行榜
    startLeaderboardRefresh() {
        // 每30秒刷新一次排行榜
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

    // 渲染排行榜
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

    async handleResetAllGames() {
        if (!confirm('确定要重置所有游戏数据吗？这将清除所有玩家的进度和排行榜数据。')) {
            return;
        }

        try {
            await API.resetAllGames();
            alert('所有游戏数据已重置');
            // 刷新排行榜显示
            this.refreshLeaderboard();
        } catch (error) {
            console.error('Failed to reset games:', error);
            alert('重置游戏数据失败');
        }
    }

    async viewUploads(questionId) {
        try {
            const response = await fetch(`${API.baseUrl}/uploads/${questionId}`);
            const uploads = await response.json();
            
            // 显示上传列表
            const uploadsHtml = uploads.map(upload => `
                <div class="border-b py-2">
                    <div class="flex justify-between items-center">
                        <span>${upload.teamName}</span>
                        <a href="${upload.fileUrl}" target="_blank" 
                           class="text-indigo-600 hover:text-indigo-500">
                            查看文件
                        </a>
                    </div>
                </div>
            `).join('');

            // 显示在模态框中
            // ... 显示模态框的代码
        } catch (error) {
            console.error('Failed to load uploads:', error);
            alert('获取上传文件列表失败');
        }
    }
}

// 修改现有的 handleLogout 函数
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        // 清理定时器
        if (window.adminPanel) {
            window.adminPanel.cleanup();
        }
        localStorage.removeItem('isAdmin');
        window.location.reload();
    }
}

// 初始化管理员面板
const adminPanel = new AdminPanel();
window.adminPanel = adminPanel; // 保存到全局以便访问

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