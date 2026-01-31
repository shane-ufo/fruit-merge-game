// ==========================================
// Leaderboard System v3.5
// Weekly + All-time + Friends
// ==========================================

const Leaderboard = {
    currentTab: 'weekly',
    data: { weekly: [], alltime: [], friends: [] },
    weekInfo: { week: '', start: null, end: null, timeUntilReset: 0 },
    userRank: { weekly: null, alltime: null },
    
    init() {
        this.setupTabs();
        this.loadLeaderboard();
        
        // Update countdown every minute
        setInterval(() => this.updateCountdown(), 60000);
    },
    
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        if (tab === 'friends') this.loadFriendsLeaderboard();
        else if (tab === 'alltime') this.loadAllTimeLeaderboard();
        
        this.renderLeaderboard();
    },
    
    async loadLeaderboard() {
        try {
            // Load weekly (default)
            const res = await fetch(`${CONFIG.BACKEND_URL}/leaderboard`);
            const data = await res.json();
            
            this.data.weekly = data.leaderboard || [];
            this.weekInfo = {
                week: data.week,
                start: new Date(data.weekStart),
                end: new Date(data.weekEnd),
                timeUntilReset: data.timeUntilReset
            };
            
            // Get user rank
            const tgUser = window.TelegramGame?.getUser();
            if (tgUser) {
                const rankRes = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/rank/${tgUser.id}`);
                const rankData = await rankRes.json();
                this.userRank.weekly = rankData.weeklyRank;
                this.userRank.alltime = rankData.allTimeRank;
            }
            
            this.renderLeaderboard();
            this.updateCountdown();
        } catch (e) {
            console.error('[Leaderboard] Load error:', e);
        }
    },
    
    async loadAllTimeLeaderboard() {
        try {
            const res = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/alltime`);
            const data = await res.json();
            this.data.alltime = data.leaderboard || [];
            this.renderLeaderboard();
        } catch (e) {
            console.error('[Leaderboard] All-time load error:', e);
        }
    },
    
    async loadFriendsLeaderboard() {
        try {
            const tgUser = window.TelegramGame?.getUser();
            if (!tgUser) { this.data.friends = []; this.renderLeaderboard(); return; }
            
            const res = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/friends/${tgUser.id}`);
            const data = await res.json();
            this.data.friends = data.leaderboard || [];
            this.renderLeaderboard();
        } catch (e) {
            console.error('[Leaderboard] Friends load error:', e);
        }
    },
    
    updateCountdown() {
        const el = document.getElementById('reset-countdown');
        if (!el) return;
        
        const ms = this.weekInfo.timeUntilReset;
        if (!ms || ms <= 0) {
            el.textContent = 'Resetting soon...';
            return;
        }
        
        const days = Math.floor(ms / 86400000);
        const hours = Math.floor((ms % 86400000) / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        
        if (days > 0) {
            el.textContent = `${days}d ${hours}h until reset`;
        } else if (hours > 0) {
            el.textContent = `${hours}h ${mins}m until reset`;
        } else {
            el.textContent = `${mins}m until reset`;
        }
        
        // Decrease time
        this.weekInfo.timeUntilReset -= 60000;
    },
    
    renderLeaderboard() {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;
        
        const entries = this.data[this.currentTab] || [];
        const tgUser = window.TelegramGame?.getUser();
        const currentUserId = tgUser?.id?.toString() || null;
        
        // Show week info for weekly tab
        const weekHeader = document.getElementById('week-header');
        if (weekHeader) {
            if (this.currentTab === 'weekly' && this.weekInfo.week) {
                weekHeader.style.display = 'block';
                weekHeader.innerHTML = `
                    <div class="week-info">
                        <span class="week-label">📅 ${this.weekInfo.week}</span>
                        <span class="countdown" id="reset-countdown"></span>
                    </div>
                `;
                this.updateCountdown();
            } else {
                weekHeader.style.display = 'none';
            }
        }
        
        if (entries.length === 0) {
            if (this.currentTab === 'friends') {
                container.innerHTML = `
                    <div class="leaderboard-empty">
                        <p>No friends yet!</p>
                        <button class="btn btn-primary" onclick="FriendsSystem?.inviteFriend()">📨 Invite Friends</button>
                    </div>`;
            } else {
                container.innerHTML = '<div class="leaderboard-empty">No scores yet. Be the first!</div>';
            }
            return;
        }
        
        container.innerHTML = entries.map((entry, index) => {
            const rank = index + 1;
            const isMe = entry.odairy === currentUserId;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            const isVVIP = entry.isVVIP || entry.nameColor === 'vvip_rainbow';
            const name = this.getStyledName(entry);
            
            return `
                <div class="leaderboard-entry ${rank <= 3 ? 'top-3' : ''} ${isMe ? 'you' : ''} ${isVVIP ? 'vvip' : ''}">
                    <div class="rank ${rank <= 3 ? 'medal' : ''}">${medal}</div>
                    <div class="player-avatar">${isVVIP ? '👑' : (entry.avatar || '🎮')}</div>
                    <div class="player-info">
                        <div class="player-name">${name}</div>
                        ${entry.isVip && !isVVIP ? '<span class="vip-badge">VIP</span>' : ''}
                    </div>
                    <div class="player-score">${(entry.score || 0).toLocaleString()}</div>
                </div>
            `;
        }).join('');
        
        // Update rank display
        const rankEl = document.getElementById('your-rank');
        if (rankEl) {
            const rank = this.currentTab === 'weekly' ? this.userRank.weekly : 
                         this.currentTab === 'alltime' ? this.userRank.alltime : null;
            rankEl.textContent = rank ? `#${rank}` : 'Not ranked';
        }
    },
    
    getStyledName(entry) {
        const name = this.escapeHtml(entry.username || entry.displayName || 'Player');
        const colorId = entry.nameColor;
        
        if (entry.isVVIP || colorId === 'vvip_rainbow') {
            return `<span class="vvip-text">${name}</span><span class="vvip-title">OWNER</span>`;
        }
        
        if (!colorId || colorId === 'default') return name;
        
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
        
        return `<span style="font-weight:bold;background:${gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${name}</span>`;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async submitScore(score) {
        try {
            const tgUser = window.TelegramGame?.getUser();
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            
            await fetch(`${CONFIG.BACKEND_URL}/leaderboard/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: tgUser?.id || userData.odairy || 'guest',
                    username: userData.displayName || tgUser?.first_name || 'Player',
                    displayName: userData.displayName,
                    score, avatar: userData.avatar || '🎮',
                    nameColor: userData.nameColor, isVip: userData.isVip, isVVIP: userData.isVVIP
                })
            });
            
            await this.loadLeaderboard();
        } catch (e) { console.error('[Leaderboard] Submit error:', e); }
    },
    
    refresh() {
        this.loadLeaderboard();
        if (this.currentTab === 'friends') this.loadFriendsLeaderboard();
        if (this.currentTab === 'alltime') this.loadAllTimeLeaderboard();
    }
};

// Referral System
const ReferralSystem = {
    init() { this.checkReferral(); },
    
    checkReferral() {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('startapp') || params.get('ref') || window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        if (ref?.startsWith('ref_')) {
            const refId = ref.replace('ref_', '');
            const tgUser = window.TelegramGame?.getUser();
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            
            if (!userData.referredBy && tgUser && refId !== String(tgUser.id)) {
                this.processReferral(refId);
            }
        }
    },
    
    async processReferral(refId) {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const tgUser = window.TelegramGame?.getUser();
        if (!tgUser) return;
        
        try {
            await fetch(`${CONFIG.BACKEND_URL}/referral`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUserId: tgUser.id, referrerId: refId })
            });
            userData.referredBy = refId;
            localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
            showToast?.('🎁 Joined via referral!');
        } catch (e) {}
    },
    
    getReferralLink() {
        const id = window.TelegramGame?.getUserId() || 'guest';
        return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=ref_${id}`;
    },
    
    inviteFriend() {
        const link = this.getReferralLink();
        if (window.Telegram?.WebApp?.switchInlineQuery) {
            window.Telegram.WebApp.switchInlineQuery(`🍉 Join Fruit Merge! ${link}`, ['users', 'groups']);
        } else {
            navigator.clipboard?.writeText(link);
            showToast?.('Link copied!');
        }
    }
};

window.Leaderboard = Leaderboard;
window.ReferralSystem = ReferralSystem;
