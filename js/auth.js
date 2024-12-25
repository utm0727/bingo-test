// 确保 Supabase 客户端只初始化一次
const supabaseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 其他 auth.js 代码... 

// 修改重定向路径为相对路径
window.onload = async function() {
    try {
        const currentUser = sessionStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = '/bingo-test/login.html';  // 修改这里
            return;
        }
        // ... 其他代码
    } catch (error) {
        console.error('初始化失败:', error);
    }
}; 