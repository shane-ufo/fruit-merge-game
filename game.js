// ==========================================
// Fruit Merge Game - Core Game Logic
// Fixed collision handling to prevent freezing
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
    scoreMultiplier: 1
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
        this.mergeQueue = [];  // Queue for safe merge processing
        this.lastDropTime = 0;
    }

    preload() {
        // Load any assets here if needed
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
        
        // Load best score
        GameState.bestScore = parseInt(localStorage.getItem(CONFIG.STORAGE_BEST_SCORE)) || 0;
        
        // Check for double score boost
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_USER_DATA) || '{}');
        GameState.scoreMultiplier = userData.doubleScore ? 2 : 1;
        
        // Setup physics world with bounds
        this.matter.world.setBounds(
            CONFIG.WALL_THICKNESS,
            0,
            CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS * 2,
            CONFIG.GAME_HEIGHT - CONFIG.WALL_THICKNESS,
            32,
            true, true, false, true
        );
        
        // Set gravity
        this.matter.world.setGravity(0, CONFIG.GRAVITY);
        
        // Create visual elements
        this.createBackground();
        this.createWalls();
        
        // Initialize fruits
        this.nextFruitIndex = Phaser.Math.Between(0, CONFIG.MAX_SPAWN_LEVEL);
        this.generateNextFruit();
        this.createPreviewFruit();
        
        // Update UI
        this.updateUI();
        
        // Setup input handlers
        this.setupInput();
        
        // Setup collision handler
        this.matter.world.on('collisionstart', this.onCollision, this);
        
        // Process merge queue in update loop (prevents freeze bug)
        this.time.addEvent({
            delay: 50,
            callback: this.processMergeQueue,
            callbackScope: this,
            loop: true
        });
        
        // Check game over condition
        this.time.addEvent({
            delay: 500,
            callback: this.checkGameOver,
            callbackScope: this,
            loop: true
        });
        
        // Notify Telegram game started
        if (window.TelegramGame) {
            window.TelegramGame.onGameStart();
        }
    }

    // ---------- Background & Walls ----------
    
    createBackground() {
        // Main container background
        const bg = this.add.graphics();
        bg.fillStyle(0xfef9e7, 1);
        bg.fillRoundedRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT, 16);
        
        // Danger zone
        const danger = this.add.graphics();
        danger.fillStyle(0xff0000, 0.08);
        danger.fillRect(CONFIG.WALL_THICKNESS, 0, 
            CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS * 2, CONFIG.DANGER_LINE_Y);
        
        // Danger line
        danger.lineStyle(2, 0xff0000, 0.4);
        danger.lineBetween(
            CONFIG.WALL_THICKNESS, CONFIG.DANGER_LINE_Y,
            CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS, CONFIG.DANGER_LINE_Y
        );
        
        // Warning text
        this.add.text(CONFIG.GAME_WIDTH / 2, CONFIG.DANGER_LINE_Y / 2, '⚠️', {
            fontSize: '16px'
        }).setOrigin(0.5).setAlpha(0.3);
    }

    createWalls() {
        const graphics = this.add.graphics();
        
        // Wood color gradient effect
        graphics.fillStyle(0x8b4513, 1);
        
        // Left wall
        graphics.fillRect(0, 0, CONFIG.WALL_THICKNESS, CONFIG.GAME_HEIGHT);
        
        // Right wall
        graphics.fillRect(CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS, 0, 
            CONFIG.WALL_THICKNESS, CONFIG.GAME_HEIGHT);
        
        // Bottom
        graphics.fillRect(0, CONFIG.GAME_HEIGHT - CONFIG.WALL_THICKNESS, 
            CONFIG.GAME_WIDTH, CONFIG.WALL_THICKNESS);
        
        // Add wood grain lines
        graphics.lineStyle(1, 0x6b3510, 0.3);
        for (let i = 0; i < CONFIG.GAME_HEIGHT; i += 20) {
            graphics.lineBetween(2, i, CONFIG.WALL_THICKNESS - 2, i + 10);
            graphics.lineBetween(CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS + 2, i, 
                CONFIG.GAME_WIDTH - 2, i + 10);
        }
    }

    // ---------- Input Handling ----------
    
    setupInput() {
        // Pointer move - update preview position
        this.input.on('pointermove', (pointer) => {
            if (GameState.isDropping || GameState.gameOver) return;
            if (!this.previewFruit) return;
            
            const fruit = FRUITS[this.currentFruitIndex];
            const minX = CONFIG.WALL_THICKNESS + fruit.radius + 5;
            const maxX = CONFIG.GAME_WIDTH - CONFIG.WALL_THICKNESS - fruit.radius - 5;
            
            const x = Phaser.Math.Clamp(pointer.x, minX, maxX);
            this.previewFruit.setPosition(x, CONFIG.DROP_LINE_Y);
            this.updateDropLine(x);
        });
        
        // Pointer down - drop fruit
        this.input.on('pointerdown', (pointer) => {
            if (GameState.isDropping || GameState.gameOver) return;
            
            const now = Date.now();
            if (now - this.lastDropTime < CONFIG.DROP_COOLDOWN) return;
            
            this.dropFruit(this.previewFruit.x);
            this.lastDropTime = now;
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
        
        // Destroy existing preview
        if (this.previewFruit) {
            this.previewFruit.destroy();
        }
        
        // Create container for preview
        const container = this.add.container(CONFIG.GAME_WIDTH / 2, CONFIG.DROP_LINE_Y);
        
        // Circle graphic
        const circle = this.add.graphics();
        circle.fillStyle(fruit.color, 0.6);
        circle.fillCircle(0, 0, fruit.radius);
        circle.lineStyle(2, 0xffffff, 0.4);
        circle.strokeCircle(0, 0, fruit.radius);
        
        // Emoji
        const emoji = this.add.text(0, 0, fruit.emoji, {
            fontSize: (fruit.radius * 1.1) + 'px'
        }).setOrigin(0.5);
        
        container.add([circle, emoji]);
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
        
        // Dashed line effect
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
        
        // Hide preview
        if (this.previewFruit) {
            this.previewFruit.setVisible(false);
        }
        if (this.dropLine) {
            this.dropLine.setVisible(false);
        }
        
        // Create actual physics fruit
        const fruitObj = this.createPhysicsFruit(x, CONFIG.DROP_LINE_Y, this.currentFruitIndex);
        this.fruits.push(fruitObj);
        
        // Haptic feedback
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('light');
        }
        
        // Delay before next drop
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
        
        // Create visual container
        const container = this.add.container(x, y);
        
        // Main circle
        const circle = this.add.graphics();
        circle.fillStyle(fruit.color, 1);
        circle.fillCircle(0, 0, fruit.radius);
        
        // Highlight
        circle.fillStyle(0xffffff, 0.2);
        circle.fillCircle(-fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.3);
        
        // Border
        circle.lineStyle(2, 0x000000, 0.1);
        circle.strokeCircle(0, 0, fruit.radius);
        
        // Emoji
        const emoji = this.add.text(0, 0, fruit.emoji, {
            fontSize: (fruit.radius * 1.2) + 'px'
        }).setOrigin(0.5);
        
        container.add([circle, emoji]);
        
        // Create physics body
        const body = this.matter.add.circle(x, y, fruit.radius, {
            restitution: 0.1,
            friction: 0.3,
            frictionAir: 0.01,
            density: 0.001,
            label: 'fruit'
        });
        
        // Store custom data on body
        body.fruitIndex = fruitIndex;
        body.gameContainer = container;
        body.id = Date.now() + Math.random();
        body.isMerged = false;
        
        // Apply random force if requested (for shake powerup)
        if (applyForce) {
            const fx = Phaser.Math.Between(-5, 5) * 0.001;
            const fy = Phaser.Math.Between(-3, 0) * 0.001;
            this.matter.body.applyForce(body, body.position, { x: fx, y: fy });
        }
        
        // Sync container position with physics body
        const updateEvent = () => {
            if (container.active && body.position) {
                container.setPosition(body.position.x, body.position.y);
                container.setRotation(body.angle);
            }
        };
        
        this.events.on('update', updateEvent);
        
        // Store cleanup reference
        container.updateEvent = updateEvent;
        
        return { body, container, fruitIndex };
    }

    // ---------- Collision & Merge System ----------
    
    onCollision(event) {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Check if both are fruits
            if (bodyA.label !== 'fruit' || bodyB.label !== 'fruit') continue;
            
            // Check if same type and not already queued for merge
            if (bodyA.fruitIndex === bodyB.fruitIndex && 
                !bodyA.isMerged && !bodyB.isMerged &&
                bodyA.fruitIndex < FRUITS.length - 1) {
                
                // Mark as pending merge
                bodyA.isMerged = true;
                bodyB.isMerged = true;
                
                // Add to merge queue
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
        
        // Process one merge at a time to prevent issues
        const merge = this.mergeQueue.shift();
        
        if (!merge.bodyA || !merge.bodyB) return;
        if (!merge.bodyA.position || !merge.bodyB.position) return;
        
        this.executeMerge(merge.bodyA, merge.bodyB, merge.fruitIndex);
    }

    executeMerge(bodyA, bodyB, fruitIndex) {
        // Calculate merge position
        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;
        const newIndex = fruitIndex + 1;
        const newFruit = FRUITS[newIndex];
        
        // Remove old fruits
        this.removeFruit(bodyA);
        this.removeFruit(bodyB);
        
        // Create new fruit
        const newFruitObj = this.createPhysicsFruit(newX, newY, newIndex);
        this.fruits.push(newFruitObj);
        
        // Give slight upward impulse for juicy feel
        this.matter.body.applyForce(newFruitObj.body, 
            newFruitObj.body.position, 
            { x: 0, y: -0.02 }
        );
        
        // Add score
        const points = newFruit.score * GameState.scoreMultiplier;
        GameState.score += points;
        this.updateUI();
        
        // Visual effects
        this.playMergeEffect(newX, newY, newFruit, points);
        
        // Haptic feedback
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('medium');
        }
        
        // Notify score update
        if (window.TelegramGame) {
            window.TelegramGame.onScoreUpdate(GameState.score);
        }
    }

    removeFruit(body) {
        if (!body) return;
        
        // Find and remove from array
        const index = this.fruits.findIndex(f => f.body === body);
        if (index !== -1) {
            const fruitObj = this.fruits[index];
            
            // Remove update listener
            if (fruitObj.container && fruitObj.container.updateEvent) {
                this.events.off('update', fruitObj.container.updateEvent);
            }
            
            // Destroy container
            if (fruitObj.container) {
                fruitObj.container.destroy();
            }
            
            // Remove from array
            this.fruits.splice(index, 1);
        }
        
        // Remove physics body
        try {
            this.matter.world.remove(body);
        } catch (e) {
            // Body might already be removed
        }
    }

    playMergeEffect(x, y, fruit, points) {
        // Particle burst
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
        
        // Ring effect
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
        
        // Score popup
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
            
            // Check if above danger line and nearly stationary
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
        
        // Update best score
        const isNewBest = GameState.score > GameState.bestScore;
        if (isNewBest) {
            GameState.bestScore = GameState.score;
            localStorage.setItem(CONFIG.STORAGE_BEST_SCORE, GameState.bestScore);
        }
        
        // Update UI
        document.getElementById('final-score').textContent = GameState.score;
        document.getElementById('modal-best-score').textContent = GameState.bestScore;
        document.getElementById('new-best-badge').style.display = isNewBest ? 'block' : 'none';
        
        // Show/hide revive button based on availability
        const reviveBtn = document.getElementById('revive-btn');
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        const canRevive = GameState.canRevive && (powerups.revive > 0);
        reviveBtn.style.display = canRevive ? 'flex' : 'none';
        
        // Show modal
        document.getElementById('game-over-modal').classList.add('show');
        
        // Haptic feedback
        if (window.TelegramGame) {
            window.TelegramGame.hapticFeedback('error');
            window.TelegramGame.onGameOver(GameState.score, GameState.bestScore);
        }
    }

    // ---------- UI Updates ----------
    
    updateUI() {
        document.getElementById('current-score').textContent = GameState.score;
        document.getElementById('best-score').textContent = GameState.bestScore;
        
        // Update powerup counts
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        document.getElementById('clear-count').textContent = powerups.clear_small || 0;
        document.getElementById('shake-count').textContent = powerups.shake || 0;
        document.getElementById('upgrade-count').textContent = powerups.upgrade || 0;
        
        // Enable/disable powerup buttons
        document.getElementById('powerup-clear').disabled = !(powerups.clear_small > 0);
        document.getElementById('powerup-shake').disabled = !(powerups.shake > 0);
        document.getElementById('powerup-upgrade').disabled = !(powerups.upgrade > 0);
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
            
            if (window.TelegramGame) {
                window.TelegramGame.hapticFeedback('success');
            }
        }
        
        return success;
    }

    clearSmallFruits() {
        // Find 3 smallest fruits
        const sorted = [...this.fruits].sort((a, b) => a.fruitIndex - b.fruitIndex);
        const toRemove = sorted.slice(0, Math.min(3, sorted.length));
        
        if (toRemove.length === 0) return false;
        
        for (const fruitObj of toRemove) {
            // Effect
            const pos = fruitObj.body.position;
            this.playRemoveEffect(pos.x, pos.y);
            
            // Remove
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
        
        // Camera shake effect
        this.cameras.main.shake(200, 0.01);
        
        showToast('Shake! 📳');
        return true;
    }

    upgradeRandomFruit() {
        // Find fruits that can be upgraded
        const upgradeable = this.fruits.filter(f => f.fruitIndex < FRUITS.length - 1);
        if (upgradeable.length === 0) return false;
        
        // Pick random fruit
        const target = Phaser.Utils.Array.GetRandom(upgradeable);
        const pos = target.body.position;
        const newIndex = target.fruitIndex + 1;
        
        // Remove old
        this.removeFruit(target.body);
        
        // Create upgraded
        const newFruit = this.createPhysicsFruit(pos.x, pos.y, newIndex);
        this.fruits.push(newFruit);
        
        // Effect
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
        
        // Use revive powerup
        const powerups = JSON.parse(localStorage.getItem(CONFIG.STORAGE_POWERUPS) || '{}');
        if (!powerups.revive || powerups.revive <= 0) return false;
        
        powerups.revive--;
        localStorage.setItem(CONFIG.STORAGE_POWERUPS, JSON.stringify(powerups));
        
        // Remove top fruits above danger line
        const toRemove = this.fruits.filter(f => {
            const fruit = FRUITS[f.fruitIndex];
            return f.body.position.y - fruit.radius < CONFIG.DANGER_LINE_Y + 50;
        });
        
        for (const fruitObj of toRemove) {
            this.playRemoveEffect(fruitObj.body.position.x, fruitObj.body.position.y);
            this.removeFruit(fruitObj.body);
        }
        
        // Reset state
        GameState.gameOver = false;
        GameState.canRevive = false;  // Can only revive once per game
        GameState.isDropping = false;
        
        // Hide modal
        document.getElementById('game-over-modal').classList.remove('show');
        
        // Create new preview
        this.generateNextFruit();
        this.createPreviewFruit();
        if (this.dropLine) {
            this.dropLine.setVisible(true);
        }
        
        this.updateUI();
        showToast('Revived! 💫');
        
        return true;
    }

    // ---------- Restart ----------
    
    restart() {
        // Clean up all fruits
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
        
        // Reset state
        GameState.score = 0;
        GameState.gameOver = false;
        GameState.isDropping = false;
        GameState.canRevive = true;
        
        // Generate new fruits
        this.nextFruitIndex = Phaser.Math.Between(0, CONFIG.MAX_SPAWN_LEVEL);
        this.generateNextFruit();
        this.createPreviewFruit();
        
        if (this.dropLine) {
            this.dropLine.setVisible(true);
        }
        
        this.updateUI();
        
        // Hide modal
        document.getElementById('game-over-modal').classList.remove('show');
        
        // Notify Telegram
        if (window.TelegramGame) {
            window.TelegramGame.onGameStart();
        }
    }
}

// ==========================================
// Initialize Phaser Game
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
    init: initGame
};
