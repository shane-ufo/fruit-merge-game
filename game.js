// ==========================================
// Fruit Merge Game - Core Game Logic
// v2.0 - Fixed mobile controls + Sound system
// ==========================================

let game = null;
let gameScene = null;

// Game state
const GameState = {
    score: 0,
    bestScore: 0,
    isDropping: false,
    gameOver: false,
    canRevive: true,
    scoreMultiplier: 1,
    soundEnabled: true,
    currentSoundPack: 'default'
};

// ==========================================
// Sound System
// ==========================================

const SoundManager = {
    sounds: {},
    loaded: false,
    
    // Sound packs configuration
    packs: {
        default: {
            drop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
            merge: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
            bigMerge: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
            gameOver: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
            button: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            powerup: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
        },
        cute: {
            drop: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
            merge: 'https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3',
            bigMerge: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
            gameOver: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
            button: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            powerup: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
        },
        retro: {
            drop: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
            merge: 'https://assets.mixkit.co/active_storage/sfx/582/582-preview.mp3',
            bigMerge: 'https://assets.mixkit.co/active_storage/sfx/583/583-preview.mp3',
            gameOver: 'https://assets.mixkit.co/active_storage/sfx/2660/2660-preview.mp3',
            button: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
            powerup: 'https://assets.mixkit.co/active_storage/sfx/584/584-preview.mp3'
        }
    },
    
    // Initialize sound system
    init(pack = 'default') {
        GameState.currentSoundPack = pack;
        this.loadPack(pack);
        
        // Load saved preference
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        GameState.soundEnabled = userData.soundEnabled !== false;
        GameState.currentSoundPack = userData.soundPack || 'default';
    },
    
    // Load a sound pack
    loadPack(packName) {
        const pack = this.packs[packName] || this.packs.default;
        
        for (const [name, url] of Object.entries(pack)) {
            this.sounds[name] = new Audio(url);
            this.sounds[name].preload = 'auto';
            this.sounds[name].volume = 0.5;
        }
        
        this.loaded = true;
        console.log('[Sound] Loaded pack:', packName);
    },
    
    // Play a sound
    play(soundName) {
        if (!GameState.soundEnabled) return;
        if (!this.sounds[soundName]) return;
        
        try {
            // Clone audio for overlapping sounds
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = this.sounds[soundName].volume;
            sound.play().catch(e => {
                // Ignore autoplay errors
            });
        } catch (e) {
            console.log('[Sound] Play error:', e);
        }
    },
    
    // Set volume (0-1)
    setVolume(volume) {
        for (const sound of Object.values(this.sounds)) {
            sound.volume = volume;
        }
    },
    
    // Toggle sound on/off
    toggle() {
        GameState.soundEnabled = !GameState.soundEnabled;
        
        // Save preference
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.soundEnabled = GameState.soundEnabled;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        return GameState.soundEnabled;
    },
    
    // Change sound pack (premium feature)
    changePack(packName) {
        if (!this.packs[packName]) return false;
        
        GameState.currentSoundPack = packName;
        this.loadPack(packName);
        
        // Save preference
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        userData.soundPack = packName;
        localStorage.setItem(CONFIG.STORAGE_USER_DATA, JSON.stringify(userData));
        
        this.play('button');
        return true;
    },
    
    // Check if user has premium (can change packs)
    hasPremiumSounds() {
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        return userData.premiumSounds === true;
    }
};

// ==========================================
// Main Game Scene
// ==========================================

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.fruits = [];
        this.currentFruitIndex = 0;
        this.nextFruitIndex = 0;
        this.previewFruit = null;
        this.dropLine = null;
        this.mergeQueue = [];
        this.lastDropTime = 0;
        
        // Touch control state
        this.isDragging = false;
        this.touchStartX = 0;
    }

    preload() {
        // Initialize sound
        SoundManager.init();
    }

    create() {
        gameScene = this;
        
        // Reset state
        GameState.score = 0;
        GameState.isDropping = false;
        GameState.gameOver = false;
        GameState.canRevive = true;
        this.fruits = [];
        this.mergeQueue = [];
        this.isDragging = false;
        
        // Load best score
        GameState.bestScore = parseInt(localStorage.getItem(CONFIG.STORAGE_BEST_SCORE)) || 0;
        
        // Check for double score boost
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        GameState.scoreMultiplier = userData.doubleScore ? 2 : 1;
        
        // Setup physics
        this.matter.world.setBounds(
            CONFIG.WALL_THICKNESS,
            0,
            CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS * 2,
            CONFIG.GAME_HEIGHT - CONFIG.WALL_THICKNESS,
            32,
            true, true, false, true
        );
        
        this.matter.world.setGravity(0, CONFIG.GRAVITY);
        
        // Create visuals
        this.createBackground();
        this.createWalls();
        
        // Initialize fruits
        this.nextFruitIndex = Phaser.Math.Between(0, CONFIG.MAX_SPAWN_LEVEL);
        this.generateNextFruit();
        this.createPreviewFruit();
        
        // Update UI
        this.updateUI();
        
        // Setup NEW touch controls (drag to position, release to drop)
        this.setupTouchControls();
        
        // Collision handler
        this.matter.world.on('collisionstart', this.onCollision, this);
        
        // Process merge queue
        this.time.addEvent({
            delay: 50,
            callback: this.processMergeQueue,
            callbackScope: this,
            loop: true
        });
        
        // Check game over
        this.time.addEvent({
            delay: 500,
            callback: this.checkGameOver,
            callbackScope: this,
            loop: true
        });
        
        // Notify Telegram
        if (window.TelegramGame) {
            window.TelegramGame.onGameStart();
        }
    }

    // ---------- Background & Walls ----------
    
    createBackground() {
        const bg = this.add.graphics();
        bg.fillStyle(0xfef9e7, 1);
        bg.fillRoundedRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 16);
        
        const danger = this.add.graphics();
        danger.fillStyle(0xff0000, 0.08);
        danger.fillRect(CONFIG.WALL_THICKNESS, 0, 
            CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS * 2, CONFIG.DANGER_LINE_Y);
        
        danger.lineStyle(2, 0xff0000, 0.4);
        danger.lineBetween(
            CONFIG.WALL_THICKNESS, CONFIG.DANGER_LINE_Y,
            CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS, CONFIG.DANGER_LINE_Y
        );
        
        this.add.text(CONFIG.GAME_WIDTH / 2, CONFIG.DANGER_LINE_Y / 2, '⚠️', {
            fontSize: '16px'
        }).setOrigin(0.5).setAlpha(0.3);
    }

    createWalls() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x8b4513, 1);
        
        graphics.fillRect(0, 0, CONFIG.WALL_THICKNESS, CONFIG.GAME_HEIGHT);
        graphics.fillRect(CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS, 0, 
            CONFIG.WALL_THICKNESS, CONFIG.GAME_HEIGHT);
        graphics.fillRect(0, CONFIG.GAME_HEIGHT - CONFIG.WALL_THICKNESS, 
            CONFIG.GAME_WIDTH, CONFIG.WALL_THICKNESS);
        
        graphics.lineStyle(1, 0x6b3510, 0.3);
        for (let i = 0; i < CONFIG.GAME_HEIGHT; i += 20) {
            graphics.lineBetween(2, i, CONFIG.WALL_THICKNESS - 2, i + 10);
            graphics.lineBetween(CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS + 2, i, 
                CONFIG.GAME_WIDTH - 2, i + 10);
        }
    }

    // ---------- NEW Touch Controls (Drag & Release) ----------
    
    setupTouchControls() {
        // Pointer DOWN - Start dragging
        this.input.on('pointerdown', (pointer) => {
            if (GameState.isDropping || GameState.gameOver) return;
            
            this.isDragging = true;
            this.touchStartX = pointer.x;
            
            // Move preview to touch position
            if (this.previewFruit) {
                const fruit = FRUITS[this.currentFruitIndex];
                const minX = CONFIG.WALL_THICKNESS + fruit.radius + 5;
                const maxX = CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS - fruit.radius - 5;
                const x = Phaser.Math.Clamp(pointer.x, minX, maxX);
                this.previewFruit.setPosition(x, CONFIG.DROP_LINE_Y);
                this.updateDropLine(x);
            }
        });
        
        // Pointer MOVE - Drag to adjust position
        this.input.on('pointermove', (pointer) => {
            if (!this.isDragging || GameState.isDropping || GameState.gameOver) return;
            if (!this.previewFruit) return;
            
            const fruit = FRUITS[this.currentFruitIndex];
            const minX = CONFIG.WALL_THICKNESS + fruit.radius + 5;
            const maxX = CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS - fruit.radius - 5;
            
            const x = Phaser.Math.Clamp(pointer.x, minX, maxX);
            this.previewFruit.setPosition(x, CONFIG.DROP_LINE_Y);
            this.updateDropLine(x);
        });
        
        // Pointer UP - Release to drop
        this.input.on('pointerup', (pointer) => {
            if (!this.isDragging || GameState.isDropping || GameState.gameOver) return;
            
            this.isDragging = false;
            
            // Drop the fruit at current position
            if (this.previewFruit) {
                const now = Date.now();
                if (now - this.lastDropTime >= CONFIG.DROP_COOLDOWN) {
                    this.dropFruit(this.previewFruit.x);
                    this.lastDropTime = now;
                }
            }
        });
        
        // Pointer OUT - Cancel drag if finger leaves game area
        this.input.on('pointerout', () => {
            this.isDragging = false;
        });
    }

    // ---------- Fruit Management ----------
    
    generateNextFruit() {
        this.currentFruitIndex = this.nextFruitIndex;
        this.nextFruitIndex = Phaser.Math.Between(0, CONFIG.MAX_SPAWN_LEVEL);
        this.updateNextFruitDisplay();
    }

    updateNextFruitDisplay() {
        const fruit = FRUITS[this.nextFruitIndex];
        const display = document.getElementById('next-fruit-display');
        if (display) {
            display.textContent = fruit.emoji;
            display.style.backgroundColor = '#' + fruit.color.toString(16).padStart(6, '0');
        }
    }

    createPreviewFruit() {
        const fruit = FRUITS[this.currentFruitIndex];
        
        if (this.previewFruit) {
            this.previewFruit.destroy();
        }
        
        const container = this.add.container(CONFIG.GAME_WIDTH / 2, CONFIG.DROP_LINE_Y);
        
        // HD Preview Graphics
        const graphics = this.add.graphics();
        const r = fruit.radius;
        const color = fruit.color;
        
        // Semi-transparent body
        graphics.fillStyle(color, 0.6);
        graphics.fillCircle(0, 0, r);
        
        // Highlight
        graphics.fillStyle(0xffffff, 0.3);
        graphics.fillCircle(-r * 0.3, -r * 0.3, r * 0.35);
        
        // Border
        graphics.lineStyle(2, 0xffffff, 0.4);
        graphics.strokeCircle(0, 0, r);
        
        // Get skin emoji
        const skin = window.SkinSystem?.getCurrentSkin?.() || {};
        const skinEmoji = skin.fruits?.[this.currentFruitIndex];
        const emoji = skinEmoji || fruit.emoji;
        
        const text = this.add.text(0, 0, emoji, {
            fontSize: Math.floor(r * 1.3) + 'px',
            resolution: 2
        }).setOrigin(0.5).setAlpha(0.8);
        
        container.add([graphics, text]);
        
        // Add "drag to move" hint for mobile (first time only)
        if (!localStorage.getItem('hint_shown')) {
            const hint = this.add.text(0, r + 25, '👆 Drag & Release', {
                fontSize: '12px',
                color: '#666666'
            }).setOrigin(0.5).setAlpha(0.8);
            
            this.tweens.add({
                targets: hint,
                alpha: 0,
                delay: 2000,
                duration: 1000,
                onComplete: () => {
                    hint.destroy();
                    localStorage.setItem('hint_shown', 'true');
                }
            });
            
            container.add(hint);
        }
        
        this.previewFruit = container;
        
        // Create/update drop line
        if (!this.dropLine) {
            this.dropLine = this.add.graphics();
        }
        this.updateDropLine(CONFIG.GAME_WIDTH / 2);
    }

    updateDropLine(x) {
        if (!this.dropLine) return;
        
        this.dropLine.clear();
        this.dropLine.lineStyle(1, 0x999999, 0.3);
        
        const dashLength = 10;
        const gapLength = 5;
        let y = CONFIG.DROP_LINE_Y + 20;
        
        while (y < CONFIG.GAME_HEIGHT - CONFIG.WALL_THICKNESS) {
            const endY = Math.min(y + dashLength, CONFIG.GAME_HEIGHT - CONFIG.WALL_THICKNESS);
            this.dropLine.lineBetween(x, y, x, endY);
            y += dashLength + gapLength;
        }
    }

    dropFruit(x) {
        GameState.isDropping = true;
        
        // Play drop sound
        SoundManager.play('drop');
        
        if (this.previewFruit) {
            this.previewFruit.setVisible(false);
        }
        if (this.dropLine) {
            this.dropLine.setVisible(false);
        }
        
        const fruitObj = this.createPhysicsFruit(x, CONFIG.DROP_LINE_Y, this.currentFruitIndex);
        this.fruits.push(fruitObj);
        
        // Haptic feedback
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('light');
        }
        
        this.time.delayedCall(CONFIG.DROP_COOLDOWN, () => {
            if (GameState.gameOver) return;
            
            GameState.isDropping = false;
            this.generateNextFruit();
            this.createPreviewFruit();
            
            if (this.dropLine) {
                this.dropLine.setVisible(true);
            }
        });
    }

    createPhysicsFruit(x, y, fruitIndex, applyForce = false) {
        const fruit = FRUITS[fruitIndex];
        
        const container = this.add.container(x, y);
        
        // HD Fruit Graphics
        const graphics = this.add.graphics();
        
        // Main circle with gradient effect
        const r = fruit.radius;
        const color = fruit.color;
        
        // Shadow
        graphics.fillStyle(0x000000, 0.2);
        graphics.fillCircle(3, 3, r);
        
        // Main body
        graphics.fillStyle(color, 1);
        graphics.fillCircle(0, 0, r);
        
        // Inner glow (lighter)
        const lighterColor = this.lightenColor(color, 40);
        graphics.fillStyle(lighterColor, 0.6);
        graphics.fillCircle(-r * 0.15, -r * 0.15, r * 0.75);
        
        // Highlight (top-left shine)
        graphics.fillStyle(0xffffff, 0.5);
        graphics.fillCircle(-r * 0.35, -r * 0.35, r * 0.35);
        
        // Small bright spot
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillCircle(-r * 0.4, -r * 0.4, r * 0.15);
        
        // Border
        graphics.lineStyle(2, this.darkenColor(color, 30), 0.5);
        graphics.strokeCircle(0, 0, r);
        
        container.add(graphics);
        
        // Add emoji on top (optional - can be removed for pure HD look)
        // Get current skin
        const skin = window.SkinSystem?.getCurrentSkin?.() || {};
        const skinEmoji = skin.fruits?.[fruitIndex];
        const emoji = skinEmoji || fruit.emoji;
        
        const text = this.add.text(0, 0, emoji, {
            fontSize: Math.floor(r * 1.3) + 'px',
            resolution: 2 // HD text rendering
        }).setOrigin(0.5);
        
        container.add(text);
        
        const body = this.matter.add.circle(x, y, fruit.radius, {
            restitution: 0.1,
            friction: 0.3,
            frictionAir: 0.01,
            density: 0.001,
            label: 'fruit'
        });
        
        body.fruitIndex = fruitIndex;
        body.gameContainer = container;
        body.id = Date.now() + Math.random();
        body.isMerged = false;
        
        if (applyForce) {
            const fx = Phaser.Math.Between(-5, 5) * 0.001;
            const fy = Phaser.Math.Between(-3, 0) * 0.001;
            this.matter.body.applyForce(body, body.position, { x: fx, y: fy });
        }
        
        const updateEvent = () => {
            if (container.active && body.position) {
                container.setPosition(body.position.x, body.position.y);
                container.setRotation(body.angle);
            }
        };
        
        this.events.on('update', updateEvent);
        container.updateEvent = updateEvent;
        
        return { body, container, fruitIndex };
    }
    
    // Color helpers for HD graphics
    lightenColor(color, percent) {
        const r = Math.min(255, ((color >> 16) & 0xff) + percent);
        const g = Math.min(255, ((color >> 8) & 0xff) + percent);
        const b = Math.min(255, (color & 0xff) + percent);
        return (r << 16) + (g << 8) + b;
    }
    
    darkenColor(color, percent) {
        const r = Math.max(0, ((color >> 16) & 0xff) - percent);
        const g = Math.max(0, ((color >> 8) & 0xff) - percent);
        const b = Math.max(0, (color & 0xff) - percent);
        return (r << 16) + (g << 8) + b;
    }

    // ---------- Collision & Merge ----------
    
    onCollision(event) {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (bodyA.label !== 'fruit' || bodyB.label !== 'fruit') continue;
            
            if (bodyA.fruitIndex === bodyB.fruitIndex && 
                !bodyA.isMerged && !bodyB.isMerged &&
                bodyA.fruitIndex < FRUITS.length - 1) {
                
                bodyA.isMerged = true;
                bodyB.isMerged = true;
                
                this.mergeQueue.push({
                    bodyA,
                    bodyB,
                    fruitIndex: bodyA.fruitIndex
                });
            }
        }
    }

    processMergeQueue() {
        if (this.mergeQueue.length === 0) return;
        
        const merge = this.mergeQueue.shift();
        
        if (!merge.bodyA || !merge.bodyB) return;
        if (!merge.bodyA.position || !merge.bodyB.position) return;
        
        this.executeMerge(merge.bodyA, merge.bodyB, merge.fruitIndex);
    }

    executeMerge(bodyA, bodyB, fruitIndex) {
        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;
        const newIndex = fruitIndex + 1;
        const newFruit = FRUITS[newIndex];
        
        this.removeFruit(bodyA);
        this.removeFruit(bodyB);
        
        const newFruitObj = this.createPhysicsFruit(newX, newY, newIndex);
        this.fruits.push(newFruitObj);
        
        this.matter.body.applyForce(newFruitObj.body, 
            newFruitObj.body.position, 
            { x: 0, y: -0.02 }
        );
        
        const points = newFruit.score * GameState.scoreMultiplier;
        GameState.score += points;
        this.updateUI();
        
        // Play merge sound (different for big fruits)
        if (newIndex >= 6) {
            SoundManager.play('bigMerge');
        } else {
            SoundManager.play('merge');
        }
        
        this.playMergeEffect(newX, newY, newFruit, points);
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('medium');
            window.TelegramGame.onScoreUpdate(GameState.score);
        }
        
        // Track merge for daily tasks
        if (window.trackMerge) {
            window.trackMerge();
        }
    }

    removeFruit(body) {
        if (!body) return;
        
        const index = this.fruits.findIndex(f => f.body === body);
        if (index !== -1) {
            const fruitObj = this.fruits[index];
            
            if (fruitObj.container && fruitObj.container.updateEvent) {
                this.events.off('update', fruitObj.container.updateEvent);
            }
            
            if (fruitObj.container) {
                fruitObj.container.destroy();
            }
            
            this.fruits.splice(index, 1);
        }
        
        try {
            this.matter.world.remove(body);
        } catch (e) {}
    }

    playMergeEffect(x, y, fruit, points) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const particle = this.add.circle(
                x + Math.cos(angle) * 5,
                y + Math.sin(angle) * 5,
                6, fruit.color
            );
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 40,
                y: y + Math.sin(angle) * 40,
                alpha: 0,
                scale: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        const ring = this.add.circle(x, y, fruit.radius, fruit.color, 0);
        ring.setStrokeStyle(3, fruit.color);
        
        this.tweens.add({
            targets: ring,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
        
        const scoreText = this.add.text(x, y - 20, '+' + points, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: scoreText,
            y: y - 70,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => scoreText.destroy()
        });
    }

    // ---------- Game Over ----------
    
    checkGameOver() {
        if (GameState.gameOver) return;
        
        for (const fruitObj of this.fruits) {
            if (!fruitObj.body || !fruitObj.body.position) continue;
            
            const fruit = FRUITS[fruitObj.fruitIndex];
            const topY = fruitObj.body.position.y - fruit.radius;
            const velocity = Math.abs(fruitObj.body.velocity?.y || 0);
            
            if (topY < CONFIG.DANGER_LINE_Y && velocity < 0.3) {
                if (!fruitObj.dangerStartTime) {
                    fruitObj.dangerStartTime = Date.now();
                } else if (Date.now() - fruitObj.dangerStartTime > CONFIG.DANGER_TIME) {
                    this.triggerGameOver();
                    return;
                }
            } else {
                fruitObj.dangerStartTime = null;
            }
        }
    }

    triggerGameOver() {
        GameState.gameOver = true;
        
        // Play game over sound
        SoundManager.play('gameOver');
        
        const isNewBest = GameState.score > GameState.bestScore;
        if (isNewBest) {
            GameState.bestScore = GameState.score;
            localStorage.setItem(CONFIG.STORAGE_BEST_SCORE, GameState.bestScore);
        }
        
        document.getElementById('final-score').textContent = GameState.score;
        document.getElementById('modal-best-score').textContent = GameState.bestScore;
        document.getElementById('new-best-badge').style.display = isNewBest ? 'block' : 'none';
        
        const reviveBtn = document.getElementById('revive-btn');
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        const canRevive = GameState.canRevive && (powerups.revive > 0);
        reviveBtn.style.display = canRevive ? 'flex' : 'none';
        
        document.getElementById('game-over-modal').classList.add('show');
        
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('error');
            window.TelegramGame.onGameOver(GameState.score, GameState.bestScore);
        }
    }

    // ---------- UI Updates ----------
    
    updateUI() {
        document.getElementById('current-score').textContent = GameState.score;
        document.getElementById('best-score').textContent = GameState.bestScore;
        
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        document.getElementById('clear-count').textContent = powerups.clear_small || 0;
        document.getElementById('shake-count').textContent = powerups.shake || 0;
        document.getElementById('upgrade-count').textContent = powerups.upgrade || 0;
        
        document.getElementById('powerup-clear').disabled = !(powerups.clear_small > 0);
        document.getElementById('powerup-shake').disabled = !(powerups.shake > 0);
        document.getElementById('powerup-upgrade').disabled = !(powerups.upgrade > 0);
        
        // Update sound button state
        const soundBtn = document.getElementById('sound-btn');
        if (soundBtn) {
            soundBtn.textContent = GameState.soundEnabled ? '🔊' : '🔇';
        }
    }

    // ---------- Power-ups ----------
    
    usePowerup(type) {
        if (GameState.gameOver || GameState.isDropping) return false;
        
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        if (!powerups[type] || powerups[type] <= 0) return false;
        
        let success = false;
        
        switch (type) {
            case 'clear_small':
                success = this.clearSmallFruits();
                break;
            case 'shake':
                success = this.shakeFruits();
                break;
            case 'upgrade':
                success = this.upgradeRandomFruit();
                break;
        }
        
        if (success) {
            powerups[type]--;
            localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
            this.updateUI();
            
            SoundManager.play('powerup');
            
            if (window.TelegramGame) {
                window.TelegramGame.hapticFeedback('success');
            }
        }
        
        return success;
    }

    clearSmallFruits() {
        const sorted = [...this.fruits].sort((a, b) => a.fruitIndex - b.fruitIndex);
        const toRemove = sorted.slice(0, Math.min(3, sorted.length));
        
        if (toRemove.length === 0) return false;
        
        for (const fruitObj of toRemove) {
            const pos = fruitObj.body.position;
            this.playRemoveEffect(pos.x, pos.y);
            this.removeFruit(fruitObj.body);
        }
        
        showToast(`Cleared ${toRemove.length} fruits! 🧹`);
        return true;
    }

    shakeFruits() {
        if (this.fruits.length === 0) return false;
        
        for (const fruitObj of this.fruits) {
            const fx = Phaser.Math.Between(-10, 10) * 0.002;
            const fy = Phaser.Math.Between(-8, -2) * 0.002;
            this.matter.body.applyForce(fruitObj.body, fruitObj.body.position, { x: fx, y: fy });
        }
        
        this.cameras.main.shake(200, 0.01);
        showToast('Shake! 📳');
        return true;
    }

    upgradeRandomFruit() {
        const upgradeable = this.fruits.filter(f => f.fruitIndex < FRUITS.length - 1);
        if (upgradeable.length === 0) return false;
        
        const target = Phaser.Utils.Array.GetRandom(upgradeable);
        const pos = target.body.position;
        const newIndex = target.fruitIndex + 1;
        
        this.removeFruit(target.body);
        
        const newFruit = this.createPhysicsFruit(pos.x, pos.y, newIndex);
        this.fruits.push(newFruit);
        
        this.playMergeEffect(pos.x, pos.y, FRUITS[newIndex], 0);
        
        showToast(`Upgraded to ${FRUITS[newIndex].emoji}!`);
        return true;
    }

    playRemoveEffect(x, y) {
        const poof = this.add.text(x, y, '💨', { fontSize: '32px' }).setOrigin(0.5);
        
        this.tweens.add({
            targets: poof,
            y: y - 50,
            alpha: 0,
            scale: 2,
            duration: 500,
            onComplete: () => poof.destroy()
        });
    }

    // ---------- Revive ----------
    
    revive() {
        if (!GameState.canRevive) return false;
        
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        if (!powerups.revive || powerups.revive <= 0) return false;
        
        powerups.revive--;
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        
        const toRemove = this.fruits.filter(f => {
            const fruit = FRUITS[f.fruitIndex];
            return f.body.position.y - fruit.radius < CONFIG.DANGER_LINE_Y + 50;
        });
        
        for (const fruitObj of toRemove) {
            this.playRemoveEffect(fruitObj.body.position.x, fruitObj.body.position.y);
            this.removeFruit(fruitObj.body);
        }
        
        GameState.gameOver = false;
        GameState.canRevive = false;
        GameState.isDropping = false;
        
        document.getElementById('game-over-modal').classList.remove('show');
        
        this.generateNextFruit();
        this.createPreviewFruit();
        if (this.dropLine) {
            this.dropLine.setVisible(true);
        }
        
        this.updateUI();
        
        SoundManager.play('powerup');
        showToast('Revived! 💫');
        
        return true;
    }

    // ---------- Restart ----------
    
    restart() {
        for (const fruitObj of this.fruits) {
            if (fruitObj.container) {
                if (fruitObj.container.updateEvent) {
                    this.events.off('update', fruitObj.container.updateEvent);
                }
                fruitObj.container.destroy();
            }
            try {
                this.matter.world.remove(fruitObj.body);
            } catch (e) {}
        }
        
        this.fruits = [];
        this.mergeQueue = [];
        
        GameState.score = 0;
        GameState.gameOver = false;
        GameState.isDropping = false;
        GameState.canRevive = true;
        
        this.nextFruitIndex = Phaser.Math.Between(0, CONFIG.MAX_SPAWN_LEVEL);
        this.generateNextFruit();
        this.createPreviewFruit();
        
        if (this.dropLine) {
            this.dropLine.setVisible(true);
        }
        
        this.updateUI();
        
        document.getElementById('game-over-modal').classList.remove('show');
        
        SoundManager.play('button');
        
        if (window.TelegramGame) {
            window.TelegramGame.onGameStart();
        }
    }
}

// ==========================================
// Initialize Game
// ==========================================

function initGame() {
    const config = {
        type: Phaser.AUTO,
        width: CONFIG.GAME_WIDTH,
        height: CONFIG.GAME_HEIGHT,
        parent: 'game-container',
        backgroundColor: '#fef9e7',
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: CONFIG.GRAVITY },
                debug: false
            }
        },
        scene: GameScene
    };
    
    game = new Phaser.Game(config);
}

// ==========================================
// Export Game API
// ==========================================

window.GameAPI = {
    getScore: () => GameState.score,
    getBestScore: () => GameState.bestScore,
    isGameOver: () => GameState.gameOver,
    restart: () => gameScene?.restart(),
    revive: () => gameScene?.revive(),
    usePowerup: (type) => gameScene?.usePowerup(type),
    init: initGame,
    
    // Sound API
    toggleSound: () => SoundManager.toggle(),
    isSoundEnabled: () => GameState.soundEnabled,
    changeSoundPack: (pack) => SoundManager.changePack(pack),
    getSoundPacks: () => Object.keys(SoundManager.packs),
    hasPremiumSounds: () => SoundManager.hasPremiumSounds()
};

// Export SoundManager
window.SoundManager = SoundManager;
