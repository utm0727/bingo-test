// 创建一个初始化函数
function initAPI() {
    // 检查 Supabase 是否已加载
    if (typeof window.supabase === 'undefined') {
        console.log('等待 Supabase 加载...', {
            supabase: window.supabase,
            location: window.location.pathname
        });
        setTimeout(initAPI, 100);
        return;
    }

    try {
        console.log('开始初始化 Supabase 客户端...', {
            hasCreateClient: !!window.supabase.createClient,
            location: window.location.pathname
        });
        
        // 初始化 Supabase 客户端
        const supabaseClient = window.supabase.createClient(
            'https://vwkkwthrkqyjmirsgqoo.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3a2t3dGhya3F5am1pcnNncW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwOTc2OTcsImV4cCI6MjA1MDY3MzY5N30.YV3HewlxV2MYe4G30vEhh-06npmXQ1_c7C4E_BIHCEo'
        );

        // 定义为全局变量
        window.API = {
            // 登录相关方法
            async login(teamName, leaderName) {
                try {
                    console.log('API.login 开始:', { teamName, leaderName });
                    
                    const { data: existingUser, error: selectError } = await supabaseClient
                        .from('users')
                        .select('*')
                        .eq('team_name', teamName)
                        .maybeSingle();

                    if (selectError) {
                        console.error('查询用户失败:', selectError);
                        return null;
                    }

                    let user = existingUser;
                    if (!user) {
                        const { data: newUser, error: insertError } = await supabaseClient
                            .from('users')
                            .insert([{
                                team_name: teamName,
                                leader_name: leaderName,
                                created_at: new Date().toISOString()
                            }])
                            .select()
                            .single();

                        if (insertError) {
                            console.error('创建用户失败:', insertError);
                            return null;
                        }
                        user = newUser;
                    }

                    return user;
                } catch (error) {
                    console.error('登录失败:', error);
                    return null;
                }
            },

            // 获取题目列表
            async getQuestions() {
                try {
                    const { data, error } = await supabaseClient
                        .from('questions')
                        .select('*')
                        .order('created_at', { ascending: true });

                    if (error) throw error;
                    return data;
                } catch (error) {
                    console.error('获取题目失败:', error);
                    return [];
                }
            },

            // 添加新题目
            async addQuestion(question) {
                try {
                    const { data, error } = await supabaseClient
                        .from('questions')
                        .insert([{ question }])
                        .select()
                        .single();

                    if (error) throw error;
                    return data;
                } catch (error) {
                    console.error('添加题目失败:', error);
                    throw error;
                }
            },

            // 删除题目
            async deleteQuestion(id) {
                try {
                    const { error } = await supabaseClient
                        .from('questions')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    return true;
                } catch (error) {
                    console.error('删除题目失败:', error);
                    throw error;
                }
            },

            // 更新游戏设置
            async updateGameSettings(gridSize) {
                try {
                    const { error } = await supabaseClient
                        .from('game_settings')
                        .upsert([{
                            id: 1, // 使用固定 ID，因为只需要一条设置记录
                            grid_size: parseInt(gridSize)
                        }]);

                    if (error) throw error;
                    return true;
                } catch (error) {
                    console.error('更新游戏设置失败:', error);
                    throw error;
                }
            },

            // 获取游戏设置
            async getGameSettings() {
                try {
                    const { data, error } = await supabaseClient
                        .from('game_settings')
                        .select('grid_size')
                        .single();

                    if (error) return { gridSize: 5 }; // 默认值
                    return { gridSize: data.grid_size };
                } catch (error) {
                    console.error('获取游戏设置失败:', error);
                    return { gridSize: 5 }; // 默认值
                }
            },

            // 检查游戏完成状态
            async checkGameCompletion(teamName) {
                try {
                    const { data, error } = await supabaseClient
                        .from('scores')
                        .select('*')
                        .eq('team_name', teamName)
                        .maybeSingle();

                    if (error) {
                        console.error('检查游戏完成状态失败:', error);
                        return false;
                    }
                    return !!data;
                } catch (error) {
                    console.error('检查游戏完成状态失败:', error);
                    return false;
                }
            },

            // 修改重置所有数据的方法
            async resetAllData() {
                try {
                    console.log('开始重置所有数据...');
                    
                    // 删除所有游戏相关数据，但保留管理员账户
                    const tables = ['scores', 'game_progress', 'questions'];
                    
                    for (const table of tables) {
                        console.log(`正在清空 ${table} 表...`);
                        const { error } = await supabaseClient
                            .from(table)
                            .delete()
                            .not('id', 'is', null); // 删除所有记录

                        if (error) {
                            console.error(`清空 ${table} 表失败:`, error);
                            throw error;
                        }
                        console.log(`${table} 表已清空`);
                    }

                    // 重置游戏设置
                    const { error: settingsError } = await supabaseClient
                        .from('game_settings')
                        .upsert([{
                            id: 1,
                            grid_size: 5 // 重置为默认值
                        }]);

                    if (settingsError) {
                        console.error('重置游戏设置失败:', settingsError);
                        throw settingsError;
                    }

                    console.log('所有数据已重置');
                    return true;
                } catch (error) {
                    console.error('重置数据失败:', error);
                    throw error;
                }
            },

            // 获取排行榜
            async getLeaderboard() {
                try {
                    const { data, error } = await supabaseClient
                        .from('scores')
                        .select(`
                            team_name,
                            score,
                            created_at,
                            users (
                                leader_name
                            )
                        `)
                        .order('score', { ascending: true })
                        .limit(10);

                    if (error) throw error;

                    return data.map(score => ({
                        teamName: score.team_name,
                        score: score.score,
                        leaderName: score.users?.leader_name,
                        timestamp: score.created_at
                    }));
                } catch (error) {
                    console.error('获取排行榜失败:', error);
                    return [];
                }
            },

            // 添加获取游戏进度方法
            async getGameProgress(teamName) {
                try {
                    const { data, error } = await supabaseClient
                        .from('game_progress')
                        .select('*')
                        .eq('team_name', teamName)
                        .maybeSingle();

                    if (error) {
                        console.error('获取游戏进度失败:', error);
                        return null;
                    }
                    return data?.progress || null;
                } catch (error) {
                    console.error('获取游戏进度失败:', error);
                    return null;
                }
            },

            // 添加保存游戏进度方法
            async saveGameProgress(teamName, progress) {
                try {
                    console.log('保存游戏进度:', { teamName, progress });
                    
                    // 如果有新的提交包含文件，先上传文件
                    for (const cell of progress.board) {
                        if (cell?.submission?.file) {  // 添加更严格的检查
                            try {
                                console.log('处理单元格文件:', {
                                    cellId: cell.id,
                                    hasFile: !!cell.submission.file,
                                    fileType: cell.submission.file?.type
                                });

                                const fileResult = await this.uploadTaskFile(
                                    teamName,
                                    cell.id,
                                    cell.submission.file
                                );
                                
                                // 保存完整的文件信息
                                cell.submission = {
                                    ...cell.submission,
                                    filePath: fileResult.path,
                                    fileUrl: fileResult.url,
                                    fileType: fileResult.fileType,
                                    fileName: fileResult.fileName,
                                    uploadTime: fileResult.uploadTime
                                };
                                
                                // 删除原始文件对象
                                delete cell.submission.file;
                            } catch (error) {
                                console.error('文件上传失败:', error, {
                                    cellId: cell.id,
                                    teamName: teamName
                                });
                            }
                        }
                    }

                    // 更新或插入游戏进度
                    const { data: existingProgress } = await supabaseClient
                        .from('game_progress')
                        .select('*')
                        .eq('team_name', teamName)
                        .single();

                    if (existingProgress) {
                        const { error: updateError } = await supabaseClient
                            .from('game_progress')
                            .update({ progress })
                            .eq('team_name', teamName);

                        if (updateError) throw updateError;
                    } else {
                        const { error: insertError } = await supabaseClient
                            .from('game_progress')
                            .insert([{
                                team_name: teamName,
                                progress: progress
                            }]);

                        if (insertError) throw insertError;
                    }

                    console.log('游戏进度保存成功');
                } catch (error) {
                    console.error('保存游戏进度失败:', error);
                    throw error;
                }
            },

            // 添加更新分数方法
            async updateScore(teamName, score) {
                try {
                    const { error } = await supabaseClient
                        .from('scores')
                        .upsert([
                            {
                                team_name: teamName,
                                score: score,
                                created_at: new Date().toISOString()
                            }
                        ], {
                            onConflict: 'team_name'
                        });

                    if (error) throw error;
                    return true;
                } catch (error) {
                    console.error('更新分数失败:', error);
                    throw error;
                }
            },

            // 添加获取随机题目方法
            async getRandomQuestions(count) {
                try {
                    const { data, error } = await supabaseClient
                        .from('questions')
                        .select('*');

                    if (error) throw error;

                    // 随机打乱题目顺序并返回指定数量
                    const shuffled = data.sort(() => 0.5 - Math.random());
                    return shuffled.slice(0, count);
                } catch (error) {
                    console.error('获取随机题目失败:', error);
                    return [];
                }
            },

            // 管理员登录方法
            async adminLogin(username, password) {
                try {
                    console.log('正在尝试管理员登录:', { username, password }); // 添加密码日志用于调试
                    const { data, error } = await supabaseClient
                        .from('admins')
                        .select('*')
                        .eq('username', username)
                        .single();

                    console.log('查询结果:', { data, error });

                    if (error) {
                        console.error('管理员登录查询失败:', error);
                        return false;
                    }

                    const loginSuccess = data && data.password === password;
                    console.log('密码验证结果:', {
                        hasData: !!data,
                        passwordMatch: loginSuccess,
                        dbPassword: data?.password,
                        inputPassword: password
                    });

                    if (loginSuccess) {
                        console.log('密码验证成功');
                        return true;
                    }

                    console.log('密码验证失败');
                    return false;
                } catch (error) {
                    console.error('管理员登录失败:', error);
                    return false;
                }
            },

            // 修改更新管理员凭证的方法
            async updateAdminCredentials(username, password) {
                try {
                    console.log('开始更新管理员信息:', { username });
                    
                    // 1. 先检查是否有现有管理员账户
                    const { data: existingAdmins, error: checkError } = await supabaseClient
                        .from('admins')
                        .select('*');

                    if (checkError) {
                        console.error('检查现有管理员失败:', checkError);
                        throw checkError;
                    }

                    console.log('现有管理员账户:', existingAdmins);

                    // 2. 如果有现有账户，删除它们
                    if (existingAdmins && existingAdmins.length > 0) {
                        const { error: deleteError } = await supabaseClient
                            .from('admins')
                            .delete()
                            .eq('username', existingAdmins[0].username);

                        if (deleteError) {
                            console.error('删除现有管理员失败:', deleteError);
                            throw deleteError;
                        }
                        console.log('成功删除现有管理员');
                    }

                    // 3. 插入新的管理员账户
                    const { data: newAdmin, error: insertError } = await supabaseClient
                        .from('admins')
                        .insert([{
                            username: username,
                            password: password,
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();

                    if (insertError) {
                        console.error('创建新管理员失败:', insertError);
                        throw insertError;
                    }

                    console.log('成功创建新管理员:', newAdmin);
                    return true;
                } catch (error) {
                    console.error('更新管理员信息失败:', error);
                    throw error;
                }
            },

            // 添加获取可用格子大小选项的方法
            async getAvailableGridSizes() {
                try {
                    const { data: questions, error } = await supabaseClient
                        .from('questions')
                        .select('*');

                    if (error) throw error;

                    // 获取不重复的题目数量
                    const uniqueQuestions = new Set(questions.map(q => q.question));
                    const questionCount = uniqueQuestions.size;

                    // 计算可用的格子大小选项
                    const availableSizes = [];
                    for (let size = 3; size <= 7; size++) {
                        if (questionCount >= size * size) {
                            availableSizes.push(size);
                        }
                    }

                    return availableSizes;
                } catch (error) {
                    console.error('获取可用格子大小失败:', error);
                    return [3]; // 默认至少返回 3x3
                }
            },

            // 添加批量删除题目的方法
            async batchDeleteQuestions(ids) {
                try {
                    console.log('正在批量删除题目:', ids);
                    const { error } = await supabaseClient
                        .from('questions')
                        .delete()
                        .in('id', ids);

                    if (error) {
                        console.error('批量删除题目失败:', error);
                        throw error;
                    }
                    console.log('批量删除题目成功');
                    return true;
                } catch (error) {
                    console.error('批量删除题目失败:', error);
                    throw error;
                }
            },

            // 修改文件上传方法
            async uploadTaskFile(teamName, taskId, file) {
                try {
                    // 添加参数验证
                    if (!teamName || !taskId || !file) {
                        console.error('无效的参数:', { teamName, taskId, file });
                        throw new Error('缺少必要的参数');
                    }

                    // 验证文件对象
                    if (!(file instanceof File)) {
                        console.error('无效的文件对象:', file);
                        throw new Error('无效的文件对象');
                    }

                    // 简化文件名，避免特殊字符
                    const fileExt = file.name.split('.').pop().toLowerCase();
                    const timestamp = Date.now();
                    const safeTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `${safeTeamName}_${taskId}_${timestamp}.${fileExt}`;

                    console.log('开始上传文件:', {
                        fileName,
                        fileType: file.type,
                        fileSize: file.size,
                        originalName: file.name
                    });

                    // 确保已初始化
                    await this.initStorage();

                    // 上传文件
                    const { data, error } = await supabaseClient.storage
                        .from('submissions')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: true,
                            contentType: file.type
                        });

                    if (error) {
                        console.error('上传失败:', error);
                        throw error;
                    }

                    console.log('文件上传成功:', data);

                    // 获取公共URL
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('submissions')
                        .getPublicUrl(fileName);

                    console.log('获取到的公共URL:', publicUrl);

                    return {
                        path: fileName,
                        url: publicUrl,
                        fileType: file.type,
                        fileName: file.name,
                        uploadTime: new Date().toISOString()
                    };
                } catch (error) {
                    console.error('上传文件失败:', error);
                    throw error;
                }
            },

            // 修改获取文件 URL 的方法
            async getSubmissionFileUrl(filePath) {
                try {
                    console.log('正在获取文件URL, 原始路径:', filePath);

                    // 如果是完整URL，验证并返回
                    if (filePath.startsWith('http')) {
                        const isValid = await this.validateFileUrl(filePath);
                        if (isValid) {
                            return filePath;
                        }
                        console.log('已保存的URL无效，尝试重新获取');
                    }

                    // 确保路径不以斜杠开头
                    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                    console.log('处理后的路径:', cleanPath);

                    // 尝试不同的方法获取URL
                    const methods = [
                        // 方法1：使用 getPublicUrl
                        async () => {
                            const { data: { publicUrl } } = supabaseClient.storage
                                .from('submissions')
                                .getPublicUrl(cleanPath);
                            return publicUrl;
                        },
                        // 方法2：使用 createSignedUrl
                        async () => {
                            const { data } = await supabaseClient.storage
                                .from('submissions')
                                .createSignedUrl(cleanPath, 3600);
                            return data?.signedUrl;
                        },
                        // 方法3：直接构建URL
                        async () => {
                            const baseUrl = 'https://vwkkwthrkqyjmirsgqoo.supabase.co/storage/v1/object/public/submissions/';
                            return baseUrl + encodeURIComponent(cleanPath);
                        }
                    ];

                    // 依次尝试每种方法
                    for (const method of methods) {
                        try {
                            const url = await method();
                            if (url && await this.validateFileUrl(url)) {
                                console.log('成功获取到有效的URL:', url);
                                return url;
                            }
                        } catch (error) {
                            console.error('尝试获取URL失败:', error);
                        }
                    }

                    throw new Error('无法获取有效的文件URL');
                } catch (error) {
                    console.error('获取文件URL失败:', error);
                    return null;
                }
            },

            // 在 API 对象中添加初始化存储桶的方法
            async initStorage() {
                try {
                    // 检查存储桶是否存在
                    const { data: buckets, error: listError } = await supabaseClient
                        .storage
                        .listBuckets();

                    if (listError) {
                        console.error('检查存储桶失败:', listError);
                        // 如果是权限错误，继续使用默认存储桶
                        return true;
                    }

                    // 检查 submissions 存储桶
                    const submissionsBucket = buckets?.find(b => b.name === 'submissions');
                    console.log('找到的存储桶:', submissionsBucket);

                    if (!submissionsBucket) {
                        console.log('存储桶不存在，使用默认存储桶');
                        return true;
                    }

                    return true;
                } catch (error) {
                    console.error('初始化存储失败:', error);
                    // 如果出错，继续使用默认存储桶
                    return true;
                }
            },

            // 添加文件转换方法
            async fileToBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            },

            // 添加文件验证方法
            async validateFileUrl(url) {
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    return response.ok;
                } catch (error) {
                    console.error('文件验证失败:', error);
                    return false;
                }
            }
        };

        console.log('API 初始化完成');
        // 触发一个事件表示 API 已经准备好
        window.dispatchEvent(new Event('APIReady'));
    } catch (error) {
        console.error('API 初始化失败:', error);
        // 如果失败，稍后重试
        setTimeout(initAPI, 100);
    }
}

// 添加一些调试信息
console.log('API.js 加载位置:', {
    location: window.location.pathname,
    script: document.currentScript?.src
});

// 立即开始初始化，不等待 DOMContentLoaded
initAPI(); 