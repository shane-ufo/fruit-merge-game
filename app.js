// ==========================================
// Main App v3.0 - All Features Integrated
// ==========================================

function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

window.showToast = showToast;

// ==========================================
// Modal System
// ==========================================

function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('show');

    // Initialize wheel canvas when opening
    if (modalId === 'wheel-modal') {
        setTimeout(() => LuckyWheel.drawWheel(), 100);
    }

    // Initialize profile UI when opening
    if (modalId === 'profile-modal') {
        updateProfileModal();
    }

    // Load friends when opening friends modal
    if (modalId === 'friends-modal') {
        FriendsSystem?.loadFriends();
    }

    // Refresh leaderboard when opening
    if (modalId === 'leaderboard-modal') {
        Leaderboard?.refresh();
    }
}

function updateProfileModal() {
    if (window.UsernameSystem) {
        UsernameSystem.updateProfileUI();
    }

    // Update stats
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    const bestScore = localStorage.getItem(CONFIG.STORAGE_BEST_SCORE) || 0;

    document.getElementById('profile-games').textContent = userData.gamesPlayed || 0;
    document.getElementById('profile-best').textContent = bestScore;
    document.getElementById('profile-stars').textContent = userData.stars || 0;
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('show');
}

window.openModal = openModal;
window.closeModal = closeModal;

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// ==========================================
// Sound Toggle
// ==========================================

function toggleSoundSetting() {
    if (window.GameAPI) {
        const enabled = GameAPI.toggleSound();
        updateSoundUI(enabled);
    }
}

function updateSoundUI(enabled) {
    const btn = document.getElementById('sound-btn');
    const toggleBtn = document.getElementById('sound-toggle-btn');

    if (btn) btn.textContent = enabled ? '🔊' : '🔇';
    if (toggleBtn) {
        toggleBtn.textContent = enabled ? 'ON' : 'OFF';
        toggleBtn.classList.toggle('off', !enabled);
    }
}

window.toggleSoundSetting = toggleSoundSetting;

// ==========================================
// Update UI
// ==========================================

function updateAllUI() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
    const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');

    // Stars
    const stars = userData.stars || 0;
    document.getElementById('header-stars').textContent = stars;
    document.getElementById('user-stars').textContent = stars;

    // Powerups
    document.getElementById('clear-count').textContent = powerups.clear_small || 0;
    document.getElementById('shake-count').textContent = powerups.shake || 0;
    document.getElementById('upgrade-count').textContent = powerups.upgrade || 0;

    // Enable/disable powerup buttons
    const clearBtn = document.getElementById('powerup-clear');
    const shakeBtn = document.getElementById('powerup-shake');
    const upgradeBtn = document.getElementById('powerup-upgrade');

    if (clearBtn) clearBtn.disabled = !(powerups.clear_small > 0);
    if (shakeBtn) shakeBtn.disabled = !(powerups.shake > 0);
    if (upgradeBtn) upgradeBtn.disabled = !(powerups.upgrade > 0);

    // Badges
    updateBadges();
}

function updateBadges() {
    // Daily badge
    const dailyBadge = document.getElementById('daily-badge');
    if (dailyBadge) {
        const canCheckIn = DailySystem.canCheckIn();
        const tasks = DailySystem.getTodaysTasks();
        const hasClaimable = tasks.tasks?.some(t => t.completed && !t.claimed);
        dailyBadge.classList.toggle('show', canCheckIn || hasClaimable);
    }

    // Wheel badge
    const wheelBadge = document.getElementById('wheel-badge');
    if (wheelBadge) {
        const canSpin = LuckyWheel.canFreeSpin();
        wheelBadge.classList.toggle('show', canSpin);
    }
}

window.updateAllUI = updateAllUI;

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing v3.0...');

    // Initialize new user
    initializeNewUser();

    // Initialize all systems
    if (window.DailySystem) {
        DailySystem.init();
        console.log('[App] Daily system initialized');
    }

    if (window.LuckyWheel) {
        LuckyWheel.init();
        console.log('[App] Lucky wheel initialized');
    }

    if (window.SkinSystem) {
        SkinSystem.init();
        console.log('[App] Skin system initialized');
    }

    if (window.UsernameSystem) {
        UsernameSystem.init();
        console.log('[App] Username system initialized');
    }

    if (window.FriendsSystem) {
        FriendsSystem.init();
        console.log('[App] Friends system initialized');
    }

    if (window.VVIPSystem) {
        VVIPSystem.injectStyles();
        VVIPSystem.init();
        console.log('[App] VVIP system initialized');
    }

    if (window.Shop) {
        Shop.init();
        console.log('[App] Shop initialized');
    }

    if (window.Leaderboard) {
        Leaderboard.init();
        console.log('[App] Leaderboard initialized');
    }

    if (window.GameAPI) {
        GameAPI.init();
        console.log('[App] Game initialized');
    }

    // Setup event listeners
    setupEventListeners();

    // Update UI
    updateAllUI();

    // Sound button click
    document.getElementById('sound-btn')?.addEventListener('click', () => {
        openModal('sound-modal');
    });

    // Update sound UI
    if (window.GameAPI) {
        updateSoundUI(GameAPI.isSoundEnabled());
    }

    // Hide loading
    setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
    }, 500);

    // Adjust game size for mobile
    adjustGameSize();
    window.addEventListener('resize', adjustGameSize);

    console.log('[App] Ready!');
});

function initializeNewUser() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');

    if (!userData.initialized) {
        userData.initialized = true;
        userData.stars = 100;
        userData.joinDate = Date.now();
        userData.soundEnabled = true;
        userData.ownedSkins = ['default'];
        userData.currentSkin = 'default';
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));

        const powerups = { revive: 2, clear_small: 3, shake: 3 };
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));

        setTimeout(() => showToast('Welcome! You got starter bonus! 🎁'), 1500);
    }
}

function adjustGameSize() {
    const gameArea = document.getElementById('game-area');
    const container = document.getElementById('game-container');

    if (!gameArea || !container) return;

    const availableHeight = gameArea.clientHeight - 20;
    const availableWidth = gameArea.clientWidth - 20;

    // Game aspect ratio
    const gameRatio = CONFIG.GAME_WIDTH / CONFIG.GAME_HEIGHT;

    let newWidth, newHeight;

    if (availableWidth / availableHeight > gameRatio) {
        // Height constrained
        newHeight = availableHeight;
        newWidth = newHeight * gameRatio;
    } else {
        // Width constrained
        newWidth = availableWidth;
        newHeight = newWidth / gameRatio;
    }

    // Apply to canvas
    const canvas = container.querySelector('canvas');
    if (canvas) {
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
    }
}

function setupEventListeners() {
    // Game Over buttons
    document.getElementById('restart-btn')?.addEventListener('click', () => {
        closeModal('game-over-modal');
        GameAPI?.restart();
    });

    document.getElementById('revive-btn')?.addEventListener('click', () => {
        if (GameAPI?.revive()) {
            closeModal('game-over-modal');
        } else {
            showToast('No revives! Buy in shop.');
        }
    });

    document.getElementById('share-btn')?.addEventListener('click', () => {
        const score = GameAPI?.getScore() || 0;
        if (window.TelegramGame) {
            TelegramGame.shareScore(score);
        } else {
            navigator.clipboard?.writeText(`🍉 I scored ${score} in Fruit Merge!`);
            showToast('Score copied!');
        }
    });

    // Powerups
    document.getElementById('powerup-clear')?.addEventListener('click', () => {
        GameAPI?.usePowerup('clear_small');
        updateAllUI();
    });

    document.getElementById('powerup-shake')?.addEventListener('click', () => {
        GameAPI?.usePowerup('shake');
        updateAllUI();
    });

    document.getElementById('powerup-upgrade')?.addEventListener('click', () => {
        GameAPI?.usePowerup('upgrade');
        updateAllUI();
    });

    // Leaderboard tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Leaderboard?.switchTab(btn.dataset.tab);
        });
    });

    // Prevent touch issues
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('#game-container')) {
            e.preventDefault();
        }
    }, { passive: false });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(m => {
                if (m.id !== 'game-over-modal') m.classList.remove('show');
            });
        }
    });
}

// ==========================================
// Track Game Events for Tasks
// ==========================================

// Override game callbacks to track tasks
const originalOnGameStart = window.TelegramGame?.onGameStart;
const originalOnGameOver = window.TelegramGame?.onGameOver;

if (window.TelegramGame) {
    window.TelegramGame.onGameStart = () => {
        originalOnGameStart?.();
        DailySystem?.updateTaskProgress('game', 1);
    };

    window.TelegramGame.onGameOver = (score, best) => {
        originalOnGameOver?.(score, best);
        DailySystem?.updateTaskProgress('score', score);
        updateAllUI();
    };
}

// Track merges (call from game.js)
window.trackMerge = function () {
    DailySystem?.updateTaskProgress('merge', 1);
};

// ==========================================
// Debug
// ==========================================

window.DEBUG = {
    addStars: (n = 100) => {
        const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        ud.stars = (ud.stars || 0) + n;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(ud));
        updateAllUI();
        showToast(`+${n} ⭐`);
    },
    addPowerups: () => {
        const p = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        p.revive = (p.revive || 0) + 10;
        p.clear_small = (p.clear_small || 0) + 10;
        p.shake = (p.shake || 0) + 10;
        p.upgrade = (p.upgrade || 0) + 10;
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(p));
        updateAllUI();
        showToast('+10 all powerups');
    },
    resetDaily: () => {
        localStorage.removeItem('dailyCheckIn');
        localStorage.removeItem('dailyTasks');
        localStorage.removeItem('luckyWheel');
        location.reload();
    },
    reset: () => {
        localStorage.clear();
        location.reload();
    }
};
