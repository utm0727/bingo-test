// 获取题库
async function getQuestions() {
    try {
        const { data, error } = await supabase
            .from('questions')
            .select(`
                *,
                created_by:users(username)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('获取题库失败:', error);
        throw error;
    }
}

// 添加新题目
async function addQuestion(content, category) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    try {
        const { data, error } = await supabase
            .from('questions')
            .insert({
                content,
                category,
                created_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('添加题目失败:', error);
        throw error;
    }
}

// 更新题目
async function updateQuestion(id, content, category) {
    try {
        const { data, error } = await supabase
            .from('questions')
            .update({ content, category })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;

    } catch (error) {
        console.error('更新题目失败:', error);
        throw error;
    }
} 