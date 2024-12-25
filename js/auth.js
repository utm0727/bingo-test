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
        this.baseUrl = '';
        
        if (fullPath.includes('/bingo-test/')) {
            // 如果在 pages 目录下
            if (fullPath.includes('/pages/')) {
                this.baseUrl = '../';
            } else {
                // 如果在根目录
                this.baseUrl = './';
            }
        } else {
            // 如果在其他位置
            this.baseUrl = '/bingo-test/';
        }

        this.logError('路径信息:', {
            fullPath,
            baseUrl: this.baseUrl,
            currentLocation: window.location.href
        });

        // 如果是游戏页面，检查登录状态
        if (fullPath.includes('/game.html')) {
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                this.logError('游戏页面检测到未登录状态，重定向到登录页面');
                window.location.href = '../index.html';
                return;
            }
        }

        // 只在登录页面初始化登录表单
        if (fullPath.endsWith('/index.html') || fullPath.endsWith('/bingo-test/')) {
            this.loginForm = document.getElementById('loginForm');
            if (this.loginForm) {
                this.init();
            }
        }
    }

    // 添加错误日志方法
    logError(message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message,
            data
        };
        this.errorLogs.push(logEntry);
        console.log(`[${logEntry.timestamp}] ${message}`, data);
        
        // 保存到 localStorage
        localStorage.setItem('authErrorLogs', JSON.stringify(this.errorLogs));
    }

    init() {
        this.logError('开始初始化登录表单');
        if (this.loginForm) {
            this.logError('找到登录表单，绑定提交事件');
            this.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                this.logError('表单提交事件触发');
                await this.handleLogin();
            });
            this.logError('登录表单事件绑定完成');
        } else {
            this.logError('未找到登录表单元素，当前页面元素:', {
                body: document.body.innerHTML,
                loginForm: document.getElementById('loginForm')
            });
        }
    }

    async handleLogin() {
        this.logError('开始处理登录请求');
        try {
            const teamName = document.getElementById('teamName');
            const leaderName = document.getElementById('leaderName');
            
            this.logError('表单元素状态:', {
                teamNameExists: !!teamName,
                leaderNameExists: !!leaderName,
                teamNameValue: teamName?.value,
                leaderNameValue: leaderName?.value
            });

            if (!teamName || !leaderName) {
                this.logError('找不到表单输入元素');
                alert('系统错误，请刷新页面重试');
                return;
            }

            const teamNameValue = teamName.value.trim();
            const leaderNameValue = leaderName.value.trim();

            this.logError('处理的表单数据:', {
                teamNameValue,
                leaderNameValue
            });

            if (!teamNameValue || !leaderNameValue) {
                this.logError('表单验证失败：字段为空');
                alert('请填写所有字段');
                return;
            }

            this.logError('开始调用 API 登录');
            const user = await window.API.login(teamNameValue, leaderNameValue);
            this.logError('API 登录响应:', user);
            
            if (user && user.team_name) {
                this.logError('登录成功，准备保存用户信息');
                
                const userData = {
                    team_name: user.team_name,
                    leader_name: user.leader_name,
                    id: user.id,
                    created_at: user.created_at
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                
                // 修改游戏页面路径的构建
                let gamePath = this.baseUrl + 'pages/game.html';
                
                // 确保路径正确
                gamePath = gamePath.replace('//', '/');
                
                this.logError('准备跳转:', {
                    gamePath,
                    baseUrl: this.baseUrl,
                    currentLocation: window.location.href
                });
                
                // 使用完整的 URL
                const fullGamePath = new URL(gamePath, window.location.origin).href;
                
                setTimeout(() => {
                    window.location.href = fullGamePath;
                }, 100);
            } else {
                this.logError('登录失败：无效的用户数据', user);
                alert('登录失败，请重试');
            }
        } catch (error) {
            this.logError('登录过程出错:', {
                error,
                stack: error.stack,
                currentLocation: window.location.href
            });
            alert('登录失败，请重试');
        }
    }
}

// 清除之前的错误日志
localStorage.removeItem('authErrorLogs');

// 初始化认证
window.addEventListener('DOMContentLoaded', () => {
    // 禁用所有 i18next 相关的控制台输出
    if (window.i18next) {
        window.i18next.options.debug = false;
    }
    
    console.log('DOM加载完成，初始化Auth');
    window.auth = new Auth();
}); 