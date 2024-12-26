// API class to handle all server communications
class API {
    constructor() {
        this.supabase = supabase.createClient(
            'https://xyzcompany.supabase.co',
            'your-anon-key'
        );
    }

    async getTasks() {
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*')
                .order('id');

            if (error) throw error;

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getProgress(teamName) {
        try {
            const { data, error } = await this.supabase
                .from('progress')
                .select('*')
                .eq('team_name', teamName)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to fetch progress:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async saveProgress(progress) {
        try {
            const { error } = await this.supabase
                .from('progress')
                .upsert({
                    team_name: progress.teamName,
                    start_time: progress.startTime,
                    submissions: progress.submissions
                });

            if (error) throw error;

            return {
                success: true
            };
        } catch (error) {
            console.error('Failed to save progress:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async submitGame(gameData) {
        try {
            const { error } = await this.supabase
                .from('leaderboard')
                .upsert({
                    team_name: gameData.teamName,
                    leader_name: gameData.leaderName,
                    completion_time: gameData.completionTime,
                    submissions: gameData.submissions
                });

            if (error) throw error;

            return {
                success: true
            };
        } catch (error) {
            console.error('Failed to submit game:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getLeaderboard() {
        try {
            const { data, error } = await this.supabase
                .from('leaderboard')
                .select('*')
                .order('completion_time');

            if (error) throw error;

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async uploadFile(file) {
        try {
            const timestamp = Date.now();
            const fileExt = file.name.split('.').pop();
            const filePath = `uploads/${timestamp}.${fileExt}`;

            const { error: uploadError } = await this.supabase.storage
                .from('bingo-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl }, error: urlError } = await this.supabase.storage
                .from('bingo-files')
                .getPublicUrl(filePath);

            if (urlError) throw urlError;

            return {
                success: true,
                url: publicUrl
            };
        } catch (error) {
            console.error('Failed to upload file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize API
window.api = new API(); 