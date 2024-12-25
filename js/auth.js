class Auth {
    constructor() {
        console.log('Auth 类初始化开始');
        this.loginForm = document.getElementById('loginForm');
        console.log('登录表单元素:', this.loginForm);
        
        // 检查是否已登录，并确保数据完整性
        const currentUser = localStorage.getItem('currentUser');
        console.log('当前存储的用户信息:', currentUser);
        
        if (currentUser) {
            try {
                // 验证用户数据的完整性
                const userData = JSON.parse(currentUser);
                if (userData && userData.team_name) {
                    console.log('检测到有效的用户信息:', userData);
                    window.location.replace('pages/game.html');
                    return;
                } else {
                    console.warn('用户数据无效，清除存储');
                    localStorage.removeItem('currentUser');
                }
            } catch (error) {
                console.error('解析用户数据失败，清除存储:', error);
                localStorage.removeItem('currentUser');
            }
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
            
            if (user && user.team_name) {  // 确保返回的用户数据包含 team_name
                console.log('登录成功，保存用户信息:', user);
                
                // 确保保存完整的用户信息
                const userData = {
                    team_name: user.team_name,
                    leader_name: user.leader_name,
                    id: user.id,
                    created_at: user.created_at
                };
                
                localStorage.setItem('currentUser', JSON.stringify(userData));
                console.log('用户信息已保存到 localStorage:', userData);
                
                // 验证保存是否成功
                const savedData = localStorage.getItem('currentUser');
                console.log('验证保存的数据:', savedData);
                
                if (savedData) {
                    console.log('准备重定向到游戏页面');
                    window.location.replace('pages/game.html');
                } else {
                    throw new Error('用户数据保存失败');
                }
            } else {
                console.error('登录失败：无效的用户数据', user);
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

// 初始化前清理可能的无效数据
if (!localStorage.getItem('currentUser')) {
    console.log('清理会话数据');
    localStorage.clear();
    sessionStorage.clear();
}

console.log('准备初始化 Auth 类');
window.auth = new Auth();
console.log('Auth 类已初始化完成'); 