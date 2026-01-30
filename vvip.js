// ==========================================
// VVIP System + Anti-Cheat Protection
// ==========================================

(function () {
    'use strict';

    // ==========================================
    // ⚠️ CONFIGURATION - 修改这里！
    // ==========================================

    // 方法 1: 用 Telegram User ID（推荐）
    // 去 Telegram 找 @userinfobot 获取你的 ID
    const OWNER_IDS = [
        '1579441495',  // ← 换成你的真实 Telegram User ID!
    ];

    // 方法 2: 用密码激活（更简单）
    // 在 Console 输入: VVIP.activate('你的密码')
    const SECRET_PASSWORD = 'owner888';  // ← 你可以改成别的密码

    // ==========================================
    // Owner Detection
    // ==========================================

    function isOwner() {
        // Check 1: localStorage flag (activated by password)
        if (localStorage.getItem('_vvip_owner') === 'true') {
            return true;
        }

        // Check 2: Telegram User ID
        const tgUser = window.TelegramGame?.getUser?.();
        if (tgUser && OWNER_IDS.includes(String(tgUser.id))) {
            return true;
        }

        return false;
    }

    // ==========================================
    // Anti-Cheat (只对普通玩家生效)
    // ==========================================

    const AntiCheat = {
        enabled: false,

        init() {
            // 延迟启动，先判断是否是 owner
            setTimeout(() => {
                if (isOwner()) {
                    console.log('%c👑 OWNER - Anti-cheat DISABLED', 'color:gold;font-size:14px');
                    return;
                }

                this.enabled = true;
                this.protect();
            }, 3000); // 3秒后启动，给足够时间判断
        },

        protect() {
            if (!this.enabled) return;

            // 1. 隐藏 console
            const noop = () => { };
            ['log', 'debug', 'info', 'warn', 'error', 'table', 'clear', 'dir', 'trace'].forEach(m => {
                try { console[m] = noop; } catch (e) { }
            });

            // 2. 删除作弊对象
            setTimeout(() => {
                delete window.CHEAT;
                delete window.VVIP;
                delete window.DEBUG;
            }, 4000);
        }
    };

    // ==========================================
    // VVIP System
    // ==========================================

    const VVIPSystem = {

        // 用密码激活 VVIP
        activate(password) {
            if (password === SECRET_PASSWORD) {
                localStorage.setItem('_vvip_owner', 'true');
                this.grantPrivileges();
                console.log('%c👑 VVIP ACTIVATED!', 'color:gold;font-size:20px');
                if (window.showToast) showToast('👑 VVIP Mode Activated!');
                return true;
            } else {
                console.log('Wrong password');
                return false;
            }
        },

        // 取消 VVIP
        deactivate() {
            localStorage.removeItem('_vvip_owner');
            console.log('VVIP deactivated. Refresh to apply.');
        },

        // 授予特权
        grantPrivileges() {
            const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_USER_DATA) || 'fruitMerge_userData';
            const powerupKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_POWERUPS) || 'fruitMerge_powerups';

            const ud = JSON.parse(localStorage.getItem(storageKey) || '{}');

            ud.isVVIP = true;
            ud.isVip = true;
            ud.stars = 999999;
            ud.ownedColors = ['default', 'gold', 'rainbow', 'pink', 'blue', 'green', 'purple', 'vvip_rainbow'];
            ud.nameColor = 'vvip_rainbow';
            ud.ownedSkins = ['default', 'animals', 'space', 'food', 'sports', 'hearts', 'halloween', 'christmas'];
            ud.premiumSounds = true;
            ud.doubleScore = true;
            ud.freeNameChanges = true;

            localStorage.setItem(storageKey, JSON.stringify(ud));

            const p = { revive: 999, clear_small: 999, shake: 999, upgrade: 999 };
            localStorage.setItem(powerupKey, JSON.stringify(p));

            // Update UI
            if (window.Shop) {
                Shop.userStars = ud.stars;
                if (Shop.updateStarsDisplay) Shop.updateStarsDisplay();
            }
            if (window.updateAllUI) updateAllUI();

            // Inject styles
            this.injectStyles();

            // Expose cheat commands
            this.exposeCommands();
        },

        // 自动初始化
        init() {
            setTimeout(() => {
                if (isOwner()) {
                    console.log('%c👑 VVIP OWNER MODE', 'color:gold;font-size:16px;font-weight:bold');
                    this.grantPrivileges();
                    setTimeout(() => {
                        if (window.showToast) showToast('👑 VVIP Owner Mode!');
                    }, 1500);
                } else {
                    // 普通用户：启动防作弊
                    AntiCheat.init();
                }
            }, 2000);
        },

        // 作弊命令
        exposeCommands() {
            const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_USER_DATA) || 'fruitMerge_userData';
            const powerupKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_POWERUPS) || 'fruitMerge_powerups';
            const scoreKey = (typeof CONFIG !== 'undefined' && CONFIG.STORAGE_BEST_SCORE) || 'fruitMerge_bestScore';

            window.CHEAT = {
                stars: (n = 10000) => {
                    const ud = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    ud.stars = (ud.stars || 0) + n;
                    localStorage.setItem(storageKey, JSON.stringify(ud));
                    if (window.Shop) { Shop.userStars = ud.stars; if (Shop.updateStarsDisplay) Shop.updateStarsDisplay(); }
                    if (window.updateAllUI) updateAllUI();
                    if (window.showToast) showToast('+' + n + ' ⭐');
                },

                powerups: (n = 99) => {
                    const p = JSON.parse(localStorage.getItem(powerupKey) || '{}');
                    ['revive', 'clear_small', 'shake', 'upgrade'].forEach(k => p[k] = (p[k] || 0) + n);
                    localStorage.setItem(powerupKey, JSON.stringify(p));
                    if (window.updateAllUI) updateAllUI();
                    if (window.showToast) showToast('+' + n + ' powerups');
                },

                score: (n) => {
                    if (window.GameState) GameState.score = n;
                    if (window.gameScene && gameScene.updateUI) gameScene.updateUI();
                    if (window.showToast) showToast('Score = ' + n);
                },

                leaderboard: (n) => {
                    localStorage.setItem(scoreKey, n);
                    if (window.Leaderboard && Leaderboard.submitScore) Leaderboard.submitScore(n);
                    if (window.showToast) showToast('Leaderboard = ' + n);
                },

                unlock: () => {
                    const ud = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    ud.ownedSkins = ['default', 'animals', 'space', 'food', 'sports', 'hearts', 'halloween', 'christmas'];
                    ud.ownedColors = ['default', 'gold', 'rainbow', 'pink', 'blue', 'green', 'purple', 'vvip_rainbow'];
                    ud.premiumSounds = true;
                    localStorage.setItem(storageKey, JSON.stringify(ud));
                    if (window.showToast) showToast('All unlocked! 🎨');
                },

                god: () => {
                    CHEAT.stars(999999);
                    CHEAT.powerups(999);
                    CHEAT.unlock();
                    if (window.showToast) showToast('🔥 GOD MODE!');
                }
            };

            console.log('%c🎮 Cheats ready!', 'color:#0f0;font-size:14px');
            console.log('  CHEAT.stars(10000)  - Add stars');
            console.log('  CHEAT.powerups(99)  - Add powerups');
            console.log('  CHEAT.score(99999)  - Set game score');
            console.log('  CHEAT.leaderboard(99999) - Set leaderboard');
            console.log('  CHEAT.unlock()      - Unlock all');
            console.log('  CHEAT.god()         - Everything!');
        },

        injectStyles() {
            if (document.getElementById('vvip-css')) return;
            const s = document.createElement('style');
            s.id = 'vvip-css';
            s.textContent = `
                .vvip-text{font-weight:bold;background:linear-gradient(90deg,#f00,#ff7f00,#ff0,#0f0,#00f,#8b00ff,#f00);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:vvip-r 2s linear infinite}
                .vvip-title{background:linear-gradient(135deg,#ffd700,#ff6b6b);color:#000;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:bold;margin-left:5px}
                @keyframes vvip-r{to{background-position:200% center}}
                .leaderboard-entry.vvip{background:linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,107,107,.1));border:2px solid rgba(255,215,0,.5);box-shadow:0 0 15px rgba(255,215,0,.2)}
            `;
            document.head.appendChild(s);
        }
    };

    // ==========================================
    // Expose & Initialize
    // ==========================================

    // 暴露 VVIP 对象（用于密码激活）
    window.VVIP = {
        activate: (pw) => VVIPSystem.activate(pw),
        deactivate: () => VVIPSystem.deactivate(),
        status: () => isOwner() ? 'VVIP Active 👑' : 'Normal User'
    };

    window.VVIPSystem = VVIPSystem;

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VVIPSystem.init());
    } else {
        VVIPSystem.init();
    }

})();
