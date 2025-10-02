const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalScoreDisplay = document.getElementById('final-score');
// === SPEL VARIABELEN ===
let gameLoopId;
let score = 0;
let lives = 3;
let entities = []; // Array voor vliegende vriendjes en bommen
let gameRunning = false;
let spawnInterval = 1000; // Eerste interval
// === AFBEELDINGEN (PNG) ===
// Je hoeft hier alleen de namen van je PNG-bestanden te veranderen!
const friendImage = new Image();
friendImage.src = 'friend.png'; // VERVANG door je vriendje PNG
const bombImage = new Image();
bombImage.src = 'bomb.png';   // VERVANG door je bom PNG
const ENTITY_SIZE = 80;
const ENTITY_SPEED = 2; // Basissnelheid
// Wacht tot de canvas de juiste grootte heeft
window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
    // Maakt de canvas 100% van zijn container
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
resizeCanvas(); // Stel de grootte in bij het opstarten
// === KLASSE voor Vliegende Objecten ===
class Entity {
    constructor(type) {
        this.type = type; // 'friend' of 'bomb'
        this.size = ENTITY_SIZE;
        this.image = (type === 'friend') ? friendImage : bombImage;
        
        // Startpositie willekeurig boven het scherm
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        
        // Willekeurige horizontale beweging
        this.vx = (Math.random() - 0.5) * 1; // Kleine willekeurige zijwaartse beweging
        this.vy = ENTITY_SPEED + Math.random() * 1; // Basissnelheid + willekeurig
        
        // Markeren of het al is aangetikt
        this.tapped = false;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Stuiteren van de zijkanten
        if (this.x < 0 || this.x + this.size > canvas.width) {
            this.vx *= -1;
        }
    }
    draw() {
        // Teken de PNG-afbeelding
        ctx.drawImage(this.image, this.x, this.y, this.size, this.size);
    }
}
// === SPEL FUNCTIES ===
function spawnEntity() {
    if (!gameRunning) return;
    // 70% kans op een vriendje, 30% kans op een bom
    const type = (Math.random() < 0.7) ? 'friend' : 'bomb';
    entities.push(new Entity(type));
    // Maak het spel geleidelijk sneller door het spawnInterval te verlagen
    if (spawnInterval > 300) {
        spawnInterval -= 10;
    }
    
    // Plan de volgende spawn
    setTimeout(spawnEntity, spawnInterval);
}
function updateGame() {
    if (!gameRunning) return;
    // Wis het canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Update en teken alle entiteiten
    for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];
        entity.update();
        entity.draw();
        // Controleer of de entiteit de onderkant heeft bereikt
        if (entity.y > canvas.height) {
            if (entity.type === 'friend' && !entity.tapped) {
                // Vriendje gemist! Verlies een leven.
                lives--;
                updateScoreBoard();
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            // Verwijder de entiteit
            entities.splice(i, 1);
        }
    }
    // Vraag om de volgende frame
    gameLoopId = requestAnimationFrame(updateGame);
}
function updateScoreBoard() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
}
function tapHandler(event) {
    if (!gameRunning) return;
    // Haal de aanraakcoördinaten op, rekening houdend met de positie van de canvas
    const rect = canvas.getBoundingClientRect();
    
    // Gebruik de eerste aanraking (event.touches) of de muispositie (event)
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const tapX = clientX - rect.left;
    const tapY = clientY - rect.top;
    for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];
        
        // Eenvoudige botsingsdetectie: controleer of de aanraking binnen de grenzen van de entiteit valt
        if (tapX > entity.x && tapX < entity.x + entity.size && 
            tapY > entity.y && tapY < entity.y + entity.size && !entity.tapped) {
            
            entity.tapped = true; // Markeer als aangetikt
            if (entity.type === 'friend') {
                score += 10;
                // Verwijder het vriendje onmiddellijk
                entities.splice(i, 1);
            } else if (entity.type === 'bomb') {
                // Bom aangetikt! Verlies een leven en punten.
                lives--;
                score = Math.max(0, score - 5); // Zorg ervoor dat de score niet negatief wordt
                // Verwijder de bom onmiddellijk
                entities.splice(i, 1);
                
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            
            updateScoreBoard();
            break; // Behandel slechts één aanraking per event
        }
    }
}
// Luister naar touch-events voor mobiele apparaten
canvas.addEventListener('touchstart', tapHandler, false); 
// Voeg ook muisklik-events toe voor testen op de desktop
canvas.addEventListener('mousedown', tapHandler, false);
function startGame() {
    // Reset variabelen
    score = 0;
    lives = 3;
    entities = [];
    spawnInterval = 1000;
    gameRunning = true;
    
    // Verberg/toon schermen
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    updateScoreBoard();
    
    // Start de gameloop en de spawn-cyclus
    gameLoopId = requestAnimationFrame(updateGame);
    spawnEntity();
}
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    
    // Toon het Game Over scherm
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
}
// === EVENT LISTENERS VOOR KNOPPEN ===
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
// Zorg ervoor dat het spel begint met het startscherm verborgen (als de afbeeldingen geladen zijn)
friendImage.onload = () => {
    bombImage.onload = () => {
        // Initieel de canvas tekenen
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // toon startscherm
        startScreen.classList.remove('hidden');
    };
};
