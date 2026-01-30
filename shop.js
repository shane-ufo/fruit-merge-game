// ==========================================
// Shop System v3.1
// Added: Buy Stars with Telegram Stars
// ==========================================

const Shop = {
    userStars: 0,
    
    // Star packages (buy with real Telegram Stars)
    starPackages: [
        { id: 'stars_100', stars: 100, price: 10, bonus: 0, label: '100 ⭐' },
        { id: 'stars_500', stars: 500, price: 45, bonus: 50, label: '500 + 50 ⭐' },
        { id: 'stars_1000', stars: 1000, price: 80, bonus: 200, label: '1000 + 200 ⭐' },
        { id: 'stars_5000', stars: 5000, price: 350, bonus: 1500, label: '5000 + 1500 ⭐' }
    ],
    
    init() {
        this.loadUserStars();
        this.renderShop();
        this.setupListeners();
    },
    
    loadUserStars() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        this.userStars = userData.stars || 0;
        this.updateStarsDisplay();
    },
    
    updateStarsDisplay() {
        const displays = [
            document.getElementById('user-stars'),
            document.getElementById('header-stars')
        ];
        
        displays.forEach(el => {
            if (el) el.textContent = this.userStars;
        });
    },
    
    renderShop() {
        const container = document.getElementById('shop-items-container');
        if (!container) return;
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        
        let html = '';
        
        // ========== Buy Stars Section ==========
        html += `
            <div class="shop-section">
                <div class="section-header">💎 Buy Stars</div>
                <div class="star-packages">
                    ${this.starPackages.map(pkg => `
                        <div class="star-package" onclick="Shop.buyStarPackage('${pkg.id}')">
                            <div class="pkg-stars">${pkg.stars + pkg.bonus} ⭐</div>
                            ${pkg.bonus > 0 ? `<div class="pkg-bonus">+${pkg.bonus} bonus!</div>` : ''}
                            <div class="pkg-price">${pkg.price} Telegram ⭐</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // ========== Power-ups Section ==========
        html += `<div class="shop-section"><div class="section-header">⚡ Power-ups</div>`;
        
        for (const [id, item] of Object.entries(SHOP_ITEMS)) {
            if (item.type !== 'consumable') continue;
            
            const owned = powerups[id] || 0;
            
            html += `
                <div class="shop-item" data-item="${id}">
                    <div class="shop-item-icon">${item.emoji}</div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.title}</div>
                        <div class="shop-item-desc">${item.description}</div>
                        <div class="shop-item-owned">Owned: ${owned}</div>
                    </div>
                    <button class="btn-buy" onclick="Shop.buyItem('${id}')">
                        ${item.price} ⭐
                    </button>
                </div>
            `;
        }
        
        html += `</div>`;
        
        // ========== Bundles Section ==========
        html += `<div class="shop-section"><div class="section-header">📦 Bundles</div>`;
        
        for (const [id, item] of Object.entries(SHOP_ITEMS)) {
            if (item.type !== 'bundle') continue;
            
            html += `
                <div class="shop-item" data-item="${id}">
                    <div class="shop-item-icon">${item.emoji}</div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.title}</div>
                        <div class="shop-item-desc">${item.description}</div>
                    </div>
                    <button class="btn-buy" onclick="Shop.buyItem('${id}')">
                        ${item.price} ⭐
                    </button>
                </div>
            `;
        }
        
        html += `</div>`;
        
        // ========== Permanent Section ==========
        html += `<div class="shop-section"><div class="section-header">✨ Permanent Upgrades</div>`;
        
        for (const [id, item] of Object.entries(SHOP_ITEMS)) {
            if (item.type !== 'permanent') continue;
            
            const owned = id === 'double_score' ? userData.doubleScore : 
                         id === 'no_ads' ? userData.noAds : false;
            
            html += `
                <div class="shop-item ${owned ? 'owned' : ''}" data-item="${id}">
                    <div class="shop-item-icon">${item.emoji}</div>
                    <div class="shop-item-info">
                        <div class="shop-item-title">${item.title}</div>
                        <div class="shop-item-desc">${item.description}</div>
                        ${owned ? '<div class="shop-item-owned">✅ Owned</div>' : ''}
                    </div>
                    ${owned ? 
                        '<button class="btn-buy" disabled>Owned</button>' : 
                        `<button class="btn-buy" onclick="Shop.buyItem('${id}')">${item.price} ⭐</button>`
                    }
                </div>
            `;
        }
        
        html += `</div>`;
        
        container.innerHTML = html;
    },
    
    setupListeners() {
        // Close shop
        document.getElementById('close-shop')?.addEventListener('click', () => {
            closeModal('shop-modal');
        });
    },
    
    // ========== Buy Star Package (Real Money) ==========
    async buyStarPackage(packageId) {
        const pkg = this.starPackages.find(p => p.id === packageId);
        if (!pkg) return;
        
        // Check if in Telegram
        if (!window.TelegramGame?.isTelegram) {
            showToast('Star purchase only works in Telegram');
            return;
        }
        
        try {
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            const userId = window.TelegramGame?.getUser()?.id || userData.odairy || 'guest';
            const username = window.TelegramGame?.getUser()?.first_name || 'Player';
            
            // Call backend to create invoice
            const response = await fetch(`${CONFIG.BACKEND_URL}/buy-stars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: pkg.id,
                    userId: userId,
                    username: username
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.invoiceLink) {
                // Open Telegram payment
                window.Telegram?.WebApp?.openInvoice(data.invoiceLink, (status) => {
                    if (status === 'paid') {
                        // Grant stars locally
                        const totalStars = pkg.stars + pkg.bonus;
                        this.addStars(totalStars);
                        showToast(`🎉 You got ${totalStars} Stars!`);
                        
                        if (window.TelegramGame) {
                            window.TelegramGame.hapticFeedback('success');
                        }
                    } else if (status === 'cancelled') {
                        showToast('Purchase cancelled');
                    } else if (status === 'failed') {
                        showToast('Purchase failed. Try again.');
                    }
                });
            } else {
                throw new Error(data.error || 'Failed to create invoice');
            }
        } catch (e) {
            console.error('[Shop] Buy stars error:', e);
            showToast('Error: ' + e.message);
        }
    },
    
    // ========== Buy Item (With In-Game Stars) ==========
    buyItem(itemId) {
        const item = SHOP_ITEMS[itemId];
        if (!item) return;
        
        if (this.userStars < item.price) {
            showToast('Not enough Stars! 💫');
            
            if (window.TelegramGame) {
                window.TelegramGame.hapticFeedback('warning');
            }
            return;
        }
        
        // Check if already owned (permanent items)
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        if (item.type === 'permanent') {
            if (itemId === 'double_score' && userData.doubleScore) {
                showToast('Already owned!');
                return;
            }
            if (itemId === 'no_ads' && userData.noAds) {
                showToast('Already owned!');
                return;
            }
        }
        
        // Deduct stars
        this.userStars -= item.price;
        userData.stars = this.userStars;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        // Grant item
        this.grantItem(item);
        
        // Update UI
        this.updateStarsDisplay();
        this.renderShop();
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        
        showToast(`Purchased ${item.title}! ✅`);
    },
    
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
        
        // Update game UI
        if (window.updateAllUI) {
            window.updateAllUI();
        }
    },
    
    addStars(amount) {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.stars = (userData.stars || 0) + amount;
        this.userStars = userData.stars;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        this.updateStarsDisplay();
        
        if (window.updateAllUI) {
            window.updateAllUI();
        }
    }
};

window.Shop = Shop;
