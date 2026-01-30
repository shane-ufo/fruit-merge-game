// ==========================================
// Username & VIP System
// ==========================================

const UsernameSystem = {
    
    // Name change pricing (increases each time)
    nameChangePrices: [0, 10, 25, 50, 100, 200, 500], // First free, then 10, 25, etc.
    
    // VIP name colors
    vipColors: {
        gold: { color: '#ffd700', gradient: 'linear-gradient(90deg, #ffd700, #ffaa00)', label: 'Gold' },
        rainbow: { color: '#ff0000', gradient: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)', label: 'Rainbow' },
        pink: { color: '#ff69b4', gradient: 'linear-gradient(90deg, #ff69b4, #ff1493)', label: 'Pink' },
        blue: { color: '#00bfff', gradient: 'linear-gradient(90deg, #00bfff, #1e90ff)', label: 'Ice Blue' },
        green: { color: '#00ff88', gradient: 'linear-gradient(90deg, #00ff88, #00cc66)', label: 'Neon Green' },
        purple: { color: '#9370db', gradient: 'linear-gradient(90deg, #9370db, #8a2be2)', label: 'Royal Purple' }
    },
    
    // VIP color prices
    colorPrices: {
        gold: 100,
        rainbow: 300,
        pink: 80,
        blue: 80,
        green: 80,
        purple: 100
    },
    
    init() {
        this.setupFirstTimeUser();
    },
    
    setupFirstTimeUser() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        // If no username set, use Telegram username or prompt
        if (!userData.displayName) {
            const tgUser = window.TelegramGame?.getUser();
            
            if (tgUser) {
                // Use Telegram username or first name
                userData.displayName = tgUser.username || tgUser.first_name || 'Player';
                userData.telegramId visually = tgUser.id;
                userData.telegramUsername = tgUser.username || null;
            } else {
                userData.displayName = 'Player_' + Date.now().toString().slice(-4);
            }
            
            userData.nameChangeCount = 0;
            userData.nameColor = null; // null = default white
            userData.isVip = false;
            userData.ownedColors = ['default'];
            
            localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        }
    },
    
    // Get current display name with color
    getDisplayName(userData = null) {
        if (!userData) {
            userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        }
        return userData.displayName || 'Player';
    },
    
    // Get name HTML with color styling
    getStyledName(userData = null, fontSize = '14px') {
        if (!userData) {
            userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        }
        
        const name = userData.displayName || 'Player';
        const colorId = userData.nameColor;
        
        if (!colorId || colorId === 'default') {
            return `<span style="font-size:${fontSize}">${this.escapeHtml(name)}</span>`;
        }
        
        const colorData = this.vipColors[colorId];
        if (!colorData) {
            return `<span style="font-size:${fontSize}">${this.escapeHtml(name)}</span>`;
        }
        
        // VIP badge
        const vipBadge = userData.isVip ? '👑 ' : '';
        
        return `<span style="
            font-size:${fontSize};
            font-weight:bold;
            background:${colorData.gradient};
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
            background-clip:text;
        ">${vipBadge}${this.escapeHtml(name)}</span>`;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Check if username is taken
    async isUsernameTaken(username) {
        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/check-username?name=${encodeURIComponent(username)}`);
            const data = await response.json();
            return data.taken;
        } catch (e) {
            console.error('[Username] Check error:', e);
            return false; // Allow if can't check
        }
    },
    
    // Get next name change price
    getNextChangePrice() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const count = userData.nameChangeCount || 0;
        
        if (count >= this.nameChangePrices.length) {
            return this.nameChangePrices[this.nameChangePrices.length - 1] * 2;
        }
        
        return this.nameChangePrices[count];
    },
    
    // Change username
    async changeName(newName) {
        // Validate
        newName = newName.trim();
        
        if (newName.length < 2) {
            showToast('Name too short (min 2 characters)');
            return false;
        }
        
        if (newName.length > 15) {
            showToast('Name too long (max 15 characters)');
            return false;
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(newName)) {
            showToast('Only letters, numbers, and underscore allowed');
            return false;
        }
        
        // Check if taken
        const taken = await this.isUsernameTaken(newName);
        if (taken) {
            showToast('Username already taken! Try another.');
            return false;
        }
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const price = this.getNextChangePrice();
        
        // Check stars (if not free)
        if (price > 0) {
            if ((userData.stars || 0) < price) {
                showToast(`Need ${price} ⭐ to change name`);
                return false;
            }
            userData.stars -= price;
        }
        
        const oldName = userData.displayName;
        userData.displayName = newName;
        userData.nameChangeCount = (userData.nameChangeCount || 0) + 1;
        
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        // Register on server
        await this.registerUsername(newName);
        
        // Update UI
        if (window.Shop) {
            Shop.userStars = userData.stars;
            Shop.updateStarsDisplay();
        }
        if (window.updateAllUI) updateAllUI();
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        
        const msg = price > 0 ? 
            `Name changed to "${newName}"! (-${price}⭐)` : 
            `Name set to "${newName}"!`;
        showToast(msg);
        
        return true;
    },
    
    // Register username on server
    async registerUsername(name) {
        try {
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            const tgUser = window.TelegramGame?.getUser();
            
            await fetch(`${CONFIG.BACKEND_URL}/register-username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    odairy: tgUser?.id || userData.odairy || 'guest',
                    username: name,
                    telegramUsername: tgUser?.username || null
                })
            });
        } catch (e) {
            console.error('[Username] Register error:', e);
        }
    },
    
    // Buy VIP color
    buyColor(colorId) {
        if (!this.vipColors[colorId]) {
            showToast('Invalid color');
            return false;
        }
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const ownedColors = userData.ownedColors || ['default'];
        
        if (ownedColors.includes(colorId)) {
            // Already owned, just select it
            this.selectColor(colorId);
            return true;
        }
        
        const price = this.colorPrices[colorId];
        
        if ((userData.stars || 0) < price) {
            showToast(`Need ${price} ⭐ to unlock this color`);
            return false;
        }
        
        // Purchase
        userData.stars -= price;
        userData.ownedColors = [...ownedColors, colorId];
        userData.nameColor = colorId;
        
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        if (window.Shop) {
            Shop.userStars = userData.stars;
            Shop.updateStarsDisplay();
        }
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        
        showToast(`Unlocked ${this.vipColors[colorId].label} name! 🎨`);
        this.updateProfileUI();
        
        return true;
    },
    
    // Select owned color
    selectColor(colorId) {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const ownedColors = userData.ownedColors || ['default'];
        
        if (colorId !== 'default' && !ownedColors.includes(colorId)) {
            showToast('You need to unlock this color first');
            return false;
        }
        
        userData.nameColor = colorId;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('light');
        }
        
        showToast('Color changed! 🎨');
        this.updateProfileUI();
        
        return true;
    },
    
    // Update profile UI
    updateProfileUI() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        // Update name preview
        const preview = document.getElementById('name-preview');
        if (preview) {
            preview.innerHTML = this.getStyledName(userData, '24px');
        }
        
        // Update color list
        const colorList = document.getElementById('color-list');
        if (colorList) {
            const ownedColors = userData.ownedColors || ['default'];
            const currentColor = userData.nameColor || 'default';
            
            let html = `
                <div class="color-item ${currentColor === 'default' ? 'selected' : ''}" 
                     onclick="UsernameSystem.selectColor('default')">
                    <div class="color-preview" style="background:#ffffff"></div>
                    <span>Default</span>
                    <span class="color-status">${currentColor === 'default' ? '✓' : ''}</span>
                </div>
            `;
            
            for (const [id, data] of Object.entries(this.vipColors)) {
                const owned = ownedColors.includes(id);
                const selected = currentColor === id;
                const price = this.colorPrices[id];
                
                html += `
                    <div class="color-item ${selected ? 'selected' : ''} ${!owned ? 'locked' : ''}" 
                         onclick="UsernameSystem.${owned ? 'selectColor' : 'buyColor'}('${id}')">
                        <div class="color-preview" style="background:${data.gradient}"></div>
                        <span>${data.label}</span>
                        <span class="color-status">
                            ${selected ? '✓' : owned ? '' : `🔒 ${price}⭐`}
                        </span>
                    </div>
                `;
            }
            
            colorList.innerHTML = html;
        }
        
        // Update change name button
        const changeBtn = document.getElementById('change-name-btn');
        if (changeBtn) {
            const price = this.getNextChangePrice();
            changeBtn.textContent = price > 0 ? `Change Name (${price}⭐)` : 'Set Name (Free)';
        }
    },
    
    // Show name change dialog
    showChangeNameDialog() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const price = this.getNextChangePrice();
        
        const currentName = userData.displayName || '';
        const priceText = price > 0 ? `(Cost: ${price}⭐)` : '(Free!)';
        
        // Use Telegram popup if available
        if (window.Telegram?.WebApp?.showPopup) {
            // Telegram doesn't support input in popup, so we'll use a custom modal
        }
        
        // Show custom input modal
        const newName = prompt(`Enter new username ${priceText}\n\nCurrent: ${currentName}\n\nRules:\n- 2-15 characters\n- Letters, numbers, underscore only`);
        
        if (newName && newName !== currentName) {
            this.changeName(newName);
        }
    }
};

// ==========================================
// Friends System (Telegram Contacts)
// ==========================================

const FriendsSystem = {
    friends: [],
    
    init() {
        this.loadFriends();
    },
    
    async loadFriends() {
        try {
            const tgUser = window.TelegramGame?.getUser();
            if (!tgUser) return;
            
            const response = await fetch(`${CONFIG.BACKEND_URL}/friends/${tgUser.id}`);
            const data = await response.json();
            
            this.friends = data.friends || [];
            this.updateFriendsUI();
        } catch (e) {
            console.error('[Friends] Load error:', e);
        }
    },
    
    async addFriend(friendId) {
        try {
            const tgUser = window.TelegramGame?.getUser();
            if (!tgUser) return false;
            
            await fetch(`${CONFIG.BACKEND_URL}/friends/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    odairy: tgUser.id,
                    friendId: friendId
                })
            });
            
            await this.loadFriends();
            return true;
        } catch (e) {
            console.error('[Friends] Add error:', e);
            return false;
        }
    },
    
    // Get friends leaderboard
    async getFriendsLeaderboard() {
        try {
            const tgUser = window.TelegramGame?.getUser();
            if (!tgUser) return [];
            
            const response = await fetch(`${CONFIG.BACKEND_URL}/leaderboard/friends/${tgUser.id}`);
            const data = await response.json();
            
            return data.leaderboard || [];
        } catch (e) {
            console.error('[Friends] Leaderboard error:', e);
            return [];
        }
    },
    
    updateFriendsUI() {
        const container = document.getElementById('friends-list');
        if (!container) return;
        
        if (this.friends.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No friends yet!</p>
                    <p>Invite friends to see them here.</p>
                    <button class="btn btn-primary" onclick="ReferralSystem?.showInvite()">
                        📨 Invite Friends
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.friends.map((f, i) => `
            <div class="friend-item">
                <div class="friend-rank">${i + 1}</div>
                <div class="friend-avatar">${f.avatar || '🎮'}</div>
                <div class="friend-info">
                    <div class="friend-name">${UsernameSystem.escapeHtml(f.username || 'Player')}</div>
                    <div class="friend-score">Best: ${f.highScore || 0}</div>
                </div>
                <div class="friend-status ${f.online ? 'online' : ''}">
                    ${f.online ? '🟢' : '⚫'}
                </div>
            </div>
        `).join('');
    },
    
    // Share to invite friends
    inviteFriend() {
        if (window.TelegramGame) {
            TelegramGame.shareReferralLink();
        } else {
            const link = `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}`;
            navigator.clipboard?.writeText(link);
            showToast('Invite link copied!');
        }
    }
};

// Export
window.UsernameSystem = UsernameSystem;
window.FriendsSystem = FriendsSystem;
