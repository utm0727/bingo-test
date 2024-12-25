// 确保 Supabase 客户端只初始化一次
const supabaseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 检查当前页面是否是登录页面
const isLoginPage = window.location.pathname.includes('login.html');

window.onload = async function() {
    try {
        const currentUser = sessionStorage.getItem('currentUser');
        
        // 如果在登录页面但已经登录，重定向到主页
        if (isLoginPage && currentUser) {
            window.location.href = './';
            return;
        }
        
        // 如果不在登录页面且未登录，重定向到登录页
        if (!isLoginPage && !currentUser) {
            window.location.href = './login.html';
            return;
        }
    } catch (error) {
        console.error('初始化失败:', error);
    }
}; 