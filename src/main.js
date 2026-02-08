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
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.speed = 25;
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        
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
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
        }
        
        // Draw bullet head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
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
    }

    takeDamage(amount) {
        this.health -= amount;
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
                inputs: ["Health Level", "Melee Weapons", "Firearms", "Ammo Level", "Enemies", "Enemy Distance", "Environmental Cover", "Stamina"],
                processBtn: "Process Decision",
                neuralOutput: "Neural Output",
                ready: "Ready",
                startBattle: "⚔️ Start Battle",
                stopBattle: "⏹️ Stop",
                restart: "Restart",
                victory: "VICTORY!",
                gameOver: "GAME OVER",
                footer: "© 2026 AI Tactical Research Project",
                actions: ["Attack", "Retreat", "Evade", "Hide", "Standby"]
            },
            hy: {
                title: "AI Տակտիկական Գործակալ",
                subtitle: "Իրական Ժամանակում Նեյրոնային Որոշման Համակարգ",
                inputParams: "Մուտքային Պարամետրեր",
                inputs: ["Առողջություն", "Սառը Զենք", "Հրազեն", "Ռազմամթերք", "Թշնամիներ", "Հեռավորություն", "Թաքստոց", "Էներգիա"],
                processBtn: "Մշակել Որոշումը",
                neuralOutput: "Նեյրոնային Ելք",
                ready: "Պատրաստ է",
                startBattle: "⚔️ Սկսել Մարտը",
                stopBattle: "⏹️ Կանգնել",
                restart: "Վերախաղալ",
                victory: "ՀԱՂԹԱՆԱԿ!",
                gameOver: "ԽԱՂԻ ԱՎԱՐՏ",
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
        this.liveAmmo = 50;
        this.liveStamina = 100;
        
        // Particles & Bullets
        this.particles = [];
        this.bullets = [];
        
        // Animation state
        this.actionPhase = 0;
        this.isFiring = false;
        this.fireTimer = 0;
        this.currentAction = "Standby";
        
        // Screen shake
        this.screenShake = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        
        // Player position
        this.playerX = 100;
        this.playerY = 0;
        this.playerBaseY = 0;
        
        // Assets
        this.assets = {
            tacticalEnemy: new Image(),
            tacticalPlayer: new Image()
        };
        this.assetsLoaded = 0;

        // UI Elements
        this.inputs = {
            health: document.getElementById('health'),
            melee: document.getElementById('melee'),
            firearms: document.getElementById('firearms'),
            ammo: document.getElementById('ammo'),
            enemies: document.getElementById('enemies'),
            distance: document.getElementById('distance'),
            cover: document.getElementById('cover'),
            stamina: document.getElementById('stamina')
        };
        
        this.displays = {
            decision: document.getElementById('decision-text'),
            status: id => document.getElementById(`${id}-val`)
        };

        // HUD Elements
        this.hud = {
            health: document.getElementById('hud-health'),
            healthBar: document.getElementById('hud-health-bar'),
            ammo: document.getElementById('hud-ammo'),
            stamina: document.getElementById('hud-stamina'),
            staminaBar: document.getElementById('hud-stamina-bar'),
            kills: document.getElementById('hud-kills'),
            enemies: document.getElementById('hud-enemies')
        };

        // Battle Controls
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
        
        // Initial language setup
        this.updateInterface();
        this.updateBtn.addEventListener('click', () => this.processDecision());
        
        this.setupCanvas();
        this.processDecision();
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
        this.liveAmmo = parseFloat(this.inputs.ammo.value);
        this.liveStamina = parseFloat(this.inputs.stamina.value);
        
        // Spawn enemies
        this.spawnEnemies();
        this.totalEnemies = this.enemies.length;
        
        // Update UI
        this.startBtn.classList.add('hidden');
        this.stopBtn.classList.remove('hidden');
        this.gameOverEl.classList.add('hidden');
        
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
        
        // Reset player state
        this.playerX = 100;
        this.playerY = this.playerBaseY;
        this.shakeX = 0;
        this.shakeY = 0;
        this.isFiring = false;
        this.fireTimer = 0;
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
        const w = this.canvas.width;
        const h = this.canvas.height;
        
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
        this.hud.ammo.textContent = Math.max(0, Math.floor(this.liveAmmo));
        this.hud.stamina.textContent = Math.max(0, Math.floor(this.liveStamina));
        this.hud.staminaBar.style.width = `${Math.max(0, this.liveStamina)}%`;
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
        // Process AI decision based on live state
        this.processBattleDecision();
        
        // Execute action effects
        this.executeAction();
        
        // Enemy attacks (simple)
        const aliveEnemies = this.enemies.filter(e => e.alive && !e.dying);
        if (aliveEnemies.length > 0 && Math.random() < 0.02) {
            const damage = 5 + Math.random() * 10;
            this.liveHealth -= damage;
            
            // Blood particles on player
            for (let i = 0; i < 5; i++) {
                this.particles.push(new Particle(this.playerX, this.playerBaseY, '#f43f5e', 'blood'));
            }
        }
        
        // Regenerate stamina slowly
        if (this.liveStamina < 100) {
            this.liveStamina += 0.1;
        }
        
        // Check game over conditions
        if (this.liveHealth <= 0) {
            this.endGame(false);
        } else {
            // Victory when all enemies are dead or dying
            const activeEnemies = this.enemies.filter(e => e.alive && !e.dying);
            if (activeEnemies.length === 0 && this.enemies.length > 0) {
                this.endGame(true);
            }
        }
        
        this.updateHUD();
    }

    processBattleDecision() {
        const health = this.liveHealth;
        const firearms = parseFloat(this.inputs.firearms.value);
        const melee = parseFloat(this.inputs.melee.value);
        const ammo = this.liveAmmo;
        const enemies = this.enemies.filter(e => e.alive).length;
        const distance = parseFloat(this.inputs.distance.value);
        const cover = parseFloat(this.inputs.cover.value);
        const stamina = this.liveStamina;

        let scores = { attack: 0, retreat: 0, evade: 0, hide: 0 };

        if (enemies === 0) {
            this.currentAction = "Attack";
            return;
        }

        // Base attack score - always some willingness to fight if healthy (melee or ammo)
        if (health >= 25 && (ammo > 0 || melee >= 1)) {
            scores.attack += 25;
        }
        
        // Better attack score with weapons
        if (health >= 35 && (firearms >= 1 || melee >= 1)) {
             // Bonus for Guns + Ammo
             if (ammo >= 1 && firearms >= 1) {
                 scores.attack += 45;
                 if (firearms >= 3) scores.attack += 15;
                 if (ammo >= 30) scores.attack += 10;
             }
             // Bonus for Melee (if close or out of ammo)
             else if (melee >= 1) {
                 scores.attack += 40;
                 if (melee >= 3) scores.attack += 20; // Strong melee preference if high level
             }
        }

        if (health < 30 || enemies >= 6) {
            scores.retreat += 40;
            if (health < 15) scores.retreat += 30;
            if (cover < 30 && stamina < 30) scores.retreat += 20;
        }

        if (stamina >= 40 && health >= 20) {
            scores.evade += 30;
            if (stamina >= 70) scores.evade += 15;
        }

        if (cover >= 50) {
            scores.hide += 40;
            if (cover >= 80) scores.hide += 20;
            if (health < 50) scores.hide += 15;
        }

        let bestAction = "Attack";
        let bestScore = scores.attack;
        
        if (scores.retreat > bestScore) { bestAction = "Retreat"; bestScore = scores.retreat; }
        if (scores.evade > bestScore) { bestAction = "Evade"; bestScore = scores.evade; }
        if (scores.hide > bestScore) { bestAction = "Hide"; bestScore = scores.hide; }

        this.currentAction = bestAction;
        
        const idx = this.strings.indexOf(bestAction);
        const total = scores.attack + scores.retreat + scores.evade + scores.hide;
        this.updateDecisionUI(idx, total > 0 ? bestScore / total : 0.25);
    }

    executeAction() {
        const action = this.currentAction;
        const firearms = parseFloat(this.inputs.firearms.value);
        const melee = parseFloat(this.inputs.melee.value);
        
        if (action === "Attack") {
            // Priority 1: Ranged Attack (needs gun + ammo)
            if (firearms >= 1 && this.liveAmmo > 0) {
                this.fireTimer++;
                if (this.fireTimer >= 12) {
                    this.fireTimer = 0;
                    this.isFiring = true;
                    this.liveAmmo -= 1;
                    
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
                        this.bullets.push(new Bullet(this.playerX + 40, this.playerBaseY, target.x, target.y));
                        
                        // Damage enemy
                        setTimeout(() => {
                            if (target.alive) {
                                const killed = target.takeDamage(20 + Math.random() * 15);
                                
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
                        
                        // High Stamina Cost
                        this.liveStamina = Math.max(0, this.liveStamina - 8);
                        
                        this.screenShake = 6;
                        
                        this.screenShake = 6;
                        
                        // Melee particles (Slash lines instead of dots)
                        for (let i = 0; i < 8; i++) {
                            const p = new Particle(this.playerX + 50, this.playerBaseY + (Math.random() - 0.5) * 40, '#38bdf8', 'slash');
                            p.speedX = 5 + Math.random() * 5;
                            p.speedY = (Math.random() - 0.5) * 5;
                            this.particles.push(p);
                        }
                        
                        if (target) {
                            // NERFED DAMAGE: Base 5 + (Melee Level * 6)
                            // Level 1: ~11 dmg | Level 5: ~35 dmg
                            const dmg = 5 + (melee * 6) + (Math.random() * 5);
                            const killed = target.takeDamage(dmg);
                            
                            // Slash visual at enemy
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
                this.playerX -= 2.5;
            }
        } else if (action === "Evade") {
            this.liveStamina -= 0.3;
        } else if (action === "Retreat") {
            this.liveStamina -= 0.2;
        }
    }

    toggleLanguage() {
        this.lang = this.lang === 'en' ? 'hy' : 'en';
        const btn = document.getElementById('lang-switch');
        btn.textContent = this.lang === 'en' ? '🇦🇲 HY' : '🇺🇸 EN';
        this.updateInterface();
        this.processDecision(); 
    }

    updateInterface() {
        const t = this.translations[this.lang];
        
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

    endGame(won) {
        this.gameOver = true;
        this.battleActive = false;
        this.playerDead = !won;
        
        const t = this.translations[this.lang];
        this.gameOverText.textContent = won ? t.victory : t.gameOver;
        this.gameOverText.style.color = won ? "#10b981" : "#f43f5e";
        this.gameOverEl.classList.remove('hidden');
        
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
    }

    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.playerBaseY = rect.height / 2;
            this.playerY = this.playerBaseY;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    processDecision() {
        const health = parseFloat(this.inputs.health.value);
        const melee = parseFloat(this.inputs.melee.value);
        const firearms = parseFloat(this.inputs.firearms.value);
        const ammo = parseFloat(this.inputs.ammo.value);
        const enemies = parseFloat(this.inputs.enemies.value);
        const distance = parseFloat(this.inputs.distance.value);
        const cover = parseFloat(this.inputs.cover.value);
        const stamina = parseFloat(this.inputs.stamina.value);

        let scores = { attack: 0, retreat: 0, evade: 0, hide: 0 };

        if (enemies === 0) {
            this.currentAction = "Attack";
            this.updateDecisionUI(0, 0.5);
            return;
        }

        // Base attack score
        if (health >= 25 && ammo > 0) {
            scores.attack += 25;
        }
        
        // Better attack with weapons
        if (health >= 35 && (firearms >= 1 || melee >= 1) && ammo >= 1) {
            scores.attack += 45;
            if (health >= 80) scores.attack += 15;
            if (firearms >= 3) scores.attack += 10;
            if (ammo >= 50) scores.attack += 10;
            if (distance <= 300) scores.attack += 10;
        }

        if (health < 30 || (enemies >= 5 && distance < 200)) {
            scores.retreat += 40;
            if (health < 20) scores.retreat += 25;
            if (enemies >= 7) scores.retreat += 15;
            if (distance < 100) scores.retreat += 20;
            if (cover < 30 && stamina < 30) scores.retreat += 20;
        }

        if (stamina >= 40 && distance < 400 && health >= 20) {
            scores.evade += 30;
            if (stamina >= 70) scores.evade += 15;
            if (distance < 200) scores.evade += 20;
            if (cover < 40) scores.evade += 10;
        }

        if (cover >= 50) {
            scores.hide += 35;
            if (cover >= 80) scores.hide += 20;
            if (enemies >= 3) scores.hide += 15;
            if (health < 50) scores.hide += 15;
            if (ammo < 20) scores.hide += 10;
        }

        let bestAction = "Attack";
        let bestScore = scores.attack;
        
        if (scores.retreat > bestScore) { bestAction = "Retreat"; bestScore = scores.retreat; }
        if (scores.evade > bestScore) { bestAction = "Evade"; bestScore = scores.evade; }
        if (scores.hide > bestScore) { bestAction = "Hide"; bestScore = scores.hide; }

        const actionIndex = this.strings.indexOf(bestAction);
        const totalScore = scores.attack + scores.retreat + scores.evade + scores.hide;
        const confidence = totalScore > 0 ? bestScore / totalScore : 0.25;

        this.currentAction = bestAction;
        this.updateDecisionUI(actionIndex, confidence);
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
        ctx.clearRect(0, 0, w, h);
        
        // Apply screen shake
        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Grid background
        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        for(let i = 0; i < w; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }
        for(let j = 0; j < h; j += 40) {
            ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
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
                py += Math.sin(this.actionPhase * 4) * 30;
            }
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
            ctx.drawImage(this.assets.tacticalPlayer, px - 45, py - 45, 90, 90);
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

        // Muzzle flash
        if (this.isFiring && action === "Attack") {
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(px + 45, py, 12 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
            
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
            
            ctx.globalAlpha = enemyAlpha;
            
            // Enemy shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.ellipse(ex, ey + 40, 25, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Enemy body
            if (this.assetsLoaded >= 2) {
                ctx.drawImage(this.assets.tacticalEnemy, ex - 40, ey - 40, 80, 80);
            } else {
                ctx.fillStyle = enemy.dying ? "#666" : "#f43f5e";
                ctx.beginPath();
                ctx.moveTo(ex, ey - 15);
                ctx.lineTo(ex + 15, ey);
                ctx.lineTo(ex, ey + 15);
                ctx.lineTo(ex - 15, ey);
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.globalAlpha = 1.0;
        });
        
        // Restore from screen shake transform
        ctx.restore();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AppController();
});
