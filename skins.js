// ==========================================
// Skin System - Fruit Themes
// ==========================================

const SkinSystem = {
    
    skins: {
        default: {
            id: 'default',
            name: 'Classic Fruits',
            price: 0,
            owned: true,
            fruits: ['🍒', '🍓', '🍇', '🍊', '🍎', '🍐', '🍑', '🍍', '🍈', '🍉', '🌈']
        },
        animals: {
            id: 'animals',
            name: 'Cute Animals',
            price: 100,
            owned: false,
            fruits: ['🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🦄']
        },
        space: {
            id: 'space',
            name: 'Space Theme',
            price: 150,
            owned: false,
            fruits: ['⭐', '🌙', '☄️', '🪐', '🌍', '🌞', '🚀', '👽', '🛸', '🌌', '✨']
        },
        food: {
            id: 'food',
            name: 'Yummy Food',
            price: 100,
            owned: false,
            fruits: ['🍩', '🍪', '🍰', '🧁', '🍫', '🍬', '🍭', '🎂', '🍦', '🍨', '🌈']
        },
        sports: {
            id: 'sports',
            name: 'Sports Balls',
            price: 120,
            owned: false,
            fruits: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🏓', '🏸', '🥎', '🌈']
        },
        hearts: {
            id: 'hearts',
            name: 'Love Hearts',
            price: 80,
            owned: false,
            fruits: ['💗', '💖', '💝', '💘', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍']
        },
        halloween: {
            id: 'halloween',
            name: 'Spooky Halloween',
            price: 150,
            owned: false,
            fruits: ['🎃', '👻', '💀', '🦇', '🕷️', '🕸️', '🧙', '🧛', '🧟', '👹', '😈']
        },
        christmas: {
            id: 'christmas',
            name: 'Merry Christmas',
            price: 150,
            owned: false,
            fruits: ['🎄', '🎅', '⛄', '🎁', '🔔', '⭐', '🦌', '🍪', '🎿', '❄️', '✨']
        }
    },
    
    currentSkin: 'default',
    
    init() {
        this.loadOwnedSkins();
        this.loadCurrentSkin();
        this.updateSkinUI();
    },
    
    loadOwnedSkins() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const owned = userData.ownedSkins || ['default'];
        
        for (const skinId of owned) {
            if (this.skins[skinId]) {
                this.skins[skinId].owned = true;
            }
        }
    },
    
    loadCurrentSkin() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        this.currentSkin = userData.currentSkin || 'default';
        
        // Make sure skin is owned
        if (!this.skins[this.currentSkin]?.owned) {
            this.currentSkin = 'default';
        }
        
        this.applySkin(this.currentSkin);
    },
    
    applySkin(skinId) {
        const skin = this.skins[skinId];
        if (!skin) return;
        
        // Update FRUITS array emojis
        skin.fruits.forEach((emoji, i) => {
            if (FRUITS[i]) {
                FRUITS[i].emoji = emoji;
            }
        });
        
        this.currentSkin = skinId;
        
        // Save
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.currentSkin = skinId;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        this.updateSkinUI();
    },
    
    buySkin(skinId) {
        const skin = this.skins[skinId];
        if (!skin || skin.owned) return false;
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        const stars = userData.stars || 0;
        
        if (stars < skin.price) {
            showToast('Not enough Stars! ⭐');
            return false;
        }
        
        // Deduct stars
        userData.stars -= skin.price;
        
        // Add to owned
        userData.ownedSkins = userData.ownedSkins || ['default'];
        userData.ownedSkins.push(skinId);
        
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        skin.owned = true;
        
        if (window.Shop) {
            Shop.userStars = userData.stars;
            Shop.updateStarsDisplay();
        }
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('success');
        }
        
        showToast(`Unlocked ${skin.name}! 🎨`);
        this.updateSkinUI();
        
        return true;
    },
    
    selectSkin(skinId) {
        const skin = this.skins[skinId];
        if (!skin) return;
        
        if (!skin.owned) {
            // Ask to buy
            this.buySkin(skinId);
            return;
        }
        
        this.applySkin(skinId);
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('light');
        }
        
        showToast(`Selected: ${skin.name} 🎨`);
    },
    
    updateSkinUI() {
        const container = document.getElementById('skins-list');
        if (!container) return;
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        
        container.innerHTML = Object.values(this.skins).map(skin => {
            const isSelected = this.currentSkin === skin.id;
            const preview = skin.fruits.slice(0, 5).join(' ');
            
            return `
                <div class="skin-item ${skin.owned ? 'owned' : 'locked'} ${isSelected ? 'selected' : ''}" 
                     onclick="SkinSystem.selectSkin('${skin.id}')">
                    <div class="skin-preview">${preview}</div>
                    <div class="skin-info">
                        <div class="skin-name">${skin.name}</div>
                        <div class="skin-status">
                            ${isSelected ? '✅ Selected' : 
                              skin.owned ? 'Tap to use' : 
                              `🔒 ${skin.price} ⭐`}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Export
window.SkinSystem = SkinSystem;
