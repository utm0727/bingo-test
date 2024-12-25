document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('loginForm');
    
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const teamName = document.getElementById('teamName').value;
        const leaderName = document.getElementById('leaderName').value;
        
        try {
            // 先检查是否已完成游戏
            const isCompleted = await API.checkGameCompletion(teamName);
            const user = { teamName, leaderName };
            localStorage.setItem('currentUser', JSON.stringify(user));

            if (isCompleted) {
                // 如果已完成游戏，跳转到完成概览页面
                window.location.href = 'pages/completion.html';
            } else {
                // 如果未完成游戏，正常登录流程
                await API.login(teamName, leaderName);
                window.location.href = 'pages/game.html';
            }
        } catch (error) {
            alert('登录失败，请重试');
        }
    });
}); 