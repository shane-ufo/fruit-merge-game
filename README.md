# 🍉 Fruit Merge Game (Suika Game Clone)

A complete Suika Game clone built with Phaser 3, ready for Telegram Mini App deployment and monetization.

## 📁 Project Structure

```
suika-game/
├── index.html      # Main HTML file with UI
├── game.js         # Core game logic (Phaser 3 + Matter.js)
├── telegram.js     # Telegram Mini App integration
└── README.md       # This file
```

## 🎮 Game Features

- ✅ Physics-based fruit dropping
- ✅ Merge identical fruits into bigger ones
- ✅ Score tracking with local best score
- ✅ Game over detection
- ✅ Touch/mouse support
- ✅ Responsive design
- ✅ Telegram Mini App ready

## 🚀 Quick Start

### Method 1: VS Code Live Server (Recommended)

1. Install VS Code
2. Install "Live Server" extension
3. Open project folder in VS Code
4. Right-click `index.html` → "Open with Live Server"

### Method 2: Python HTTP Server

```bash
cd suika-game
python -m http.server 8000
# Open http://localhost:8000
```

### Method 3: Node.js

```bash
npx serve
# or
npm install -g http-server
http-server
```

---

## 📱 Deploy to Production

### Option A: GitHub Pages (Free)

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fruit-merge-game.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Navigate to Pages section
   - Select "main" branch
   - Save

3. **Your game is live at:**
   ```
   https://YOUR_USERNAME.github.io/fruit-merge-game
   ```

### Option B: Vercel (Free, Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy"
6. Done! You get a URL like `fruit-merge-game.vercel.app`

### Option C: Netlify (Free)

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Done!

---

## 🤖 Telegram Mini App Setup

### Step 1: Create a Telegram Bot

1. Open Telegram and find `@BotFather`
2. Send `/newbot`
3. Follow prompts to name your bot
4. Save the **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Create Mini App

1. In BotFather, send `/newapp`
2. Select your bot
3. Enter app details:
   - Title: "Fruit Merge Game"
   - Description: "Addictive fruit merging puzzle game"
   - Upload a 640x360 photo for the game
4. Enter your deployed game URL (from GitHub Pages/Vercel)
5. Choose a short name (e.g., `fruitmerge`)

### Step 3: Get Your Mini App Link

Your game will be available at:
```
https://t.me/YOUR_BOT_USERNAME/fruitmerge
```

### Step 4: Test Your App

1. Open the link in Telegram
2. The game should load in Telegram's webview
3. Test all features

---

## 💰 Monetization Guide

### Method 1: Telegram Stars (Recommended)

Telegram Stars is the official payment system for Mini Apps.

#### Setup Backend (Required for Payments)

You need a simple backend to create invoices. Here's a Node.js example:

```javascript
// server.js
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const bot = new TelegramBot('YOUR_BOT_TOKEN');

app.use(express.json());

// Create invoice endpoint
app.post('/create-invoice', async (req, res) => {
    const { userId, itemId, title, description, amount } = req.body;
    
    try {
        const invoiceLink = await bot.createInvoiceLink(
            title,
            description,
            itemId,
            '', // provider_token (empty for Telegram Stars)
            'XTR', // currency (XTR = Telegram Stars)
            [{ label: title, amount: amount }]
        );
        
        res.json({ invoiceLink });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000);
```

#### Handle Successful Payments

Add webhook handler for successful payments:

```javascript
bot.on('pre_checkout_query', (query) => {
    bot.answerPreCheckoutQuery(query.id, true);
});

bot.on('successful_payment', (msg) => {
    const userId = msg.from.id;
    const itemId = msg.successful_payment.invoice_payload;
    
    // Grant the purchased item to user
    grantItem(userId, itemId);
});
```

### Method 2: Telegram Ads (Coming Soon)

Telegram is rolling out ads for Mini Apps. Stay tuned for official documentation.

### Method 3: Referral System

Implement a referral system to grow your user base:

```javascript
// In telegram.js, extract referral code from start parameter
const startParam = tg.initDataUnsafe?.start_param;
if (startParam) {
    // User was referred by another player
    // Track referral and reward the referrer
}
```

---

## 🛍️ Purchasable Items

The game includes these pre-configured items (see `telegram.js`):

| Item | Price (Stars) | Description |
|------|---------------|-------------|
| 💫 Continue Game | 10 | Revive after game over |
| 🧹 Clear Small | 5 | Remove small fruits |
| 🎁 Big Start | 3 | Start with bigger fruit |
| 🚫 No Ads | 100 | Remove ads permanently |

### Adding Purchase UI

Add this to your `index.html` for a shop button:

```html
<button id="shop-btn" class="btn btn-secondary">🛒 Shop</button>

<div id="shop-modal" class="modal">
    <div class="modal-content">
        <h2>Shop</h2>
        <div class="shop-items">
            <!-- Items will be populated by JS -->
        </div>
    </div>
</div>
```

---

## 🎨 Customization

### Change Fruit Theme

Edit the `FRUITS` array in `game.js`:

```javascript
// Animal theme
const FRUITS = [
    { name: 'Mouse', color: 0xcccccc, radius: 15, score: 1, emoji: '🐭' },
    { name: 'Rabbit', color: 0xffcccc, radius: 22, score: 3, emoji: '🐰' },
    // ... add more
];

// Emoji theme
const FRUITS = [
    { name: 'Smile', color: 0xffee00, radius: 15, score: 1, emoji: '😀' },
    { name: 'Laugh', color: 0xffee00, radius: 22, score: 3, emoji: '😂' },
    // ... add more
];
```

### Adjust Difficulty

```javascript
// Faster falling (harder)
this.matter.world.setGravity(0, 1.5);

// More bouncy
restitution: 0.4

// Only spawn smallest 3 fruits (harder)
nextFruitIndex = Phaser.Math.Between(0, 2);
```

### Add Sound Effects

1. Add sound files to project
2. Load in preload():
```javascript
preload() {
    this.load.audio('drop', 'sounds/drop.mp3');
    this.load.audio('merge', 'sounds/merge.mp3');
    this.load.audio('gameover', 'sounds/gameover.mp3');
}
```
3. Play at appropriate moments:
```javascript
this.sound.play('merge');
```

---

## 📊 Analytics (Optional)

Add simple analytics to track user behavior:

```javascript
// Track game events
function trackEvent(eventName, data = {}) {
    if (window.TelegramGame?.isTelegram) {
        // Send to your analytics backend
        fetch('https://your-backend.com/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: eventName,
                userId: window.TelegramGame.getUser()?.id,
                data,
                timestamp: Date.now()
            })
        });
    }
}

// Usage
trackEvent('game_start');
trackEvent('game_over', { score: 1234 });
trackEvent('purchase', { item: 'revive', price: 10 });
```

---

## 🐛 Troubleshooting

### Game shows blank screen
- Must run via HTTP server, not file://
- Check browser console for errors

### Physics not working
- Ensure Phaser version is 3.60+
- Check Matter.js is enabled in config

### Telegram features not working
- Only works when opened via Telegram
- Check if `window.Telegram.WebApp` exists

### Payments not working
- Need a backend server for creating invoices
- Telegram Stars requires proper bot setup

---

## 📋 Development Checklist

### Phase 1: Core Game ✅
- [x] Basic game mechanics
- [x] Score system
- [x] Game over detection
- [x] Mobile touch support

### Phase 2: Telegram Integration
- [ ] Deploy to hosting
- [ ] Create Telegram Bot
- [ ] Setup Mini App
- [ ] Test in Telegram

### Phase 3: Monetization
- [ ] Setup backend for payments
- [ ] Add shop UI
- [ ] Implement purchasable items
- [ ] Test payment flow

### Phase 4: Growth
- [ ] Add leaderboard
- [ ] Implement referral system
- [ ] Add social sharing
- [ ] Marketing and promotion

---

## 📚 Resources

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Stars](https://core.telegram.org/bots/payments-stars)

---

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

---

Good luck with your game! 🚀🎮
