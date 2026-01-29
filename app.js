// ==========================================
// Main App Initialization
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

// Make it globally available
window.showToast = showToast;

// ==========================================
// App Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing...');
    
    // Initialize all systems
    initializeSystems();
    
    // Setup event listeners
    setupGlobalEventListeners();
    
    // Hide loading overlay
    setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }, 500);
    
    console.log('[App] Ready!');
});

function initializeSystems() {
    // Initialize Telegram (already auto-inits, but ensure)
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
    
    // Give initial powerups for new users
    initializeNewUser();
}

function initializeNewUser() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    
    // Check if new user
    if (!userData.initialized) {
        userData.initialized = true;
        userData.stars = 100;  // Starting bonus
        userData.joinDate = Date.now();
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        // Give starting powerups
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

function setupGlobalEventListeners() {
    
    // ---------- Game Over Modal Buttons ----------
    
    // Restart button
    document.getElementById('restart-btn')?.addEventListener('click', () => {
        if (window.GameAPI) {
            GameAPI.restart();
        }
    });
    
    // Revive button
    document.getElementById('revive-btn')?.addEventListener('click', () => {
        if (window.GameAPI) {
            const success = GameAPI.revive();
            if (!success) {
                showToast('No revives left! Buy more in shop.');
            }
        }
    });
    
    // Share button
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
        // Prevent scrolling in game area
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
    
    // ---------- Keyboard Shortcuts (for testing) ----------
    
    document.addEventListener('keydown', (e) => {
        // R - Restart
        if (e.key === 'r' || e.key === 'R') {
            if (window.GameAPI?.isGameOver()) {
                GameAPI.restart();
            }
        }
        
        // 1, 2, 3 - Use powerups
        if (e.key === '1') GameAPI?.usePowerup('clear_small');
        if (e.key === '2') GameAPI?.usePowerup('shake');
        if (e.key === '3') GameAPI?.usePowerup('upgrade');
    });
    
    // ---------- Close modals on Escape key ----------
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                // Don't close game over modal with escape
                if (modal.id !== 'game-over-modal') {
                    modal.classList.remove('show');
                }
            });
        }
    });
}

// ==========================================
// Debug Helpers (remove in production)
// ==========================================

window.DEBUG = {
    // Add stars
    addStars: (amount = 100) => {
        Shop.addStars(amount);
    },
    
    // Add powerups
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
    
    // Reset all data
    resetAll: () => {
        localStorage.clear();
        location.reload();
    },
    
    // Trigger game over
    gameOver: () => {
        if (gameScene) {
            gameScene.triggerGameOver();
        }
    },
    
    // Show state
    showState: () => {
        console.log('Score:', GameState.score);
        console.log('Best:', GameState.bestScore);
        console.log('Fruits:', gameScene?.fruits.length);
        console.log('Powerups:', localStorage.getItem(CONFIG.STORAGE_POWERUPS));
        console.log('UserData:', localStorage.getItem(CONFIG.STORAGE_USER_DATA));
    }
};

console.log('[App] Debug commands available via window.DEBUG');
