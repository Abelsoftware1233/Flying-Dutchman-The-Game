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
// De canvas grootte blijft intern 400x600, maar schaalt nu via CSS
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const ITEM_SIZE = 50; 
const MAX_FALL_SPEED = 3;
const MIN_FALL_SPEED = 1;
const SPAWN_INTERVAL_MS = 1000; 

// Game State Variables
let score = 0;
let lives = 30;
let gameItems = [];
let itemSpawnInterval;
let isPlaying = false;

// Afbeeldingen laden (onveranderd)
const friendImage = new Image();
friendImage.src = '1000008887.jpg'; 

const bombImage = new Image();
bombImage.src = 'bomb.jpg'; 

// Afbeeldingen laadstatus (onveranderd)
let assetsLoaded = false;
let imagesLoadedCount = 0;
const totalImages = 2;

function imageLoaded() {
    imagesLoadedCount++;
    if (imagesLoadedCount === totalImages) {
        assetsLoaded = true;
        startButton.textContent = 'Start Spel';
        startButton.disabled = false;
    }
}

friendImage.onload = imageLoaded;
bombImage.onload = imageLoaded;
friendImage.onerror = () => { console.error("Fout bij het laden van friendImage."); imageLoaded(); };
bombImage.onerror = () => { console.error("Fout bij het laden van bombImage."); imageLoaded(); };

// Set Canvas Size (interne resolutie)
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
        this.y = -ITEM_SIZE; 
        this.width = ITEM_SIZE;
        this.height = ITEM_SIZE;
        this.type = type;
        this.image = type === 'friend' ? friendImage : bombImage;
        const speedMultiplier = 1 + (score / 200); 
        this.speed = (Math.random() * (MAX_FALL_SPEED - MIN_FALL_SPEED) + MIN_FALL_SPEED) * speedMultiplier;
    }

    // Move the item down
    update() {
        this.y += this.speed;
    }

    // Draw the item
    draw() {
        if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = this.type === 'friend' ? 'gold' : 'darkred';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// --- Game Logic Functions ---

function updateScoreboard() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
}

function spawnItem() {
    const bombChance = Math.min(0.5, 0.2 + (score / 500)); 
    const type = Math.random() < bombChance ? 'bomb' : 'friend';
    const randomX = Math.random() * (CANVAS_WIDTH - ITEM_SIZE);
    
    const newItem = new GameItem(randomX, type);
    gameItems.push(newItem);
}

function gameLoop() {
    if (!isPlaying) return;

    requestAnimationFrame(gameLoop); 

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];
        item.update();
        item.draw();

        if (item.y > CANVAS_HEIGHT) {
            if (item.type === 'friend') {
                lives--;
                updateScoreboard();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            gameItems.splice(i, 1);
        }
    }
}

/**
 * Functie voor het afhandelen van zowel muisklikken als touch-events
 * @param {Event} event - De muis- of touch-event
 */
function handleInput(event) {
    if (!isPlaying) return;
    
    // Voorkom dubbele afhandeling als zowel click als touch zijn geactiveerd
    event.preventDefault(); 

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    // Bepaal de juiste coördinaten: 
    // gebruik 'touches[0]' voor touch-events en 'event' voor muisklikken
    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    // Bereken de coördinaten op de interne canvas resolutie (400x600)
    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;


    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];

        if (clickX >= item.x && clickX <= item.x + item.width &&
            clickY >= item.y && clickY <= item.y + item.height) {

            if (item.type === 'friend') {
                score += 10; 
                if (score % 50 === 0 && score > 0) {
                    clearInterval(itemSpawnInterval);
                    const newSpawnInterval = Math.max(500, SPAWN_INTERVAL_MS - (score / 10)); 
                    itemSpawnInterval = setInterval(spawnItem, newSpawnInterval);
                }

            } else if (item.type === 'bomb') {
                lives--;    
            }

            gameItems.splice(i, 1);
            updateScoreboard();

            if (lives <= 0) {
                endGame();
            }

            return;
        }
    }
}

function startGame() {
    if (!assetsLoaded) {
        alert("Wacht tot de spelonderdelen (afbeeldingen) geladen zijn.");
        return;
    }
    
    score = 0;
    lives = 30;
    gameItems = [];
    isPlaying = true;

    updateScoreboard();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    requestAnimationFrame(gameLoop); 

    clearInterval(itemSpawnInterval);
    itemSpawnInterval = setInterval(spawnItem, SPAWN_INTERVAL_MS); 
}

function endGame() {
    isPlaying = false;
    clearInterval(itemSpawnInterval);
    
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Initialisatie
startButton.textContent = 'Laden...';
startButton.disabled = true;

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Luister nu naar zowel 'click' (muis) als 'touchstart' (mobiel)
canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', handleInput);
