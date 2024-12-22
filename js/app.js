document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const teamName = document.getElementById('teamName').value;
        const leaderName = document.getElementById('leaderName').value;
        
        try {
            // 先检查是否已完成游戏
            const isCompleted = await API.checkGameCompletion(teamName);
            if (isCompleted) {
                // 如果已完成游戏，保存用户信息并跳转到排行榜
                const user = { teamName, leaderName };
                localStorage.setItem('currentUser', JSON.stringify(user));
                alert('您的队伍已经完成游戏了！');
                window.location.href = 'pages/leaderboard.html';
                return;
            }

            // 如果未完成游戏，正常登录流程
            const user = await API.login(teamName, leaderName);
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'pages/game.html';
        } catch (error) {
            alert('登录失败，请重试');
        }
    });
}); 