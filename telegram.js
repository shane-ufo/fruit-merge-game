// ==========================================
// Telegram Integration v3.3
// Fixed: Persistent User ID (一个人只有一个ID)
// ==========================================

const TelegramGame = {
    webapp: null,
    user: null,
    isTelegram: false,

    init() {
        // Check if in Telegram
        if (window.Telegram?.WebApp) {
            this.webapp = window.Telegram.WebApp;
            this.isTelegram = true;

            const tgUser = this.webapp.initDataUnsafe?.user;

            if (tgUser) {
                this.user = {
                    id: tgUser.id,
                    odairy: String(tgUser.id),
                    first_name: tgUser.first_name || '',
                    last_name: tgUser.last_name || '',
                    username: tgUser.username || '',
                    language_code: tgUser.language_code || 'en'
                };
                this.saveUserToStorage();
                console.log('[TG] User:', this.user.odairy, this.user.first_name);
            } else {
                this.loadUserFromStorage();
            }

            this.webapp.ready();
            this.webapp.expand();

            try {
                this.webapp.setHeaderColor('#1a1a2e');
                this.webapp.setBackgroundColor('#1a1a2e');
            } catch (e) { }

        } else {
            console.log('[TG] Not in Telegram');
            this.loadUserFromStorage();
        }

        if (!this.user) {
            this.createGuestUser();
        }

        this.startHeartbeat();
        return this;
    },

    // 保存用户到 localStorage（持久化）
    saveUserToStorage() {
        if (this.user) {
            localStorage.setItem('_permanent_user_id', this.user.odairy);
            localStorage.setItem('_permanent_user_data', JSON.stringify(this.user));
        }
    },

    // 从 localStorage 读取用户
    loadUserFromStorage() {
        try {
            const savedData = localStorage.getItem('_permanent_user_data');
            const savedId = localStorage.getItem('_permanent_user_id');

            if (savedData) {
                this.user = JSON.parse(savedData);
                console.log('[TG] Loaded user:', this.user.odairy);
            } else if (savedId) {
                this.user = { id: savedId, odairy: savedId, first_name: 'Player' };
            }
        } catch (e) { }
    },

    // 创建 Guest（只创建一次！）
    createGuestUser() {
        let odairy = localStorage.getItem('_permanent_user_id');

        if (!odairy) {
            // 只在第一次生成，之后永远用同一个
            odairy = 'G' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            localStorage.setItem('_permanent_user_id', odairy);
        }

        this.user = {
            id: odairy,
            odairy: odairy,
            first_name: 'Guest',
            last_name: '',
            username: ''
        };

        this.saveUserToStorage();
        console.log('[TG] Guest ID:', odairy);
    },

    getUser() { return this.user; },

    getUserId() {
        return this.user?.odairy || localStorage.getItem('_permanent_user_id');
    },

    getDisplayName() {
        const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        if (ud.displayName) return ud.displayName;
        if (this.user?.first_name) return this.user.first_name;
        if (this.user?.username) return this.user.username;
        return 'Player';
    },

    // 心跳
    startHeartbeat() {
        const send = async () => {
            if (!this.user) return;
            const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');

            try {
                await fetch(CONFIG.BACKEND_URL + '/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: this.getUserId(),
                        odairy: this.getUserId(),
                        username: this.user.username || '',
                        firstName: this.user.first_name || '',
                        lastName: this.user.last_name || '',
                        displayName: ud.displayName || this.getDisplayName(),
                        avatar: ud.avatar || '🎮',
                        nameColor: ud.nameColor,
                        isVip: ud.isVip || false,
                        isVVIP: ud.isVVIP || false,
                        score: parseInt(localStorage.getItem(CONFIG.STORAGE_BEST_SCORE)) || 0
                    })
                });
            } catch (e) { }
        };

        send();
        setInterval(send, 30000);
    },

    onGameStart() {
        const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        fetch(CONFIG.BACKEND_URL + '/game/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: TelegramGame.getUserId(),
                username: ud.displayName || this.getDisplayName()
            })
        }).catch(() => { });
    },

    onGameOver(score, isNewBest) {
        const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        fetch(CONFIG.BACKEND_URL + '/game/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: TelegramGame.getUserId(),
                username: ud.displayName || this.getDisplayName(),
                displayName: ud.displayName || this.getDisplayName(),
                score: score,
                nameColor: ud.nameColor,
                isVip: ud.isVip || false,
                isVVIP: ud.isVVIP || false
            })
        }).catch(() => { });
    },

    onScoreUpdate(score) { },

    hapticFeedback(type = 'light') {
        if (!this.webapp?.HapticFeedback) return;
        try {
            if (['light', 'medium', 'heavy'].includes(type)) {
                this.webapp.HapticFeedback.impactOccurred(type);
            } else {
                this.webapp.HapticFeedback.notificationOccurred(type);
            }
        } catch (e) { }
    },

    shareScore(score) {
        const text = '🍉 I scored ' + score + ' in Fruit Merge!';
        const url = 'https://t.me/' + CONFIG.BOT_USERNAME + '/' + CONFIG.APP_SHORT_NAME;

        if (this.webapp?.switchInlineQuery) {
            this.webapp.switchInlineQuery(text, ['users', 'groups', 'channels']);
        } else {
            navigator.clipboard?.writeText(text + '\n' + url);
            showToast?.('Copied!');
        }
    },

    shareReferralLink() {
        const url = 'https://t.me/' + CONFIG.BOT_USERNAME + '/' + CONFIG.APP_SHORT_NAME + '?startapp=ref_' + this.getUserId();

        if (this.webapp?.switchInlineQuery) {
            this.webapp.switchInlineQuery('🍉 Join Fruit Merge! ' + url, ['users', 'groups', 'channels']);
        } else {
            navigator.clipboard?.writeText(url);
            showToast?.('Link copied!');
        }
    },

    close() { this.webapp?.close?.(); }
};

document.addEventListener('DOMContentLoaded', () => TelegramGame.init());
window.TelegramGame = TelegramGame;
