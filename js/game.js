// Game class to manage the Bingo game
class Game {
    constructor() {
        this.teamName = '';
        this.leaderName = '';
        this.tasks = [];
        this.submissions = new Map();
        this.startTime = null;
        this.timer = null;
        this.isCompleted = false;

        // Initialize the game
        this.init();
    }

    async init() {
        try {
            // Get team info from localStorage
            const teamInfo = JSON.parse(localStorage.getItem('teamInfo'));
            if (!teamInfo) {
                window.location.href = '../index.html';
                return;
            }

            this.teamName = teamInfo.teamName;
            this.leaderName = teamInfo.leaderName;

            // Display team info
            document.getElementById('teamName').textContent = this.teamName;
            document.getElementById('leaderName').textContent = this.leaderName;

            // Get tasks from API
            const response = await window.api.getTasks();
            if (!response.success) {
                throw new Error('Failed to fetch tasks');
            }

            this.tasks = response.data;
            this.renderBoard();
            this.startTimer();

            // Load saved progress
            await this.loadProgress();

            // Add event listeners
            this.addEventListeners();
        } catch (error) {
            console.error('Game initialization failed:', error);
            alert('Failed to initialize game. Please try again.');
        }
    }

    renderBoard() {
        const board = document.getElementById('bingoBoard');
        board.innerHTML = '';

        this.tasks.forEach((task, index) => {
            const cell = document.createElement('div');
            cell.className = 'bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200';
            cell.innerHTML = `
                <div class="flex flex-col h-full">
                    <h3 class="font-medium text-gray-900 mb-2">Task ${index + 1}</h3>
                    <p class="text-gray-600 text-sm flex-grow">${task.question}</p>
                    <button class="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors duration-200"
                            onclick="window.game.openTaskModal(${index})">
                        Submit
                    </button>
                </div>
            `;

            if (this.submissions.has(index)) {
                cell.classList.add('bg-green-50');
                cell.querySelector('button').disabled = true;
                cell.querySelector('button').classList.add('bg-gray-400');
                cell.querySelector('button').classList.remove('hover:bg-indigo-700');
            }

            board.appendChild(cell);
        });

        this.updateProgress();
    }

    openTaskModal(taskIndex) {
        const task = this.tasks[taskIndex];
        const modal = document.getElementById('taskModal');
        const question = document.getElementById('taskQuestion');
        const form = document.getElementById('taskForm');

        question.textContent = task.question;
        modal.classList.remove('hidden');

        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.handleTaskSubmission(taskIndex);
        };
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        modal.classList.add('hidden');
        form.reset();
        document.getElementById('filePreview').classList.add('hidden');
    }

    async handleTaskSubmission(taskIndex) {
        try {
            const form = document.getElementById('taskForm');
            const description = form.querySelector('#taskDescription').value;
            const fileInput = form.querySelector('#taskFile');
            const file = fileInput.files[0];

            const submission = {
                taskIndex,
                description,
                timestamp: new Date().toISOString()
            };

            if (file) {
                const fileData = await this.uploadFile(file);
                submission.fileUrl = fileData.url;
                submission.fileType = fileData.type;
            }

            this.submissions.set(taskIndex, submission);
            await this.saveProgress();
            this.renderBoard();
            this.closeTaskModal();

            if (this.checkCompletion()) {
                await this.handleGameCompletion();
            }
        } catch (error) {
            console.error('Task submission failed:', error);
            alert('Failed to submit task. Please try again.');
        }
    }

    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('File upload failed');
            }

            const data = await response.json();
            return {
                url: data.url,
                type: file.type
            };
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    }

    async loadProgress() {
        try {
            const savedProgress = await window.api.getProgress(this.teamName);
            if (savedProgress.success && savedProgress.data) {
                this.submissions = new Map(Object.entries(savedProgress.data.submissions));
                this.startTime = new Date(savedProgress.data.startTime);
                this.renderBoard();
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    async saveProgress() {
        try {
            const progress = {
                teamName: this.teamName,
                startTime: this.startTime.toISOString(),
                submissions: Object.fromEntries(this.submissions)
            };

            await window.api.saveProgress(progress);
        } catch (error) {
            console.error('Failed to save progress:', error);
            alert('Failed to save progress. Please try again.');
        }
    }

    startTimer() {
        if (!this.startTime) {
            this.startTime = new Date();
        }

        const updateTimer = () => {
            const now = new Date();
            const diff = now - this.startTime;
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            document.getElementById('timer').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        updateTimer();
        this.timer = setInterval(updateTimer, 1000);
    }

    updateProgress() {
        const total = this.tasks.length;
        const completed = this.submissions.size;
        const percentage = Math.round((completed / total) * 100);
        
        document.getElementById('progress').textContent = `${percentage}%`;
        document.getElementById('status').textContent = this.isCompleted ? 'Completed' : 'Playing';
    }

    checkCompletion() {
        return this.submissions.size === this.tasks.length;
    }

    async handleGameCompletion() {
        if (this.isCompleted) return;

        this.isCompleted = true;
        clearInterval(this.timer);

        const completionTime = new Date() - this.startTime;
        const hours = Math.floor(completionTime / 3600000);
        const minutes = Math.floor((completionTime % 3600000) / 60000);
        const seconds = Math.floor((completionTime % 60000) / 1000);
        const timeString = `${hours}:${minutes}:${seconds}`;

        try {
            await window.api.submitGame({
                teamName: this.teamName,
                leaderName: this.leaderName,
                completionTime: timeString,
                submissions: Object.fromEntries(this.submissions)
            });

            window.location.href = 'completion.html';
        } catch (error) {
            console.error('Game submission failed:', error);
            alert('Failed to submit game. Please try again.');
        }
    }

    async handleSave() {
        await this.saveProgress();
        alert('Progress saved successfully!');
    }

    async handleSubmit() {
        if (!this.checkCompletion()) {
            alert('Please complete all tasks before submitting.');
            return;
        }

        await this.handleGameCompletion();
    }
}

// Initialize game
window.game = new Game();

// Handle logout
function handleLogout() {
    localStorage.removeItem('teamInfo');
    window.location.href = '../index.html';
} 