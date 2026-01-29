// ==========================================
// Telegram Mini App Integration
// ==========================================

(function() {
    'use strict';

    const tg = window.Telegram?.WebApp;
    const isTelegram = !!tg;
    
    let userData = null;
    let referralCode = null;

    // ---------- Initialize ----------
    
    function init() {
        if (!isTelegram) {
            console.log('[TG] Not in Telegram environment');
            return;
        }

        console.log('[TG] Initializing Telegram Mini App...');

        // Ready signal
        tg.ready();

        // Expand to full height
        tg.expand();

        // Set theme colors
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');

        // Get user data
        userData = tg.initDataUnsafe?.user;
        if (userData) {
            console.log('[TG] User:', userData.first_name, userData.id);
        }

        // Check for referral start parameter
        referralCode = tg.initDataUnsafe?.start_param;
        if (referralCode) {
            console.log('[TG] Referral code:', referralCode);
            processReferral(referralCode);
        }

        // Enable closing confirmation when game is in progress
        tg.enableClosingConfirmation();

        // Setup main button
        setupMainButton();

        console.log('[TG] Initialization complete');
    }

    // ---------- Main Button ----------
    
    function setupMainButton() {
        tg.MainButton.setText('Share Score');
        tg.MainButton.color = '#667eea';
        tg.MainButton.textColor = '#ffffff';
        
        tg.MainButton.onClick(() => {
            shareScore(window.GameAPI?.getScore() || 0);
        });
    }

    function showMainButton(text = 'Share Score') {
        if (!isTelegram) return;
        tg.MainButton.setText(text);
        tg.MainButton.show();
    }

    function hideMainButton() {
        if (!isTelegram) return;
        tg.MainButton.hide();
    }

    // ---------- Haptic Feedback ----------
    
    function hapticFeedback(type = 'light') {
        if (!isTelegram) return;

        try {
            switch(type) {
                case 'light':
                    tg.HapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    tg.HapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    tg.HapticFeedback.impactOccurred('heavy');
                    break;
                case 'success':
                    tg.HapticFeedback.notificationOccurred('success');
                    break;
                case 'warning':
                    tg.HapticFeedback.notificationOccurred('warning');
                    break;
                case 'error':
                    tg.HapticFeedback.notificationOccurred('error');
                    break;
            }
        } catch (e) {
            console.log('[TG] Haptic feedback error:', e);
        }
    }

    // ---------- Sharing ----------
    
    function shareScore(score) {
        const text = `🍉 I scored ${score} points in Fruit Merge!\nCan you beat my score?`;
        
        if (isTelegram) {
            tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
        } else {
            // Web fallback
            if (navigator.share) {
                navigator.share({ text });
            } else {
                navigator.clipboard.writeText(text);
                showToast('Score copied to clipboard!');
            }
        }
    }

    function shareReferralLink() {
        const link = getReferralLink();
        const text = `🎮 Play Fruit Merge with me!\n${link}`;
        
        if (isTelegram) {
            tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
        } else {
            navigator.clipboard.writeText(link);
            showToast('Link copied!');
        }
    }

    function getReferralLink() {
        const myId = userData?.id || 'guest';
        return `https://t.me/${CONFIG.BOT_USERNAME}/${CONFIG.APP_SHORT_NAME}?startapp=${myId}`;
    }

    // ---------- Referral System ----------
    
    function processReferral(code) {
        // Don't process own referral
        if (userData && code === userData.id.toString()) return;
        
        // Check if already processed
        const processed = localStorage.getItem('referral_processed');
        if (processed) return;
        
        // Mark as processed
        localStorage.setItem('referral_processed', code);
        
        // In production: Send to backend to credit the referrer
        console.log('[TG] Processing referral from:', code);
        
        // Give bonus to new user
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        powerups.revive = (powerups.revive || 0) + 1;
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        
        showToast('Welcome bonus: +1 Revive! 🎁');
    }

    // ---------- Payments (Telegram Stars) ----------
    
    async function requestPayment(item) {
        if (!isTelegram) {
            console.log('[TG] Payment not available outside Telegram');
            showToast('Payment only works in Telegram');
            return { success: false, error: 'Not in Telegram' };
        }

        try {
            // In production, create invoice via your backend
            // const invoiceLink = await createInvoiceOnBackend(item);
            
            // For demo, simulate payment
            const confirmed = await showConfirm(
                `Buy ${item.title} for ${item.price} ⭐?`
            );
            
            if (confirmed) {
                // Simulate successful payment
                grantPurchase(item);
                hapticFeedback('success');
                return { success: true };
            }
            
            return { success: false, error: 'Cancelled' };
            
        } catch (error) {
            console.error('[TG] Payment error:', error);
            hapticFeedback('error');
            return { success: false, error: error.message };
        }
    }

    function grantPurchase(item) {
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
        
        showToast(`Purchased ${item.title}! ✅`);
        
        // Update game UI
        if (window.GameAPI) {
            window.gameScene?.updateUI();
        }
    }

    // ---------- Popups ----------
    
    function showPopup(title, message, buttons = []) {
        if (!isTelegram) {
            alert(`${title}\n\n${message}`);
            return Promise.resolve('ok');
        }

        return new Promise((resolve) => {
            tg.showPopup({
                title,
                message,
                buttons: buttons.length ? buttons : [{ type: 'ok' }]
            }, (buttonId) => {
                resolve(buttonId);
            });
        });
    }

    function showConfirm(message) {
        if (!isTelegram) {
            return Promise.resolve(confirm(message));
        }

        return new Promise((resolve) => {
            tg.showConfirm(message, (confirmed) => {
                resolve(confirmed);
            });
        });
    }

    function showAlert(message) {
        if (!isTelegram) {
            alert(message);
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            tg.showAlert(message, resolve);
        });
    }

    // ---------- Cloud Storage ----------
    
    const cloudStorage = {
        async get(key) {
            if (!isTelegram) {
                return localStorage.getItem(key);
            }
            
            return new Promise((resolve) => {
                tg.CloudStorage.getItem(key, (error, value) => {
                    resolve(error ? null : value);
                });
            });
        },

        async set(key, value) {
            if (!isTelegram) {
                localStorage.setItem(key, value);
                return true;
            }
            
            return new Promise((resolve) => {
                tg.CloudStorage.setItem(key, value, (error) => {
                    resolve(!error);
                });
            });
        },

        async remove(key) {
            if (!isTelegram) {
                localStorage.removeItem(key);
                return true;
            }
            
            return new Promise((resolve) => {
                tg.CloudStorage.removeItem(key, (error) => {
                    resolve(!error);
                });
            });
        },

        async getAll(keys) {
            if (!isTelegram) {
                const result = {};
                for (const key of keys) {
                    result[key] = localStorage.getItem(key);
                }
                return result;
            }
            
            return new Promise((resolve) => {
                tg.CloudStorage.getItems(keys, (error, values) => {
                    resolve(error ? {} : values);
                });
            });
        }
    };

    // ---------- Game Callbacks ----------
    
    function onGameStart() {
        hideMainButton();
    }

    function onScoreUpdate(score) {
        // Can be used for real-time updates
    }

    function onGameOver(score, bestScore) {
        showMainButton('Share Score 📤');
    }

    // ---------- Export API ----------
    
    window.TelegramGame = {
        // State
        isTelegram,
        getUser: () => userData,
        getReferralCode: () => referralCode,
        getReferralLink,

        // UI
        hapticFeedback,
        showPopup,
        showConfirm,
        showAlert,
        showMainButton,
        hideMainButton,

        // Sharing
        shareScore,
        shareReferralLink,

        // Payments
        requestPayment,
        grantPurchase,

        // Storage
        cloudStorage,

        // Callbacks
        onGameStart,
        onScoreUpdate,
        onGameOver,

        // Init
        init
    };

    // Auto-initialize
    init();

})();
