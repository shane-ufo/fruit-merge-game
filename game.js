// ==========================================
// Fruit Merge Game (Suika Game Clone)
// Built with Phaser 3 + Matter.js
// ==========================================

// ---------- Game Configuration ----------
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const WALL_THICKNESS = 15;
const DROP_LINE_Y = 80;
const DANGER_LINE_Y = 100;

// ---------- Fruit Configuration ----------
// Each fruit: name, color, radius, score, emoji
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
    }

    // Preload assets
    preload() {
        // You can load images/sounds here
        // For now we use drawn shapes and emojis
    }

    // Create game objects
    create() {
        // Initialize Matter.js physics engine with boundaries
        this.matter.world.setBounds(
            WALL_THICKNESS, 
            0, 
            GAME_WIDTH - WALL_THICKNESS * 2, 
            GAME_HEIGHT - WALL_THICKNESS,
            32, 
            true, true, false, true
        );

        // Set gravity
        this.matter.world.setGravity(0, 1);

        // Draw background
        this.createBackground();

        // Draw container walls
        this.createWalls();

        // Initialize fruits array
        this.fruits = [];
        
        // Generate first two fruits
        this.generateNextFruit();
        this.generateNextFruit();
        this.createPreviewFruit();

        // Update UI
        this.updateUI();

        // Input: Mouse/Touch move
        this.input.on('pointermove', (pointer) => {
            if (!isDropping && !gameOver && previewFruit) {
                let x = Phaser.Math.Clamp(
                    pointer.x,
                    WALL_THICKNESS + FRUITS[currentFruitIndex].radius,
                    GAME_WIDTH - WALL_THICKNESS - FRUITS[currentFruitIndex].radius
                );
                previewFruit.setPosition(x, DROP_LINE_Y);
            }
        });

        // Input: Click/Tap to drop
        this.input.on('pointerdown', (pointer) => {
            if (!isDropping && !gameOver) {
                this.dropFruit(previewFruit.x);
            }
        });

        // Collision detection
        this.matter.world.on('collisionstart', (event) => {
            this.handleCollision(event);
        });

        // Check game over periodically
        this.time.addEvent({
            delay: 500,
            callback: this.checkGameOver,
            callbackScope: this,
            loop: true
        });
    }

    // Create background and danger zone
    createBackground() {
        // Game area background
        const bg = this.add.graphics();
        bg.fillStyle(0xfef3c7, 1);
        bg.fillRoundedRect(0, 0, GAME_WIDTH, GAME_HEIGHT, 20);
        
        // Danger line
        const dangerLine = this.add.graphics();
        dangerLine.lineStyle(2, 0xff0000, 0.5);
        dangerLine.lineBetween(WALL_THICKNESS, DANGER_LINE_Y, GAME_WIDTH - WALL_THICKNESS, DANGER_LINE_Y);
        
        // Danger zone shading
        dangerLine.fillStyle(0xff0000, 0.1);
        dangerLine.fillRect(WALL_THICKNESS, 0, GAME_WIDTH - WALL_THICKNESS * 2, DANGER_LINE_Y);
    }

    // Create container walls
    createWalls() {
        const wallColor = 0x8b4513;
        const graphics = this.add.graphics();
        graphics.fillStyle(wallColor, 1);
        
        // Left wall
        graphics.fillRect(0, 0, WALL_THICKNESS, GAME_HEIGHT);
        // Right wall
        graphics.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT);
        // Bottom
        graphics.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS);
    }

    // Generate next fruit (random from first 5 types)
    generateNextFruit() {
        currentFruitIndex = nextFruitIndex;
        nextFruitIndex = Phaser.Math.Between(0, 4);
        this.updateNextFruitDisplay();
    }

    // Update next fruit preview in UI
    updateNextFruitDisplay() {
        const nextFruit = FRUITS[nextFruitIndex];
        const display = document.getElementById('next-fruit-display');
        display.textContent = nextFruit.emoji;
        display.style.backgroundColor = '#' + nextFruit.color.toString(16).padStart(6, '0');
    }

    // Create preview fruit that follows mouse/touch
    createPreviewFruit() {
        const fruit = FRUITS[currentFruitIndex];
        
        if (previewFruit) {
            previewFruit.destroy();
        }

        // Create preview circle
        const graphics = this.add.graphics();
        graphics.fillStyle(fruit.color, 0.7);
        graphics.fillCircle(0, 0, fruit.radius);
        
        // Add emoji
        const emoji = this.add.text(0, 0, fruit.emoji, {
            fontSize: fruit.radius + 'px'
        }).setOrigin(0.5);

        // Combine into container
        previewFruit = this.add.container(GAME_WIDTH / 2, DROP_LINE_Y, [graphics, emoji]);
        
        // Add drop line indicator
        this.dropLine = this.add.graphics();
        this.updateDropLine(GAME_WIDTH / 2);
    }

    // Update drop line position
    updateDropLine(x) {
        if (this.dropLine) {
            this.dropLine.clear();
            this.dropLine.lineStyle(2, 0x888888, 0.3);
            this.dropLine.lineBetween(x, DROP_LINE_Y, x, GAME_HEIGHT - WALL_THICKNESS);
        }
    }

    // Drop fruit from current position
    dropFruit(x) {
        isDropping = true;
        const fruit = FRUITS[currentFruitIndex];

        // Hide preview
        if (previewFruit) {
            previewFruit.setVisible(false);
        }
        if (this.dropLine) {
            this.dropLine.setVisible(false);
        }

        // Create physics fruit
        const fruitBody = this.createFruitBody(x, DROP_LINE_Y, currentFruitIndex);
        this.fruits.push(fruitBody);

        // Allow next drop after delay
        this.time.delayedCall(500, () => {
            isDropping = false;
            this.generateNextFruit();
            this.createPreviewFruit();
            if (this.dropLine) {
                this.dropLine.setVisible(true);
            }
        });
    }

    // Create fruit with physics body
    createFruitBody(x, y, fruitIndex) {
        const fruit = FRUITS[fruitIndex];

        // Create circle graphics
        const graphics = this.add.graphics();
        graphics.fillStyle(fruit.color, 1);
        graphics.fillCircle(0, 0, fruit.radius);
        graphics.lineStyle(3, 0xffffff, 0.3);
        graphics.strokeCircle(0, 0, fruit.radius);

        // Add emoji
        const emoji = this.add.text(0, 0, fruit.emoji, {
            fontSize: (fruit.radius * 1.2) + 'px'
        }).setOrigin(0.5);

        // Combine into container
        const container = this.add.container(x, y, [graphics, emoji]);

        // Add physics properties
        const body = this.matter.add.circle(x, y, fruit.radius, {
            restitution: 0.2,  // Bounciness
            friction: 0.5,     // Surface friction
            frictionAir: 0.01, // Air resistance
            label: 'fruit',
            fruitIndex: fruitIndex
        });

        // Link container and physics body
        container.body = body;
        body.gameObject = container;

        // Update container position every frame
        this.events.on('update', () => {
            if (container && container.active) {
                container.setPosition(body.position.x, body.position.y);
                container.setRotation(body.angle);
            }
        });

        return { container, body, fruitIndex };
    }

    // Handle collision between objects
    handleCollision(event) {
        const pairs = event.pairs;

        for (let pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Check if two fruits collided
            if (bodyA.label === 'fruit' && bodyB.label === 'fruit') {
                // Check if same type and not max level
                if (bodyA.fruitIndex === bodyB.fruitIndex && bodyA.fruitIndex < FRUITS.length - 1) {
                    this.mergeFruits(bodyA, bodyB);
                }
            }
        }
    }

    // Merge two fruits into a bigger one
    mergeFruits(bodyA, bodyB) {
        // Prevent duplicate merges
        if (bodyA.merged || bodyB.merged) return;
        bodyA.merged = true;
        bodyB.merged = true;

        const newIndex = bodyA.fruitIndex + 1;
        const newFruit = FRUITS[newIndex];

        // Calculate new position (midpoint)
        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;

        // Remove old fruits
        this.removeFruit(bodyA);
        this.removeFruit(bodyB);

        // Create new bigger fruit
        const newFruitBody = this.createFruitBody(newX, newY, newIndex);
        this.fruits.push(newFruitBody);

        // Add score
        score += newFruit.score;
        this.updateUI();

        // Play merge effect
        this.playMergeEffect(newX, newY, newFruit);

        // Notify Telegram (if available)
        if (window.TelegramGame) {
            window.TelegramGame.onScoreUpdate(score);
        }
    }

    // Remove fruit from game
    removeFruit(body) {
        if (body.gameObject) {
            body.gameObject.destroy();
        }
        this.matter.world.remove(body);
        
        // Remove from array
        this.fruits = this.fruits.filter(f => f.body !== body);
    }

    // Play merge visual effect
    playMergeEffect(x, y, fruit) {
        // Create particle burst
        const particles = this.add.graphics();
        particles.fillStyle(fruit.color, 0.8);
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const px = x + Math.cos(angle) * 10;
            const py = y + Math.sin(angle) * 10;
            particles.fillCircle(px, py, 5);
        }

        // Scale up and fade out
        this.tweens.add({
            targets: particles,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => particles.destroy()
        });

        // Show +score popup
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

    // Check if game is over
    checkGameOver() {
        if (gameOver) return;

        for (let fruitObj of this.fruits) {
            if (fruitObj.body && fruitObj.body.position) {
                const topY = fruitObj.body.position.y - FRUITS[fruitObj.fruitIndex].radius;
                
                // If fruit top is above danger line and nearly stationary
                if (topY < DANGER_LINE_Y && Math.abs(fruitObj.body.velocity.y) < 0.5) {
                    // Give some buffer time
                    if (!fruitObj.dangerTime) {
                        fruitObj.dangerTime = Date.now();
                    } else if (Date.now() - fruitObj.dangerTime > 1500) {
                        this.endGame();
                        return;
                    }
                } else {
                    fruitObj.dangerTime = null;
                }
            }
        }
    }

    // End the game
    endGame() {
        gameOver = true;

        // Update best score
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('fruitMergeBest', bestScore);
        }

        // Show game over modal
        document.getElementById('final-score').textContent = score;
        document.getElementById('modal-best-score').textContent = bestScore;
        document.getElementById('game-over-modal').classList.add('show');

        // Notify Telegram (if available)
        if (window.TelegramGame) {
            window.TelegramGame.onGameOver(score, bestScore);
        }
    }

    // Update score UI
    updateUI() {
        document.getElementById('current-score').textContent = score;
        document.getElementById('best-score').textContent = bestScore;
    }

    // Restart the game
    restart() {
        // Clear all fruits
        for (let fruitObj of this.fruits) {
            if (fruitObj.container) {
                fruitObj.container.destroy();
            }
            if (fruitObj.body) {
                this.matter.world.remove(fruitObj.body);
            }
        }
        this.fruits = [];

        // Reset state
        score = 0;
        gameOver = false;
        isDropping = false;

        // Generate new fruits
        this.generateNextFruit();
        this.generateNextFruit();
        this.createPreviewFruit();
        this.updateUI();

        // Hide modal
        document.getElementById('game-over-modal').classList.remove('show');
    }

    // Called every frame
    update() {
        // Update drop line position
        if (previewFruit && previewFruit.visible) {
            this.updateDropLine(previewFruit.x);
        }
    }
}

// ---------- Phaser Game Configuration ----------
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
            debug: false  // Set to true to see physics boundaries
        }
    },
    scene: GameScene
};

// ---------- Start Game ----------
const game = new Phaser.Game(config);

// ---------- Button Event Listeners ----------
document.getElementById('restart-btn').addEventListener('click', () => {
    game.scene.getScene('GameScene').restart();
});

document.getElementById('share-btn').addEventListener('click', () => {
    if (window.TelegramGame) {
        window.TelegramGame.shareScore(score);
    } else {
        // Fallback: copy score to clipboard
        navigator.clipboard.writeText(`I scored ${score} points in Fruit Merge Game! Can you beat me?`);
        alert('Score copied to clipboard!');
    }
});

// ---------- Prevent Mobile Scrolling ----------
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// ---------- Export for Telegram Integration ----------
window.GameAPI = {
    getScore: () => score,
    getBestScore: () => bestScore,
    restart: () => game.scene.getScene('GameScene').restart()
};
