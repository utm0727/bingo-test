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
                    console.log('检查游戏完成状态:', teamName);
                    
                    const { data, error } = await supabaseClient
                        .from('leaderboard')
                        .select('*')
                        .eq('team_name', teamName)
                        .single();

                    if (error && error.code !== 'PGRST116') {  // PGRST116 是"没有找到记录"的错误
                        console.error('检查游戏完成状态失败:', error);
                        return false;
                    }

                    return !!data;  // 如果有记录就表示完成了
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
                    console.log('开始获取排行榜数据');
                    
                    // 从 leaderboard 表获取数据
                    const { data, error } = await supabaseClient
                        .from('leaderboard')
                        .select('*')
                        .order('completion_time', { ascending: true })
                        .headers({
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        });

                    if (error) {
                        console.error('获取排行榜数据失败:', error);
                        return [];
                    }

                    console.log('原始排行榜数据:', data);

                    // 确保数据存在且是数组
                    if (!data || !Array.isArray(data)) {
                        console.log('没有找到排行榜数据');
                        return [];
                    }

                    // 格式化数据
                    const formattedData = data.map(entry => ({
                        team_name: entry.team_name,
                        completion_time: entry.completion_time
                    }));

                    console.log('格式化后的排行榜数据:', formattedData);
                    return formattedData;
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

            // 修改 saveGameProgress 方法
            async saveGameProgress(teamName, progressData) {
                try {
                    console.log('保存游戏进度:', { teamName, progress: progressData });
                    
                    // 处理每个格子的提交内容
                    const processedBoard = await Promise.all(progressData.board.map(async (cell) => {
                        if (cell.submission) {
                            // 创建基础的提交信息
                            const processedSubmission = {
                                timestamp: cell.submission.timestamp,
                                description: cell.submission.description || null,
                                // 保留之前的文件信息
                                fileUrl: cell.submission.fileUrl,
                                fileName: cell.submission.fileName,
                                storagePath: cell.submission.storagePath,
                                fileType: cell.submission.fileType
                            };

                            // 如果有新的文件数据，上传到 Storage
                            if (cell.submission.file) {
                                try {
                                    // 生成安全的文件名
                                    const timestamp = Date.now();
                                    const originalName = cell.submission.fileName;
                                    const fileExt = originalName.split('.').pop().toLowerCase();
                                    const safeFileName = `${teamName}_${timestamp}.${fileExt}`;
                                    
                                    console.log('准备上传文件:', {
                                        fileName: safeFileName,
                                        fileType: cell.submission.file.type,
                                        fileSize: cell.submission.file.size
                                    });

                                    // 直接上传文件对象
                                    const { data, error: uploadError } = await supabaseClient
                                        .storage
                                        .from('submissions')
                                        .upload(safeFileName, cell.submission.file, {
                                            contentType: cell.submission.file.type,
                                            duplex: 'half',
                                            headers: {
                                                'x-upsert': 'true'
                                            }
                                        });

                                    if (uploadError) {
                                        console.error('上传错误:', uploadError);
                                        throw uploadError;
                                    }

                                    // 获取文件的公共URL
                                    const { data: { publicUrl } } = supabaseClient
                                        .storage
                                        .from('submissions')
                                        .getPublicUrl(safeFileName);

                                    // 更新文件信息
                                    processedSubmission.fileUrl = publicUrl;
                                    processedSubmission.fileName = originalName;
                                    processedSubmission.storagePath = safeFileName;
                                    processedSubmission.fileType = cell.submission.file.type;
                                    
                                    console.log('文件上传成功:', {
                                        publicUrl,
                                        fileName: originalName,
                                        storagePath: safeFileName,
                                        fileType: cell.submission.file.type
                                    });
                                } catch (error) {
                                    console.error('文件上传失败:', error);
                                    throw error;
                                }
                            }

                            return {
                                ...cell,
                                submission: processedSubmission
                            };
                        }
                        return cell;
                    }));

                    // 更新进度数据
                    const { error } = await supabaseClient
                        .from('game_progress')
                        .upsert({
                            team_name: teamName,
                            progress: {
                                ...progressData,
                                board: processedBoard
                            }
                        }, {
                            onConflict: 'team_name'
                        });

                    if (error) throw error;
                    console.log('游戏进度保存成功');
                    return true;
                } catch (error) {
                    console.error('保存游戏进度失败:', error);
                    throw error;
                }
            },

            // 修改更新分数方法
            async updateScore(teamName, completionTime) {
                try {
                    console.log('更新分数:', { teamName, completionTime });

                    // 先检查是否已有记录
                    const { data: existingScore, error: checkError } = await supabaseClient
                        .from('leaderboard')
                        .select('*')
                        .eq('team_name', teamName)
                        .single();

                    if (checkError && checkError.code !== 'PGRST116') {  // PGRST116 是"没有找到记录"的错误
                        console.error('检查分数记录失败:', checkError);
                        return false;
                    }

                    if (existingScore) {
                        // 如果已有记录，使用 update
                        const { error: updateError } = await supabaseClient
                            .from('leaderboard')
                            .update({ completion_time: completionTime })
                            .eq('team_name', teamName);

                        if (updateError) {
                            console.error('更新分数失败:', updateError);
                            return false;
                        }
                    } else {
                        // 如果没有记录，使用 insert
                        const { error: insertError } = await supabaseClient
                            .from('leaderboard')
                            .insert([{
                                team_name: teamName,
                                completion_time: completionTime
                            }]);

                        if (insertError) {
                            console.error('插入分数失败:', insertError);
                            return false;
                        }
                    }

                    console.log('分数更新成功');
                    return true;
                } catch (error) {
                    console.error('更新分数失败:', error);
                    // 不抛出错误，让游戏继续进行
                    return false;
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
                    // 简化文件名，避免特殊字符
                    const fileExt = file.name.split('.').pop().toLowerCase();
                    const timestamp = Date.now();
                    const safeTeamName = teamName.replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `${safeTeamName}_${taskId}_${timestamp}.${fileExt}`;

                    console.log('开始上传文件:', {
                        fileName,
                        fileType: file.type,
                        fileSize: file.size
                    });

                    // 上传文件
                    const { data, error } = await supabaseClient.storage
                        .from('submissions')
                        .upload(fileName, file, {
                            cacheControl: '3600',
                            upsert: true,
                            contentType: file.type
                        });

                    if (error) throw error;

                    console.log('文件上传成功:', data);

                    // 获取公共URL
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('submissions')
                        .getPublicUrl(fileName);

                    console.log('获取到的公共URL:', publicUrl);

                    // 保存完整信息
                    return {
                        path: fileName,  // 保存文件名作为路径
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

                    // 如果是完整URL，直接返回
                    if (filePath.startsWith('http')) {
                        return filePath;
                    }

                    // 获取存储桶中的文件列表
                    const { data: files, error: listError } = await supabaseClient.storage
                        .from('submissions')
                        .list();

                    if (listError) {
                        console.error('获取文件列表失败:', listError);
                        throw listError;
                    }

                    console.log('存储桶中的文件:', files);

                    // 尝试找到匹配的文件
                    const file = files.find(f => f.name === filePath);
                    if (!file) {
                        console.error('文件未找到:', filePath);
                        throw new Error('文件未找到');
                    }

                    // 获取公共URL
                    const { data: { publicUrl } } = supabaseClient.storage
                        .from('submissions')
                        .getPublicUrl(file.name);

                    console.log('获取到的公共URL:', publicUrl);
                    return publicUrl;
                } catch (error) {
                    console.error('获取文件URL失败:', error);
                    
                    // 尝试直接构建URL
                    try {
                        const baseUrl = `${supabaseClient.storageUrl}/object/public/submissions/`;
                        const fullUrl = baseUrl + encodeURIComponent(filePath);
                        console.log('尝试直接构建URL:', fullUrl);
                        return fullUrl;
                    } catch (fallbackError) {
                        console.error('构建URL失败:', fallbackError);
                        return null;
                    }
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
                        throw listError;
                    }

                    const bucketExists = buckets?.some(b => b.name === 'submissions');
                    
                    if (!bucketExists) {
                        // 创建存储桶，设置为公开
                        const { error: createError } = await supabaseClient
                            .storage
                            .createBucket('submissions', {
                                public: true,  // 修改为公开
                                allowedMimeTypes: ['image/*', 'video/*']
                            });

                        if (createError) throw createError;
                        console.log('存储桶创建成功');
                    } else {
                        // 如果存储桶已存在，更新为公开
                        const { error: updateError } = await supabaseClient
                            .storage
                            .updateBucket('submissions', {
                                public: true
                            });

                        if (updateError) {
                            console.error('更新存储桶失败:', updateError);
                        }
                    }

                    return true;
                } catch (error) {
                    console.error('初始化存储失败:', error);
                    throw error;
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