const supabaseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 玩家登录
async function playerLogin(username, password) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select()
            .eq('username', username)
            .eq('password', password)
            .eq('is_admin', false)  // 确保是玩家账号
            .single();

        if (error) throw error;
        if (!data) throw new Error('玩家账号或密码错误');

        sessionStorage.setItem('currentPlayer', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('玩家登录失败:', error);
        throw error;
    }
}

// 管理员登录
async function adminLogin(username, password) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select()
            .eq('username', username)
            .eq('password', password)
            .eq('is_admin', true)  // 确保是管理员账号
            .single();

        if (error) throw error;
        if (!data) throw new Error('管理员账号或密码错误');

        sessionStorage.setItem('currentAdmin', JSON.stringify(data));
        return data;
    } catch (error) {
        console.error('管理员登录失败:', error);
        throw error;
    }
}

// 检查玩家登录状态
function checkPlayerLogin() {
    return sessionStorage.getItem('currentPlayer') !== null;
}

// 检查管理员登录状态
function checkAdminLogin() {
    return sessionStorage.getItem('currentAdmin') !== null;
}

// 检查当前页面是否是登录页面
const isLoginPage = window.location.pathname.includes('login.html');

window.onload = async function() {
    try {
        const currentPlayer = sessionStorage.getItem('currentPlayer');
        const currentAdmin = sessionStorage.getItem('currentAdmin');
        
        // 如果在登录页面但已经登录，重定向到主页
        if (isLoginPage && (currentPlayer || currentAdmin)) {
            window.location.href = './';
            return;
        }
        
        // 如果不在登录页面且未登录，重定向到登录页
        if (!isLoginPage && !currentPlayer && !currentAdmin) {
            window.location.href = './login.html';
            return;
        }
    } catch (error) {
        console.error('初始化失败:', error);
    }
}; 