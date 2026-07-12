/* ============================================
   STAR DEFENSE - Entity System
   Player, enemies, bullets, particles, powerups
   ============================================ */

// --- Ship Definitions ---
const SHIP_DEFS = {
    interceptor: {
        name: '闪电拦截机',
        speed: 7, fireRate: 8, bulletDamage: 8, bulletSpeed: 12,
        hp: 80, energy: 100, width: 40, height: 50,
        bulletPattern: 'single'
    },
    fighter: {
        name: '暴风战斗机',
        speed: 5, fireRate: 6, bulletDamage: 12, bulletSpeed: 10,
        hp: 120, energy: 120, width: 50, height: 55,
        bulletPattern: 'dual'
    },
    bomber: {
        name: '毁灭轰炸舰',
        speed: 3.5, fireRate: 4, bulletDamage: 25, bulletSpeed: 8,
        hp: 200, energy: 150, width: 60, height: 65,
        bulletPattern: 'spread'
    }
};

// --- Level Definitions ---
const LEVEL_DEFS = [
    {
        id: 1, name: '前哨遭遇',
        desc: '侦察编队已侦测到敌方活动信号',
        bgTint: 'rgba(0,40,80,0.1)',
        enemies: [
            { type: 'scout', weight: 80 },
            { type: 'fighter', weight: 20 }
        ],
        spawnRate: 0.6,
        enemySpeedMult: 1,
        enemyHpMult: 1,
        killTarget: 10,
        boss: { type: 'boss_1', hp: 500, width: 140, height: 120 }
    },
    {
        id: 2, name: '深空伏击',
        desc: '警告：进入高危区域，大量敌军集结',
        bgTint: 'rgba(40,0,60,0.1)',
        enemies: [
            { type: 'scout', weight: 30 },
            { type: 'fighter', weight: 60 },
            { type: 'cruiser', weight: 10 }
        ],
        spawnRate: 0.5,
        enemySpeedMult: 1.15,
        enemyHpMult: 1.3,
        killTarget: 15,
        boss: { type: 'boss_1', hp: 900, width: 150, height: 130 }
    },
    {
        id: 3, name: '虫巢核心',
        desc: '敌方母巢防御系统全面激活',
        bgTint: 'rgba(60,20,0,0.1)',
        enemies: [
            { type: 'fighter', weight: 40 },
            { type: 'cruiser', weight: 40 },
            { type: 'elite', weight: 20 }
        ],
        spawnRate: 0.4,
        enemySpeedMult: 1.3,
        enemyHpMult: 1.6,
        killTarget: 20,
        boss: { type: 'boss_2', hp: 1200, width: 160, height: 140 }
    },
    {
        id: 4, name: '终焉之战',
        desc: '终极歼灭者已苏醒，全舰进入战斗状态',
        bgTint: 'rgba(80,0,0,0.12)',
        enemies: [
            { type: 'cruiser', weight: 30 },
            { type: 'elite', weight: 50 },
            { type: 'fighter', weight: 20 }
        ],
        spawnRate: 0.35,
        enemySpeedMult: 1.5,
        enemyHpMult: 2.0,
        killTarget: 25,
        boss: { type: 'boss_2', hp: 2000, width: 180, height: 160 }
    }
];

// --- Enemy Definitions ---
const ENEMY_DEFS = {
    scout:   { hp: 20,  speed: 3.5, width: 30, height: 30, score: 10,  credits: 5,  fireRate: 0,  bulletSpeed: 0,  bulletDamage: 0 },
    fighter: { hp: 50,  speed: 2.5, width: 40, height: 40, score: 25,  credits: 15, fireRate: 2.5, bulletSpeed: 5,  bulletDamage: 8 },
    cruiser: { hp: 120, speed: 1.8, width: 55, height: 50, score: 50,  credits: 30, fireRate: 1.8, bulletSpeed: 4,  bulletDamage: 12 },
    elite:   { hp: 200, speed: 2.2, width: 50, height: 50, score: 80,  credits: 50, fireRate: 1.2, bulletSpeed: 6,  bulletDamage: 15 }
};

// --- Entity Classes ---
class Player {
    constructor(shipType) {
        const def = SHIP_DEFS[shipType];
        Object.assign(this, def);
        this.shipType = shipType;
        this.x = 0;
        this.y = 0;
        this.maxHp = def.hp;
        this.hp = def.hp;
        this.maxEnergy = def.energy;
        this.energy = def.energy;
        this.fireCooldown = 0;
        this.invincible = 0;
        this._hitFlash = 0;
        this.upgrades = { fire: 0, speed: 0, shield: 0 };
    }

    getEffectiveSpeed() {
        return this.speed * (1 + this.upgrades.speed * 0.1);
    }

    getEffectiveDamage() {
        return this.bulletDamage * (1 + this.upgrades.fire * 0.15);
    }

    getEffectiveHp() {
        return this.maxHp + this.upgrades.shield * 30;
    }

    update(dt, input) {
        const spd = this.getEffectiveSpeed() * dt * 60;
        if (input.left) this.x -= spd;
        if (input.right) this.x += spd;
        if (input.up) this.y -= spd;
        if (input.down) this.y += spd;

        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.invincible > 0) this.invincible -= dt;
        if (this._hitFlash > 0) this._hitFlash -= dt * 3;

        // Energy regen
        this.energy = Math.min(this.maxEnergy, this.energy + 3 * dt);
    }

    canShoot() {
        return this.fireCooldown <= 0;
    }

    shoot() {
        this.fireCooldown = 1 / this.fireRate;
        const bullets = [];
        const dmg = this.getEffectiveDamage();
        const spd = this.bulletSpeed;
        const pattern = this.bulletPattern;
        const lvl = this.upgrades.fire;

        if (pattern === 'single') {
            bullets.push({ x: this.x, y: this.y - this.height * 0.5, vx: 0, vy: -spd, damage: dmg, size: 3 });
            if (lvl >= 1) {
                bullets.push({ x: this.x - 8, y: this.y - this.height * 0.3, vx: 0, vy: -spd, damage: dmg * 0.7, size: 2.5 });
                bullets.push({ x: this.x + 8, y: this.y - this.height * 0.3, vx: 0, vy: -spd, damage: dmg * 0.7, size: 2.5 });
            }
        } else if (pattern === 'dual') {
            bullets.push({ x: this.x - 12, y: this.y - this.height * 0.3, vx: 0, vy: -spd, damage: dmg, size: 3 });
            bullets.push({ x: this.x + 12, y: this.y - this.height * 0.3, vx: 0, vy: -spd, damage: dmg, size: 3 });
            if (lvl >= 1) {
                bullets.push({ x: this.x, y: this.y - this.height * 0.5, vx: 0, vy: -spd * 1.1, damage: dmg * 0.8, size: 3.5 });
            }
        } else if (pattern === 'spread') {
            bullets.push({ x: this.x, y: this.y - this.height * 0.5, vx: 0, vy: -spd, damage: dmg, size: 4 });
            if (lvl >= 0 || true) {
                const angle = 0.15;
                bullets.push({ x: this.x - 15, y: this.y - this.height * 0.3, vx: -spd * Math.sin(angle), vy: -spd * Math.cos(angle), damage: dmg * 0.7, size: 3 });
                bullets.push({ x: this.x + 15, y: this.y - this.height * 0.3, vx: spd * Math.sin(angle), vy: -spd * Math.cos(angle), damage: dmg * 0.7, size: 3 });
            }
            if (lvl >= 2) {
                const angle2 = 0.3;
                bullets.push({ x: this.x - 20, y: this.y - this.height * 0.2, vx: -spd * Math.sin(angle2), vy: -spd * Math.cos(angle2), damage: dmg * 0.5, size: 2.5 });
                bullets.push({ x: this.x + 20, y: this.y - this.height * 0.2, vx: spd * Math.sin(angle2), vy: -spd * Math.cos(angle2), damage: dmg * 0.5, size: 2.5 });
            }
        }

        return bullets;
    }

    takeDamage(amount) {
        if (this.invincible > 0) return false;
        this.hp -= amount;
        this._hitFlash = 1;
        this.invincible = 0.5;
        return true;
    }

    getBounds() {
        return {
            x: this.x - this.width * 0.3,
            y: this.y - this.height * 0.4,
            w: this.width * 0.6,
            h: this.height * 0.8
        };
    }
}

class Enemy {
    constructor(type, x, y, levelMult) {
        const def = ENEMY_DEFS[type];
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = def.hp * levelMult.enemyHpMult;
        this.maxHp = this.hp;
        this.speed = def.speed * levelMult.enemySpeedMult;
        this.width = def.width;
        this.height = def.height;
        this.score = def.score;
        this.credits = def.credits;
        this.fireRate = def.fireRate;
        this.bulletSpeed = def.bulletSpeed;
        this.bulletDamage = def.bulletDamage;
        this.fireCooldown = Math.random() * def.fireRate;
        this.movePattern = this._getMovePattern();
        this.moveTimer = Math.random() * Math.PI * 2;
        this.originX = x;
        this.dead = false;
    }

    _getMovePattern() {
        if (this.type === 'scout') return 'zigzag';
        if (this.type === 'fighter') return 'sine';
        if (this.type === 'cruiser') return 'slow_approach';
        return 'circle';
    }

    update(dt, W, H) {
        if (this._hitFlash > 0) this._hitFlash -= dt * 4;
        this.moveTimer += dt * 2;
        const spd = this.speed * dt * 60;

        switch (this.movePattern) {
            case 'zigzag':
                this.y += spd;
                this.x += Math.sin(this.moveTimer * 3) * spd * 0.8;
                break;
            case 'sine':
                this.y += spd * 0.8;
                this.x = this.originX + Math.sin(this.moveTimer) * 60;
                break;
            case 'slow_approach':
                this.y += spd * 0.5;
                break;
            case 'circle':
                this.y += spd * 0.3;
                this.x = this.originX + Math.cos(this.moveTimer) * 40;
                break;
        }

        // Keep in bounds
        this.x = Math.max(this.width / 2, Math.min(W - this.width / 2, this.x));

        // Firing
        if (this.fireRate > 0) {
            this.fireCooldown -= dt;
        }

        // Off screen
        if (this.y > H + 50) this.dead = true;
    }

    canShoot() {
        return this.fireRate > 0 && this.fireCooldown <= 0;
    }

    shoot(playerX, playerY) {
        this.fireCooldown = this.fireRate * (0.8 + Math.random() * 0.4);
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return {
            x: this.x,
            y: this.y + this.height * 0.4,
            vx: (dx / dist) * this.bulletSpeed,
            vy: (dy / dist) * this.bulletSpeed,
            damage: this.bulletDamage,
            size: 4,
            color: this.type === 'elite' ? '#ffd700' : '#ff4444'
        };
    }

    takeDamage(amount) {
        this.hp -= amount;
        this._hitFlash = 1;
        if (this.hp <= 0) {
            this.dead = true;
            return true; // killed
        }
        return false;
    }

    getBounds() {
        return {
            x: this.x - this.width * 0.4,
            y: this.y - this.height * 0.4,
            w: this.width * 0.8,
            h: this.height * 0.8
        };
    }
}

class Boss {
    constructor(def, x, y, levelMult) {
        this.type = def.type;
        this.x = x;
        this.y = -100;
        this.targetY = 100;
        this.hp = def.hp * levelMult.enemyHpMult;
        this.maxHp = this.hp;
        this.width = def.width;
        this.height = def.height;
        this.score = 500 * def.hp / 500;
        this.credits = 300;
        this.phase = 'entering';
        this.moveTimer = 0;
        this.fireTimer = 0;
        this.patternIndex = 0;
        this.dead = false;
        this.def = def;
        this.levelMult = levelMult;
    }

    update(dt, W, playerX, playerY) {
        this.moveTimer += dt;

        if (this.phase === 'entering') {
            this.y += 1.5 * dt * 60;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.phase = 'active';
            }
            return [];
        }

        // Movement
        const centerX = W / 2;
        this.x = centerX + Math.sin(this.moveTimer * 0.5) * (W * 0.25);

        // Shooting patterns
        this.fireTimer += dt;
        const bullets = [];

        if (this.type === 'boss_1') {
            if (this.fireTimer > 0.8) {
                this.fireTimer = 0;
                // Spread shot
                for (let i = -2; i <= 2; i++) {
                    const angle = Math.PI / 2 + i * 0.25;
                    bullets.push({
                        x: this.x, y: this.y + this.height * 0.4,
                        vx: Math.cos(angle) * 4,
                        vy: Math.sin(angle) * 4,
                        damage: 10, size: 5, color: '#ff4444'
                    });
                }
            }
            // Aimed shot
            if (Math.floor(this.moveTimer * 2) % 5 === 0) {
                const dx = playerX - this.x;
                const dy = playerY - this.y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                bullets.push({
                    x: this.x, y: this.y + this.height * 0.3,
                    vx: (dx / d) * 6, vy: (dy / d) * 6,
                    damage: 15, size: 6, color: '#ff0044'
                });
            }
        } else if (this.type === 'boss_2') {
            // Phase 1: Spiral
            if (this.hp > this.maxHp * 0.5) {
                if (this.fireTimer > 0.15) {
                    this.fireTimer = 0;
                    const a = this.moveTimer * 3;
                    bullets.push({
                        x: this.x, y: this.y + this.height * 0.3,
                        vx: Math.cos(a) * 3.5,
                        vy: Math.sin(a) * 3.5 + 1,
                        damage: 8, size: 4, color: '#aa44ff'
                    });
                    bullets.push({
                        x: this.x, y: this.y + this.height * 0.3,
                        vx: Math.cos(a + Math.PI) * 3.5,
                        vy: Math.sin(a + Math.PI) * 3.5 + 1,
                        damage: 8, size: 4, color: '#00ff88'
                    });
                }
            } else {
                // Phase 2: Barrage + spiral
                if (this.fireTimer > 0.1) {
                    this.fireTimer = 0;
                    const a = this.moveTimer * 5;
                    for (let i = 0; i < 3; i++) {
                        const aa = a + i * (Math.PI * 2 / 3);
                        bullets.push({
                            x: this.x, y: this.y + this.height * 0.2,
                            vx: Math.cos(aa) * 3,
                            vy: Math.sin(aa) * 3 + 1.5,
                            damage: 10, size: 4, color: '#ff44ff'
                        });
                    }
                }
                // Aimed barrage
                if (Math.floor(this.moveTimer * 3) % 8 === 0) {
                    for (let i = -1; i <= 1; i++) {
                        const dx = playerX - this.x + i * 30;
                        const dy = playerY - this.y;
                        const d = Math.sqrt(dx * dx + dy * dy) || 1;
                        bullets.push({
                            x: this.x + i * 20, y: this.y + this.height * 0.3,
                            vx: (dx / d) * 5, vy: (dy / d) * 5,
                            damage: 12, size: 5, color: '#00ff88'
                        });
                    }
                }
            }
        }

        return bullets;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.dead = true;
            return true;
        }
        return false;
    }

    getBounds() {
        return {
            x: this.x - this.width * 0.4,
            y: this.y - this.height * 0.35,
            w: this.width * 0.8,
            h: this.height * 0.7
        };
    }
}

// --- Particle System ---
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawnExplosion(x, y, count, color, sizeRange) {
        const sr = sizeRange || [2, 6];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                type: 'explosion',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: sr[0] + Math.random() * (sr[1] - sr[0]),
                color: color || '#ffaa44'
            });
        }
        // Sparks
        for (let i = 0; i < count * 0.5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                type: 'spark',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.04 + Math.random() * 0.03,
                color: color || '#00f0ff'
            });
        }
    }

    spawnBigExplosion(x, y) {
        this.spawnExplosion(x, y, 40, '#ff6622', [3, 12]);
        this.spawnExplosion(x, y, 20, '#ffcc00', [2, 8]);
        // Debris
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 0.5;
            this.particles.push({
                type: 'debris',
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + 1,
                life: 1,
                decay: 0.008 + Math.random() * 0.008,
                size: 3 + Math.random() * 5,
                angle: Math.random() * Math.PI * 2,
                angVel: (Math.random() - 0.5) * 0.2,
                color: ['#666', '#888', '#554433', '#444'][Math.floor(Math.random() * 4)]
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += (p.vx || 0) * dt * 60;
            p.y += (p.vy || 0) * dt * 60;
            p.life -= p.decay * dt * 60;
            if (p.angle !== undefined) p.angle += (p.angVel || 0) * dt * 60;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        Renderer.drawParticles(ctx, this.particles);
    }
}

// --- PowerUp ---
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'fire', 'speed', 'shield', 'score'
        this.speed = 1.5;
        this.dead = false;
        this.size = 14;
    }

    update(dt) {
        this.y += this.speed * dt * 60;
        if (this.y > 800) this.dead = true;
    }

    getBounds() {
        return { x: this.x - this.size, y: this.y - this.size, w: this.size * 2, h: this.size * 2 };
    }
}

// --- Collision Detection ---
function rectIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function circleRectIntersect(cx, cy, cr, r) {
    const closestX = Math.max(r.x, Math.min(cx, r.x + r.w));
    const closestY = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
}