import { NeuralNetwork } from './logic/neuralNet.js';

class Particle {
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.015;
        
        if (type === 'blood') {
            this.speedY = Math.random() * 3 + 1;
            this.size = Math.random() * 6 + 3;
        } else if (type === 'spark') {
            this.size = Math.random() * 3 + 1;
            this.decay = 0.08;
        } else if (type === 'impact') {
            this.speedX = (Math.random() - 0.5) * 15;
            this.speedY = (Math.random() - 0.5) * 15;
            this.size = Math.random() * 5 + 3;
            this.decay = 0.06;
        } else if (type === 'muzzle') {
            this.speedX = Math.random() * 10 + 5;
            this.speedY = (Math.random() - 0.5) * 4;
            this.size = Math.random() * 4 + 2;
            this.decay = 0.1;
        } else if (type === 'dust') {
            this.speedX = (Math.random() - 0.5) * 2 - 2; // Drift left mainly
            this.speedY = -Math.random() * 2;
            this.size = Math.random() * 10 + 5;
            this.decay = 0.015;
            this.color = `rgba(200, 180, 150, ${0.4 + Math.random() * 0.3})`;
        }
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.type === 'blood') this.speedY += 0.2;
        if (this.type === 'impact') {
            this.speedX *= 0.95;
            this.speedY *= 0.95;
        }
        if (this.type === 'dust') {
            this.x += Math.sin(this.life * 10) * 0.5; // lazy drift
            this.size *= 1.01; // expand
        }
        this.life -= this.decay;
        this.size *= 0.97;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect for muzzle and spark
        if (this.type === 'muzzle' || this.type === 'spark') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (this.type === 'slash') {
            // Draw a sharp line for slash
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.speedX * 3, this.y + this.speedY * 3);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
    }
}

class Bullet {
    constructor(startX, startY, targetX, targetY, image) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.image = image;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.speed = 25;
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        
        // Calculate rotation angle from velocity
        this.angle = Math.atan2(this.vy, this.vx);
        
        this.alive = true;
        this.trail = [];
        this.maxTrailLength = 8;
    }

    update() {
        // Save trail position
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        // Check if reached target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 20) {
            this.alive = false;
        }
    }

    draw(ctx) {
        // Draw tracer trail
        const color = this.isEnemy ? '#f43f5e' : '#fbbf24';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        
        // Draw bullet sprite rotated to match flight direction
        if (this.image && this.image.complete && this.image.naturalWidth > 0) {
            const spriteW = 32;
            const spriteH = 16;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.drawImage(this.image, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
            ctx.restore();
        } else {
            // Fallback: draw circle if image not loaded
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Enemy {
    constructor(x, y, id) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.baseY = y;
        this.health = 100;
        this.alive = true;
        this.dying = false;
        this.deathTimer = 0;
        this.phase = Math.random() * Math.PI * 2;
        this.hitTimer = 0;      // flash/flinch on hit
        this.hitFromX = 0;      // direction of incoming hit
        this.shootTimer = 0;    // duration of shooting animation
        this.isShooting = false;
    }

    update(phase) {
        if (this.dying) {
            this.deathTimer++;
            if (this.deathTimer > 30) {
                this.alive = false;
            }
        } else {
            this.y = this.baseY + Math.sin(phase + this.phase) * 20;
        }
        // Decay hit reaction
        if (this.hitTimer > 0) {
            this.hitTimer--;
        }
        
        // Update shooting animation
        if (this.isShooting) {
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                this.isShooting = false;
            }
        }
    }

    takeDamage(amount, fromX = 0) {
        this.health -= amount;
        this.hitTimer = 12;  // flash for 12 frames
        this.hitFromX = fromX;
        if (this.health <= 0 && !this.dying) {
            this.dying = true;
            return true; // enemy killed
        }
        return false;
    }
}

class AppController {
    constructor() {
        this.ai = new NeuralNetwork(8, 8, 4);
        this.strings = ["Attack", "Retreat", "Evade", "Hide"];
        this.lang = 'en';
        
        this.translations = {
            en: {
                title: "AI Tactical Agent",
                subtitle: "Real-time Neural Decision System",
                inputParams: "Input Parameters",
                inputs: ["Health Level", "Knife Level", "Gun Level", "Enemies"],
                processBtn: "Process Decision",
                neuralOutput: "Neural Output",
                ready: "Ready",
                startBattle: "⚔️ Start Battle",
                stopBattle: "⏹️ Stop",
                restart: "Restart",
                victory: "VICTORY!",
                gameOver: "GAME OVER",
                retreated: "Hero Retreated!",
                footer: "© 2026 AI Tactical Research Project",
                actions: ["Attack", "Retreat", "Evade", "Hide", "Standby"]
            },
            hy: {
                title: "AI Տակտիկական Գործակալ",
                subtitle: "Իրական Ժամանակում Նեյրոնային Որոշման Համակարգ",
                inputParams: "Մուտքային Պարամետրեր",
                inputs: ["Առողջություն", "Դանակի Մակարդակ", "Հրազենի Մակարդակ", "Թշնամիներ"],
                processBtn: "Մշակել Որոշումը",
                neuralOutput: "Նեյրոնային Ելք",
                ready: "Պատրաստ է",
                startBattle: "⚔️ Սկսել Մարտը",
                stopBattle: "⏹️ Կանգնել",
                restart: "Վերախաղալ",
                victory: "ՀԱՂԹԱՆԱԿ!",
                gameOver: "ԽԱՂԻ ԱՎԱՐՏ",
                retreated: "Հերոսը Նահանջեց!",
                footer: "© 2026 Տակտիկական Հետազոտական Ծրագիր",
                actions: ["Հարձակում", "Նահանջ", "Խուսափում", "Թաքնվել", "Սպասման ռեժիմ"]
            }
        };
        
        // Game State
        this.battleActive = false;
        this.gameOver = false;
        this.kills = 0;
        this.enemies = [];
        this.totalEnemies = 0;
        this.playerDead = false;
        
        // Combat stats (live values during battle)
        this.liveHealth = 100;
        
        // Particles & Bullets
        this.particles = [];
        this.bullets = [];
        
        // Animation state
        this.actionPhase = 0;
        this.isFiring = false;
        this.fireTimer = 0;
        this.enemyFireTimer = 0;
        this.evadeRollPhase = 0;
        this.currentAction = "Standby";
        
        // Screen shake
        this.screenShake = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        
        // Melee swing animation
        this.meleeSwingProgress = 0; // 0 = not swinging, 0->1 = swing animation
        this.meleeSwingActive = false;
        
        // Player position
        this.playerX = 180;
        this.playerY = 0;
        this.playerBaseY = 0;
        
        // Assets
        this.assets = {
            tacticalEnemy: new Image(),
            tacticalPlayer: new Image(),
            bullet: new Image(),
            muzzleFlash: new Image(),
            knife: new Image()
        };
        this.assetsLoaded = 0;

        // UI Elements
        this.inputs = {
            health: document.getElementById('health'),
            melee: document.getElementById('melee'),
            firearms: document.getElementById('firearms'),
            enemies: document.getElementById('enemies')
        };
        
        this.displays = {
            decision: document.getElementById('decision-text'),
            status: id => document.getElementById(`${id}-val`)
        };

        // HUD Elements
        this.hud = {
            health: document.getElementById('hud-health'),
            healthBar: document.getElementById('hud-health-bar'),
            kills: document.getElementById('hud-kills'),
            enemies: document.getElementById('hud-enemies')
        };

        // Battle Controls
        this.battleControlsEl = document.querySelector('.battle-controls');
        this.startBtn = document.getElementById('start-battle');
        this.stopBtn = document.getElementById('stop-battle');
        this.restartBtn = document.getElementById('restart-btn');
        this.gameOverEl = document.getElementById('game-over');
        this.gameOverText = document.getElementById('game-over-text');
        
        this.updateBtn = document.getElementById('update-ai');
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.init();
        this.animate();
    }

    init() {
        // Load Sprites
        const onLoad = () => this.assetsLoaded++;
        this.assets.tacticalEnemy.src = './src/assets/tactical_enemy.png';
        this.assets.tacticalPlayer.src = './src/assets/tactical_player.png';
        this.assets.bullet.src = './src/assets/bullet.png';
        this.assets.muzzleFlash.src = './src/assets/muzzle_flash.png';
        this.assets.knife.src = './src/assets/knife.png';
        this.assets.wall = new Image();
        this.assets.wall.src = './src/assets/wall.png';
        
        Object.values(this.assets).forEach(img => {
            img.onload = onLoad;
            img.onerror = () => console.warn(`Failed to load: ${img.src}`);
        });

        // Update values on range change
        Object.entries(this.inputs).forEach(([key, el]) => {
            el.addEventListener('input', () => {
                this.displays.status(key).textContent = el.value;
                if (!this.battleActive) {
                    this.processDecision();
                }
            });
        });

        // Battle controls
        this.startBtn.addEventListener('click', () => this.startBattle());
        this.stopBtn.addEventListener('click', () => this.stopBattle());
        this.restartBtn.addEventListener('click', () => this.restartBattle());
        
        document.getElementById('lang-switch').addEventListener('click', () => this.toggleLanguage());
        
        // Fullscreen toggle
        const fsBtn = document.getElementById('fullscreen-btn');
        const vizContainer = document.querySelector('.visualization-container');
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                vizContainer.requestFullscreen().catch(err => {
                    console.warn('Fullscreen failed:', err);
                });
            } else {
                document.exitFullscreen();
            }
        });
        
        document.addEventListener('fullscreenchange', () => {
            const isFs = !!document.fullscreenElement;
            fsBtn.textContent = isFs ? '✕' : '⛶';
            fsBtn.title = isFs ? 'Exit Fullscreen' : 'Toggle Fullscreen';
            setTimeout(() => {
                const rect = this.canvas.parentElement.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                // Use reference height for playerBaseY so it stays in the scaled coordinate space
                this.playerBaseY = this.refHeight / 2;
                this.playerY = this.playerBaseY;
            }, 100);
        });

        // Initial language setup
        this.updateInterface();
        this.updateBtn.addEventListener('click', () => this.processDecision());
        
        this.setupCanvas();
        this.processDecision();
        
        // Initialize the Neural Network (8 Inputs, 8 Hidden, 4 Outputs)
        this.nn = new NeuralNetwork(8, 8, 4);
    }

    startBattle() {
        this.battleActive = true;
        this.gameOver = false;
        this.playerDead = false;
        this.kills = 0;
        this.bullets = [];
        this.particles = [];
        
        // Initialize from slider values
        this.liveHealth = parseFloat(this.inputs.health.value);
        
        // Spawn enemies
        this.spawnEnemies();
        this.totalEnemies = this.enemies.length;
        
        // Update UI
        this.battleControlsEl.classList.remove('hidden');
        this.startBtn.classList.add('hidden');
        this.stopBtn.classList.remove('hidden');
        this.gameOverEl.classList.add('hidden');
        
        this.playerX = 300; // Start in the open
        this.updateHUD();
    }

    stopBattle() {
        this.battleActive = false;
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        
        // Clear entities
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.kills = 0;
        
        this.playerX = 300;
        this.playerY = this.playerBaseY;
        this.shakeX = 0;
        this.shakeY = 0;
        this.isFiring = false;
        this.fireTimer = 0;
        this.enemyFireTimer = 0;
        this.evadeRollPhase = 0;
        this.attackType = null;
        
        // Reset player stats checks
        this.liveHealth = parseFloat(this.inputs.health.value);
        this.liveAmmo = parseFloat(this.inputs.ammo.value);
        this.liveStamina = parseFloat(this.inputs.stamina.value);
        
        // Reset HUD
        this.updateHUD();
        this.gameOverEl.classList.add('hidden');
    }

    restartBattle() {
        this.gameOverEl.classList.add('hidden');
        this.startBattle();
    }

    spawnEnemies() {
        this.enemies = [];
        const count = parseInt(this.inputs.enemies.value);
        // Use reference dimensions so positions work with the fullscreen scale transform
        const w = this.refWidth || this.canvas.width;
        const h = this.refHeight || this.canvas.height;
        
        // Enemies spawn in the right 60% of the canvas
        const spawnAreaStart = w * 0.35;
        const spawnAreaEnd = w - 40; // Leave margin
        const spawnAreaWidth = spawnAreaEnd - spawnAreaStart;
        
        for (let i = 0; i < count; i++) {
            // Distribute enemies evenly across the spawn area
            const spacing = Math.min(60, spawnAreaWidth / (count + 1));
            const x = Math.min(spawnAreaEnd, spawnAreaStart + spacing * (i + 1));
            
            // Stagger vertically in rows if there are many enemies
            const row = Math.floor(i / 4);
            const rowOffset = (i % 2 === 0 ? -35 : 35) + (row * 25);
            const y = Math.max(50, Math.min(h - 50, h / 2 + rowOffset));
            
            this.enemies.push(new Enemy(x, y, i));
        }
    }

    updateHUD() {
        this.hud.health.textContent = Math.max(0, Math.floor(this.liveHealth));
        this.hud.healthBar.style.width = `${Math.max(0, this.liveHealth)}%`;
        this.hud.kills.textContent = this.kills;
        this.hud.enemies.textContent = this.totalEnemies;
    }

    animate() {
        // Update action phase slowly for smooth animations
        this.actionPhase += 0.03;
        
        // Battle logic
        if (this.battleActive && !this.gameOver) {
            this.battleTick();
        }
        
        // Update screen shake
        if (this.screenShake > 0) {
            this.shakeX = (Math.random() - 0.5) * this.screenShake;
            this.shakeY = (Math.random() - 0.5) * this.screenShake;
            this.screenShake *= 0.9;
            if (this.screenShake < 0.5) this.screenShake = 0;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
        
        // Update melee swing animation
        if (this.meleeSwingActive) {
            this.meleeSwingProgress += 0.018;
            if (this.meleeSwingProgress >= 1.0) {
                this.meleeSwingProgress = 0;
                this.meleeSwingActive = false;
            }
        }
        
        // Update particles
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => p.update());
        
        // Update bullets
        this.bullets = this.bullets.filter(b => b.alive);
        this.bullets.forEach(b => b.update());
        
        // Update enemies
        this.enemies.forEach(e => e.update(this.actionPhase));
        
        // Draw
        this.drawScene(this.currentAction);
        
        requestAnimationFrame(() => this.animate());
    }

    battleTick() {
        // Execute locked-in action effects (decision is made before battle starts)
        this.executeAction();
        
        // Enemy attacks (deterministic)
        const aliveEnemies = this.enemies.filter(e => e.alive && !e.dying);
        if (aliveEnemies.length > 0) {
            this.enemyFireTimer++;
            if (this.enemyFireTimer >= 30) { // Fires strictly every 30 frames (was 20)
                this.enemyFireTimer = 0;
                
                // Pick a random enemy to perform the shooting animation
                const attacker = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            attacker.isShooting = true;
            attacker.shootTimer = 25; // Slower shooting animation (lasts ~400ms)
            
            // Spawn an enemy bullet targeting the player
            // Originating slightly from the enemy's left side (gun position)
            const startX = attacker.x - 20;
            const startY = attacker.y + 10;
            
            // Slight inaccuracy for enemy bullets
            const targetX = this.playerX + (Math.random() - 0.5) * 40;
            const targetY = this.playerBaseY + (Math.random() - 0.5) * 40 + 20;
            
            const enemyBullet = new Bullet(startX, startY, targetX, targetY, this.assets.bullet);
            enemyBullet.speed = 15; // Enemy bullets fly slightly slower
            // Give enemy bullets red tracers instead of yellow
            enemyBullet.isEnemy = true;
            this.bullets.push(enemyBullet);
            
            // Add flash particles at enemy gun
            for (let i = 0; i < 6; i++) {
                const p = new Particle(startX, startY, '#f43f5e', 'muzzle');
                p.speedX = -Math.random() * 5;
                this.particles.push(p);
            }
            
            // Damage the player when bullet lands (~250ms later based on distance and speed 15)
            setTimeout(() => {
                // TACTICAL BUFFS:
                
                // 1. HIDE - 90% Miss chance
                if (this.currentAction === "Hide" && Math.random() < 0.9) {
                    // Missed! Spawn "MISS" text or just return
                    return; 
                }
                
                // 2. EVADE - 75% Dodge chance (already existed, but let's confirm/buff)
                if (this.currentAction === "Evade" && Math.random() < 0.75) {
                    return; 
                }
                
                // 3. RETREAT - Invulnerability behind wall (Reverted size)
                let damage = 8;
                if (this.playerX < 145) {
                    damage = 0; // Completely safe behind wall
                } else if (this.currentAction === "Retreat") {
                    damage = 2; 
                }
                
                
                this.liveHealth -= damage;
                this.screenShake = 6;
                
                // Blood particles on player
                for (let i = 0; i < 5; i++) {
                    this.particles.push(new Particle(this.playerX, this.playerBaseY, '#f43f5e', 'blood'));
                }
            }, 250);
            } // Close the enemyFireTimer if-statement
        }
        

        
        // Escape Logic (Past the wall to the far left)
        if (this.playerX < 50) {
            this.endGame(true, this.translations[this.lang].retreated);
            return;
        }

        // Check game over conditions
        if (this.liveHealth <= 0) {
            this.endGame(false);
        } else {
            // Victory when all enemies are dead or dying
            const activeEnemies = this.enemies.filter(e => e.alive && !e.dying);
            if (activeEnemies.length === 0 && this.enemies.length > 0) {
                if (this.playerX < 145) {
                    this.endGame(true, "Tactical Victory: Hero Hidden!");
                } else {
                    this.endGame(true);
                }
            }
        }
        
        this.updateHUD();
    }

    processBattleDecision() {
        // Force-refresh Neural Network logic each call. Prevents Vite HMR caching from masking weight upgrades.
        this.nn = new NeuralNetwork(4, 3, 4);

        // When previewing before a battle, use the slider values. During battle, use the live simulated states.
        const health = this.battleActive ? this.liveHealth : parseFloat(this.inputs.health.value);
        const enemies = this.battleActive ? this.enemies.filter(e => e.alive).length : parseInt(this.inputs.enemies.value);
        
        const firearms = parseFloat(this.inputs.firearms.value); // 0-5
        const melee = parseFloat(this.inputs.melee.value); // 0-5

        // Auto-win condition
        if (enemies <= 0) {
            this.currentAction = "Attack";
            return;
        }

        // --- NORMALIZE INPUTS BETWEEN 0.0 AND 1.0 FOR NEURAL NETWORK ---
        // 0: Health (0-1), 1: Melee (0-1), 2: Firearms (0-1), 3: Enemies (0-1)
        
        const normHealth = health / 100.0;
        const normMelee = melee / 5.0;
        const normFirearms = firearms / 5.0;
        const normEnemies = Math.min(enemies / 10.0, 1.0); // Assume 10 enemies is max threat

        // Feed forward through Neural Network
        const inputs = [
            normHealth, normMelee, normFirearms, normEnemies
        ];
        
        const outputs = this.nn.feedForward(inputs);

        // Find highest output activation
        let bestScore = -1;
        let bestIndex = 0;
        let sumVotes = 0;
        
        for (let i = 0; i < outputs.length; i++) {
            sumVotes += outputs[i];
            if (outputs[i] > bestScore) {
                bestScore = outputs[i];
                bestIndex = i;
            }
        }

        // Output index mapping based on neuralNet.js
        // 0=Attack, 1=Retreat, 2=Evade, 3=Hide
        const actions = ["Attack", "Retreat", "Evade", "Hide"];
        let bestAction = actions[bestIndex];


        // --- DETERMINISTIC PREDICTION OVERRIDE ---
        // If the AI thinks it should attack, first simulate the mathematical outcome.
        if (bestAction === "Attack") {
            const willWin = this.predictCombatOutcome(health, melee, firearms, enemies);
            if (!willWin) {
                // If we know we'd lose the fight, fallback to best evasive action
                bestAction = "Retreat";
            }
        }

        this.currentAction = bestAction;
        
        // Update bestIndex to match any overrides that occurred
        bestIndex = actions.indexOf(bestAction);
        
        const total = sumVotes;
        this.updateDecisionUI(bestIndex, total > 0 ? (bestScore / total) : 0.25);
    }
    
    predictCombatOutcome(health, meleeLvl, firearmLvl, numEnemies) {
        // Simulates the exact deterministic combat taking place in battleTick
        let simHealth = health;
        let simEnemies = numEnemies;
        let enemyHealths = Array(numEnemies).fill(100);
        
        let frames = 0;
        let pFireTimer = 0;
        let eFireTimer = 0;
        
        // Failsafe: if combat takes > 3000 frames (~50 seconds), player probably loses
        while (simHealth > 0 && simEnemies > 0 && frames < 3000) {
            frames++;
            
            // --- Player Attack Logic ---
            if (firearmLvl >= 1) {
                pFireTimer++;
                if (pFireTimer >= 12) {
                    pFireTimer = 0;
                    // Bullet damage takes 250ms (15 frames) to land, but mathematically it's applied
                    enemyHealths[0] -= 30; // 30 deterministic player damage (was 25)
                    if (enemyHealths[0] <= 0) {
                        enemyHealths.shift(); // Remove dead enemy
                        simEnemies--;
                    }
                }
            } else if (meleeLvl >= 1) {
                pFireTimer++;
                if (pFireTimer >= 30) {
                    pFireTimer = 0;
                    const dmg = 5 + (meleeLvl * 6) + 2; 
                    enemyHealths[0] -= dmg;
                    if (enemyHealths[0] <= 0) {
                        enemyHealths.shift();
                        simEnemies--;
                    }
                }
            }
            
            // --- Enemy Attack Logic ---
            if (simEnemies > 0) {
                eFireTimer++;
                if (eFireTimer >= 30) {
                    eFireTimer = 0;
                    
                    // NEW: If player is behind wall, they take 0 damage in the simulation
                    const isSafe = (this.playerX < 145);
                    if (!isSafe) {
                        simHealth -= (8 * simEnemies);
                    }
                }
            }
        }
        
        return simHealth > 0;
    }

    executeAction() {
        const action = this.currentAction;
        const firearms = parseFloat(this.inputs.firearms.value);
        const melee = parseFloat(this.inputs.melee.value);
        
        if (action === "Attack") {
            // Priority 1: Ranged Attack (needs gun)
            if (firearms >= 1) {
                this.fireTimer++;
                if (this.fireTimer >= 12) {
                    this.fireTimer = 0;
                    this.isFiring = true;
                    
                    // Screen shake
                    this.screenShake = 8;
                    
                    // Muzzle flash particles
                    for (let i = 0; i < 8; i++) {
                        this.particles.push(new Particle(this.playerX + 35, this.playerBaseY, '#fbbf24', 'muzzle'));
                    }
                    for (let i = 0; i < 4; i++) {
                        this.particles.push(new Particle(this.playerX + 40, this.playerBaseY, '#ff6b35', 'spark'));
                    }
                    
                    // Spawn bullet
                    const target = this.enemies.find(e => e.alive && !e.dying);
                    if (target) {
                        this.bullets.push(new Bullet(this.playerX + 40, this.playerBaseY, target.x, target.y, this.assets.bullet));
                        
                        // Damage enemy
                        setTimeout(() => {
                            if (target.alive) {
                                const killed = target.takeDamage(30); // 30 Fixed deterministic damage (was 25)
                                
                                // Impact particles
                                for (let i = 0; i < 10; i++) {
                                    this.particles.push(new Particle(target.x, target.y, '#fbbf24', 'impact'));
                                }
                                
                                if (killed) {
                                    this.kills++;
                                    this.screenShake = 15;
                                    for (let i = 0; i < 25; i++) {
                                        this.particles.push(new Particle(target.x, target.y, '#f43f5e', 'blood'));
                                    }
                                    for (let i = 0; i < 15; i++) {
                                        this.particles.push(new Particle(target.x, target.y, '#ff6b35', 'impact'));
                                    }
                                }
                            }
                        }, 100);
                    }
                    setTimeout(() => this.isFiring = false, 100);
                }
            } 
            // Priority 2: Melee Attack (needs melee weapon + close range + stamina)
            else if (melee >= 1) {
                // Range check: Can only melee if enemy is very close
                const target = this.enemies.find(e => e.alive && !e.dying);
                const distToEnemy = target ? Math.abs(target.x - this.playerX) : 999;
                
                // Only attack if close enough (< 120px to be safe)
                if (distToEnemy < 120) {
                    this.fireTimer++;
                    if (this.fireTimer >= 30) { // Much slower than shooting
                        this.fireTimer = 0;
                        this.isFiring = true; 
                        this.attackType = 'melee';
                        this.meleeSwingActive = true;
                        this.meleeSwingProgress = 0;
                        this.screenShake = 6;
                        
                        // Melee particles (Slash lines instead of dots)
                        for (let i = 0; i < 8; i++) {
                            const p = new Particle(this.playerX + 50, this.playerBaseY + (Math.random() - 0.5) * 40, '#38bdf8', 'slash');
                            p.speedX = 5 + Math.random() * 5;
                            p.speedY = (Math.random() - 0.5) * 5;
                            this.particles.push(p);
                        }
                        
                        if (target) {
                            // NERFED DAMAGE: Deterministic Base 5 + (Melee Level * 6)
                            const dmg = 5 + (melee * 6) + 2; 
                            const killed = target.takeDamage(dmg, this.playerX);
                            
                            // Blood + slash visual at enemy
                            for (let i = 0; i < 6; i++) {
                                this.particles.push(new Particle(target.x, target.y, '#f43f5e', 'blood'));
                            }
                            for (let i = 0; i < 8; i++) {
                                this.particles.push(new Particle(target.x, target.y, '#e0f2fe', 'impact'));
                            }
                            
                            if (killed) {
                                this.kills++;
                                this.screenShake = 12;
                                for (let i = 0; i < 20; i++) {
                                    this.particles.push(new Particle(target.x, target.y, '#f43f5e', 'blood'));
                                }
                            }
                        }
                        setTimeout(() => {
                             this.isFiring = false;
                             this.attackType = null;
                        }, 200);

                        // If shooting, stay in cover (Reverted position)
                        if (firearms >= 1 && this.playerX > 100) {
                            this.playerX -= 1.0;
                        }
                    }
                } else {
                    // Too far to melee - CHARGE FORWARD!
                    if (target) {
                         this.playerX += 4; // Run towards enemy
                         // Don't run inside them
                         if (this.playerX > target.x - 80) {
                             this.playerX = target.x - 80;
                         }
                    }
                    this.fireTimer = 0;
                }
            }
        } else if (action === "Retreat") {
            // Smooth backward movement
            if (this.playerX > 40) {
                this.playerX -= 3.0; // Faster retreat
                
                // Spawn dust trail
                if (Math.random() < 0.3) {
                    this.particles.push(new Particle(this.playerX + 20, this.playerBaseY + 40, '#d1d5db', 'dust'));
                }
            }
        } else if (action === "Evade") {
            // Dodge rolling
            this.evadeRollPhase += 0.2; // controls rotation speed
            // Move back and forth in a dodgeroll pattern
            this.playerX = 100 + Math.sin(this.evadeRollPhase * 0.5) * 80;
            
            // Dust for evasion too
            if (Math.random() < 0.2) {
                this.particles.push(new Particle(this.playerX, this.playerBaseY + 40, '#d1d5db', 'dust'));
            }
        } else if (action === "Hide") {
            // Move to cover (New wall position)
            if (this.playerX > 100) {
                this.playerX -= 2.0; 
            } else if (this.playerX < 100) {
                this.playerX += 2.0;
            }
            // Small subtle "stealth" shimmer
            if (Math.random() < 0.05) {
                const p = new Particle(this.playerX + (Math.random() - 0.5) * 40, this.playerBaseY + (Math.random() - 0.5) * 40, '#94a3b8', 'spark');
                p.decay = 0.05;
                this.particles.push(p);
            }
        }
    }

    toggleLanguage() {
        this.lang = this.lang === 'en' ? 'hy' : 'en';
        this.updateInterface();
        this.processDecision(); 
    }

    updateInterface() {
        const t = this.translations[this.lang];
        
        // Update Language Button
        const btn = document.getElementById('lang-switch');
        btn.textContent = this.lang === 'en' ? '🇦🇲 HY' : '🇺🇸 EN';
        
        // Header & Footer
        document.querySelector('header h1').textContent = t.title;
        document.querySelector('header p').textContent = t.subtitle;
        document.querySelector('footer p').innerHTML = `&copy; 2026 ${t.footer.replace('© 2026 ', '')}`;
        
        // Sections
        document.querySelector('h2').textContent = t.inputParams;
        document.querySelector('h3').textContent = t.neuralOutput;
        
        // Buttons
        document.getElementById('update-ai').textContent = t.processBtn;
        document.getElementById('start-battle').textContent = t.startBattle;
        document.getElementById('stop-battle').textContent = t.stopBattle;
        // Game over text update handles restart btn visibility, but label needs update
        const restartBtn = document.getElementById('restart-btn');
        if(restartBtn) restartBtn.textContent = t.restart;
        
        // Labels
        const labels = document.querySelectorAll('.input-group label');
        labels.forEach((label, i) => {
            if (t.inputs[i]) label.textContent = t.inputs[i];
        });
        
        // Status Badge if Ready
        if (!this.battleActive && this.currentAction === "Standby") {
             document.getElementById('ai-status').textContent = t.ready;
        }
    }

    endGame(won, customMessage = null) {
        this.gameOver = true;
        this.battleActive = false;
        this.playerDead = !won;
        
        const t = this.translations[this.lang];
        const overlay = document.getElementById('game-over');
        const text = document.getElementById('game-over-text');
        
        overlay.classList.remove('hidden');
        
        if (customMessage) {
            text.textContent = customMessage;
        } else {
            text.textContent = won ? t.victory : t.gameOver;
        }
        
        text.style.color = won ? '#10b981' : '#f43f5e';
        this.stopBtn.classList.add('hidden');
        this.startBtn.classList.add('hidden'); // Keep start button hidden, use restart
        this.battleControlsEl.classList.add('hidden'); // Hide the empty container overlay
    }

    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            // Store reference dimensions on first call (normal non-fullscreen size)
            if (!this.refWidth) {
                this.refWidth = rect.width;
                this.refHeight = rect.height;
            }
            
            this.playerBaseY = this.refHeight / 2; // Keep base Y in reference coords
            this.playerY = this.playerBaseY;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    processDecision() {
        // Instantiate a fresh Neural Network to prevent caching issues, just like processBattleDecision
        this.previewNN = new NeuralNetwork(4, 3, 4);

        const health = parseFloat(this.inputs.health.value);
        const melee = parseFloat(this.inputs.melee.value);
        const firearms = parseFloat(this.inputs.firearms.value);
        const enemies = parseFloat(this.inputs.enemies.value);

        if (enemies === 0) {
            this.currentAction = "Attack";
            this.updateDecisionUI(0, 0.5);
            return;
        }

        // --- NORMALIZE INPUTS BETWEEN 0.0 AND 1.0 FOR NEURAL NETWORK ---
        // 0: Health (0-1), 1: Melee (0-1), 2: Firearms (0-1), 3: Enemies (0-1)
        
        const normHealth = health / 100.0;
        const normMelee = melee / 5.0;
        const normFirearms = firearms / 5.0;
        const normEnemies = Math.min(enemies / 10.0, 1.0); // Assume 10 enemies is max threat

        // Feed forward through Neural Network
        const nnInputs = [normHealth, normMelee, normFirearms, normEnemies];
        const outputs = this.previewNN.feedForward(nnInputs);

        let bestIndex = 0;
        let bestScore = outputs[0];
        let totalScore = 0;
        
        for (let i = 0; i < outputs.length; i++) {
            totalScore += outputs[i];
            if (outputs[i] > bestScore) {
                bestScore = outputs[i];
                bestIndex = i;
            }
        }

        let bestAction = this.strings[bestIndex];

        // --- DETERMINISTIC PREDICTION OVERRIDE FOR PREVIEWS ---
        if (bestAction === "Attack") {
            const willWin = this.predictCombatOutcome(health, melee, firearms, enemies);
            if (!willWin) {
                bestAction = "Retreat";
                bestIndex = 1;
            }
        }

        this.currentAction = bestAction;
        const confidence = totalScore > 0 ? (bestScore / totalScore) : 0.25;
        this.updateDecisionUI(bestIndex, confidence);
    }

    updateDecisionUI(idx, confidence) {
        const t = this.translations[this.lang];
        const actionName = this.lang === 'en' ? this.strings[idx] : t.actions[idx];
        
        this.displays.decision.textContent = actionName;
        this.displays.decision.style.color = this.getColorForDecision(idx);
        
        const statusBadge = document.getElementById('ai-status');
        statusBadge.textContent = `${actionName} (${(confidence * 100).toFixed(0)}%)`;
        statusBadge.style.borderColor = this.getColorForDecision(idx);
        statusBadge.style.color = this.getColorForDecision(idx);
    }

    getColorForDecision(idx) {
        const colors = ['#f43f5e', '#38bdf8', '#fbbf24', '#10b981'];
        return colors[idx];
    }

    drawScene(action = "Idle") {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear the entire real canvas
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);
        
        // Calculate scale factor for fullscreen
        const scale = Math.min(w / this.refWidth, h / this.refHeight);
        const offsetX = (w - this.refWidth * scale) / 2;
        const offsetY = (h - this.refHeight * scale) / 2;
        
        // Apply scaling transform — everything below draws in reference coordinates
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        // Use reference dimensions for drawing
        const rw = this.refWidth;
        const rh = this.refHeight;
        
        // Draw Tactical Wall (Reverted to compact size)
        if (this.assets.wall && this.assets.wall.complete) {
            ctx.drawImage(this.assets.wall, 100 - 45, this.playerBaseY - 60, 90, 120);
        } else {
            ctx.fillStyle = "#475569";
            ctx.fillRect(100 - 5, this.playerBaseY - 50, 10, 100);
        }

        // Apply screen shake
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Grid background
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        for(let i = 0; i < rw; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, rh); ctx.stroke();
        }
        for(let j = 0; j < rh; j += 40) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(rw, j); ctx.stroke();
        }

        // Draw Bullets (behind everything for tracer effect)
        this.bullets.forEach(b => b.draw(ctx));
        
        // Draw Particles
        this.particles.forEach(p => p.draw(ctx));

        // === PLAYER ===
        let px = this.playerX;
        let py = this.playerBaseY;
        
        // Only animate position during specific actions
        if (this.battleActive) {
            if (action === "Attack" && this.isFiring) {
                if (this.attackType === 'melee') {
                    // Lunge forward for melee
                    px += 60 + Math.sin(this.actionPhase * 10) * 10;
                } else {
                    // Recoil for shooting
                    px += (Math.random() - 0.5) * 4;
                }

            } else if (action === "Retreat") {
                // Bobbing while walking back
                py += Math.sin(this.actionPhase * 10) * 4;
                
                // Dust particles at feet
                if (Math.random() < 0.2) {
                    const p = new Particle(px, py + 25, '#94a3b8', 'spark');
                    p.speedX = Math.random() * 2;
                    p.speedY = -Math.random() * 2;
                    p.life = 0.6;
                    this.particles.push(p);
                }
            } else if (action === "Evade") {
                // Bobbing while evading is lower (staying low to ground)
                py += Math.sin(this.actionPhase * 4) * 15;
            }
        }
        
        // --- Evade Dodge Roll Rotation ---
        if (this.currentAction === "Evade" && this.liveStamina > 0) {
            ctx.translate(px, py);
            ctx.rotate(this.evadeRollPhase);
            ctx.translate(-px, -py);
        }
        
        // Hide transparency
        let alpha = 1.0;
        if (action === "Hide") {
            alpha = 0.3 + Math.sin(this.actionPhase * 2) * 0.1;
        }
        if (this.playerDead) {
            alpha = 0.5;
        }
        ctx.globalAlpha = alpha;

        // Player shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(px, py + 45, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Player body
        if (this.assetsLoaded >= 2) {
            if (action === "Hide") ctx.globalAlpha = 0.4;
            ctx.drawImage(this.assets.tacticalPlayer, px - 45, py - 45, 90, 90);
            ctx.globalAlpha = 1.0;
        } else {
            const grad = ctx.createRadialGradient(px, py, 5, px, py, 25);
            grad.addColorStop(0, this.playerDead ? "#475569" : "#38bdf8");
            grad.addColorStop(1, "#1e293b");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.6)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Death X
        if (this.playerDead) {
            ctx.strokeStyle = "#f43f5e";
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(px - 25, py - 25); ctx.lineTo(px + 25, py + 25); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px + 25, py - 25); ctx.lineTo(px - 25, py + 25); ctx.stroke();
        }

        // Knife melee swing animation
        if (this.meleeSwingActive && action === "Attack" && this.attackType === 'melee') {
            const knifeImg = this.assets.knife;
            const t = this.meleeSwingProgress;
            
            // Smooth easing: fast start, slow end (ease-out)
            const eased = 1 - Math.pow(1 - t, 3);
            
            // Swing from -60° to +90° (top-right arc to bottom-right)
            const startAngle = -Math.PI / 3;  // -60 degrees
            const endAngle = Math.PI / 2;      // +90 degrees
            const currentAngle = startAngle + (endAngle - startAngle) * eased;
            
            // Knife pivot point (at player's side)
            const pivotX = px + 30;
            const pivotY = py - 5;
            const knifeLength = 55;
            const knifeWidth = 22;
            
            // Draw knife sprite
            if (knifeImg && knifeImg.complete && knifeImg.naturalWidth > 0) {
                ctx.save();
                ctx.translate(pivotX, pivotY);
                ctx.rotate(currentAngle);
                ctx.drawImage(knifeImg, 0, -knifeWidth / 2, knifeLength, knifeWidth);
                ctx.restore();
            } else {
                // Fallback: draw a simple blade shape
                ctx.save();
                ctx.translate(pivotX, pivotY);
                ctx.rotate(currentAngle);
                ctx.fillStyle = '#c0c0c0';
                ctx.beginPath();
                ctx.moveTo(0, -3);
                ctx.lineTo(knifeLength, 0);
                ctx.lineTo(0, 3);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        // Muzzle flash (only for ranged attacks, not melee)
        if (this.isFiring && action === "Attack" && this.attackType !== 'melee') {
            const flashImg = this.assets.muzzleFlash;
            if (flashImg && flashImg.complete && flashImg.naturalWidth > 0) {
                const flashSize = 35 + Math.random() * 10;
                ctx.save();
                ctx.globalAlpha = 0.85 + Math.random() * 0.15;
                ctx.drawImage(flashImg, px + 30, py - flashSize / 2, flashSize, flashSize);
                ctx.restore();
            } else {
                // Fallback circle if image not loaded
                ctx.fillStyle = "#fbbf24";
                ctx.beginPath();
                ctx.arc(px + 45, py, 8 + Math.random() * 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw targeting line to first enemy
            const target = this.enemies.find(e => e.alive && !e.dying);
            if (target) {
                ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.beginPath();
                ctx.moveTo(px + 30, py);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        ctx.globalAlpha = 1.0;

        // Player label
        ctx.fillStyle = "white";
        ctx.font = "bold 11px Inter";
        ctx.textAlign = "center";
        ctx.fillText("AGENT", px, py + 60);

        // === ENEMIES ===
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            let ex = enemy.x;
            let ey = enemy.y;
            let enemyAlpha = 1.0;
            
            if (enemy.dying) {
                enemyAlpha = 1 - (enemy.deathTimer / 30);
                ey += enemy.deathTimer * 0.5; // Fall down
            }
            
            // Hit reaction: flinch away from hit source
            if (enemy.hitTimer > 0) {
                const flinchAmount = enemy.hitTimer * 0.8;
                const flinchDir = enemy.hitFromX < ex ? 1 : -1;
                ex += flinchDir * flinchAmount;
                ey += (Math.random() - 0.5) * 2; // slight vertical shake
            }
            
            ctx.globalAlpha = enemyAlpha;
            
            // Enemy shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(ex, ey + 40, 25, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Enemy body
            if (this.assetsLoaded >= 2) {
                ctx.drawImage(this.assets.tacticalEnemy, ex - 40, ey - 40, 80, 80);
                
                // Red flash overlay on hit
                if (enemy.hitTimer > 0) {
                    ctx.globalAlpha = (enemy.hitTimer / 12) * 0.4;
                    ctx.fillStyle = '#f43f5e';
                    ctx.fillRect(ex - 40, ey - 40, 80, 80);
                    ctx.globalAlpha = enemyAlpha;
                }
                
                // Enemy muzzle flash
                if (enemy.isShooting) {
                    const flashImg = this.assets.muzzleFlash;
                    
                    // Flash size pulsates based on shootTimer
                    const pulse = Math.sin(enemy.shootTimer * 0.5);
                    const flashSize = 25 + pulse * 10;
                    const gunX = ex - 35;
                    const gunY = ey + 15;
                    
                    if (flashImg && flashImg.complete && flashImg.naturalWidth > 0) {
                        ctx.save();
                        // Turn muzzle flash to face left
                        ctx.translate(gunX, gunY);
                        ctx.scale(-1, 1);
                        ctx.globalAlpha = 0.85 + Math.random() * 0.15;
                        ctx.drawImage(flashImg, 0, -flashSize / 2, flashSize, flashSize);
                        ctx.restore();
                    } else {
                        ctx.fillStyle = "#f43f5e";
                        ctx.beginPath();
                        ctx.arc(gunX, gunY, 8 + Math.random() * 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            } else {
                ctx.fillStyle = enemy.dying ? "#666" : (enemy.hitTimer > 0 ? "#ff8888" : "#f43f5e");
                ctx.beginPath();
                ctx.moveTo(ex, ey - 15);
                ctx.lineTo(ex + 15, ey);
                ctx.lineTo(ex, ey + 15);
                ctx.lineTo(ex - 15, ey);
                ctx.closePath();
                ctx.fill();
            }
            
            // Health bar (show when damaged)
            if (!enemy.dying && enemy.health < 100) {
                const barWidth = 40;
                const barHeight = 4;
                const barX = ex - barWidth / 2;
                const barY = ey - 50;
                
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                const healthPct = Math.max(0, enemy.health / 100);
                ctx.fillStyle = healthPct > 0.5 ? '#10b981' : (healthPct > 0.25 ? '#fbbf24' : '#f43f5e');
                ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);
            }
            
            ctx.globalAlpha = 1.0;
        });
        
        // Restore from screen shake transform
        ctx.restore();
        
        // Restore from fullscreen scale transform
        ctx.restore();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AppController();
});
