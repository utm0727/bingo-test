class Auth {
    constructor() {
        // 禁用 i18next 调试信息
        if (window.i18next) {
            window.i18next.init({
                debug: false,
                lng: 'zh-CN',
                fallbackLng: 'zh-CN',
                resources: {
                    'zh-CN': {
                        translation: {}
                    }
                }
            });
        }

        this.errorLogs = [];
        this.logError('Auth 类初始化开始');
        
        // 获取当前页面路径
        const fullPath = window.location.pathname;
        this.logError('当前页面路径:', fullPath);

        // 设置基础URL
        this.baseUrl = fullPath.includes('/bingo-test/pages/') 
            ? '..'
            : '.';
        
        this.logError('环境信息:', {
            fullPath,
            baseUrl: this.baseUrl,
            hostname: window.location.hostname,
            origin: window.location.origin
        });

        // 如果是游戏页面，检查登录状态
        if (fullPath.includes('/game.html')) {
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                this.logError('游戏页面检测到未登录状态，重定向到登录页面');
                window.location.href = `${this.baseUrl}/index.html`;
                return;
            }
        }

        // 只在登录页面初始化登录表单
        if (fullPath.endsWith('/index.html') || fullPath.endsWith('/bingo-test/')) {
            this.loginForm = document.getElementById('loginForm');
            if (this.loginForm) {
                this.init();
            } else {
                this.logError('未找到登录表单');
            }
        }
    }

    logError(message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message: message,
            data: data
        };
        this.errorLogs.push(logEntry);
        console.log(`[Auth] ${message}`, data || '');
    }

    init() {
        this.logError('初始化登录表单');
        
        // 从 URL 参数获取团队信息
        const urlParams = new URLSearchParams(window.location.search);
        const teamName = urlParams.get('team');
        const leaderName = urlParams.get('leader');

        // 如果存在团队信息，自动填充表单
        if (teamName) {
            const teamNameInput = document.getElementById('teamName');
            if (teamNameInput) {
                teamNameInput.value = decodeURIComponent(teamName);
            }
        }
        if (leaderName) {
            const leaderNameInput = document.getElementById('leaderName');
            if (leaderNameInput) {
                leaderNameInput.value = decodeURIComponent(leaderName);
            }
        }

        // 绑定表单提交事件
        this.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    async handleLogin() {
        try {
            const teamName = document.getElementById('teamName').value.trim();
            const leaderName = document.getElementById('leaderName').value.trim();

            if (!teamName || !leaderName) {
                alert('Please enter both team name and leader name');
                return;
            }

            this.logError('尝试登录:', { teamName, leaderName });

            const success = await window.API.login(teamName, leaderName);
            if (success) {
                this.logError('登录成功，保存用户信息');
                localStorage.setItem('currentUser', JSON.stringify({ team_name: teamName, leader_name: leaderName }));
                window.location.href = `${this.baseUrl}/pages/game.html`;
            } else {
                this.logError('登录失败');
                alert('Login failed. Please try again.');
            }
        } catch (error) {
            this.logError('登录过程出错:', error);
            alert('An error occurred during login. Please try again.');
        }
    }
}

// 初始化 Auth 实例
window.addEventListener('DOMContentLoaded', () => {
    window.auth = new Auth();
}); 