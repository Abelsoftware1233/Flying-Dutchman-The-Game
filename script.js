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
const ITEM_SIZE = 50; // Iets groter gemaakt voor betere zichtbaarheid van de afbeeldingen
const MAX_FALL_SPEED = 3;
const MIN_FALL_SPEED = 1;
const SPAWN_INTERVAL_MS = 1000; // Item spawnt elke 1 seconde
const BOMB_CHANCE = 0.2; // 20% kans op een bom

// Game State Variables
let score = 0;
let lives = 3;
let gameItems = [];
let gameLoopInterval;
let itemSpawnInterval;
let isPlaying = false;

// Afbeeldingen laden
const friendImage = new Image();
// Gebruik 1000008638.jpg (silhouette) als de vriend.
// OF gebruik 'pop.jpg' als dat het gewenste vriendje is. Ik kies voor de silhouette nu.
friendImage.src = '1000008638.jpg'; 

const bombImage = new Image();
bombImage.src = 'bomb.jpg'; // Gebruik bomb.jpg

// Afbeeldingen zijn niet direct beschikbaar; we wachten tot ze geladen zijn.
let assetsLoaded = false;
let imagesLoadedCount = 0;
const totalImages = 2;

function imageLoaded() {
    imagesLoadedCount++;
    if (imagesLoadedCount === totalImages) {
        assetsLoaded = true;
        // Optioneel: verander de startknop als alles geladen is
        startButton.textContent = 'Start Spel';
        startButton.disabled = false;
    }
}

friendImage.onload = imageLoaded;
bombImage.onload = imageLoaded;
friendImage.onerror = () => { console.error("Fout bij het laden van friendImage (1000008638.jpg)."); imageLoaded(); };
bombImage.onerror = () => { console.error("Fout bij het laden van bombImage (bomb.jpg)."); imageLoaded(); };


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
        this.image = type === 'friend' ? friendImage : bombImage;
        // Snellere items als de score hoger wordt
        const speedMultiplier = 1 + (score / 200); 
        this.speed = (Math.random() * (MAX_FALL_SPEED - MIN_FALL_SPEED) + MIN_FALL_SPEED) * speedMultiplier;
    }

    // Move the item down
    update() {
        this.y += this.speed;
    }

    // Draw the item
    draw() {
        // Zorg ervoor dat de afbeelding geladen is voordat we proberen te tekenen
        if (this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: teken een gekleurde rechthoek als de afbeelding faalt
            ctx.fillStyle = this.type === 'friend' ? 'green' : 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
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
    // Check de kans op een bom
    const type = Math.random() < BOMB_CHANCE ? 'bomb' : 'friend';
    // Zorg ervoor dat item volledig binnen de x-grenzen spawnt
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
            // Een vriend die de onderkant passeert, kost een leven (gemiste tik)
            if (item.type === 'friend') {
                lives--;
                updateScoreboard();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            // Verwijder het item, ongeacht het type
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

    // Krijg klikcoördinaten relatief ten opzichte van de canvas
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];

        // Eenvoudige botsingscontrole van de bounding box
        if (clickX >= item.x && clickX <= item.x + item.width &&
            clickY >= item.y && clickY <= item.y + item.height) {

            if (item.type === 'friend') {
                score += 10; // Punten scoren voor het tikken op een vriend
                // Optioneel: verhoog de snelheid van het spawnen bij hogere scores
                if (score % 50 === 0) {
                    clearInterval(itemSpawnInterval);
                    const newSpawnInterval = Math.max(500, SPAWN_INTERVAL_MS - (score / 10)); // Minimaal 0.5s
                    itemSpawnInterval = setInterval(spawnItem, newSpawnInterval);
                }

            } else if (item.type === 'bomb') {
                lives--;    // Leven verliezen voor het tikken op een bom
            }

            // Verwijder het getikte item
            gameItems.splice(i, 1);
            updateScoreboard();

            // Controleer op game over conditie
            if (lives <= 0) {
                endGame();
            }

            // Stop met het verwerken van andere items voor deze klik
            return;
        }
    }
}

/**
 * Sets up and starts the game.
 */
function startGame() {
    if (!assetsLoaded) {
        alert("Wacht even tot de spelonderdelen (afbeeldingen) geladen zijn.");
        return;
    }
    
    score = 0;
    lives = 3;
    gameItems = [];
    isPlaying = true;

    updateScoreboard();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Zet de game-intervallen op
    gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
    itemSpawnInterval = setInterval(spawnItem, SPAWN_INTERVAL_MS); // Spawn item
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

// Initialisatie: Zet startknop uit tot alles geladen is
startButton.textContent = 'Laden...';
startButton.disabled = true;

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
canvas.addEventListener('click', handleCanvasClick);
