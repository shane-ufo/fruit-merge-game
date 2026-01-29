// ==========================================
// Game Configuration
// ==========================================

const CONFIG = {
    // Game dimensions
    GAME_WIDTH: 380,
    GAME_HEIGHT: 550,

    // Physics
    WALL_THICKNESS: 12,
    DROP_LINE_Y: 70,
    DANGER_LINE_Y: 90,
    GRAVITY: 1.2,

    // Gameplay
    DROP_COOLDOWN: 400,        // ms between drops
    DANGER_TIME: 2000,         // ms before game over when above line
    MAX_SPAWN_LEVEL: 4,        // Max fruit level that can spawn (0-4 = first 5 fruits)

    // Storage keys
    STORAGE_BEST_SCORE: 'fruitMerge_bestScore',
    STORAGE_USER_DATA: 'fruitMerge_userData',
    STORAGE_POWERUPS: 'fruitMerge_powerups',

    // Backend URL (change this to your backend)
    BACKEND_URL: 'https://your-backend.com/api',

    // Telegram Bot username (for referral links)
    BOT_USERNAME: 'FruitMergeGameBot',
    APP_SHORT_NAME: 'play'
};

// ==========================================
// Fruit Configuration
// ==========================================

const FRUITS = [
    { name: 'Cherry', color: 0xe74c3c, radius: 18, score: 1, emoji: '🍒' },
    { name: 'Strawberry', color: 0xff6b81, radius: 25, score: 3, emoji: '🍓' },
    { name: 'Grape', color: 0x9b59b6, radius: 32, score: 6, emoji: '🍇' },
    { name: 'Orange', color: 0xf39c12, radius: 40, score: 10, emoji: '🍊' },
    { name: 'Apple', color: 0xe74c3c, radius: 48, score: 15, emoji: '🍎' },
    { name: 'Pear', color: 0xf1c40f, radius: 56, score: 21, emoji: '🍐' },
    { name: 'Peach', color: 0xfdcb6e, radius: 65, score: 28, emoji: '🍑' },
    { name: 'Pineapple', color: 0xf39c12, radius: 74, score: 36, emoji: '🍍' },
    { name: 'Melon', color: 0x2ecc71, radius: 84, score: 45, emoji: '🍈' },
    { name: 'Watermelon', color: 0x27ae60, radius: 95, score: 55, emoji: '🍉' },
    { name: 'Rainbow', color: 0xe056fd, radius: 105, score: 100, emoji: '🌈' }
];

// ==========================================
// Shop Items Configuration
// ==========================================

const SHOP_ITEMS = {
    // Consumables (can buy multiple)
    revive: {
        id: 'revive',
        title: 'Continue Game',
        description: 'Revive once after game over',
        price: 10,
        emoji: '💫',
        type: 'consumable'
    },
    clear_small: {
        id: 'clear_small',
        title: 'Clear Small Fruits',
        description: 'Remove the 3 smallest fruits',
        price: 5,
        emoji: '🧹',
        type: 'consumable'
    },
    shake: {
        id: 'shake',
        title: 'Shake Container',
        description: 'Shuffle all fruits to create merges',
        price: 3,
        emoji: '📳',
        type: 'consumable'
    },
    upgrade: {
        id: 'upgrade',
        title: 'Upgrade Random',
        description: 'Upgrade a random fruit by one level',
        price: 8,
        emoji: '⬆️',
        type: 'consumable'
    },

    // Bundles
    starter_pack: {
        id: 'starter_pack',
        title: 'Starter Pack',
        description: '5 Revives + 10 Clear + 5 Shake',
        price: 50,
        emoji: '📦',
        type: 'bundle',
        contents: { revive: 5, clear_small: 10, shake: 5 }
    },
    mega_pack: {
        id: 'mega_pack',
        title: 'Mega Pack',
        description: '15 of each power-up!',
        price: 150,
        emoji: '🎁',
        type: 'bundle',
        contents: { revive: 15, clear_small: 15, shake: 15, upgrade: 15 }
    },

    // Permanent unlocks
    no_ads: {
        id: 'no_ads',
        title: 'Remove Ads',
        description: 'Permanently remove all advertisements',
        price: 200,
        emoji: '🚫',
        type: 'permanent'
    },
    double_score: {
        id: 'double_score',
        title: '2x Score Boost',
        description: 'Permanently earn 2x score',
        price: 300,
        emoji: '✨',
        type: 'permanent'
    }
};

// ==========================================
// Referral Configuration
// ==========================================

const REFERRAL_CONFIG = {
    STARS_PER_REFERRAL: 50,
    BONUS_PERCENTAGE: 10
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, FRUITS, SHOP_ITEMS, REFERRAL_CONFIG };
}
