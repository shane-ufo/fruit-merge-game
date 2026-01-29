// ==========================================
// Shop System
// ==========================================

const Shop = {
    userStars: 0,
    
    // Initialize shop
    init() {
        this.loadUserStars();
        this.renderShopItems();
        this.setupEventListeners();
    },
    
    // Load user's star balance
    loadUserStars() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        this.userStars = userData.stars || 100;  // Start with 100 stars for testing
        this.updateStarsDisplay();
    },
    
    // Save user's star balance
    saveUserStars() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.stars = this.userStars;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        this.updateStarsDisplay();
    },
    
    // Update stars display
    updateStarsDisplay() {
        const display = document.getElementById('user-stars');
        if (display) {
            display.textContent = this.userStars;
        }
    },
    
    // Render shop items
    renderShopItems() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;
        
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        let html = '';
        
        // Consumables section
        html += '<div class="shop-section"><h3 style="margin: 15px 0 10px; opacity: 0.7; font-size: 12px;">POWER-UPS</h3></div>';
        
        for (const [key, item] of Object.entries(SHOP_ITEMS)) {
            if (item.type !== 'consumable') continue;
            
            const owned = powerups[item.id] || 0;
            html += this.renderShopItem(item, owned);
        }
        
        // Bundles section
        html += '<div class="shop-section"><h3 style="margin: 20px 0 10px; opacity: 0.7; font-size: 12px;">BUNDLES</h3></div>';
        
        for (const [key, item] of Object.entries(SHOP_ITEMS)) {
            if (item.type !== 'bundle') continue;
            html += this.renderShopItem(item);
        }
        
        // Permanent section
        html += '<div class="shop-section"><h3 style="margin: 20px 0 10px; opacity: 0.7; font-size: 12px;">PERMANENT UPGRADES</h3></div>';
        
        for (const [key, item] of Object.entries(SHOP_ITEMS)) {
            if (item.type !== 'permanent') continue;
            
            const isPurchased = (item.id === 'no_ads' && userData.noAds) ||
                               (item.id === 'double_score' && userData.doubleScore);
            
            html += this.renderShopItem(item, null, isPurchased);
        }
        
        container.innerHTML = html;
        
        // Add click listeners to buy buttons
        container.querySelectorAll('.btn-buy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('.btn-buy').dataset.itemId;
                this.purchaseItem(itemId);
            });
        });
    },
    
    // Render single shop item
    renderShopItem(item, owned = null, isPurchased = false) {
        const canAfford = this.userStars >= item.price;
        
        let buttonHtml = '';
        if (isPurchased) {
            buttonHtml = '<span style="color: #38ef7d; font-weight: bold;">✓ Owned</span>';
        } else {
            buttonHtml = `
                <button class="btn btn-buy" data-item-id="${item.id}" ${!canAfford ? 'disabled style="opacity:0.5"' : ''}>
                    ${item.price} ⭐
                </button>
            `;
        }
        
        let ownedHtml = '';
        if (owned !== null && owned > 0) {
            ownedHtml = `<div class="shop-item-owned">You have: ${owned}</div>`;
        }
        
        return `
            <div class="shop-item" data-item="${item.id}">
                <div class="shop-item-icon">${item.emoji}</div>
                <div class="shop-item-info">
                    <div class="shop-item-title">${item.title}</div>
                    <div class="shop-item-desc">${item.description}</div>
                    ${ownedHtml}
                </div>
                ${buttonHtml}
            </div>
        `;
    },
    
    // Purchase item
    async purchaseItem(itemId) {
        const item = SHOP_ITEMS[itemId];
        if (!item) return;
        
        // Check if can afford
        if (this.userStars < item.price) {
            showToast('Not enough stars! ⭐');
            if (window.TelegramGame) {
                window.TelegramGame.hapticFeedback('error');
            }
            return;
        }
        
        // Check if permanent item already owned
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        if (item.type === 'permanent') {
            if ((item.id === 'no_ads' && userData.noAds) ||
                (item.id === 'double_score' && userData.doubleScore)) {
                showToast('Already owned!');
                return;
            }
        }
        
        // Confirm purchase
        const confirmed = await (window.TelegramGame?.showConfirm || confirm)(
            `Buy ${item.title} for ${item.price} ⭐?`
        );
        
        if (!confirmed) return;
        
        // Deduct stars
        this.userStars -= item.price;
        this.saveUserStars();
        
        // Grant item
        this.grantItem(item);
        
        // Refresh display
        this.renderShopItems();
        
        // Update game UI
        if (window.gameScene) {
            window.gameScene.updateUI();
        }
        
        // Feedback
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        showToast(`Purchased ${item.title}! ✅`);
    },
    
    // Grant purchased item
    grantItem(item) {
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        if (item.type === 'consumable') {
            powerups[item.id] = (powerups[item.id] || 0) + 1;
        } else if (item.type === 'bundle') {
            for (const [key, count] of Object.entries(item.contents)) {
                powerups[key] = (powerups[key] || 0) + count;
            }
        } else if (item.type === 'permanent') {
            if (item.id === 'no_ads') {
                userData.noAds = true;
            } else if (item.id === 'double_score') {
                userData.doubleScore = true;
            }
        }
        
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
    },
    
    // Add stars (from referrals, rewards, etc.)
    addStars(amount) {
        this.userStars += amount;
        this.saveUserStars();
        showToast(`+${amount} ⭐`);
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Shop button
        document.getElementById('shop-btn')?.addEventListener('click', () => {
            this.openShop();
        });
        
        // Close shop button
        document.getElementById('close-shop')?.addEventListener('click', () => {
            this.closeShop();
        });
        
        // Close on backdrop click
        document.getElementById('shop-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'shop-modal') {
                this.closeShop();
            }
        });
    },
    
    // Open shop modal
    openShop() {
        this.loadUserStars();
        this.renderShopItems();
        document.getElementById('shop-modal')?.classList.add('show');
    },
    
    // Close shop modal
    closeShop() {
        document.getElementById('shop-modal')?.classList.remove('show');
    }
};

// Export
window.Shop = Shop;
