// ==========================================
// Telegram Mini App Integration
// Handles: User auth, sharing, payments
// ==========================================

(function() {
    'use strict';

    // ---------- Telegram WebApp Instance ----------
    const tg = window.Telegram?.WebApp;

    // ---------- Check if running in Telegram ----------
    const isTelegram = !!tg;

    // ---------- User Data ----------
    let userData = null;

    // ---------- Initialize ----------
    function init() {
        if (!isTelegram) {
            console.log('Not running in Telegram, skipping TG integration');
            return;
        }

        console.log('Telegram Mini App detected, initializing...');

        // Tell Telegram the app is ready
        tg.ready();

        // Expand to full screen
        tg.expand();

        // Set header color
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');

        // Get user data
        userData = tg.initDataUnsafe?.user;
        if (userData) {
            console.log('Player:', userData.first_name, userData.last_name);
        }

        // Enable closing confirmation
        tg.enableClosingConfirmation();

        // Setup main button (can be used for various purposes)
        setupMainButton();

        // Setup back button
        tg.BackButton.onClick(() => {
            // Handle back navigation if needed
        });

        console.log('Telegram Mini App initialized successfully');
    }

    // ---------- Setup Main Button ----------
    function setupMainButton() {
        // The main button can be shown at game over for sharing
        tg.MainButton.setText('Share Score');
        tg.MainButton.color = '#667eea';
        tg.MainButton.textColor = '#ffffff';
        
        tg.MainButton.onClick(() => {
            shareScore(window.GameAPI?.getScore() || 0);
        });
    }

    // ---------- Show Main Button ----------
    function showMainButton() {
        if (isTelegram) {
            tg.MainButton.show();
        }
    }

    // ---------- Hide Main Button ----------
    function hideMainButton() {
        if (isTelegram) {
            tg.MainButton.hide();
        }
    }

    // ---------- Share Score ----------
    function shareScore(score) {
        if (!isTelegram) {
            // Fallback for web
            const text = `I scored ${score} points in Fruit Merge Game! Can you beat me?`;
            if (navigator.share) {
                navigator.share({ text });
            } else {
                navigator.clipboard.writeText(text);
                alert('Score copied to clipboard!');
            }
            return;
        }

        // Share via Telegram
        const text = `🍉 I scored ${score} points in Fruit Merge Game!\nCan you beat my score?`;
        
        // Switch to inline query for sharing
        tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
    }

    // ---------- Haptic Feedback ----------
    function hapticFeedback(type = 'light') {
        if (!isTelegram) return;

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
            case 'error':
                tg.HapticFeedback.notificationOccurred('error');
                break;
        }
    }

    // ---------- Show Popup ----------
    function showPopup(title, message, buttons = []) {
        if (!isTelegram) {
            alert(`${title}\n\n${message}`);
            return Promise.resolve();
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

    // ---------- Show Confirm ----------
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

    // ---------- Request Payment (Telegram Stars) ----------
    async function requestPayment(itemId, title, description, amount) {
        if (!isTelegram) {
            console.log('Payment not available outside Telegram');
            return { success: false, error: 'Not in Telegram' };
        }

        try {
            // Create invoice link via your backend
            // For now, we'll use a placeholder
            // In production, you need a backend to create invoice
            
            const invoiceLink = await createInvoice(itemId, title, description, amount);
            
            // Open payment
            const result = await new Promise((resolve) => {
                tg.openInvoice(invoiceLink, (status) => {
                    resolve(status);
                });
            });

            if (result === 'paid') {
                hapticFeedback('success');
                return { success: true };
            } else {
                return { success: false, error: result };
            }
        } catch (error) {
            console.error('Payment error:', error);
            return { success: false, error: error.message };
        }
    }

    // ---------- Create Invoice (Backend Call) ----------
    async function createInvoice(itemId, title, description, amount) {
        // In production, this should call your backend
        // Your backend creates the invoice using Telegram Bot API
        // and returns the invoice link
        
        // Example backend call:
        // const response = await fetch('https://your-backend.com/create-invoice', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         userId: userData?.id,
        //         itemId,
        //         title,
        //         description,
        //         amount
        //     })
        // });
        // const data = await response.json();
        // return data.invoiceLink;

        // Placeholder for demo
        console.log('Creating invoice for:', itemId, amount, 'stars');
        throw new Error('Backend not configured');
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
        }
    };

    // ---------- Save Score to Cloud ----------
    async function saveScoreToCloud(score) {
        const currentBest = parseInt(await cloudStorage.get('bestScore')) || 0;
        if (score > currentBest) {
            await cloudStorage.set('bestScore', score.toString());
            return true;
        }
        return false;
    }

    // ---------- Load Best Score from Cloud ----------
    async function loadBestScoreFromCloud() {
        return parseInt(await cloudStorage.get('bestScore')) || 0;
    }

    // ---------- Game Event Callbacks ----------
    function onScoreUpdate(score) {
        // Called when score changes
        // Can be used for real-time leaderboard updates
    }

    function onGameOver(score, bestScore) {
        // Called when game ends
        showMainButton();
        hapticFeedback('medium');
        saveScoreToCloud(score);
    }

    function onGameStart() {
        // Called when game starts/restarts
        hideMainButton();
    }

    // ---------- Export Public API ----------
    window.TelegramGame = {
        // State
        isTelegram,
        getUser: () => userData,

        // UI
        shareScore,
        showPopup,
        showConfirm,
        hapticFeedback,
        showMainButton,
        hideMainButton,

        // Payment
        requestPayment,

        // Storage
        cloudStorage,
        saveScoreToCloud,
        loadBestScoreFromCloud,

        // Game callbacks
        onScoreUpdate,
        onGameOver,
        onGameStart
    };

    // ---------- Auto Initialize ----------
    init();

})();


// ==========================================
// MONETIZATION ITEMS CONFIGURATION
// Define your purchasable items here
// ==========================================

const SHOP_ITEMS = {
    // Revive after game over
    REVIVE: {
        id: 'revive',
        title: 'Continue Game',
        description: 'Continue playing after game over',
        price: 10, // Telegram Stars
        emoji: '💫'
    },

    // Remove bottom 3 smallest fruits
    CLEAR_SMALL: {
        id: 'clear_small',
        title: 'Clear Small Fruits',
        description: 'Remove all small fruits from the container',
        price: 5,
        emoji: '🧹'
    },

    // Start with a bigger fruit
    BIG_START: {
        id: 'big_start',
        title: 'Big Start',
        description: 'Start the next round with a bigger fruit',
        price: 3,
        emoji: '🎁'
    },

    // No ads (if you add ads later)
    NO_ADS: {
        id: 'no_ads',
        title: 'Remove Ads',
        description: 'Remove all advertisements permanently',
        price: 100,
        emoji: '🚫'
    }
};

// Export shop items
window.SHOP_ITEMS = SHOP_ITEMS;
