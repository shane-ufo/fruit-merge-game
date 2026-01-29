// ==========================================
// Fruit Merge Game (Suika Game Clone)
// Built with Phaser 3 + Matter.js
// FIXED VERSION - No memory leaks
// ==========================================

// ---------- Game Configuration ----------
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const WALL_THICKNESS = 15;
const DROP_LINE_Y = 80;
const DANGER_LINE_Y = 100;

// ---------- Fruit Configuration ----------
const FRUITS = [
    { name: 'Cherry',     color: 0xff6b6b, radius: 15,  score: 1,   emoji: '🍒' },
    { name: 'Strawberry', color: 0xff8787, radius: 22,  score: 3,   emoji: '🍓' },
    { name: 'Grape',      color: 0x9775fa, radius: 30,  score: 6,   emoji: '🍇' },
    { name: 'Orange',     color: 0xffa94d, radius: 38,  score: 10,  emoji: '🍊' },
    { name: 'Apple',      color: 0xff6b6b, radius: 48,  score: 15,  emoji: '🍎' },
    { name: 'Pear',       color: 0xffe066, radius: 58,  score: 21,  emoji: '🍐' },
    { name: 'Peach',      color: 0xffc9c9, radius: 68,  score: 28,  emoji: '🍑' },
    { name: 'Pineapple',  color: 0xffd43b, radius: 78,  score: 36,  emoji: '🍍' },
    { name: 'Melon',      color: 0x8ce99a, radius: 88,  score: 45,  emoji: '🍈' },
    { name: 'Watermelon', color: 0x69db7c, radius: 98,  score: 55,  emoji: '🍉' },
    { name: 'Rainbow',    color: 0xff00ff, radius: 108, score: 100, emoji: '🌈' }
];

// ---------- Game State ----------
let score = 0;
let bestScore = parseInt(localStorage.getItem('fruitMergeBest')) || 0;
let currentFruitIndex = 0;
let nextFruitIndex = 0;
let isDropping = false;
let gameOver = false;
let previewFruit = null;

// ---------- Phaser Scene ----------
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.fruits = [];
        this.mergeQueue = []; // Queue for merges to prevent race conditions
    }

    preload() {
        // Assets can be loaded here
    }

    create() {
        // Reset state on create
        this.fruits = [];
        this.mergeQueue = [];
        score = 0;
        gameOver = false;
        isDropping = false;

        // Initialize physics with boundaries
        this.matter.world.setBounds(
            WALL_THICKNESS, 
            0, 
            GAME_WIDTH - WALL_THICKNESS * 2, 
            GAME_HEIGHT - WALL_THICKNESS,
            32, 
            true, true, false, true
        );

        this.matter.world.setGravity(0, 1);

        // Create visuals
        this.createBackground();
        this.createWalls();

        // Initialize fruits
        this.generateNextFruit();
        this.generateNextFruit();
        this.createPreviewFruit();

        // Update UI
        this.updateUI();

        // Input handlers
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerdown', this.handlePointerDown, this);

        // Collision detection
        this.matter.world.on('collisionstart', this.handleCollision, this);

        // Game over check timer
        this.gameOverTimer = this.time.addEvent({
            delay: 500,
            callback: this.checkGameOver,
            callbackScope: this,
            loop: true
        });
    }

    // ---------- Input Handlers ----------
    handlePointerMove(pointer) {
        if (!isDropping && !gameOver && previewFruit) {
            const radius = FRUITS[currentFruitIndex].radius;
            const x = Phaser.Math.Clamp(
                pointer.x,
                WALL_THICKNESS + radius,
                GAME_WIDTH - WALL_THICKNESS - radius
            );
            previewFruit.setPosition(x, DROP_LINE_Y);
            this.updateDropLine(x);
        }
    }

    handlePointerDown(pointer) {
        if (!isDropping && !gameOver && previewFruit) {
            this.dropFruit(previewFruit.x);
        }
    }

    // ---------- Background & Walls ----------
    createBackground() {
        const bg = this.add.graphics();
        bg.fillStyle(0xfef3c7, 1);
        bg.fillRoundedRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 20);
        
        const dangerLine = this.add.graphics();
        dangerLine.lineStyle(2, 0xff0000, 0.5);
        dangerLine.lineBetween(WALL_THICKNESS, DANGER_LINE_Y, GAME_WIDTH - WALL_THICKNESS, DANGER_LINE_Y);
        
        dangerLine.fillStyle(0xff0000, 0.1);
        dangerLine.fillRect(WALL_THICKNESS, 0, GAME_WIDTH - WALL_THICKNESS * 2, DANGER_LINE_Y);
    }

    createWalls() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x8b4513, 1);
        graphics.fillRect(0, 0, WALL_THICKNESS, GAME_HEIGHT);
        graphics.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT);
        graphics.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS);
    }

    // ---------- Fruit Management ----------
    generateNextFruit() {
        currentFruitIndex = nextFruitIndex;
        nextFruitIndex = Phaser.Math.Between(0, 4);
        this.updateNextFruitDisplay();
    }

    updateNextFruitDisplay() {
        const nextFruit = FRUITS[nextFruitIndex];
        const display = document.getElementById('next-fruit-display');
        if (display) {
            display.textContent = nextFruit.emoji;
            display.style.backgroundColor = '#' + nextFruit.color.toString(16).padStart(6, '0');
        }
    }

    createPreviewFruit() {
        const fruit = FRUITS[currentFruitIndex];
        
        if (previewFruit) {
            previewFruit.destroy();
        }

        const graphics = this.add.graphics();
        graphics.fillStyle(fruit.color, 0.7);
        graphics.fillCircle(0, 0, fruit.radius);
        
        const emoji = this.add.text(0, 0, fruit.emoji, {
            fontSize: fruit.radius + 'px'
        }).setOrigin(0.5);

        previewFruit = this.add.container(GAME_WIDTH / 2, DROP_LINE_Y, [graphics, emoji]);
        
        if (!this.dropLine) {
            this.dropLine = this.add.graphics();
        }
        this.dropLine.setVisible(true);
        this.updateDropLine(GAME_WIDTH / 2);
    }

    updateDropLine(x) {
        if (this.dropLine) {
            this.dropLine.clear();
            this.dropLine.lineStyle(2, 0x888888, 0.3);
            this.dropLine.lineBetween(x, DROP_LINE_Y, x, GAME_HEIGHT - WALL_THICKNESS);
        }
    }

    dropFruit(x) {
        isDropping = true;

        if (previewFruit) {
            previewFruit.setVisible(false);
        }
        if (this.dropLine) {
            this.dropLine.setVisible(false);
        }

        const fruitObj = this.createFruitBody(x, DROP_LINE_Y, currentFruitIndex);
        this.fruits.push(fruitObj);

        this.time.delayedCall(500, () => {
            if (!gameOver) {
                isDropping = false;
                this.generateNextFruit();
                this.createPreviewFruit();
            }
        });
    }

    createFruitBody(x, y, fruitIndex) {
        const fruit = FRUITS[fruitIndex];

        // Create graphics
        const graphics = this.add.graphics();
        graphics.fillStyle(fruit.color, 1);
        graphics.fillCircle(0, 0, fruit.radius);
        graphics.lineStyle(3, 0xffffff, 0.3);
        graphics.strokeCircle(0, 0, fruit.radius);

        // Create emoji
        const emoji = this.add.text(0, 0, fruit.emoji, {
            fontSize: (fruit.radius * 1.2) + 'px'
        }).setOrigin(0.5);

        // Create container
        const container = this.add.container(x, y, [graphics, emoji]);

        // Create physics body
        const body = this.matter.add.circle(x, y, fruit.radius, {
            restitution: 0.2,
            friction: 0.5,
            frictionAir: 0.01,
            label: 'fruit',
            fruitIndex: fruitIndex
        });

        // Create fruit object (NOT using event listeners!)
        const fruitObj = {
            container,
            body,
            fruitIndex,
            id: Date.now() + Math.random(), // Unique ID
            merged: false,
            dangerTime: null
        };

        // Store reference on body for collision detection
        body.fruitObj = fruitObj;

        return fruitObj;
    }

    // ---------- Collision Handling ----------
    handleCollision(event) {
        const pairs = event.pairs;

        for (let pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Check if both are fruits
            if (bodyA.label === 'fruit' && bodyB.label === 'fruit') {
                const fruitA = bodyA.fruitObj;
                const fruitB = bodyB.fruitObj;

                // Check valid and same type
                if (fruitA && fruitB && 
                    !fruitA.merged && !fruitB.merged &&
                    fruitA.fruitIndex === fruitB.fruitIndex && 
                    fruitA.fruitIndex < FRUITS.length - 1) {
                    
                    // Mark as merged immediately to prevent double merge
                    fruitA.merged = true;
                    fruitB.merged = true;

                    // Queue the merge (process in update to avoid physics issues)
                    this.mergeQueue.push({ fruitA, fruitB });
                }
            }
        }
    }

    // ---------- Merge Logic ----------
    processMergeQueue() {
        while (this.mergeQueue.length > 0) {
            const { fruitA, fruitB } = this.mergeQueue.shift();
            this.mergeFruits(fruitA, fruitB);
        }
    }

    mergeFruits(fruitA, fruitB) {
        // Double check they haven't been removed
        if (!fruitA.body || !fruitB.body) return;

        const newIndex = fruitA.fruitIndex + 1;
        const newFruit = FRUITS[newIndex];

        // Calculate merge position
        const newX = (fruitA.body.position.x + fruitB.body.position.x) / 2;
        const newY = (fruitA.body.position.y + fruitB.body.position.y) / 2;

        // Remove old fruits
        this.removeFruit(fruitA);
        this.removeFruit(fruitB);

        // Create new fruit
        const newFruitObj = this.createFruitBody(newX, newY, newIndex);
        this.fruits.push(newFruitObj);

        // Add score
        score += newFruit.score;
        this.updateUI();

        // Play effect
        this.playMergeEffect(newX, newY, newFruit);
    }

    removeFruit(fruitObj) {
        // Destroy container
        if (fruitObj.container) {
            fruitObj.container.destroy();
            fruitObj.container = null;
        }

        // Remove physics body
        if (fruitObj.body) {
            this.matter.world.remove(fruitObj.body);
            fruitObj.body = null;
        }

        // Remove from array
        const index = this.fruits.indexOf(fruitObj);
        if (index > -1) {
            this.fruits.splice(index, 1);
        }
    }

    // ---------- Effects ----------
    playMergeEffect(x, y, fruit) {
        // Particle burst
        const particles = this.add.graphics();
        particles.fillStyle(fruit.color, 0.8);
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            particles.fillCircle(
                x + Math.cos(angle) * 10,
                y + Math.sin(angle) * 10,
                5
            );
        }

        this.tweens.add({
            targets: particles,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => particles.destroy()
        });

        // Score popup
        const scoreText = this.add.text(x, y - 30, '+' + fruit.score, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: scoreText,
            y: y - 80,
            alpha: 0,
            duration: 800,
            onComplete: () => scoreText.destroy()
        });
    }

    // ---------- Game Over Check ----------
    checkGameOver() {
        if (gameOver) return;

        for (let fruitObj of this.fruits) {
            if (!fruitObj.body || fruitObj.merged) continue;

            const topY = fruitObj.body.position.y - FRUITS[fruitObj.fruitIndex].radius;
            const velocity = Math.abs(fruitObj.body.velocity.y);

            // Check if above danger line and nearly stationary
            if (topY < DANGER_LINE_Y && velocity < 0.5) {
                if (!fruitObj.dangerTime) {
                    fruitObj.dangerTime = Date.now();
                } else if (Date.now() - fruitObj.dangerTime > 2000) {
                    this.endGame();
                    return;
                }
            } else {
                fruitObj.dangerTime = null;
            }
        }
    }

    endGame() {
        gameOver = true;

        // Update best score
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('fruitMergeBest', bestScore);
        }

        // Show modal
        document.getElementById('final-score').textContent = score;
        document.getElementById('modal-best-score').textContent = bestScore;
        document.getElementById('game-over-modal').classList.add('show');

        // Telegram callback
        if (window.TelegramGame) {
            window.TelegramGame.onGameOver(score, bestScore);
        }
    }

    // ---------- UI Update ----------
    updateUI() {
        const currentScoreEl = document.getElementById('current-score');
        const bestScoreEl = document.getElementById('best-score');
        if (currentScoreEl) currentScoreEl.textContent = score;
        if (bestScoreEl) bestScoreEl.textContent = bestScore;
    }

    // ---------- Restart ----------
    restart() {
        // Clear all fruits
        for (let fruitObj of this.fruits) {
            if (fruitObj.container) fruitObj.container.destroy();
            if (fruitObj.body) this.matter.world.remove(fruitObj.body);
        }
        this.fruits = [];
        this.mergeQueue = [];

        // Reset state
        score = 0;
        gameOver = false;
        isDropping = false;

        // Regenerate
        this.generateNextFruit();
        this.generateNextFruit();
        this.createPreviewFruit();
        this.updateUI();

        // Hide modal
        document.getElementById('game-over-modal').classList.remove('show');
    }

    // ---------- Update Loop (Called Every Frame) ----------
    update() {
        // Process any pending merges
        this.processMergeQueue();

        // Sync container positions with physics bodies
        for (let fruitObj of this.fruits) {
            if (fruitObj.body && fruitObj.container && fruitObj.container.active) {
                fruitObj.container.setPosition(
                    fruitObj.body.position.x,
                    fruitObj.body.position.y
                );
                fruitObj.container.setRotation(fruitObj.body.angle);
            }
        }
    }
}

// ---------- Phaser Configuration ----------
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#fef3c7',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false
        }
    },
    scene: GameScene
};

// ---------- Start Game ----------
const game = new Phaser.Game(config);

// ---------- Button Listeners ----------
document.getElementById('restart-btn').addEventListener('click', () => {
    game.scene.getScene('GameScene').restart();
});

document.getElementById('share-btn').addEventListener('click', () => {
    if (window.TelegramGame) {
        window.TelegramGame.shareScore(score);
    } else {
        const text = `I scored ${score} points in Fruit Merge Game! Can you beat me?`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            alert('Score copied to clipboard!');
        }
    }
});

// ---------- Prevent Mobile Scroll ----------
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// ---------- Export API ----------
window.GameAPI = {
    getScore: () => score,
    getBestScore: () => bestScore,
    restart: () => game.scene.getScene('GameScene').restart()
};
