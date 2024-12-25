// 确保 Supabase 客户端只初始化一次
const supabaseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 其他 auth.js 代码... 