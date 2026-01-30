// ==========================================
// VVIP System + Anti-Cheat Protection
// ==========================================

(function() {
    'use strict';
    
    // ⚠️⚠️⚠️ PUT YOUR TELEGRAM USER ID HERE! ⚠️⚠️⚠️
    // 
    // How to find your ID:
    // 1. Open Telegram
    // 2. Search for @userinfobot
    // 3. Send any message
    // 4. It will reply with your ID (e.g., 123456789)
    //
    const OWNER_IDS = [
        '123456789',  // <-- REPLACE WITH YOUR REAL TELEGRAM USER ID!
        // Add more admin IDs here if needed
    ];
    
    // ==========================================
    // Anti-Cheat System
    // ==========================================
    
    const AntiCheat = {
        
        init() {
            this.protectConsole();
            this.detectDevTools();
            this.protectGlobals();
            this.startValidation();
            this.blockCommonCheats();
        },
        
        isAdmin() {
            const tgUser = window.TelegramGame?.getUser?.();
            if (!tgUser) return false;
            return OWNER_IDS.includes(String(tgUser.id));
        },
        
        // Disable console for non-admins
        protectConsole() {
            if (this.isAdmin()) return;
            
            const noop = () => {};
            ['log', 'debug', 'info', 'warn', 'error', 'table', 'clear', 'dir', 'trace'].forEach(m => {
                window.console[m] = noop;
            });
            
            try { Object.freeze(console); } catch(e) {}
        },
        
        // Detect DevTools
        detectDevTools() {
            if (this.isAdmin()) return;
            
            // Method 1: Size detection
            setInterval(() => {
                if (window.outerWidth - window.innerWidth > 160 || 
                    window.outerHeight - window.innerHeight > 160) {
                    this.onCheatDetected('DevTools');
                }
            }, 2000);
            
            // Method 2: debugger timing
            setInterval(() => {
                const t1 = performance.now();
                debugger;
                if (performance.now() - t1 > 100) {
                    this.onCheatDetected('Debugger');
                }
            }, 3000);
        },
        
        // Remove cheat functions from window
        protectGlobals() {
            if (this.isAdmin()) return;
            
            // Delete any cheat objects
            setTimeout(() => {
                delete window.CHEAT;
                delete window.AdminCheats;
                delete window.DEBUG;
            }, 2000);
            
            // Prevent localStorage tampering detection
            const originalSetItem = localStorage.setItem.bind(localStorage);
            localStorage.setItem = (key, value) => {
                // Check for suspicious star values
                if (key === CONFIG?.STORAGE_USER_DATA) {
                    try {
                        const data = JSON.parse(value);
                        if (data.stars > 100000 && !this.isAdmin()) {
                            this.onCheatDetected('Stars manipulation');
                            return;
                        }
                    } catch(e) {}
                }
                originalSetItem(key, value);
            };
        },
        
        // Validate data periodically
        startValidation() {
            if (this.isAdmin()) return;
            
            let lastStars = 0;
            let lastTime = Date.now();
            
            setInterval(() => {
                const ud = JSON.parse(localStorage.getItem(CONFIG?.STORAGE_USER_DATA || '') || '{}');
                const now = Date.now();
                const timeDiff = (now - lastTime) / 1000;
                const starsDiff = (ud.stars || 0) - lastStars;
                
                // Max 100 stars per second is suspicious
                if (starsDiff > timeDiff * 100 && starsDiff > 500) {
                    this.onCheatDetected('Abnormal stars');
                }
                
                lastStars = ud.stars || 0;
                lastTime = now;
            }, 5000);
        },
        
        // Block common cheat attempts
        blockCommonCheats() {
            if (this.isAdmin()) return;
            
            // Block eval
            window.eval = () => { this.onCheatDetected('eval'); };
            
            // Block Function constructor
            try {
                window.Function = () => { this.onCheatDetected('Function'); };
            } catch(e) {}
        },
        
        onCheatDetected(reason) {
            // Show warning
            if (window.showToast) {
                showToast('⚠️ Cheat detected! Data may be reset.');
            }
            
            // Report to server
            const tgUser = window.TelegramGame?.getUser?.();
            fetch(`${CONFIG?.BACKEND_URL || ''}/report-cheat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    odairy: tgUser?.id,
                    reason: reason,
                    time: Date.now()
                })
            }).catch(() => {});
            
            // Optional: Reset data
            // localStorage.clear();
            // location.reload();
        }
    };
    
    // ==========================================
    // VVIP System (Only for OWNER_IDS)
    // ==========================================
    
    const VVIPSystem = {
        
        isVVIP(userId) {
            return OWNER_IDS.includes(String(userId));
        },
        
        init() {
            setTimeout(() => {
                const tgUser = window.TelegramGame?.getUser?.();
                
                if (tgUser && this.isVVIP(tgUser.id)) {
                    console.log('%c👑 VVIP OWNER MODE!', 'color:gold;font-size:20px;font-weight:bold');
                    this.activateVVIP();
                    this.exposeCheatCommands();
                } else {
                    // Normal user: enable anti-cheat
                    AntiCheat.init();
                }
            }, 1500);
        },
        
        activateVVIP() {
            const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
            
            ud.isVVIP = true;
            ud.isVip = true;
            ud.stars = Math.max(ud.stars || 0, 999999);
            ud.ownedColors = ['default','gold','rainbow','pink','blue','green','purple','vvip_rainbow'];
            ud.nameColor = 'vvip_rainbow';
            ud.ownedSkins = ['default','animals','space','food','sports','hearts','halloween','christmas'];
            ud.premiumSounds = true;
            ud.doubleScore = true;
            ud.freeNameChanges = true;
            
            localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(ud));
            
            const p = { revive: 999, clear_small: 999, shake: 999, upgrade: 999 };
            localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(p));
            
            if (window.Shop) { Shop.userStars = ud.stars; Shop.updateStarsDisplay(); }
            if (window.updateAllUI) updateAllUI();
            
            this.injectStyles();
            
            setTimeout(() => showToast?.('👑 VVIP Owner Mode!'), 2000);
        },
        
        exposeCheatCommands() {
            window.CHEAT = {
                addStars: (n=10000) => {
                    const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA)||'{}');
                    ud.stars = (ud.stars||0) + n;
                    localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(ud));
                    Shop && (Shop.userStars = ud.stars, Shop.updateStarsDisplay());
                    updateAllUI?.();
                    showToast?.(`+${n} ⭐`);
                },
                setStars: (n) => {
                    const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA)||'{}');
                    ud.stars = n;
                    localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(ud));
                    Shop && (Shop.userStars = ud.stars, Shop.updateStarsDisplay());
                    updateAllUI?.();
                    showToast?.(`Stars = ${n}`);
                },
                addPowerups: (n=99) => {
                    const p = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS)||'{}');
                    ['revive','clear_small','shake','upgrade'].forEach(k => p[k] = (p[k]||0) + n);
                    localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(p));
                    updateAllUI?.();
                    showToast?.(`+${n} powerups`);
                },
                unlockAll: () => {
                    const ud = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA)||'{}');
                    ud.ownedSkins = ['default','animals','space','food','sports','hearts','halloween','christmas'];
                    ud.ownedColors = ['default','gold','rainbow','pink','blue','green','purple','vvip_rainbow'];
                    ud.premiumSounds = true;
                    localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(ud));
                    showToast?.('All unlocked! 🎨');
                },
                setScore: (n) => { GameState && (GameState.score = n); gameScene?.updateUI(); showToast?.(`Score=${n}`); },
                setHighScore: (n) => { localStorage.setItem(CONFIG.STORAGE_BEST_SCORE, n); Leaderboard?.submitScore(n); showToast?.(`Best=${n}`); },
                godMode: () => { CHEAT.setStars(999999); CHEAT.addPowerups(999); CHEAT.unlockAll(); showToast?.('🔥 GOD MODE!'); },
                help: () => console.log('CHEAT: addStars, setStars, addPowerups, unlockAll, setScore, setHighScore, godMode')
            };
            console.log('%cType CHEAT.help()', 'color:#0f0');
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
    
    window.VVIPSystem = VVIPSystem;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => VVIPSystem.init());
    } else {
        VVIPSystem.init();
    }
})();
