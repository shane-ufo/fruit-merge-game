// ==========================================
// Leaderboard System
// ==========================================

const Leaderboard = {
    currentTab: 'global',
    
    // Mock data for demo (in production, fetch from backend)
    mockData: {
        global: [
            { id: 1, name: 'Alex', score: 12500, avatar: '🦊' },
            { id: 2, name: 'Maria', score: 11200, avatar: '🐱' },
            { id: 3, name: 'John', score: 10800, avatar: '🐶' },
            { id: 4, name: 'Emma', score: 9500, avatar: '🐰' },
            { id: 5, name: 'David', score: 8700, avatar: '🦁' },
            { id: 6, name: 'Sophie', score: 7900, avatar: '🐼' },
            { id: 7, name: 'Mike', score: 7200, avatar: '🐨' },
            { id: 8, name: 'Lisa', score: 6500, avatar: '🦄' },
            { id: 9, name: 'Tom', score: 5800, avatar: '🐸' },
            { id: 10, name: 'Anna', score: 5100, avatar: '🐙' },
        ],
        friends: [
            { id: 2, name: 'Maria', score: 11200, avatar: '🐱' },
            { id: 5, name: 'David', score: 8700, avatar: '🦁' },
            { id: 8, name: 'Lisa', score: 6500, avatar: '🦄' },
        ],
        weekly: [
            { id: 4, name: 'Emma', score: 4500, avatar: '🐰' },
            { id: 1, name: 'Alex', score: 4200, avatar: '🦊' },
            { id: 7, name: 'Mike', score: 3800, avatar: '🐨' },
            { id: 3, name: 'John', score: 3200, avatar: '🐶' },
            { id: 9, name: 'Tom', score: 2900, avatar: '🐸' },
        ]
    },

    // Initialize
    init() {
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        // Leaderboard button
        document.getElementById('leaderboard-btn')?.addEventListener('click', () => {
            this.openLeaderboard();
        });

        // Close button
        document.getElementById('close-leaderboard')?.addEventListener('click', () => {
            this.closeLeaderboard();
        });

        // Tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Close on backdrop click
        document.getElementById('leaderboard-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'leaderboard-modal') {
                this.closeLeaderboard();
            }
        });
    },

    // Open leaderboard
    openLeaderboard() {
        this.renderLeaderboard();
        document.getElementById('leaderboard-modal')?.classList.add('show');
    },

    // Close leaderboard
    closeLeaderboard() {
        document.getElementById('leaderboard-modal')?.classList.remove('show');
    },

    // Switch tab
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        this.renderLeaderboard();
    },

    // Render leaderboard
    renderLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        const data = this.mockData[this.currentTab] || [];
        const myScore = window.GameAPI?.getBestScore() || 0;
        const myName = window.TelegramGame?.getUser()?.first_name || 'You';

        let html = '';

        data.forEach((entry, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const isYou = false;  // Would compare with actual user ID

            let rankDisplay = rank;
            if (rank === 1) rankDisplay = '🥇';
            else if (rank === 2) rankDisplay = '🥈';
            else if (rank === 3) rankDisplay = '🥉';

            html += `
                <div class="leaderboard-entry ${isTop3 ? 'top-3' : ''} ${isYou ? 'you' : ''}">
                    <div class="rank ${isTop3 ? 'rank-medal' : ''}">${rankDisplay}</div>
                    <div class="player-avatar">${entry.avatar}</div>
                    <div class="player-name">${entry.name}</div>
                    <div class="player-score">${this.formatScore(entry.score)}</div>
                </div>
            `;
        });

        // If no data
        if (data.length === 0) {
            html = '<div style="text-align: center; padding: 40px; opacity: 0.5;">No data available</div>';
        }

        container.innerHTML = html;

        // Update your rank
        const yourRank = this.findUserRank(data, myScore);
        document.getElementById('your-rank').textContent = yourRank ? `#${yourRank}` : '#--';
    },

    // Find user's rank
    findUserRank(data, myScore) {
        // Simple ranking based on score
        let rank = 1;
        for (const entry of data) {
            if (entry.score > myScore) {
                rank++;
            }
        }
        return rank;
    },

    // Format score with commas
    formatScore(score) {
        return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Submit score to leaderboard (production: send to backend)
    async submitScore(score) {
        const user = window.TelegramGame?.getUser();
        
        console.log('[Leaderboard] Submitting score:', score, 'for user:', user?.first_name);
        
        // In production, send to your backend:
        // await fetch(`${CONFIG.BACKEND_URL}/leaderboard/submit`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         userId: user?.id,
        //         score: score,
        //         initData: window.Telegram?.WebApp?.initData
        //     })
        // });
        
        return true;
    },

    // Fetch leaderboard from backend (production)
    async fetchLeaderboard(type = 'global') {
        // In production:
        // const response = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/${type}`);
        // return response.json();
        
        return this.mockData[type] || [];
    }
};

// ==========================================
// Referral System
// ==========================================

const ReferralSystem = {
    
    // Initialize
    init() {
        this.setupEventListeners();
        this.loadReferralData();
    },

    // Setup event listeners
    setupEventListeners() {
        // Invite button (can be added to UI)
        document.getElementById('invite-btn')?.addEventListener('click', () => {
            this.sendInvite();
        });

        // Copy referral link
        document.getElementById('copy-referral')?.addEventListener('click', () => {
            this.copyReferralLink();
        });

        // Close referral modal
        document.getElementById('close-referral')?.addEventListener('click', () => {
            this.closeReferralModal();
        });
    },

    // Load referral data
    loadReferralData() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        document.getElementById('friends-invited').textContent = userData.friendsInvited || 0;
        document.getElementById('stars-earned').textContent = userData.referralStars || 0;
        
        // Set referral link
        const linkInput = document.getElementById('referral-link-input');
        if (linkInput && window.TelegramGame) {
            linkInput.value = window.TelegramGame.getReferralLink();
        }
    },

    // Send invite
    sendInvite() {
        if (window.TelegramGame) {
            window.TelegramGame.shareReferralLink();
        } else {
            this.copyReferralLink();
        }
    },

    // Copy referral link
    copyReferralLink() {
        const link = window.TelegramGame?.getReferralLink() || window.location.href;
        navigator.clipboard.writeText(link);
        showToast('Link copied! 📋');
    },

    // Open referral modal
    openReferralModal() {
        this.loadReferralData();
        document.getElementById('referral-modal')?.classList.add('show');
    },

    // Close referral modal
    closeReferralModal() {
        document.getElementById('referral-modal')?.classList.remove('show');
    },

    // Process incoming referral (called when user joins via referral link)
    processIncomingReferral(referrerId) {
        // Track that this user was referred
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.referredBy = referrerId;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        // In production: notify backend to credit the referrer
        // await fetch(`${CONFIG.BACKEND_URL}/referral/process`, {
        //     method: 'POST',
        //     body: JSON.stringify({ referrerId, newUserId: currentUserId })
        // });
    },

    // Credit referrer when referee makes purchase (production: handle on backend)
    creditReferrer(referrerId, purchaseAmount) {
        const bonus = Math.floor(purchaseAmount * (REFERRAL_CONFIG.BONUS_PERCENTAGE / 100));
        
        // In production, this would be handled server-side
        console.log(`[Referral] Crediting ${bonus} stars to referrer ${referrerId}`);
    }
};

// Export
window.Leaderboard = Leaderboard;
window.ReferralSystem = ReferralSystem;
