// ==========================================
// Leaderboard System v3.2
// Real data + VIP colored names + Friends
// ==========================================

const Leaderboard = {
    currentTab: 'global',
    data: {
        global: [],
        friends: []
    },
    userRank: null,
    
    init() {
        this.setupTabs();
        this.loadLeaderboard();
    },
    
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        this.renderLeaderboard();
        
        // Load friends data if needed
        if (tab === 'friends') {
            this.loadFriendsLeaderboard();
        }
    },
    
    async loadLeaderboard() {
        try {
            // Load global leaderboard
            const response = await fetch(`${CONFIG.BACKEND_URL}/leaderboard?limit=100`);
            this.data.global = await response.json();
            
            // Get user rank
            const tgUser = window.TelegramGame?.getUser();
            if (tgUser) {
                const rankRes = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/rank/${tgUser.id}`);
                const rankData = await rankRes.json();
                this.userRank = rankData.rank;
            }
            
            this.renderLeaderboard();
        } catch (e) {
            console.error('[Leaderboard] Load error:', e);
            this.renderError();
        }
    },
    
    async loadFriendsLeaderboard() {
        try {
            const tgUser = window.TelegramGame?.getUser();
            if (!tgUser) {
                this.data.friends = [];
                this.renderLeaderboard();
                return;
            }
            
            const response = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/friends/${tgUser.id}`);
            const data = await response.json();
            this.data.friends = data.leaderboard || [];
            
            this.renderLeaderboard();
        } catch (e) {
            console.error('[Leaderboard] Friends load error:', e);
        }
    },
    
    renderLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;
        
        const entries = this.currentTab === 'friends' ? this.data.friends : this.data.global;
        const tgUser = window.TelegramGame?.getUser();
        const currentUserId = tgUser?.id?.toString() || null;
        
        if (entries.length === 0) {
            if (this.currentTab === 'friends') {
                container.innerHTML = `
                    <div class="leaderboard-empty">
                        <p>No friends yet!</p>
                        <p>Invite friends to compete with them.</p>
                        <button class="btn btn-primary" onclick="FriendsSystem?.inviteFriend()">
                            📨 Invite Friends
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = '<div class="leaderboard-empty">No scores yet. Be the first!</div>';
            }
            return;
        }
        
        container.innerHTML = entries.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.odairy === currentUserId || entry.userId === currentUserId;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            const isVVIP = entry.isVVIP || entry.nameColor === 'vvip_rainbow';
            
            // Styled name with color
            const styledName = this.getStyledName(entry);
            
            return `
                <div class="leaderboard-entry ${rank <= 3 ? 'top-3' : ''} ${isCurrentUser ? 'you' : ''} ${isVVIP ? 'vvip' : ''}">
                    <div class="rank ${rank <= 3 ? 'medal' : ''}">${medal}</div>
                    <div class="player-avatar">${isVVIP ? '👑' : (entry.avatar || '🎮')}</div>
                    <div class="player-info">
                        <div class="player-name">${styledName}</div>
                        ${entry.isVip && !isVVIP ? '<span class="vip-badge">VIP</span>' : ''}
                    </div>
                    <div class="player-score">${entry.score?.toLocaleString() || 0}</div>
                </div>
            `;
        }).join('');
        
        // Update user rank display
        const rankDisplay = document.getElementById('your-rank');
        if (rankDisplay) {
            if (this.userRank) {
                rankDisplay.textContent = `#${this.userRank}`;
            } else {
                rankDisplay.textContent = 'Not ranked';
            }
        }
    },
    
    getStyledName(entry) {
        const name = this.escapeHtml(entry.username || entry.displayName || 'Player');
        const colorId = entry.nameColor;
        
        // Check for VVIP
        if (entry.isVVIP || colorId === 'vvip_rainbow') {
            return `
                <span class="vvip-text">${name}</span>
                <span class="vvip-title">OWNER</span>
            `;
        }
        
        if (!colorId || colorId === 'default') {
            return name;
        }
        
        // VIP colors
        const colors = {
            gold: 'linear-gradient(90deg, #ffd700, #ffaa00)',
            rainbow: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)',
            pink: 'linear-gradient(90deg, #ff69b4, #ff1493)',
            blue: 'linear-gradient(90deg, #00bfff, #1e90ff)',
            green: 'linear-gradient(90deg, #00ff88, #00cc66)',
            purple: 'linear-gradient(90deg, #9370db, #8a2be2)'
        };
        
        const gradient = colors[colorId];
        if (!gradient) return name;
        
        return `<span style="
            font-weight:bold;
            background:${gradient};
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
            background-clip:text;
        ">${name}</span>`;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    renderError() {
        const container = document.getElementById('leaderboard-list');
        if (container) {
            container.innerHTML = '<div class="leaderboard-empty">Failed to load leaderboard</div>';
        }
    },
    
    // Submit score to server
    async submitScore(score) {
        try {
            const tgUser = window.TelegramGame?.getUser();
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            
            const userId = tgUser?.id || userData.odairy || 'guest';
            const username = userData.displayName || tgUser?.first_name || 'Player';
            
            await fetch(`${CONFIG.BACKEND_URL}/leaderboard/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    username: username,
                    displayName: userData.displayName,
                    score: score,
                    avatar: userData.avatar || '🎮',
                    nameColor: userData.nameColor || null,
                    isVip: userData.isVip || false
                })
            });
            
            // Reload leaderboard
            await this.loadLeaderboard();
        } catch (e) {
            console.error('[Leaderboard] Submit error:', e);
        }
    },
    
    // Refresh
    refresh() {
        this.loadLeaderboard();
        if (this.currentTab === 'friends') {
            this.loadFriendsLeaderboard();
        }
    }
};

// ==========================================
// Referral System
// ==========================================

const ReferralSystem = {
    stats: {
        invited: 0,
        earned: 0
    },
    
    init() {
        this.loadStats();
        this.checkReferral();
    },
    
    loadStats() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        this.stats.invited = userData.referralCount || 0;
        this.stats.earned = userData.referralEarnings || 0;
        this.updateUI();
    },
    
    checkReferral() {
        // Check if user came from a referral link
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('startapp') || urlParams.get('ref');
        
        if (refCode && refCode.startsWith('ref_')) {
            const referrerId = refCode.replace('ref_', '');
            this.processReferral(referrerId);
        }
        
        // Also check Telegram start_param
        const tgUser = window.TelegramGame?.getUser();
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        if (startParam && startParam.startsWith('ref_')) {
            const referrerId = startParam.replace('ref_', '');
            if (tgUser && referrerId !== String(tgUser.id)) {
                this.processReferral(referrerId);
            }
        }
    },
    
    async processReferral(referrerId) {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        // Don't process if already referred
        if (userData.referredBy) return;
        
        const tgUser = window.TelegramGame?.getUser();
        if (!tgUser) return;
        
        try {
            await fetch(`${CONFIG.BACKEND_URL}/referral`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newUserId: tgUser.id,
                    referrerId: referrerId
                })
            });
            
            userData.referredBy = referrerId;
            localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
            
            showToast('🎁 You joined via referral!');
        } catch (e) {
            console.error('[Referral] Process error:', e);
        }
    },
    
    getReferralLink() {
        const tgUser = window.TelegramGame?.getUser();
        const userId = tgUser?.id || 'guest';
        return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=ref_${userId}`;
    },
    
    showInvite() {
        if (window.TelegramGame?.isTelegram) {
            // Use Telegram share
            const link = this.getReferralLink();
            const text = `🍉 Join me in Fruit Merge! Let's compete!\n\n${link}`;
            
            window.Telegram?.WebApp?.switchInlineQuery?.(text, ['users', 'groups', 'channels']);
        } else {
            // Copy link
            const link = this.getReferralLink();
            navigator.clipboard?.writeText(link);
            showToast('Invite link copied!');
        }
    },
    
    updateUI() {
        const invitedEl = document.getElementById('friends-invited');
        const earnedEl = document.getElementById('stars-earned');
        const linkInput = document.getElementById('referral-link-input');
        
        if (invitedEl) invitedEl.textContent = this.stats.invited;
        if (earnedEl) earnedEl.textContent = this.stats.earned;
        if (linkInput) linkInput.value = this.getReferralLink();
    }
};

// Export
window.Leaderboard = Leaderboard;
window.ReferralSystem = ReferralSystem;
