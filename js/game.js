/* ============================================
   STAR DEFENSE - Game Core
   Scene management, game loop, input, upgrades
   ============================================ */

(function() {
    'use strict';

    // --- State ---
    const State = {
        currentScene: 'intro',
        selectedShip: 'fighter',
        player: null,
        enemies: [],
        playerBullets: [],
        enemyBullets: [],
        powerUps: [],
        particles: new ParticleSystem(),
        boss: null,
        level: 0,
        score: 0,
        credits: 0,
        kills: 0,
        levelKills: 0,
        bossSpawned: false,
        paused: false,
        upgradeOpen: false,
        scrollY: 0,
        input: { up: false, down: false, left: false, right: false, fire: false, special: false },
        gameTime: 0,
        spawnTimer: 0,
        W: 0,
        H: 0,
        menuAnimFrame: null,
        gameAnimFrame: null,
        introVideoUrl: null
    };

    // --- DOM Refs ---
    const $ = id => document.getElementById(id);
    const scenes = {
        intro: $('intro-scene'),
        menu: $('menu-scene'),
        hangar: $('hangar-scene'),
        game: $('game-scene'),
        gameover: $('gameover-scene'),
        levelup: $('levelup-scene')
    };

    // --- Scene Management ---
    function showScene(name) {
        Object.values(scenes).forEach(s => s.classList.remove('active'));
        if (scenes[name]) {
            scenes[name].classList.add('active');
            State.currentScene = name;
        }
    }

    // --- Canvas Setup ---
    function setupCanvas(id, w, h) {
        const canvas = $(id);
        canvas.width = w;
        canvas.height = h;
        return canvas.getContext('2d');
    }

    function resizeGame() {
        State.W = window.innerWidth;
        State.H = window.innerHeight;
        const gameCanvas = $('game-canvas');
        gameCanvas.width = State.W;
        gameCanvas.height = State.H;
        Renderer.init(State.W, State.H);
    }

    // ============================================
    // INTRO SCENE
    // ============================================
    function startIntro() {
        showScene('intro');
        const canvas = $('intro-canvas');
        const ctx = setupCanvas('intro-canvas', State.W, State.H);
        const textEl = $('intro-text');
        textEl.innerHTML = '';

        // Check for AIGC video
        if (State.introVideoUrl) {
            const video = document.createElement('video');
            video.src = State.introVideoUrl;
            video.muted = true;
            video.autoplay = true;
            video.playsInline = true;
            video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.4;';
            scenes.intro.insertBefore(video, canvas);
        }

        const dialogLines = [
            { speaker: '指挥官·林雪', text: '所有单位注意，这是紧急作战指令。' },
            { speaker: '', text: '三小时前，我们的前哨站在猎户座边境遭到不明势力袭击。' },
            { speaker: '', text: '信号分析显示，这不是普通的海盗行为——它们是有组织的。' },
            { speaker: '指挥官·林雪', text: '你被选为本次反击行动的首席飞行员。' },
            { speaker: '', text: '你的任务：穿越四个危险区域，消灭敌方指挥单元。' },
            { speaker: '', text: '沿途中你将遇到各类敌方舰艇，每个区域都有一名指挥官镇守。' },
            { speaker: '指挥官·林雪', text: '在战斗中获取积分，可以强化你的战机。' },
            { speaker: '', text: '地球的命运，就交给你了。' },
            { speaker: '指挥官·林雪', text: '祝你好运，飞行员。出发！' }
        ];

        let lineIndex = 0;
        let progress = 0;
        let started = false;
        let introAlive = true; // Guard flag - set to false when leaving intro

        function addLine() {
            if (!introAlive) return;
            if (lineIndex >= dialogLines.length) {
                setTimeout(() => {
                    if (!introAlive) return;
                    introAlive = false;
                    if (scenes.intro.querySelector('video')) {
                        scenes.intro.querySelector('video').remove();
                    }
                    startMenu();
                }, 1500);
                return;
            }

            const line = dialogLines[lineIndex];
            const div = document.createElement('div');
            div.className = 'line' + (line.speaker ? '' : '');

            if (line.speaker) {
                const speakerDiv = document.createElement('div');
                speakerDiv.className = 'line speaker';
                speakerDiv.textContent = line.speaker;
                speakerDiv.style.animationDelay = '0s';
                textEl.appendChild(speakerDiv);
                div.style.animationDelay = '0.3s';
            } else {
                div.style.animationDelay = '0s';
            }

            div.textContent = line.text;
            textEl.appendChild(div);
            lineIndex++;

            // Auto-scroll
            textEl.scrollTop = textEl.scrollHeight;

            // Auto-advance
            setTimeout(addLine, 3000);
        }

        // Animate intro background
        let introFrame;
        function introLoop() {
            if (!introAlive) return;
            progress += 0.002;
            Renderer.drawIntroBackground(ctx, State.W, State.H, progress);
            Renderer.updateStars(1/60);

            introFrame = requestAnimationFrame(introLoop);
        }

        setTimeout(() => {
            if (!introAlive) return;
            if (!started) {
                started = true;
                addLine();
            }
        }, 800);

        introLoop();

        // Skip handler
        State._introSkip = (e) => {
            if (e.code === 'Space' || e.type === 'click') {
                e.preventDefault();
                introAlive = false;
                cancelAnimationFrame(introFrame);
                if (scenes.intro.querySelector('video')) {
                    scenes.intro.querySelector('video').remove();
                }
                document.removeEventListener('keydown', State._introSkip);
                $('intro-skip').removeEventListener('click', State._introSkip);
                State._introSkip = null;
                startMenu();
            }
        };
        document.addEventListener('keydown', State._introSkip);
        $('intro-skip').addEventListener('click', State._introSkip);
    }

    // ============================================
    // MENU SCENE
    // ============================================
    function startMenu() {
        showScene('menu');
        audio.init();
        audio.resume();
        audio.startBGM('menu');

        const canvas = $('menu-canvas');
        const ctx = setupCanvas('menu-canvas', State.W, State.H);

        function menuLoop(time) {
            Renderer.updateStars(1/60);
            Renderer.drawMenuBackground(ctx, State.W, State.H, time);
            State.menuAnimFrame = requestAnimationFrame(menuLoop);
        }
        State.menuAnimFrame = requestAnimationFrame(menuLoop);

        // Button handlers
        $('btn-start').onclick = () => {
            audio.playMenuClick();
            cancelAnimationFrame(State.menuAnimFrame);
            startGame();
        };
        $('btn-hangar').onclick = () => {
            audio.playMenuClick();
            cancelAnimationFrame(State.menuAnimFrame);
            startHangar();
        };
        $('btn-settings').onclick = () => {
            audio.playMenuClick();
            toggleSettings();
        };
    }

    // ============================================
    // HANGAR SCENE
    // ============================================
    const SHIP_DEFS = [
        { id: 'interceptor', name: '闪电拦截机', desc: '高机动性侦察战机，擅长闪避和快速打击', speed: 90, fire: 50, armor: 40 },
        { id: 'fighter', name: '暴风战斗机', desc: '均衡型主力战机，适应各种作战环境', speed: 60, fire: 70, armor: 60 },
        { id: 'bomber', name: '毁灭轰炸舰', desc: '重型火力平台，拥有强大的破坏力和生存能力', speed: 30, fire: 95, armor: 85 }
    ];
    let hangarIndex = 1; // default fighter

    function startHangar() {
        showScene('hangar');
        const canvas = $('hangar-canvas');
        const ctx = setupCanvas('hangar-canvas', State.W, State.H);

        // Set initial index to match selectedShip
        hangarIndex = SHIP_DEFS.findIndex(s => s.id === State.selectedShip);
        if (hangarIndex < 0) hangarIndex = 1;
        updateHangarDisplay();

        // Background animation
        function hangarLoop(time) {
            Renderer.updateStars(1/60);
            Renderer.drawMenuBackground(ctx, State.W, State.H, time);
            State.menuAnimFrame = requestAnimationFrame(hangarLoop);
        }
        State.menuAnimFrame = requestAnimationFrame(hangarLoop);

        // Arrow buttons
        $('btn-ship-prev').onclick = () => {
            audio.playMenuClick();
            hangarIndex = (hangarIndex - 1 + SHIP_DEFS.length) % SHIP_DEFS.length;
            updateHangarDisplay();
        };
        $('btn-ship-next').onclick = () => {
            audio.playMenuClick();
            hangarIndex = (hangarIndex + 1) % SHIP_DEFS.length;
            updateHangarDisplay();
        };

        $('btn-hangar-back').onclick = () => {
            audio.playMenuClick();
            cancelAnimationFrame(State.menuAnimFrame);
            startMenu();
        };

        $('btn-hangar-confirm').onclick = () => {
            audio.playMenuClick();
            State.selectedShip = SHIP_DEFS[hangarIndex].id;
            cancelAnimationFrame(State.menuAnimFrame);
            startGame();
        };
    }

    function updateHangarDisplay() {
        const ship = SHIP_DEFS[hangarIndex];
        State.selectedShip = ship.id;

        // Update name
        $('hangar-ship-name').textContent = ship.name;

        // Update stats
        $('hstat-speed').style.width = ship.speed + '%';
        $('hstat-fire').style.width = ship.fire + '%';
        $('hstat-armor').style.width = ship.armor + '%';
        $('hangar-desc').textContent = ship.desc;

        // Draw ship on main canvas
        const mainCanvas = $('hangar-main-canvas');
        if (mainCanvas) {
            const ctx = mainCanvas.getContext('2d');
            ctx.clearRect(0, 0, 300, 300);

            // Try AIGC image
            const aigcImg = Renderer._aigcImages['ship_' + ship.id];
            if (aigcImg) {
                const aspect = aigcImg.width / aigcImg.height;
                let dw, dh;
                if (aspect > 1) { dw = 200; dh = dw / aspect; }
                else { dh = 200; dw = dh * aspect; }
                ctx.drawImage(aigcImg, (300 - dw) / 2, (300 - dh) / 2, dw, dh);
            } else {
                // Fallback procedural
                ctx.save();
                ctx.translate(150, 150);
                ctx.scale(1.2, 1.2);
                if (ship.id === 'interceptor') Renderer._drawInterceptor(ctx, 100, 100);
                else if (ship.id === 'fighter') Renderer._drawFighter(ctx, 100, 100);
                else Renderer._drawBomber(ctx, 100, 100);
                ctx.restore();
            }
        }
    }

    function updateShipSelection() {}

    // ============================================
    // GAME SCENE
    // ============================================
    function startGame() {
        audio.stopBGM();

        // Cancel any previous game loop
        if (State.gameAnimFrame) cancelAnimationFrame(State.gameAnimFrame);

        showScene('game');
        resizeGame();

        // Reset state
        State._dying = false;
        State._ultimateCooldown = 0;
        State.player = new Player(State.selectedShip);
        State.player.x = State.W / 2;
        State.player.y = State.H - 100;
        State.player.hp = State.player.getEffectiveHp();
        State.player.maxHp = State.player.getEffectiveHp();
        State.enemies = [];
        State.playerBullets = [];
        State.enemyBullets = [];
        State.powerUps = [];
        State.particles = new ParticleSystem();
        State.boss = null;
        State.level = 0;
        State.score = 0;
        State.credits = 0;
        State.kills = 0;
        State.levelKills = 0;
        State.bossSpawned = false;
        State.paused = false;
        State.upgradeOpen = false;
        State.gameTime = 0;
        State.spawnTimer = 0;
        State.scrollY = 0;

        $('upgrade-panel').classList.remove('active');

        // Load saved upgrades
        try {
            const saved = JSON.parse(localStorage.getItem('sd_upgrades') || '{}');
            if (saved[State.selectedShip]) {
                State.player.upgrades = saved[State.selectedShip];
                State.player.hp = State.player.getEffectiveHp();
                State.player.maxHp = State.player.getEffectiveHp();
            }
        } catch(e) {}

        // Start level 1 (delayed to ensure gameLoop is running first)
        setTimeout(() => startLevel(0), 100);

        // Game loop - always runs while game scene is active or transitioning
        let lastTime = performance.now();
        function gameLoop(now) {
            if (State.currentScene !== 'game' && State.currentScene !== 'levelup') return;

            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;

            if (State.currentScene === 'game' && !State.paused && !State.upgradeOpen) {
                try {
                    updateGame(dt);
                } catch(err) {
                    console.error('updateGame error:', err);
                }
            }

            if (State.currentScene === 'game' || State.currentScene === 'levelup') {
                try {
                    renderGame();
                } catch(err) {
                    console.error('renderGame error:', err);
                }
            }

            State.gameAnimFrame = requestAnimationFrame(gameLoop);
        }
        State.gameAnimFrame = requestAnimationFrame(gameLoop);
    }

    function startLevel(levelIndex) {
        State.level = levelIndex;
        State.levelKills = 0;
        State.bossSpawned = false;
        State.boss = null;
        State.enemies = [];
        State.enemyBullets = [];
        State.spawnTimer = 0;

        const levelDef = LEVEL_DEFS[levelIndex];
        showLevelTransition(levelDef.id, levelDef.desc, () => {
            if (State.boss) audio.startBGM('boss');
            else audio.startBGM('game');
        });
    }

    function showLevelTransition(num, desc, onDone) {
        showScene('levelup');
        $('levelup-num').textContent = num;
        $('levelup-desc').textContent = desc;
        audio.playLevelUp();

        setTimeout(() => {
            if (State.currentScene !== 'levelup') return;
            showScene('game');
            if (onDone) onDone();
        }, 2500);
    }

    function updateGame(dt) {
        State.gameTime += dt;
        State.scrollY += dt * 30;

        const player = State.player;
        const W = State.W;
        const H = State.H;
        const levelDef = LEVEL_DEFS[State.level];

        // Mouse follow: instant tracking
        if (State._mouseX !== undefined && State._mouseY !== undefined) {
            player.x = State._mouseX;
            player.y = State._mouseY;
        }

        // Clamp player to screen
        player.x = Math.max(player.width / 2, Math.min(W - player.width / 2, player.x));
        player.y = Math.max(player.height / 2, Math.min(H - player.height / 2, player.y));

        // Update cooldowns
        if (player.fireCooldown > 0) player.fireCooldown -= dt;
        if (player.invincible > 0) player.invincible -= dt;
        if (player._hitFlash > 0) player._hitFlash -= dt * 3;
        player.energy = Math.min(player.maxEnergy, player.energy + 3 * dt);

        // Auto-fire (left click hold)
        if (State.input.fire && player.canShoot()) {
            const bullets = player.shoot();
            State.playerBullets.push(...bullets);
            audio.playShoot();
        }

        // Limit bullet count to prevent memory issues
        if (State.playerBullets.length > 500) {
            State.playerBullets.splice(0, State.playerBullets.length - 500);
        }
        if (State.enemyBullets.length > 500) {
            State.enemyBullets.splice(0, State.enemyBullets.length - 500);
        }

        // Update gamepad
        updateGamepadInput();

        // Ultimate cooldown
        if (State._ultimateCooldown > 0) State._ultimateCooldown -= dt;

        // Spawn enemies
        if (!State.bossSpawned && !State.boss) {
            State.spawnTimer -= dt;
            if (State.spawnTimer <= 0) {
                spawnEnemy(W);
                State.spawnTimer = levelDef.spawnRate * (0.7 + Math.random() * 0.6);
            }
        }

        // Check if should spawn boss
        if (!State.bossSpawned && State.levelKills >= levelDef.killTarget) {
            State.bossSpawned = true;
            audio.playBossWarning();
            showMessage('WARNING: BOSS INCOMING');
            setTimeout(() => {
                if (State._dying || State.currentScene !== 'game') return;
                State.boss = new Boss(
                    levelDef.boss,
                    W / 2, -100,
                    { enemyHpMult: levelDef.enemyHpMult, enemySpeedMult: levelDef.enemySpeedMult }
                );
                audio.startBGM('boss');
            }, 2000);
        }

        // Update enemies
        for (let i = State.enemies.length - 1; i >= 0; i--) {
            const e = State.enemies[i];
            e.update(dt, W, H);
            if (e.dead) {
                State.enemies.splice(i, 1);
                continue;
            }
            // Enemy shooting
            if (e.canShoot()) {
                State.enemyBullets.push(e.shoot(player.x, player.y));
                audio.playEnemyShoot();
            }
        }

        // Update boss
        if (State.boss) {
            const bossBullets = State.boss.update(dt, W, player.x, player.y);
            State.enemyBullets.push(...bossBullets);
            if (State.boss.dead) {
                handleBossDefeat();
            }
        }

        // Update bullets
        for (let i = State.playerBullets.length - 1; i >= 0; i--) {
            const b = State.playerBullets[i];
            b.x += (b.vx || 0) * dt * 60;
            b.y += b.vy * dt * 60;
            if (b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20) {
                State.playerBullets.splice(i, 1);
            }
        }

        for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
            const b = State.enemyBullets[i];
            b.x += b.vx * dt * 60;
            b.y += b.vy * dt * 60;
            if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) {
                State.enemyBullets.splice(i, 1);
            }
        }

        // Update powerups
        for (let i = State.powerUps.length - 1; i >= 0; i--) {
            State.powerUps[i].update(dt);
            if (State.powerUps[i].dead) {
                State.powerUps.splice(i, 1);
            }
        }

        // Update particles
        State.particles.update(dt);

        // --- Collision Detection ---
        const playerBounds = player.getBounds();

        // Player bullets vs enemies
        for (let bi = State.playerBullets.length - 1; bi >= 0; bi--) {
            const b = State.playerBullets[bi];
            let hit = false;

            // vs enemies
            for (let ei = State.enemies.length - 1; ei >= 0; ei--) {
                const e = State.enemies[ei];
                if (circleRectIntersect(b.x, b.y, Math.max(b.size, 8), e.getBounds())) {
                    const killed = e.takeDamage(b.damage);
                    hit = true;
                    if (killed) {
                        handleEnemyKill(e);
                        State.enemies.splice(ei, 1);
                    } else {
                        State.particles.spawnExplosion(b.x, b.y, 3, '#00ccff', [1, 3]);
                    }
                    break;
                }
            }

            // vs boss
            if (!hit && State.boss && !State.boss.dead) {
                if (circleRectIntersect(b.x, b.y, Math.max(b.size, 8), State.boss.getBounds())) {
                    State.boss.takeDamage(b.damage);
                    hit = true;
                    State.particles.spawnExplosion(b.x, b.y, 3, '#ff6644', [1, 3]);
                }
            }

            if (hit) {
                State.playerBullets.splice(bi, 1);
            }
        }

        // Enemy bullets vs player
        if (player.invincible <= 0) {
            for (let bi = State.enemyBullets.length - 1; bi >= 0; bi--) {
                const b = State.enemyBullets[bi];
                if (circleRectIntersect(b.x, b.y, Math.max(b.size, 8), playerBounds)) {
                    const dmg = player.takeDamage(b.damage);
                    if (dmg) {
                        audio.playHit();
                        State.particles.spawnExplosion(player.x, player.y, 5, '#ff4444', [1, 3]);
                    }
                    State.enemyBullets.splice(bi, 1);
                }
            }

            // Enemy bodies vs player
            for (const e of State.enemies) {
                if (rectIntersect(playerBounds, e.getBounds())) {
                    player.takeDamage(15);
                    e.takeDamage(999);
                    audio.playHit();
                    State.particles.spawnExplosion(e.x, e.y, 10, '#ff8800', [2, 5]);
                }
            }
        }

        // Powerups vs player
        for (let i = State.powerUps.length - 1; i >= 0; i--) {
            const p = State.powerUps[i];
            if (rectIntersect(playerBounds, p.getBounds())) {
                collectPowerUp(p);
                State.powerUps.splice(i, 1);
            }
        }

        // --- Check death ---
        if (player.hp <= 0) {
            handlePlayerDeath();
        }

        // --- Update HUD ---
        updateHUD();
    }

    function spawnEnemy(W) {
        const levelDef = LEVEL_DEFS[State.level];
        // Weighted random selection
        let roll = Math.random() * 100;
        let type = levelDef.enemies[0].type;
        for (const e of levelDef.enemies) {
            roll -= e.weight;
            if (roll <= 0) { type = e.type; break; }
        }

        const x = Math.random() * (W - 100) + 50;
        const enemy = new Enemy(type, x, -40, {
            enemyHpMult: levelDef.enemyHpMult,
            enemySpeedMult: levelDef.enemySpeedMult
        });
        State.enemies.push(enemy);
    }

    function handleEnemyKill(enemy) {
        State.score += enemy.score;
        State.credits += enemy.credits;
        State.kills++;
        State.levelKills++;
        State.particles.spawnExplosion(enemy.x, enemy.y, 15, '#ff8800', [2, 6]);
        audio.playExplosion();

        // Random powerup drop
        if (Math.random() < 0.12) {
            const types = ['fire', 'speed', 'shield', 'score'];
            const type = types[Math.floor(Math.random() * types.length)];
            State.powerUps.push(new PowerUp(enemy.x, enemy.y, type));
        }
    }

    function handleBossDefeat() {
        State.score += Math.floor(State.boss.score);
        State.credits += State.boss.credits;
        State.particles.spawnBigExplosion(State.boss.x, State.boss.y);
        audio.playBigExplosion();
        State.boss = null;

        showMessage('BOSS DEFEATED');

        // Next level or victory
        setTimeout(() => {
            if (State._dying || State.currentScene !== 'game') return;
            if (State.level < LEVEL_DEFS.length - 1) {
                openUpgradePanel(true);
            } else {
                handleVictory();
            }
        }, 2000);
    }

    function handlePlayerDeath() {
        if (State._dying) return;
        State._dying = true;
        State.particles.spawnBigExplosion(State.player.x, State.player.y);
        audio.playBigExplosion();
        audio.stopBGM();

        setTimeout(() => {
            cancelAnimationFrame(State.gameAnimFrame);
            State._dying = false;
            showGameOver(false);
        }, 1500);
    }

    function handleVictory() {
        if (State._dying) return;
        State._dying = true;
        audio.stopBGM();
        audio.playLevelUp();
        setTimeout(() => {
            cancelAnimationFrame(State.gameAnimFrame);
            State._dying = false;
            showGameOver(true);
        }, 2000);
    }

    function collectPowerUp(pu) {
        audio.playPowerUp();
        const player = State.player;
        switch (pu.type) {
            case 'fire':
                State.score += 50;
                showMessage('FIRE +50');
                break;
            case 'speed':
                State.score += 50;
                showMessage('SPEED +50');
                break;
            case 'shield':
                player.hp = Math.min(player.getEffectiveHp(), player.hp + 30);
                showMessage('SHIELD +30');
                break;
            case 'score':
                State.score += 200;
                State.credits += 50;
                showMessage('+200 SCORE');
                break;
        }
        State.particles.spawnExplosion(pu.x, pu.y, 8, '#ffd700', [1, 4]);
    }

    // --- Ultimate Weapon ---
    function useUltimateWeapon() {
        const player = State.player;
        if (!player || player.hp <= 0 || State._ultimateCooldown > 0) return;

        const cost = 50;
        if (player.energy < cost) {
            showMessage('能量不足!');
            return;
        }
        player.energy -= cost;
        State._ultimateCooldown = 0.3; // prevent rapid clicks

        audio.playBigExplosion();

        // Fire a massive burst of bullets in all directions
        const cx = player.x, cy = player.y;
        const dmg = player.getEffectiveDamage() * 3;
        const spd = 10;
        const count = 36; // 360 degree coverage
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            State.playerBullets.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                damage: dmg, size: 6,
                color: '#ff6644'
            });
        }

        // Big flash effect
        State.particles.spawnBigExplosion(cx, cy);
        showMessage('终极武器!');
    }

    // --- Upgrade System ---
    function openUpgradePanel(autoClose) {
        State.upgradeOpen = true;
        State.paused = true;
        const panel = $('upgrade-panel');
        panel.classList.add('active');

        // Use score as currency, show available points
        const updateCosts = () => {
            const costs = {
                fire: 100 + State.player.upgrades.fire * 80,
                speed: 100 + State.player.upgrades.speed * 80,
                shield: 100 + State.player.upgrades.shield * 80
            };
            $('cost-fire').textContent = costs.fire;
            $('cost-speed').textContent = costs.speed;
            $('cost-shield').textContent = costs.shield;
            const pts = $('upgrade-points');
            if (pts) pts.textContent = '可用: ' + State.score;

            // Update button disabled state based on available score
            panel.querySelectorAll('.upgrade-btn').forEach(btn => {
                const item = btn.parentElement;
                const type = item.id.replace('upgrade-', '');
                btn.disabled = State.score < costs[type];
            });
        };
        updateCosts();

        // Wire upgrade buttons
        panel.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.disabled = false;
            btn.onclick = () => {
                const item = btn.parentElement;
                const type = item.id.replace('upgrade-', '');
                const cost = 100 + State.player.upgrades[type] * 80;
                if (State.score >= cost) {
                    State.score -= cost;
                    State.player.upgrades[type]++;
                    audio.playPowerUp();
                    updateCosts();
                    updateHUD();
                }
            };
        });

        $('btn-resume').onclick = () => {
            if (State._resuming) return;
            State._resuming = true;
            panel.classList.remove('active');
            State.upgradeOpen = false;
            State.paused = false;

            // Save upgrades
            try {
                const saved = JSON.parse(localStorage.getItem('sd_upgrades') || '{}');
                saved[State.selectedShip] = State.player.upgrades;
                localStorage.setItem('sd_upgrades', JSON.stringify(saved));
            } catch(e) {}

            // Next level
            if (autoClose && State.level < LEVEL_DEFS.length - 1) {
                startLevel(State.level + 1);
            }
            setTimeout(() => { State._resuming = false; }, 500);
        };
    }

    // --- HUD ---
    function updateHUD() {
        const p = State.player;
        $('hud-score').textContent = State.score;
        $('hud-level').textContent = State.level + 1;
        $('hud-credits').textContent = State.credits;
        $('hud-hp-bar').style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
        $('hud-energy-bar').style.width = (p.energy / p.maxEnergy) * 100 + '%';
    }

    function showMessage(text) {
        const area = $('message-area');
        const msg = document.createElement('div');
        msg.className = 'msg';
        msg.textContent = text;
        area.appendChild(msg);
        setTimeout(() => msg.remove(), 2500);
    }

    // --- Render Game ---
    function renderGame() {
        const canvas = $('game-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const W = State.W;
        const H = State.H;

        // Fallback: always fill dark background
        ctx.fillStyle = '#050a14';
        ctx.fillRect(0, 0, W, H);

        try {
            Renderer.drawBackground(ctx, State.scrollY);
        } catch(e) { console.error('bg:', e); }
        try {
            Renderer.updateStars(1/60);
            Renderer.drawStars(ctx, State.scrollY);
        } catch(e) { console.error('stars:', e); }

        // Level tint
        if (LEVEL_DEFS && LEVEL_DEFS[State.level]) {
            ctx.fillStyle = LEVEL_DEFS[State.level].bgTint;
            ctx.fillRect(0, 0, W, H);
        }

        // Powerups
        for (const pu of State.powerUps) {
            try { Renderer.drawPowerUp(ctx, pu.x, pu.y, pu.type, Date.now()); } catch(e) {}
        }

        // Player bullets
        for (const b of State.playerBullets) {
            try {
                if (b.color === '#ff6644') {
                    // Ultimate weapon bullet
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
                    ctx.fillStyle = '#ff6644';
                    ctx.shadowColor = '#ff4422';
                    ctx.shadowBlur = 10;
                    ctx.fill();
                    ctx.restore();
                } else {
                    Renderer.drawPlayerBullet(ctx, b.x, b.y, b.size, State.player.upgrades.fire);
                }
            } catch(e) {}
        }

        // Enemy bullets
        for (const b of State.enemyBullets) {
            try { Renderer.drawEnemyBullet(ctx, b.x, b.y, b.size, b.color); } catch(e) {}
        }

        // Enemies
        for (const e of State.enemies) {
            try { Renderer.drawEnemyShip(ctx, e.type, e.x, e.y, e.width, e.height, undefined, undefined, e._hitFlash || 0); } catch(e) {}
        }

        // Boss
        if (State.boss && !State.boss.dead) {
            try {
                Renderer.drawEnemyShip(ctx, State.boss.type, State.boss.x, State.boss.y,
                    State.boss.width, State.boss.height, State.boss.hp, State.boss.maxHp);
            } catch(e) {}
        }

        // Player
        if (State.player && State.player.hp > 0) {
            const p = State.player;
            // Invincibility flicker
            if (p.invincible <= 0 || Math.floor(p.invincible * 10) % 2 === 0) {
                try { Renderer.drawPlayerShip(ctx, p, p.x, p.y, p.width, p.height); } catch(e) { console.error('player:', e); }
            }
        }

        // Particles on top
        try { State.particles.draw(ctx); } catch(e) {}

        // Crosshair
        if (!State.upgradeOpen) {
            drawCrosshair(ctx);
        }
    }

    function drawCrosshair(ctx) {
        const mx = State._mouseX || State.W / 2;
        const my = State._mouseY || State.H / 2;
        ctx.strokeStyle = 'rgba(0,240,255,0.4)';
        ctx.lineWidth = 1;
        const s = 12;
        ctx.beginPath();
        ctx.moveTo(mx - s, my); ctx.lineTo(mx - 4, my);
        ctx.moveTo(mx + 4, my); ctx.lineTo(mx + s, my);
        ctx.moveTo(mx, my - s); ctx.lineTo(mx, my - 4);
        ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + s);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,240,255,0.15)';
        ctx.beginPath();
        ctx.arc(mx, my, 16, 0, Math.PI * 2);
        ctx.stroke();
    }

    // --- Game Over ---
    function showGameOver(victory) {
        showScene('gameover');
        const canvas = $('gameover-canvas');
        const ctx = setupCanvas('gameover-canvas', State.W, State.H);

        $('gameover-title').textContent = victory ? '任务完成' : '任务失败';
        $('gameover-title').className = 'scene-title' + (victory ? ' victory' : '');
        $('final-score').textContent = State.score;
        $('final-level').textContent = State.level + 1;
        $('final-kills').textContent = State.kills;

        function goLoop(time) {
            if (victory) {
                ctx.fillStyle = '#050a08';
                ctx.fillRect(0, 0, State.W, State.H);
                const grad = ctx.createRadialGradient(State.W/2, State.H/2, 0, State.W/2, State.H/2, State.W * 0.5);
                grad.addColorStop(0, 'rgba(0,80,40,0.15)');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, State.W, State.H);
            } else {
                Renderer.drawGameOverBackground(ctx, State.W, State.H, time);
            }
            Renderer.updateStars(1/60);
            Renderer.drawStars(ctx, 0);
            if (State.currentScene === 'gameover') {
                State.menuAnimFrame = requestAnimationFrame(goLoop);
            }
        }
        State.menuAnimFrame = requestAnimationFrame(goLoop);

        $('btn-retry').onclick = () => {
            audio.playMenuClick();
            cancelAnimationFrame(State.menuAnimFrame);
            startGame();
        };
        $('btn-menu').onclick = () => {
            audio.playMenuClick();
            cancelAnimationFrame(State.menuAnimFrame);
            startMenu();
        };
    }

    // --- Settings ---
    function toggleSettings() {
        let overlay = document.querySelector('.settings-overlay');
        if (overlay) {
            overlay.remove();
            return;
        }

        overlay = document.createElement('div');
        overlay.className = 'settings-overlay active';
        overlay.innerHTML = `
            <div class="settings-panel">
                <h3>系统设置</h3>
                <div class="setting-row">
                    <span>音乐音量</span>
                    <input type="range" id="set-bgm" min="0" max="100" value="${audio.bgmVolume * 100}">
                </div>
                <div class="setting-row">
                    <span>音效音量</span>
                    <input type="range" id="set-sfx" min="0" max="100" value="${audio.sfxVolume * 100}">
                </div>
                <div style="margin-top:1.5rem;text-align:center;">
                    <button class="sci-fi-btn" id="set-close" data-text="关闭" style="width:200px;margin:0 auto;">关闭</button>
                </div>
            </div>
        `;
        document.getElementById('game-wrapper').appendChild(overlay);

        $('set-bgm').oninput = (e) => audio.setBGMVolume(e.target.value / 100);
        $('set-sfx').oninput = (e) => audio.setSFXVolume(e.target.value / 100);
        $('set-close').onclick = () => {
            audio.playMenuClick();
            overlay.remove();
        };
    }

    // --- Input Handling ---
    function initInput() {
        // --- Mouse control (primary) ---
        // Disable right-click context menu
        document.addEventListener('contextmenu', e => {
            if (State.currentScene === 'game') e.preventDefault();
        });

        // Mouse tracking
        document.addEventListener('mousemove', e => {
            State._mouseX = e.clientX;
            State._mouseY = e.clientY;
        });

        // Left click = fire, Right click = ultimate weapon
        document.addEventListener('mousedown', e => {
            if (State.currentScene !== 'game' || State.paused || State.upgradeOpen) return;
            audio.resume();
            if (e.button === 0) {
                State.input.fire = true;
            } else if (e.button === 2) {
                useUltimateWeapon();
            }
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 0) State.input.fire = false;
        });

        // --- Keyboard (fallback for menu navigation + Esc) ---
        document.addEventListener('keydown', e => {
            if (State._introSkip) return;
            audio.resume();

            switch (e.code) {
                case 'Escape':
                    if (State.currentScene === 'game' && !State.upgradeOpen) {
                        State.paused = !State.paused;
                        if (State.paused) openUpgradePanel(false);
                    }
                    break;
                case 'Space':
                    if (State.currentScene !== 'game') e.preventDefault();
                    break;
            }
        });

        // --- Touch controls (mobile) ---
        let touchId = null;
        document.addEventListener('touchstart', e => {
            audio.resume();
            if (State.currentScene === 'game' && e.touches.length > 0) {
                e.preventDefault();
                const touch = e.touches[0];
                State.input.fire = true;
                touchId = touch.identifier;
                State._mouseX = touch.clientX;
                State._mouseY = touch.clientY;
            }
        }, { passive: false });

        document.addEventListener('touchmove', e => {
            if (State.currentScene === 'game' && touchId !== null) {
                e.preventDefault();
                for (const touch of e.changedTouches) {
                    if (touch.identifier === touchId) {
                        State._mouseX = touch.clientX;
                        State._mouseY = touch.clientY;
                    }
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', e => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === touchId) {
                    touchId = null;
                    State.input.fire = false;
                }
            }
        });

        // --- Gamepad ---
        window.addEventListener('gamepadconnected', e => {
            State._gamepadId = e.gamepad.index;
        });
        window.addEventListener('gamepaddisconnected', e => {
            if (State._gamepadId === e.gamepad.index) State._gamepadId = null;
        });
    }

    function updateGamepadInput() {
        const gamepads = navigator.getGamepads();
        if (!gamepads || !State._gamepadId) return;
        const gp = gamepads[State._gamepadId];
        if (!gp) return;
        const deadzone = 0.2;
        const dx = gp.axes[0] || 0;
        const dy = gp.axes[1] || 0;
        if (Math.abs(dx) > deadzone) State._mouseX = State.player.x + dx * 200;
        if (Math.abs(dy) > deadzone) State._mouseY = State.player.y + dy * 200;
        if (gp.buttons[5] && gp.buttons[5].pressed) State.input.fire = true;
        else State.input.fire = false;
    }

    // --- Resize ---
    window.addEventListener('resize', () => {
        State.W = window.innerWidth;
        State.H = window.innerHeight;
        if (State.currentScene === 'game') {
            resizeGame();
            if (State.player) {
                State.player.x = Math.min(State.player.x, State.W - State.player.width / 2);
                State.player.y = Math.min(State.player.y, State.H - State.player.height / 2);
            }
        }
    });

    // --- Check for AIGC assets ---
    function loadAssets() {
        // Renderer loads manifest; check after a short delay
        setTimeout(() => {
            if (Renderer._manifest && Renderer._manifest.intro_video) {
                State.introVideoUrl = Renderer._manifest.intro_video;
            }
        }, 500);
    }

    // --- Init ---
    function init() {
        State.W = window.innerWidth;
        State.H = window.innerHeight;
        Renderer.init(State.W, State.H);
        initInput();
        loadAssets();
        startIntro();
    }

    // Start when DOM is ready
    window.onerror = function(msg, url, line, col, err) {
        console.error('Global error:', msg, 'at line', line);
        // Show error on screen for debugging
        const errEl = document.getElementById('debug-error');
        if (errEl) {
            errEl.textContent = msg + ' (line ' + line + ')';
            errEl.style.display = 'block';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();