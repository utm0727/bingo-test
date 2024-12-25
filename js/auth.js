class Auth {
    constructor() {
        console.log('Auth 类初始化开始');
        this.loginForm = document.getElementById('loginForm');
        console.log('登录表单元素:', this.loginForm);
        
        // 检查是否已登录
        const currentUser = localStorage.getItem('currentUser');
        console.log('当前存储的用户信息:', currentUser);
        
        if (currentUser) {
            console.log('检测到已登录用户，准备重定向到游戏页面');
            window.location.replace('pages/game.html');
            return;
        }

        // 等待 API 准备好再初始化
        if (window.API) {
            console.log('API 已就绪，直接初始化');
            this.init();
        } else {
            console.log('等待 API 准备...');
            window.addEventListener('APIReady', () => {
                console.log('收到 API 就绪事件，开始初始化');
                this.init();
            });
        }
        console.log('Auth 类初始化完成');
    }

    init() {
        console.log('开始初始化登录表单');
        if (this.loginForm) {
            console.log('找到登录表单，绑定提交事件');
            this.loginForm.addEventListener('submit', async (e) => {
                console.log('表单提交事件触发');
                e.preventDefault();
                await this.handleLogin();
            });
        } else {
            console.warn('未找到登录表单元素');
        }
        console.log('登录表单初始化完成');
    }

    async handleLogin() {
        console.log('开始处理登录请求');
        try {
            const teamName = document.getElementById('teamName');
            const leaderName = document.getElementById('leaderName');
            
            console.log('表单元素:', {
                teamNameElement: teamName,
                leaderNameElement: leaderName
            });

            if (!teamName || !leaderName) {
                console.error('找不到表单输入元素');
                alert('系统错误，请刷新页面重试');
                return;
            }

            const teamNameValue = teamName.value.trim();
            const leaderNameValue = leaderName.value.trim();

            console.log('表单输入值:', {
                teamName: teamNameValue,
                leaderName: leaderNameValue
            });

            if (!teamNameValue || !leaderNameValue) {
                console.log('表单验证失败：字段为空');
                alert('请填写所有字段');
                return;
            }

            console.log('开始调用 API 登录');
            const user = await window.API.login(teamNameValue, leaderNameValue);
            console.log('API 登录响应:', user);
            
            if (user) {
                console.log('登录成功，保存用户信息');
                localStorage.setItem('currentUser', JSON.stringify(user));
                console.log('用户信息已保存到 localStorage');
                
                console.log('准备重定向到游戏页面');
                window.location.replace('pages/game.html');
            } else {
                console.error('登录失败：API 未返回用户信息');
                alert('登录失败，请重试');
            }
        } catch (error) {
            console.error('登录过程出错:', error);
            console.error('错误详情:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            alert('登录失败，请重试');
        }
    }
}

// 添加错误处理
window.onerror = function(msg, url, line, col, error) {
    console.error('全局错误:', {
        message: msg,
        url: url,
        line: line,
        column: col,
        error: error
    });
    return false;
};

console.log('准备初始化 Auth 类');
window.auth = new Auth();
console.log('Auth 类已初始化完成'); 