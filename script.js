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
const powerupDisplay = document.getElementById('powerup-display'); // Nieuw HTML element nodig

// Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const ITEM_SIZE = 50;
const MAX_FALL_SPEED = 3.5; // Iets verhoogd
const MIN_FALL_SPEED = 1.5; // Iets verhoogd
const INITIAL_SPAWN_INTERVAL_MS = 1000;
const BOMB_CHANCE = 0.2;
const POWERUP_CHANCE = 0.1; // Nieuwe kans voor power-up
const LEVEL_UP_SCORE = 100; // Om de hoeveel punten de moeilijkheid verhoogt

// Game State Variables
let score = 0;
let lives = 30;
let gameItems = [];
let gameLoopInterval;
let itemSpawnInterval;
let isPlaying = false;
let currentLevel = 1;

// Power-up State
let isSlowTimeActive = false;
let slowTimeRemaining = 0;
const SLOW_TIME_DURATION_MS = 5000;
const SLOW_TIME_FACTOR = 0.5; // Items vallen half zo snel

// Visual Feedback (voor kliks)
let clickFeedbacks = [];

// Afbeeldingen laden
const friendImage = new Image();
friendImage.src = '1000008887.jpg'; // De goudstaaf

const bombImage = new Image();
bombImage.src = 'bomb.jpg'; // De bom

// Nieuwe power-up afbeelding (of gebruik kleur als fallback)
const powerupImage = new Image();
// Voor nu een placeholder, gebruik de fallback in de GameItem draw
powerupImage.src = 'powerup.png';

// Afbeeldingen laadstatus
let assetsLoaded = false;
let imagesLoadedCount = 0;
const totalImages = 3; // Nu 3 afbeeldingen

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
powerupImage.onload = imageLoaded;

// Fallbacks voor foutafhandeling tijdens het laden
friendImage.onerror = () => { console.error("Fout bij het laden van friendImage."); imageLoaded(); };
bombImage.onerror = () => { console.error("Fout bij het laden van bombImage."); imageLoaded(); };
powerupImage.onerror = () => { console.error("Fout bij het laden van powerupImage."); imageLoaded(); };

// Set Canvas Size
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

/**
 * Represents a falling item (friend, bomb, or powerup).
 * @param {number} x - initial x position
 * @param {string} type - 'friend', 'bomb', or 'powerup'
 */
class GameItem {
    constructor(x, type) {
        this.x = x;
        this.y = -ITEM_SIZE;
        this.width = ITEM_SIZE;
        this.height = ITEM_SIZE;
        this.type = type;
        this.image = this.getImageByType(type);

        // Dynamische snelheid gebaseerd op het level
        const baseSpeed = Math.random() * (MAX_FALL_SPEED - MIN_FALL_SPEED) + MIN_FALL_SPEED;
        const speedMultiplier = 1 + (currentLevel * 0.2); // Snelheid neemt toe per level
        this.baseSpeed = baseSpeed * speedMultiplier;
        this.speed = this.baseSpeed;
    }

    getImageByType(type) {
        switch (type) {
            case 'friend': return friendImage;
            case 'bomb': return bombImage;
            case 'powerup': return powerupImage;
            default: return null;
        }
    }

    // Move the item down
    update() {
        // Pas de snelheid aan als Slow Time actief is
        this.speed = isSlowTimeActive ? this.baseSpeed * SLOW_TIME_FACTOR : this.baseSpeed;
        this.y += this.speed;
    }

    // Draw the item
    draw() {
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: teken een gekleurde rechthoek
            switch (this.type) {
                case 'friend': ctx.fillStyle = 'gold'; break;
                case 'bomb': ctx.fillStyle = 'red'; break;
                case 'powerup': ctx.fillStyle = 'blue'; break; // Power-up kleur
                default: ctx.fillStyle = 'gray';
            }
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Tekst op de power-up om duidelijk te maken wat het is
            if (this.type === 'powerup') {
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('P-Up', this.x + this.width / 2, this.y + this.height / 2 + 5);
            }
        }
    }
}

/**
 * Visual feedback for clicks (score/effect).
 * @param {number} x - x position
 * @param {number} y - y position
 * @param {string} text - text to display
 * @param {string} color - color of the text
 */
class ClickFeedback {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.opacity = 1.0;
        this.lifetime = 60; // Frames
    }

    update() {
        this.y -= 1; // Move up slightly
        this.opacity -= 1 / this.lifetime;
        this.lifetime--;
    }

    draw() {
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x + ITEM_SIZE / 2, this.y);
        ctx.globalAlpha = 1.0; // Reset
    }
}

// --- Game Logic Functions ---

function updateScoreboard() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    powerupDisplay.textContent = isSlowTimeActive ? `Slow: ${Math.ceil(slowTimeRemaining / 1000)}s` : '';
}

function updateLevel() {
    const newLevel = Math.floor(score / LEVEL_UP_SCORE) + 1;
    if (newLevel > currentLevel) {
        currentLevel = newLevel;
        applyLevelDifficulty();
        // Optioneel: visuele melding "LEVEL UP!"
    }
}

function applyLevelDifficulty() {
    // 1. Pas de spawn-interval aan
    clearInterval(itemSpawnInterval);
    // Minimaal interval van 200ms
    const newSpawnInterval = Math.max(200, INITIAL_SPAWN_INTERVAL_MS - (currentLevel - 1) * 100);
    itemSpawnInterval = setInterval(spawnItem, newSpawnInterval);

    // 2. De valsnelheid wordt al dynamisch berekend in GameItem op basis van currentLevel

    // 3. De kans op bommen verhogen (maximaal 40%)
    const newBombChance = Math.min(0.4, BOMB_CHANCE + (currentLevel - 1) * 0.05);
    // BOMB_CHANCE = newBombChance; // We passen de globale constante aan voor toekomstige spawns

    console.log(`Level ${currentLevel}: Spawn Interval: ${newSpawnInterval}ms`);
}


function spawnItem() {
    let type;
    const rand = Math.random();
    const bombThreshold = BOMB_CHANCE + (currentLevel - 1) * 0.02; // Bomkans stijgt
    const powerupThreshold = bombThreshold + POWERUP_CHANCE;

    if (rand < bombThreshold) {
        type = 'bomb';
    } else if (rand < powerupThreshold) {
        type = 'powerup';
    } else {
        type = 'friend';
    }

    const randomX = Math.random() * (CANVAS_WIDTH - ITEM_SIZE);
    const newItem = new GameItem(randomX, type);
    gameItems.push(newItem);
}

function activateSlowTime() {
    if (isSlowTimeActive) {
        // Verleng de duur als de power-up opnieuw wordt gepakt
        slowTimeRemaining += SLOW_TIME_DURATION_MS;
    } else {
        isSlowTimeActive = true;
        slowTimeRemaining = SLOW_TIME_DURATION_MS;
    }
}

function updatePowerups(deltaTime) {
    if (isSlowTimeActive) {
        slowTimeRemaining -= deltaTime;
        if (slowTimeRemaining <= 0) {
            isSlowTimeActive = false;
            slowTimeRemaining = 0;
        }
    }
}

let lastTime = 0;
function gameLoop(currentTime) {
    if (!isPlaying) return;

    // Bereken delta time voor frame-rate onafhankelijke updates (belangrijk voor power-ups!)
    if (!lastTime) lastTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update power-up status
    updatePowerups(deltaTime);

    // Teken en update items
    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];
        item.update();
        item.draw();

        // Item is buiten beeld
        if (item.y > CANVAS_HEIGHT) {
            if (item.type === 'friend') {
                lives--;
                clickFeedbacks.push(new ClickFeedback(item.x, CANVAS_HEIGHT - 20, '-1 LEVEN', 'orange'));
                updateScoreboard();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
            gameItems.splice(i, 1);
        }
    }

    // Teken en update klik feedback
    for (let i = clickFeedbacks.length - 1; i >= 0; i--) {
        const feedback = clickFeedbacks[i];
        feedback.update();
        feedback.draw();
        if (feedback.lifetime <= 0) {
            clickFeedbacks.splice(i, 1);
        }
    }

    updateScoreboard(); // Update de power-up timer
    requestAnimationFrame(gameLoop); // Gebruik requestAnimationFrame voor vloeiender loop
}

function handleItemCatch(item) {
    let feedbackText = '';
    let feedbackColor = '';

    if (item.type === 'friend') {
        score += 10;
        feedbackText = '+10';
        feedbackColor = 'lime';
        updateLevel(); // Controleer op level-up na score verhoging
    } else if (item.type === 'bomb') {
        lives -= 3; // Bom kost meer levens
        feedbackText = '-3 LEVENS';
        feedbackColor = 'red';
    } else if (item.type === 'powerup') {
        // 50/50 kans op Slow Time of een Bonus Leven
        if (Math.random() < 0.5) {
            activateSlowTime();
            feedbackText = 'SLOW TIME!';
            feedbackColor = 'cyan';
        } else {
            lives += 1;
            feedbackText = '+1 LEVEN';
            feedbackColor = 'yellow';
        }
    }

    // Voeg visuele feedback toe
    clickFeedbacks.push(new ClickFeedback(item.x, item.y, feedbackText, feedbackColor));

    // Verwijder het gevangen item
    gameItems.splice(gameItems.indexOf(item), 1);
    updateScoreboard();

    if (lives <= 0) {
        endGame();
    }
}


function handleCanvasClick(event) {
    if (!isPlaying) return;

    const rect = canvas.getBoundingClientRect();
    // Correcte schaalberekening is cruciaal voor synchroniciteit
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Zoek naar het item dat is geklikt
    for (let i = gameItems.length - 1; i >= 0; i--) {
        const item = gameItems[i];

        if (clickX >= item.x && clickX <= item.x + item.width &&
            clickY >= item.y && clickY <= item.y + item.height) {

            handleItemCatch(item);
            return; // Slechts één item per klik verwerken
        }
    }
}

function startGame() {
    if (!assetsLoaded) {
        alert("Wacht tot de spelonderdelen (afbeeldingen) geladen zijn.");
        return;
    }

    // Reset Game State
    score = 0;
    lives = 30;
    currentLevel = 1;
    gameItems = [];
    clickFeedbacks = [];
    isSlowTimeActive = false;
    slowTimeRemaining = 0;
    isPlaying = true;
    lastTime = 0; // Reset voor requestAnimationFrame

    updateScoreboard();
    // Verberg de overlays
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    // Zorg ervoor dat de canvas en het scoreboard zichtbaar zijn
    document.getElementById('game-container').classList.remove('start-hidden');

    // Reset en start intervallen (spawn-interval wordt gezet door applyLevelDifficulty)
    clearInterval(itemSpawnInterval);
    applyLevelDifficulty(); // Start met level 1 instellingen

    // Start de animatieloop
    requestAnimationFrame(gameLoop); // Gebruik requestAnimationFrame
}

function endGame() {
    isPlaying = false;
    clearInterval(itemSpawnInterval); // Stop het spawnen van items

    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Initialisatie
startButton.textContent = 'Laden...';
startButton.disabled = true;

// --- Event Listeners ---
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
canvas.addEventListener('click', handleCanvasClick);
