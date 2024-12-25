class Auth {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        
        // 检查是否已登录
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            console.log('用户已登录，重定向到游戏页面');
            window.location.href = 'pages/game.html';
            return;
        }

        // 等待 API 准备好再初始化
        if (window.API) {
            this.init();
        } else {
            window.addEventListener('APIReady', () => this.init());
        }
    }

    init() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
    }

    async handleLogin() {
        try {
            const teamName = document.getElementById('teamName').value.trim();
            const leaderName = document.getElementById('leaderName').value.trim();

            if (!teamName || !leaderName) {
                alert('请填写所有字段');
                return;
            }

            console.log('尝试登录:', { teamName, leaderName });
            const user = await window.API.login(teamName, leaderName);
            
            if (user) {
                console.log('登录成功:', user);
                // 保存用户信息到 localStorage
                localStorage.setItem('currentUser', JSON.stringify(user));
                
                // 使用 window.location.replace 而不是 href
                window.location.replace('pages/game.html');
            } else {
                console.error('登录失败：未返回用户信息');
                alert('登录失败，请重试');
            }
        } catch (error) {
            console.error('登录失败:', error);
            alert('登录失败，请重试');
        }
    }
}

// 初始化认证
window.auth = new Auth(); 