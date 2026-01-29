// ==========================================
// Main App Initialization v2.0
// Added: Sound settings, Mobile control hints
// ==========================================

// Toast notification helper
function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

window.showToast = showToast;

// ==========================================
// App Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing v2.0...');
    
    initializeSystems();
    setupGlobalEventListeners();
    setupSoundSettings();
    
    // Hide loading overlay
    setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }, 500);
    
    // Hide control hint after 5 seconds
    setTimeout(() => {
        const hint = document.getElementById('control-hint');
        if (hint) hint.style.display = 'none';
    }, 5000);
    
    console.log('[App] Ready!');
});

function initializeSystems() {
    // Initialize Telegram
    if (window.TelegramGame) {
        console.log('[App] Telegram integration active');
    }
    
    // Initialize Shop
    if (window.Shop) {
        Shop.init();
        console.log('[App] Shop initialized');
    }
    
    // Initialize Leaderboard
    if (window.Leaderboard) {
        Leaderboard.init();
        console.log('[App] Leaderboard initialized');
    }
    
    // Initialize Referral System
    if (window.ReferralSystem) {
        ReferralSystem.init();
        console.log('[App] Referral system initialized');
    }
    
    // Initialize Game
    if (window.GameAPI) {
        GameAPI.init();
        console.log('[App] Game initialized');
    }
    
    // Initialize new user
    initializeNewUser();
}

function initializeNewUser() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    
    if (!userData.initialized) {
        userData.initialized = true;
        userData.stars = 100;
        userData.joinDate = Date.now();
        userData.soundEnabled = true;
        userData.soundPack = 'default';
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        powerups.revive = (powerups.revive || 0) + 2;
        powerups.clear_small = (powerups.clear_small || 0) + 3;
        powerups.shake = (powerups.shake || 0) + 3;
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        
        console.log('[App] New user initialized with bonus items');
        
        setTimeout(() => {
            showToast('Welcome! You got starter bonus! 🎁');
        }, 1500);
    }
}

// ==========================================
// Sound Settings
// ==========================================

function setupSoundSettings() {
    // Sound button in header - toggles sound on/off
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        // Update initial state
        updateSoundButton();
        
        // Long press opens settings, short press toggles
        let pressTimer;
        let isLongPress = false;
        
        soundBtn.addEventListener('mousedown', () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                openSoundSettings();
            }, 500);
        });
        
        soundBtn.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                toggleSound();
            }
        });
        
        soundBtn.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
        });
        
        // Touch events for mobile
        soundBtn.addEventListener('touchstart', (e) => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                openSoundSettings();
            }, 500);
        });
        
        soundBtn.addEventListener('touchend', (e) => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                toggleSound();
            }
            e.preventDefault();
        });
    }
    
    // Close sound modal
    document.getElementById('close-sound')?.addEventListener('click', () => {
        document.getElementById('sound-modal')?.classList.remove('show');
    });
    
    // Sound toggle in settings
    document.getElementById('sound-toggle-btn')?.addEventListener('click', () => {
        toggleSound();
        updateSoundSettingsUI();
    });
    
    // Sound pack selection
    document.getElementById('sound-pack-list')?.addEventListener('click', (e) => {
        const packItem = e.target.closest('.sound-pack-item');
        if (!packItem) return;
        
        const pack = packItem.dataset.pack;
        selectSoundPack(pack);
    });
    
    // Buy premium sounds
    document.getElementById('buy-premium-sounds')?.addEventListener('click', () => {
        buyPremiumSounds();
    });
    
    // Close modal on backdrop click
    document.getElementById('sound-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'sound-modal') {
            document.getElementById('sound-modal').classList.remove('show');
        }
    });
}

function toggleSound() {
    if (window.GameAPI) {
        const enabled = GameAPI.toggleSound();
        updateSoundButton();
        showToast(enabled ? 'Sound ON 🔊' : 'Sound OFF 🔇');
    }
}

function updateSoundButton() {
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn && window.GameAPI) {
        soundBtn.textContent = GameAPI.isSoundEnabled() ? '🔊' : '🔇';
    }
}

function openSoundSettings() {
    updateSoundSettingsUI();
    document.getElementById('sound-modal')?.classList.add('show');
}

function updateSoundSettingsUI() {
    // Update toggle button
    const toggleBtn = document.getElementById('sound-toggle-btn');
    if (toggleBtn && window.GameAPI) {
        const enabled = GameAPI.isSoundEnabled();
        toggleBtn.textContent = enabled ? 'ON' : 'OFF';
        toggleBtn.classList.toggle('off', !enabled);
    }
    
    // Update pack list
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    const currentPack = userData.soundPack || 'default';
    const hasPremium = userData.premiumSounds === true;
    
    document.querySelectorAll('.sound-pack-item').forEach(item => {
        const pack = item.dataset.pack;
        const isActive = pack === currentPack;
        const isLocked = pack !== 'default' && !hasPremium;
        
        item.classList.toggle('active', isActive);
        item.classList.toggle('locked', isLocked);
        
        const status = item.querySelector('.pack-status');
        if (status) {
            if (isActive) {
                status.textContent = '✓';
            } else if (isLocked) {
                status.textContent = '🔒 50⭐';
            } else {
                status.textContent = '';
            }
        }
    });
    
    // Update premium promo visibility
    const promo = document.getElementById('premium-promo');
    if (promo) {
        promo.style.display = hasPremium ? 'none' : 'block';
    }
}

function selectSoundPack(pack) {
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    const hasPremium = userData.premiumSounds === true;
    
    // Check if locked
    if (pack !== 'default' && !hasPremium) {
        // Offer to buy single pack or premium
        showToast('Unlock premium sounds first! 🔒');
        return;
    }
    
    // Change pack
    if (window.GameAPI) {
        GameAPI.changeSoundPack(pack);
        updateSoundSettingsUI();
        showToast(`Sound pack: ${pack.charAt(0).toUpperCase() + pack.slice(1)} 🎵`);
    }
}

async function buyPremiumSounds() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    const stars = userData.stars || 0;
    
    if (stars < 100) {
        showToast('Not enough stars! Need 100⭐');
        return;
    }
    
    const confirmed = await (window.TelegramGame?.showConfirm || confirm)(
        'Buy Premium Sounds for 100⭐? Unlock all sound packs forever!'
    );
    
    if (!confirmed) return;
    
    // Deduct stars
    userData.stars -= 100;
    userData.premiumSounds = true;
    localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
    
    // Update shop stars display
    if (window.Shop) {
        Shop.userStars = userData.stars;
        Shop.updateStarsDisplay();
    }
    
    updateSoundSettingsUI();
    
    if (window.TelegramGame) {
        window.TelegramGame.hapticFeedback('success');
    }
    
    showToast('Premium Sounds unlocked! 🎉');
}

// ==========================================
// Global Event Listeners
// ==========================================

function setupGlobalEventListeners() {
    
    // ---------- Game Over Modal Buttons ----------
    
    document.getElementById('restart-btn')?.addEventListener('click', () => {
        if (window.GameAPI) {
            GameAPI.restart();
        }
    });
    
    document.getElementById('revive-btn')?.addEventListener('click', () => {
        if (window.GameAPI) {
            const success = GameAPI.revive();
            if (!success) {
                showToast('No revives left! Buy more in shop.');
            }
        }
    });
    
    document.getElementById('share-btn')?.addEventListener('click', () => {
        const score = window.GameAPI?.getScore() || 0;
        if (window.TelegramGame) {
            TelegramGame.shareScore(score);
        } else {
            const text = `🍉 I scored ${score} points in Fruit Merge! Can you beat me?`;
            if (navigator.share) {
                navigator.share({ text });
            } else {
                navigator.clipboard.writeText(text);
                showToast('Score copied!');
            }
        }
    });
    
    // ---------- Power-up Buttons ----------
    
    document.getElementById('powerup-clear')?.addEventListener('click', () => {
        if (window.GameAPI) {
            GameAPI.usePowerup('clear_small');
        }
    });
    
    document.getElementById('powerup-shake')?.addEventListener('click', () => {
        if (window.GameAPI) {
            GameAPI.usePowerup('shake');
        }
    });
    
    document.getElementById('powerup-upgrade')?.addEventListener('click', () => {
        if (window.GameAPI) {
            GameAPI.usePowerup('upgrade');
        }
    });
    
    // ---------- Prevent Default Touch Behaviors ----------
    
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // ---------- Keyboard Shortcuts ----------
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            if (window.GameAPI?.isGameOver()) {
                GameAPI.restart();
            }
        }
        
        if (e.key === '1') GameAPI?.usePowerup('clear_small');
        if (e.key === '2') GameAPI?.usePowerup('shake');
        if (e.key === '3') GameAPI?.usePowerup('upgrade');
        if (e.key === 'm' || e.key === 'M') toggleSound();
    });
    
    // ---------- Close modals on Escape ----------
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                if (modal.id !== 'game-over-modal') {
                    modal.classList.remove('show');
                }
            });
        }
    });
}

// ==========================================
// Debug Helpers
// ==========================================

window.DEBUG = {
    addStars: (amount = 100) => {
        if (window.Shop) {
            Shop.addStars(amount);
        }
    },
    
    addPowerups: () => {
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        powerups.revive = (powerups.revive || 0) + 10;
        powerups.clear_small = (powerups.clear_small || 0) + 10;
        powerups.shake = (powerups.shake || 0) + 10;
        powerups.upgrade = (powerups.upgrade || 0) + 10;
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        gameScene?.updateUI();
        showToast('Debug: +10 all powerups');
    },
    
    unlockPremiumSounds: () => {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.premiumSounds = true;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        showToast('Debug: Premium sounds unlocked');
    },
    
    resetAll: () => {
        localStorage.clear();
        location.reload();
    },
    
    gameOver: () => {
        if (gameScene) {
            gameScene.triggerGameOver();
        }
    },
    
    showState: () => {
        console.log('Score:', GameState.score);
        console.log('Best:', GameState.bestScore);
        console.log('Sound:', GameState.soundEnabled);
        console.log('Sound Pack:', GameState.currentSoundPack);
        console.log('Fruits:', gameScene?.fruits.length);
        console.log('Powerups:', localStorage.getItem(CONFIG.STORAGE_POWERUPS));
        console.log('UserData:', localStorage.getItem(CONFIG.STORAGE_USER_DATA));
    }
};

console.log('[App] Debug commands available via window.DEBUG');
console.log('[App] Tip: Press M to toggle sound, Hold sound button for settings');
