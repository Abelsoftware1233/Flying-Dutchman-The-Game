// Game Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

// Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const ITEM_SIZE = 40;
const FRIEND_COLOR = 'green'; // Color for point items (friends)
const BOMB_COLOR = 'red';    // Color for penalty items (bombs)
const MAX_FALL_SPEED = 2;
const MIN_FALL_SPEED = 0.5;

// Game State Variables
let score = 0;
let lives = 3;
let gameItems = [];
let gameLoopInterval;
let itemSpawnInterval;
let isPlaying = false;

// Set Canvas Size
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

/**
 * Represents a falling item (friend or bomb).
 * @param {number} x - initial x position
 * @param {string} type - 'friend' or 'bomb'
 */
class GameItem {
    constructor(x, type) {
        this.x = x;
        this.y = -ITEM_SIZE; // Start above the canvas
        this.width = ITEM_SIZE;
        this.height = ITEM_SIZE;
        this.type = type;
        this.color = type === 'friend' ? FRIEND_COLOR : BOMB_COLOR;
        this.speed = Math.random() * (MAX_FALL_SPEED - MIN_FALL_SPEED) + MIN_FALL_SPEED;
    }

    // Move the item down
    update() {
        this.y += this.speed;
    }

    // Draw the item
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // A simple circle for the item
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        // Optional: Add a simple 'F' or 'B' label
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type === 'friend' ? '😊' : '💣', this.x + this.width / 2, this.y + this.height / 2);
    }
}

// --- Game Logic Functions ---

/**
 * Updates the score and lives display on the scoreboard.
 */
function updateScoreboard() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
}

/**
 * Spawns a new item (friend or bomb) at a random x-position.
 */
function spawnItem() {
    // 80% chance for a friend, 20% for a bomb
    const type = Math.random() < 0.8 ? 'friend' : 'bomb';
    // Ensure item spawns fully within the x-bounds
    const randomX = Math.random() * (CANVAS_WIDTH - ITEM_SIZE);
    
    const newItem = new GameItem(randomX, type);
    gameItems.push(newItem);
}

/**
 * The main game loop: updates positions, checks bounds, and redraws.
 */
function gameLoop() {
    if (!isPlaying) return;

    // 1. Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Update and draw all items
    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];
        item.update();
        item.draw();

        // 3. Check if item has passed the bottom
        if (item.y > CANVAS_HEIGHT) {
            // A friend passing the bottom means a missed tap, losing a life
            if (item.type === 'friend') {
                lives--;
                updateScoreboard();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            // Remove the item regardless of type
            gameItems.splice(i, 1);
        }
    }
}

/**
 * Handles a click/tap event on the canvas.
 * @param {MouseEvent} event - The click event object.
 */
function handleCanvasClick(event) {
    if (!isPlaying) return;

    // Get click coordinates relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];

        // Simple bounding box collision check
        if (clickX >= item.x && clickX <= item.x + item.width &&
            clickY >= item.y && clickY <= item.y + item.height) {

            if (item.type === 'friend') {
                score += 10; // Score points for tapping a friend
            } else if (item.type === 'bomb') {
                lives--;    // Lose a life for tapping a bomb
            }

            // Remove the tapped item
            gameItems.splice(i, 1);
            updateScoreboard();

            // Check for game over condition
            if (lives <= 0) {
                endGame();
            }

            // Stop processing other items for this click
            return;
        }
    }
}

/**
 * Sets up and starts the game.
 */
function startGame() {
    score = 0;
    lives = 3;
    gameItems = [];
    isPlaying = true;

    updateScoreboard();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Set up game intervals
    gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
    itemSpawnInterval = setInterval(spawnItem, 1000); // Spawn an item every 1 second
}

/**
 * Stops the game and displays the game over screen.
 */
function endGame() {
    isPlaying = false;
    clearInterval(gameLoopInterval);
    clearInterval(itemSpawnInterval);
    
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
canvas.addEventListener('click', handleCanvasClick);
