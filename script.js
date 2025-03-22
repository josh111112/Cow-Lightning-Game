class Vector {
    constructor(x, y, x1, y1) {
        this.X = x;
        this.Y = y;
        this.X1 = x1;
        this.Y1 = y1;
    }

    Length() {
        return Math.sqrt(Math.pow(this.X1 - this.X, 2) + Math.pow(this.Y1 - this.Y, 2));
    }

    Multiply(factor) {
        return new Vector(
            this.X,
            this.Y,
            this.X + (this.X1 - this.X) * factor,
            this.Y + (this.Y1 - this.Y) * factor
        );
    }
}

class Lightning {

    constructor(c) {
        this.config = c;
    }

    Cast(context, from, to) {
        context.save();

        if (!from || !to) {
            return;
        }
        //Main vector
        var v = new Vector(from.x, from.y, to.x, to.y);
        //skip cas if not close enough
        if (this.config.Threshold && v.Length() > context.canvas.width * this.config.Threshold) {
            return;
        }
        var vLen = v.Length();
        var refv = { x: from.x, y: from.y };
        var lR = (vLen / context.canvas.width)
        //count of segemnets
        var segments = Math.floor(this.config.Segments * lR);
        //lenth of each
        var l = vLen / segments;

        for (let i = 1; i <= segments; i++) {
            //position in the main vector
            var dv = v.Multiply((1 / segments) * i);

            //add position noise
            if (i != segments) {
                dv.Y1 += l * Math.random();
                dv.X1 += l * Math.random();
            }
            
            //new vector for segment
            var r = new Vector(refv.x, refv.y, dv.X1, dv.Y1);
            
            //background blur
            this.Line(context, r, {
                Color: this.config.GlowColor,
                With: this.config.GlowWidth * lR,
                Blur: this.config.GlowBlur * lR,
                BlurColor: this.config.GlowColor,
                Alpha: this.Random(this.config.GlowAlpha, this.config.GlowAlpha * 2) / 100
            });

            //main line
            this.Line(context, r, {
                Color: this.config.Color,
                With: this.config.Width,
                Blur: this.config.Blur,
                BlurColor: this.config.BlurColor,
                Alpha: this.config.Alpha
            });
            refv = { x: dv.X1, y: dv.Y1 };
        }

        this.Circle(context, to, lR);
        this.Circle(context, from, lR);

        context.restore();
    }

    Circle(context, p, lR) {
        context.beginPath();
        context.arc(p.x + Math.random() * 10 * lR, p.y + Math.random() * 10 * lR, 5, 0, 2 * Math.PI, false);
        context.fillStyle = 'white';
        context.shadowBlur = 100;
        context.shadowColor = "#2319FF";
        context.fill();
    }

    Line(context, v, c) {
        context.beginPath();
        context.strokeStyle = c.Color;
        context.lineWidth = c.With;
        context.moveTo(v.X, v.Y);
        context.lineTo(v.X1, v.Y1);
        context.globalAlpha = c.Alpha;
        context.shadowBlur = c.Blur;
        context.shadowColor = c.BlurColor;
        context.stroke();
    }

    Random(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

}

let userCow = null;
let canvas, ctx;
let lightning;
let lightningPoints = [];
let lastLightningTime = 0;
let activeLightning = null;
let lightningFadeOut = 0;
let gameActive = true;
let animationFrameId = null;

// Show modal on page load
window.addEventListener('load', () => {
    document.getElementById('designModal').style.display = 'flex';
    updatePreview();
    setupLightning();
});

// Update preview when inputs change
document.getElementById('cowColor').addEventListener('input', updatePreview);
document.getElementById('cowSize').addEventListener('input', updatePreview);

function updatePreview() {
    const preview = document.getElementById('previewCow');
    const color = document.getElementById('cowColor').value;
    const size = document.getElementById('cowSize').value;
    
    preview.style.width = `${size}px`;
    preview.style.height = `${size * 0.6}px`;
    preview.style.background = color;
}

function startScene() {
    const name = document.getElementById('cowName').value || 'My Cow';
    const color = document.getElementById('cowColor').value;
    const size = document.getElementById('cowSize').value;
    
    userCow = { name, color, size };
    document.getElementById('designModal').style.display = 'none';
    createClouds();
    createCows();
}

// Create clouds
function createClouds() {
    const cloudCount = 5;
    for (let i = 0; i < cloudCount; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        
        const size = Math.random() * 100 + 100;
        cloud.style.width = `${size}px`;
        cloud.style.height = `${size * 0.6}px`;
        cloud.style.top = `${Math.random() * 150 + 50}px`;
        cloud.style.animationDuration = `${Math.random() * 10 + 15}s`;
        cloud.style.animationDelay = `${Math.random() * 5}s`;
        
        document.body.appendChild(cloud);
    }
}

// Create cows
function createCows() {
    const cowCount = 3;
    const minDistance = 100;
    const cows = [];
    
    // Create user's custom cow first
    if (userCow) {
        const customCow = document.createElement('div');
        customCow.className = 'cow';
        customCow.style.width = `${userCow.size}px`;
        customCow.style.height = `${userCow.size * 0.6}px`;
        customCow.style.background = userCow.color;
        customCow.title = userCow.name;
        
        let position;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            position = Math.random() * 60 + 20;
            attempts++;
        } while (attempts < maxAttempts && 
            cows.some(existingCow => 
                Math.abs(existingCow - position) < (minDistance / window.innerWidth * 100)
            )
        );
        
        customCow.style.left = `${position}%`;
        customCow.style.animationDelay = `${Math.random() * 2}s`;
        
        document.body.appendChild(customCow);
        cows.push(position);
    }
    
    // Create regular cows
    for (let i = 0; i < cowCount; i++) {
        const cow = document.createElement('div');
        cow.className = 'cow';
        
        let position;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            position = Math.random() * 60 + 20;
            attempts++;
        } while (attempts < maxAttempts && 
            cows.some(existingCow => 
                Math.abs(existingCow - position) < (minDistance / window.innerWidth * 100)
            )
        );
        
        cow.style.left = `${position}%`;
        cow.style.animationDelay = `${Math.random() * 2}s`;
        
        document.body.appendChild(cow);
        cows.push(position);
    }
}

function setupLightning() {
    canvas = document.getElementById('lightningCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize lightning with configuration
    lightning = new Lightning({
        Color: '#ffffff',
        Width: 8,
        Blur: 15,
        BlurColor: '#ffffff',
        Alpha: 0.9,
        GlowColor: '#4a90e2',
        GlowWidth: 8,
        GlowBlur: 30,
        GlowAlpha: 70,
        Segments: 20,
        Threshold: 0.8
    });

    // Start animation loop
    animate();
}

function getCloudPosition() {
    const clouds = document.getElementsByClassName('cloud');
    if (clouds.length === 0) {
        // If no clouds, create a random position in the upper portion of the screen
        return {
            x: Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1),
            y: Math.random() * (window.innerHeight * 0.3) + 50
        };
    }
    
    const randomCloud = clouds[Math.floor(Math.random() * clouds.length)];
    const rect = randomCloud.getBoundingClientRect();
    
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function checkLightningHit(lightning) {
    const cows = document.getElementsByClassName('cow');
    for (let cow of cows) {
        const rect = cow.getBoundingClientRect();
        const cowCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };

        // Calculate distance from lightning to cow center
        const dx = lightning.to.x - cowCenter.x;
        const dy = lightning.to.y - cowCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If lightning is close enough to the cow (within 100 pixels)
        if (distance < 100) {
            transformCowToSteak(cow);
            
            // Check if this was the user's cow
            if (cow.title === userCow.name) {
                gameOver();
                return true;
            }
            
            // Check if this was the last regular cow
            const remainingCows = document.getElementsByClassName('cow');
            if (remainingCows.length === 1 && remainingCows[0].title === userCow.name) {
                victory();
            }
            
            return true;
        }
    }
    return false;
}

function transformCowToSteak(cow) {
    const rect = cow.getBoundingClientRect();
    const steak = document.createElement('div');
    steak.className = 'steak';
    steak.style.left = `${(rect.left / window.innerWidth) * 100}%`;
    steak.style.animationDelay = `${Math.random() * 2}s`;
    
    // Copy the cow's position and size
    steak.style.width = `${rect.width}px`;
    steak.style.height = `${rect.height}px`;
    
    // Add the bone
    const bone = document.createElement('div');
    bone.className = 'bone';
    steak.appendChild(bone);
    
    // Add marbling
    const marbling = document.createElement('div');
    marbling.className = 'marbling';
    steak.appendChild(marbling);
    
    // Remove the cow and add the steak
    cow.remove();
    document.body.appendChild(steak);
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(animationFrameId);
    document.getElementById('gameOverScreen').style.display = 'flex';
}

function victory() {
    gameActive = false;
    cancelAnimationFrame(animationFrameId);
    document.getElementById('victoryScreen').style.display = 'flex';
}

function restartGame() {
    // Hide all screens
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('victoryScreen').style.display = 'none';
    document.getElementById('designModal').style.display = 'flex';
    
    // Clear all existing elements
    const existingElements = document.querySelectorAll('.cloud, .cow, .steak');
    existingElements.forEach(el => el.remove());
    
    // Reset game state
    gameActive = true;
    userCow = null;
    lastLightningTime = 0;
    activeLightning = null;
    lightningFadeOut = 0;
    
    // Reset preview
    updatePreview();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function animate() {
    if (!gameActive) return;
    
    // Only clear the canvas when starting a new lightning
    if (!activeLightning) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    const currentTime = Date.now();
    
    // Create new lightning every 2-5 seconds
    if (currentTime - lastLightningTime > Math.random() * 3000 + 2000) {
        // Always get a position, even if no clouds
        const cloudPos = getCloudPosition();
        
        // Clear canvas for new lightning
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        activeLightning = {
            from: cloudPos,
            to: {
                x: cloudPos.x + (Math.random() - 0.5) * 200,
                y: canvas.height * 0.95
            }
        };
        lightningFadeOut = 1;
        lastLightningTime = currentTime;
        
        // Check for lightning hits
        checkLightningHit(activeLightning);
    }
    
    // Draw active lightning with fade out
    if (activeLightning) {
        ctx.globalAlpha = lightningFadeOut;
        lightning.Cast(ctx, activeLightning.from, activeLightning.to);
        ctx.globalAlpha = 1;
        
        // Fade out over 4500ms
        lightningFadeOut = Math.max(0, lightningFadeOut - (1000/4500) * (1000/60));
        
        if (lightningFadeOut === 0) {
            activeLightning = null;
        }
    }
    
    animationFrameId = requestAnimationFrame(animate);
}
