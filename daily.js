// ==========================================
// Daily System - Check-in, Tasks, Rewards
// ==========================================

const DailySystem = {
    
    // ==========================================
    // Daily Check-in
    // ==========================================
    
    checkInRewards: [
        { day: 1, reward: 10, type: 'stars', label: '10 ⭐' },
        { day: 2, reward: 1, type: 'clear_small', label: '1 🧹' },
        { day: 3, reward: 20, type: 'stars', label: '20 ⭐' },
        { day: 4, reward: 1, type: 'shake', label: '1 📳' },
        { day: 5, reward: 30, type: 'stars', label: '30 ⭐' },
        { day: 6, reward: 1, type: 'revive', label: '1 💫' },
        { day: 7, reward: 100, type: 'stars', label: '100 ⭐' }
    ],
    
    getCheckInData() {
        const data = JSON.parse(localStorage.getItem('dailyCheckIn') || '{}');
        return {
            lastCheckIn: data.lastCheckIn || null,
            streak: data.streak || 0,
            checkedToday: this.isCheckedToday(data.lastCheckIn)
        };
    },
    
    isCheckedToday(lastCheckIn) {
        if (!lastCheckIn) return false;
        const today = new Date().toDateString();
        const last = new Date(lastCheckIn).toDateString();
        return today === last;
    },
    
    canCheckIn() {
        return !this.getCheckInData().checkedToday;
    },
    
    checkIn() {
        if (!this.canCheckIn()) {
            showToast('Already checked in today! ✅');
            return null;
        }
        
        const data = this.getCheckInData();
        const today = new Date();
        const lastDate = data.lastCheckIn ? new Date(data.lastCheckIn) : null;
        
        // Check if streak continues (checked in yesterday)
        let newStreak = 1;
        if (lastDate) {
            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                newStreak = (data.streak % 7) + 1; // Loop back after 7
            } else if (diffDays === 0) {
                return null; // Already checked in
            }
        }
        
        // Get reward
        const reward = this.checkInRewards[newStreak - 1];
        
        // Grant reward
        this.grantReward(reward);
        
        // Save data
        localStorage.setItem('dailyCheckIn', JSON.stringify({
            lastCheckIn: today.toISOString(),
            streak: newStreak
        }));
        
        // Haptic feedback
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        
        showToast(`Day ${newStreak} reward: ${reward.label}! 🎁`);
        
        return { day: newStreak, reward };
    },
    
    grantReward(reward) {
        if (reward.type === 'stars') {
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            userData.stars = (userData.stars || 0) + reward.reward;
            localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
            if (window.Shop) Shop.userStars = userData.stars;
        } else {
            const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
            powerups[reward.type] = (powerups[reward.type] || 0) + reward.reward;
            localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        }
    },
    
    // ==========================================
    // Daily Tasks
    // ==========================================
    
    taskDefinitions: [
        { id: 'play_3', name: 'Play 3 Games', target: 3, reward: 15, rewardType: 'stars', icon: '🎮' },
        { id: 'score_500', name: 'Score 500 Points', target: 500, reward: 20, rewardType: 'stars', icon: '🎯' },
        { id: 'merge_10', name: 'Merge 10 Fruits', target: 10, reward: 10, rewardType: 'stars', icon: '🍉' },
        { id: 'play_5', name: 'Play 5 Games', target: 5, reward: 1, rewardType: 'clear_small', icon: '🎲' },
        { id: 'score_1000', name: 'Score 1000 Points', target: 1000, reward: 30, rewardType: 'stars', icon: '🏆' },
        { id: 'merge_20', name: 'Merge 20 Fruits', target: 20, reward: 1, rewardType: 'shake', icon: '🔥' }
    ],
    
    getTodaysTasks() {
        const saved = JSON.parse(localStorage.getItem('dailyTasks') || '{}');
        const today = new Date().toDateString();
        
        // Reset if new day
        if (saved.date !== today) {
            // Pick 3 random tasks
            const shuffled = [...this.taskDefinitions].sort(() => Math.random() - 0.5);
            const todayTasks = shuffled.slice(0, 3).map(t => ({
                ...t,
                progress: 0,
                completed: false,
                claimed: false
            }));
            
            const newData = {
                date: today,
                tasks: todayTasks,
                gamesPlayed: 0,
                totalScore: 0,
                mergeCount: 0
            };
            
            localStorage.setItem('dailyTasks', JSON.stringify(newData));
            return newData;
        }
        
        return saved;
    },
    
    updateTaskProgress(type, value) {
        const data = this.getTodaysTasks();
        
        // Update counters
        if (type === 'game') data.gamesPlayed += value;
        if (type === 'score') data.totalScore += value;
        if (type === 'merge') data.mergeCount += value;
        
        // Check task progress
        data.tasks.forEach(task => {
            if (task.completed) return;
            
            if (task.id.startsWith('play_')) {
                task.progress = data.gamesPlayed;
            } else if (task.id.startsWith('score_')) {
                task.progress = data.totalScore;
            } else if (task.id.startsWith('merge_')) {
                task.progress = data.mergeCount;
            }
            
            if (task.progress >= task.target) {
                task.completed = true;
            }
        });
        
        localStorage.setItem('dailyTasks', JSON.stringify(data));
        this.updateTaskUI();
    },
    
    claimTaskReward(taskId) {
        const data = this.getTodaysTasks();
        const task = data.tasks.find(t => t.id === taskId);
        
        if (!task || !task.completed || task.claimed) {
            return false;
        }
        
        // Grant reward
        this.grantReward({ type: task.rewardType, reward: task.reward });
        
        task.claimed = true;
        localStorage.setItem('dailyTasks', JSON.stringify(data));
        
        const label = task.rewardType === 'stars' ? `${task.reward} ⭐` : `1 ${task.icon}`;
        showToast(`Claimed: ${label}! 🎁`);
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        
        this.updateTaskUI();
        return true;
    },
    
    updateTaskUI() {
        const container = document.getElementById('tasks-list');
        if (!container) return;
        
        const data = this.getTodaysTasks();
        
        container.innerHTML = data.tasks.map(task => {
            const percent = Math.min(100, (task.progress / task.target) * 100);
            const rewardLabel = task.rewardType === 'stars' ? `${task.reward}⭐` : `1x`;
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''} ${task.claimed ? 'claimed' : ''}">
                    <div class="task-icon">${task.icon}</div>
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-progress-bar">
                            <div class="task-progress-fill" style="width: ${percent}%"></div>
                        </div>
                        <div class="task-progress-text">${task.progress}/${task.target}</div>
                    </div>
                    <div class="task-reward">
                        ${task.claimed ? '✅' : task.completed ? 
                            `<button class="claim-btn" onclick="DailySystem.claimTaskReward('${task.id}')">${rewardLabel}</button>` : 
                            rewardLabel}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // ==========================================
    // Initialize
    // ==========================================
    
    init() {
        this.getTodaysTasks();
        this.updateTaskUI();
        this.updateCheckInUI();
    },
    
    updateCheckInUI() {
        const data = this.getCheckInData();
        const container = document.getElementById('checkin-days');
        if (!container) return;
        
        container.innerHTML = this.checkInRewards.map((reward, i) => {
            const day = i + 1;
            const isPast = day < data.streak || (day === data.streak && data.checkedToday);
            const isToday = day === data.streak + 1 && !data.checkedToday;
            const isFuture = day > data.streak + 1 || (day > data.streak && data.checkedToday);
            
            return `
                <div class="checkin-day ${isPast ? 'claimed' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'locked' : ''}">
                    <div class="day-num">Day ${day}</div>
                    <div class="day-reward">${reward.label}</div>
                    ${isPast ? '<div class="day-check">✓</div>' : ''}
                </div>
            `;
        }).join('');
        
        // Update button
        const btn = document.getElementById('checkin-btn');
        if (btn) {
            btn.disabled = data.checkedToday;
            btn.textContent = data.checkedToday ? '✅ Checked In' : '📅 Check In';
        }
    }
};

// ==========================================
// Lucky Wheel
// ==========================================

const LuckyWheel = {
    prizes: [
        { label: '5 ⭐', type: 'stars', value: 5, color: '#ff6b6b' },
        { label: '10 ⭐', type: 'stars', value: 10, color: '#ffd93d' },
        { label: '🧹', type: 'clear_small', value: 1, color: '#6bcb77' },
        { label: '20 ⭐', type: 'stars', value: 20, color: '#4d96ff' },
        { label: '📳', type: 'shake', value: 1, color: '#ff6b6b' },
        { label: '50 ⭐', type: 'stars', value: 50, color: '#ffd93d' },
        { label: '💫', type: 'revive', value: 1, color: '#6bcb77' },
        { label: '100 ⭐', type: 'stars', value: 100, color: '#4d96ff' }
    ],
    
    isSpinning: false,
    
    getWheelData() {
        const data = JSON.parse(localStorage.getItem('luckyWheel') || '{}');
        const today = new Date().toDateString();
        
        if (data.date !== today) {
            return { date: today, freeSpins: 1, paidSpins: 0 };
        }
        return data;
    },
    
    saveWheelData(data) {
        localStorage.setItem('luckyWheel', JSON.stringify(data));
    },
    
    canFreeSpin() {
        return this.getWheelData().freeSpins > 0;
    },
    
    getSpinCost() {
        return 20; // Stars per paid spin
    },
    
    spin(isPaid = false) {
        if (this.isSpinning) return;
        
        const data = this.getWheelData();
        
        if (!isPaid && data.freeSpins <= 0) {
            showToast('No free spins left! Use Stars to spin.');
            return;
        }
        
        if (isPaid) {
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            if ((userData.stars || 0) < this.getSpinCost()) {
                showToast('Not enough Stars!');
                return;
            }
            userData.stars -= this.getSpinCost();
            localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
            if (window.Shop) Shop.userStars = userData.stars;
        } else {
            data.freeSpins--;
            this.saveWheelData(data);
        }
        
        this.isSpinning = true;
        
        // Random prize (weighted towards lower prizes)
        const weights = [25, 20, 15, 15, 10, 8, 5, 2]; // Lower = rarer
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let prizeIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                prizeIndex = i;
                break;
            }
        }
        
        const prize = this.prizes[prizeIndex];
        
        // Animate wheel
        this.animateWheel(prizeIndex, () => {
            // Grant prize
            DailySystem.grantReward({ type: prize.type, reward: prize.value });
            
            showToast(`You won ${prize.label}! 🎉`);
            
            if (window.TelegramGame) {
                window.TelegramGame.hapticFeedback('success');
            }
            
            this.isSpinning = false;
            this.updateWheelUI();
        });
    },
    
    animateWheel(prizeIndex, callback) {
        const wheel = document.getElementById('wheel-spinner');
        if (!wheel) {
            callback();
            return;
        }
        
        const segmentAngle = 360 / this.prizes.length;
        const targetAngle = 360 * 5 + (360 - prizeIndex * segmentAngle - segmentAngle / 2);
        
        wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
        wheel.style.transform = `rotate(${targetAngle}deg)`;
        
        setTimeout(() => {
            wheel.style.transition = 'none';
            wheel.style.transform = `rotate(${targetAngle % 360}deg)`;
            callback();
        }, 4000);
    },
    
    updateWheelUI() {
        const data = this.getWheelData();
        const freeBtn = document.getElementById('spin-free-btn');
        const paidBtn = document.getElementById('spin-paid-btn');
        
        if (freeBtn) {
            freeBtn.disabled = data.freeSpins <= 0 || this.isSpinning;
            freeBtn.textContent = data.freeSpins > 0 ? `🎡 Free Spin (${data.freeSpins})` : '❌ No Free Spins';
        }
        
        if (paidBtn) {
            paidBtn.textContent = `🎡 Spin (${this.getSpinCost()}⭐)`;
        }
    },
    
    init() {
        this.updateWheelUI();
        this.drawWheel();
    },
    
    drawWheel() {
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        const segmentAngle = (2 * Math.PI) / this.prizes.length;
        
        this.prizes.forEach((prize, i) => {
            const startAngle = i * segmentAngle - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;
            
            // Draw segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = prize.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(prize.label, radius - 15, 5);
            ctx.restore();
        });
        
        // Center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();
    }
};

// Export
window.DailySystem = DailySystem;
window.LuckyWheel = LuckyWheel;
