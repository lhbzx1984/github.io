/* ============================================
   STAR DEFENSE - Renderer
   Canvas rendering engine with ship drawing,
   particles, stars, and visual effects
   ============================================ */

const Renderer = {
    // Cached ship images
    _shipCache: {},
    _enemyCache: {},
    _bgCanvas: null,
    _stars: [],
    _aigcImages: {},
    _aigcLoaded: false,

    init(w, h) {
        this.W = w;
        this.H = h;
        this._initStars();
        this._preRenderBackgrounds();
        this._loadAIGCImages();
    },

    _loadAIGCImages() {
        if (this._aigcLoaded) return;
        this._aigcLoaded = true;
        this._imagesLoaded = false;
        const shipKeys = ['ship_interceptor', 'ship_fighter', 'ship_bomber'];
        const enemyKeys = ['enemy_scout', 'enemy_fighter', 'enemy_cruiser', 'enemy_elite', 'boss_1', 'boss_2'];
        const otherKeys = ['space_bg'];
        const allKeys = [...shipKeys, ...enemyKeys, ...otherKeys];
        let loaded = 0;
        const total = allKeys.length;

        const onImageReady = () => {
            loaded++;
            if (loaded >= total) this._imagesLoaded = true;
        };

        try {
            fetch('assets/manifest.json')
                .then(r => r.json())
                .then(manifest => {
                    this._manifest = manifest;
                    for (const key of allKeys) {
                        if (manifest[key]) {
                            const img = new Image();
                            img.src = manifest[key];
                            img.onload = () => {
                                this._aigcImages[key] = img;
                                onImageReady();
                            };
                            img.onerror = () => onImageReady();
                        } else {
                            onImageReady();
                        }
                    }
                })
                .catch(() => {});
        } catch(e) {}
    },

    // --- Star field ---
    _initStars() {
        this._stars = [];
        for (let i = 0; i < 200; i++) {
            this._stars.push({
                x: Math.random() * this.W,
                y: Math.random() * this.H,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 1.5 + 0.3,
                brightness: Math.random() * 0.7 + 0.3
            });
        }
    },

    updateStars(dt) {
        for (const s of this._stars) {
            s.y += s.speed * dt * 60;
            if (s.y > this.H) {
                s.y = -2;
                s.x = Math.random() * this.W;
            }
        }
    },

    drawStars(ctx, scrollY) {
        for (const s of this._stars) {
            ctx.globalAlpha = s.brightness;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    // --- Backgrounds ---
    _preRenderBackgrounds() {
        // Pre-render space nebula background
        this._bgCanvas = document.createElement('canvas');
        this._bgCanvas.width = this.W;
        this._bgCanvas.height = this.H;
        const c = this._bgCanvas.getContext('2d');

        // Base dark
        c.fillStyle = '#050a14';
        c.fillRect(0, 0, this.W, this.H);

        // Nebula blobs
        const nebulae = [
            { x: this.W * 0.2, y: this.H * 0.3, r: 300, color: 'rgba(0,60,120,0.15)' },
            { x: this.W * 0.8, y: this.H * 0.6, r: 250, color: 'rgba(80,0,120,0.12)' },
            { x: this.W * 0.5, y: this.H * 0.8, r: 350, color: 'rgba(0,80,80,0.1)' },
        ];
        for (const n of nebulae) {
            const grad = c.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
            grad.addColorStop(0, n.color);
            grad.addColorStop(1, 'transparent');
            c.fillStyle = grad;
            c.fillRect(0, 0, this.W, this.H);
        }
    },

    drawBackground(ctx, scrollY) {
        // Try AIGC background image first
        const aigcBg = this._aigcImages['space_bg'];
        if (aigcBg) {
            const y = scrollY % (aigcBg.height || this.H);
            ctx.globalAlpha = 0.35;
            ctx.drawImage(aigcBg, 0, y - (aigcBg.height || this.H));
            ctx.drawImage(aigcBg, 0, y);
            ctx.globalAlpha = 1;
        } else if (this._bgCanvas) {
            const y = scrollY % this.H;
            ctx.drawImage(this._bgCanvas, 0, y - this.H);
            ctx.drawImage(this._bgCanvas, 0, y);
        }
    },

    // --- Player Ships ---
    drawPlayerShip(ctx, ship, x, y, w, h) {
        ctx.save();
        ctx.translate(x, y);

        const shipType = (typeof ship === 'string') ? ship : ship.shipType;
        const aigcKey = 'ship_' + shipType;

        // Try AIGC image first
        const aigcImg = this._aigcImages[aigcKey];
        if (aigcImg) {
            ctx.drawImage(aigcImg, -w / 2, -h / 2, w, h);
            // Engine glow effect on top
            const glowSize = 6 + Math.sin(Date.now() * 0.01) * 2;
            const engineGrad = ctx.createRadialGradient(0, h * 0.45, 0, 0, h * 0.45, glowSize * 2);
            engineGrad.addColorStop(0, 'rgba(0,200,255,0.6)');
            engineGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = engineGrad;
            ctx.fillRect(-glowSize * 2, h * 0.3, glowSize * 4, glowSize * 3);
        } else {
            // Fallback: procedural drawing
            this._drawPlayerProcedural(ctx, shipType, w, h);
        }

        // Shield shimmer (when hit recently)
        if (ship._hitFlash > 0) {
            ctx.globalAlpha = ship._hitFlash * 0.4;
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 0.7, h * 0.6, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    },

    _drawPlayerProcedural(ctx, shipType, w, h) {
        // Engine glow
        const glowSize = 8 + Math.sin(Date.now() * 0.01) * 3;
        const engineGrad = ctx.createRadialGradient(0, h * 0.45, 0, 0, h * 0.45, glowSize * 2);
        engineGrad.addColorStop(0, 'rgba(0,200,255,0.8)');
        engineGrad.addColorStop(0.5, 'rgba(0,100,255,0.3)');
        engineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = engineGrad;
        ctx.fillRect(-glowSize * 2, h * 0.3, glowSize * 4, glowSize * 3);

        // Engine flame
        ctx.fillStyle = '#00ccff';
        ctx.beginPath();
        ctx.moveTo(-w * 0.15, h * 0.4);
        ctx.lineTo(0, h * 0.4 + glowSize * 1.5);
        ctx.lineTo(w * 0.15, h * 0.4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-w * 0.06, h * 0.4);
        ctx.lineTo(0, h * 0.4 + glowSize);
        ctx.lineTo(w * 0.06, h * 0.4);
        ctx.fill();

        if (shipType === 'interceptor') this._drawInterceptor(ctx, w, h);
        else if (shipType === 'fighter') this._drawFighter(ctx, w, h);
        else if (shipType === 'bomber') this._drawBomber(ctx, w, h);
    },

    _drawInterceptor(ctx, w, h) {
        // Sleek delta wing
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#e0f0ff');
        grad.addColorStop(0.5, '#4488cc');
        grad.addColorStop(1, '#1a3355');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);           // Nose
        ctx.lineTo(w * 0.15, -h * 0.1);
        ctx.lineTo(w * 0.5, h * 0.35);     // Right wing tip
        ctx.lineTo(w * 0.2, h * 0.4);
        ctx.lineTo(w * 0.12, h * 0.45);
        ctx.lineTo(-w * 0.12, h * 0.45);
        ctx.lineTo(-w * 0.2, h * 0.4);
        ctx.lineTo(-w * 0.5, h * 0.35);    // Left wing tip
        ctx.lineTo(-w * 0.15, -h * 0.1);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#00ccff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.15, w * 0.08, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Edge highlight
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.15, -h * 0.1);
        ctx.lineTo(w * 0.5, h * 0.35);
        ctx.stroke();
    },

    _drawFighter(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#f0f4ff');
        grad.addColorStop(0.4, '#8899bb');
        grad.addColorStop(1, '#334466');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.2, -h * 0.15);
        ctx.lineTo(w * 0.45, h * 0.1);     // Right wing
        ctx.lineTo(w * 0.4, h * 0.2);
        ctx.lineTo(w * 0.25, h * 0.15);
        ctx.lineTo(w * 0.2, h * 0.4);
        ctx.lineTo(w * 0.1, h * 0.45);
        ctx.lineTo(-w * 0.1, h * 0.45);
        ctx.lineTo(-w * 0.2, h * 0.4);
        ctx.lineTo(-w * 0.25, h * 0.15);
        ctx.lineTo(-w * 0.4, h * 0.2);
        ctx.lineTo(-w * 0.45, h * 0.1);
        ctx.lineTo(-w * 0.2, -h * 0.15);
        ctx.closePath();
        ctx.fill();

        // Weapon pods
        ctx.fillStyle = '#667799';
        ctx.fillRect(w * 0.3, -h * 0.05, w * 0.15, h * 0.2);
        ctx.fillRect(-w * 0.45, -h * 0.05, w * 0.15, h * 0.2);

        // Cockpit
        ctx.fillStyle = '#00eeff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.15, w * 0.09, h * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Edge lines
        ctx.strokeStyle = '#aabbdd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.2, -h * 0.15);
        ctx.lineTo(w * 0.45, h * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(-w * 0.2, -h * 0.15);
        ctx.lineTo(-w * 0.45, h * 0.1);
        ctx.stroke();
    },

    _drawBomber(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#ccc');
        grad.addColorStop(0.4, '#666');
        grad.addColorStop(1, '#333');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.45);
        ctx.lineTo(w * 0.2, -h * 0.2);
        ctx.lineTo(w * 0.5, h * 0.0);
        ctx.lineTo(w * 0.45, h * 0.15);
        ctx.lineTo(w * 0.35, h * 0.35);
        ctx.lineTo(w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.35, h * 0.35);
        ctx.lineTo(-w * 0.45, h * 0.15);
        ctx.lineTo(-w * 0.5, h * 0.0);
        ctx.lineTo(-w * 0.2, -h * 0.2);
        ctx.closePath();
        ctx.fill();

        // Orange accent stripes
        ctx.fillStyle = '#ff8800';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(-w * 0.35, h * 0.05, w * 0.7, h * 0.04);
        ctx.fillRect(-w * 0.25, h * 0.15, w * 0.5, h * 0.03);
        ctx.globalAlpha = 1;

        // Heavy turrets
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(-w * 0.3, h * 0.0, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w * 0.3, h * 0.0, w * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#ffaa00';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.15, w * 0.1, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Quad engines
        for (const ex of [-0.2, -0.08, 0.08, 0.2]) {
            const flicker = 5 + Math.sin(Date.now() * 0.012 + ex * 20) * 3;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(w * (ex - 0.04), h * 0.43);
            ctx.lineTo(w * ex, h * 0.43 + flicker * 1.3);
            ctx.lineTo(w * (ex + 0.04), h * 0.43);
            ctx.fill();
        }
    },

    // --- Enemy Ships ---
    drawEnemyShip(ctx, type, x, y, w, h, hp, maxHp, hitFlash) {
        ctx.save();
        ctx.translate(x, y);

        // Try AIGC image first
        const aigcImg = this._aigcImages['enemy_' + type] || this._aigcImages[type];
        if (aigcImg && (type === 'scout' || type === 'fighter' || type === 'cruiser' || type === 'elite')) {
            ctx.drawImage(aigcImg, -w / 2, -h / 2, w, h);
        } else if (aigcImg && (type === 'boss_1' || type === 'boss_2')) {
            ctx.drawImage(aigcImg, -w / 2, -h / 2, w, h);
            // Draw HP bar for boss
            if (hp !== undefined && maxHp) {
                const barW = w * 0.8;
                const barH = 6;
                const barY = -h * 0.5 - 15;
                ctx.fillStyle = '#ffffff10';
                ctx.fillRect(-barW / 2, barY, barW, barH);
                const ratio = Math.max(0, hp / maxHp);
                ctx.fillStyle = type === 'boss_1' ? '#ff2244' : '#aa44ff';
                ctx.fillRect(-barW / 2, barY, barW * ratio, barH);
                ctx.strokeStyle = '#ffffff22';
                ctx.lineWidth = 1;
                ctx.strokeRect(-barW / 2, barY, barW, barH);
            }
        } else {
            // Fallback: procedural drawing
            if (type === 'scout') this._drawScout(ctx, w, h);
            else if (type === 'fighter') this._drawEnemyFighter(ctx, w, h);
            else if (type === 'cruiser') this._drawCruiser(ctx, w, h);
            else if (type === 'elite') this._drawElite(ctx, w, h);
            else if (type === 'boss_1') this._drawBoss1(ctx, w, h, hp, maxHp);
            else if (type === 'boss_2') this._drawBoss2(ctx, w, h, hp, maxHp);
        }

        // Hit flash overlay
        if (hitFlash > 0) {
            ctx.globalAlpha = hitFlash * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    },

    _drawScout(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#ff4444');
        grad.addColorStop(1, '#661111');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.4);
        ctx.lineTo(w * 0.35, h * 0.3);
        ctx.lineTo(0, h * 0.15);
        ctx.lineTo(-w * 0.35, h * 0.3);
        ctx.closePath();
        ctx.fill();

        // Red eye
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -h * 0.1, w * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    },

    _drawEnemyFighter(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#cc2233');
        grad.addColorStop(1, '#331111');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.2, -h * 0.1);
        ctx.lineTo(w * 0.5, h * 0.2);
        ctx.lineTo(w * 0.3, h * 0.4);
        ctx.lineTo(0, h * 0.3);
        ctx.lineTo(-w * 0.3, h * 0.4);
        ctx.lineTo(-w * 0.5, h * 0.2);
        ctx.lineTo(-w * 0.2, -h * 0.1);
        ctx.closePath();
        ctx.fill();

        // Spikes
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.2);
        ctx.lineTo(w * 0.55, h * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w * 0.5, h * 0.2);
        ctx.lineTo(-w * 0.55, h * 0.35);
        ctx.stroke();
    },

    _drawCruiser(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#8844aa');
        grad.addColorStop(1, '#223322');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.4);
        ctx.lineTo(w * 0.3, -h * 0.15);
        ctx.lineTo(w * 0.5, h * 0.1);
        ctx.lineTo(w * 0.4, h * 0.35);
        ctx.lineTo(w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.4, h * 0.35);
        ctx.lineTo(-w * 0.5, h * 0.1);
        ctx.lineTo(-w * 0.3, -h * 0.15);
        ctx.closePath();
        ctx.fill();

        // Green weapon ports
        ctx.fillStyle = '#00ff44';
        ctx.shadowColor = '#00ff44';
        ctx.shadowBlur = 6;
        for (const px of [-0.3, 0, 0.3]) {
            ctx.beginPath();
            ctx.arc(w * px, h * 0.05, w * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    },

    _drawElite(ctx, w, h) {
        const grad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.5, '#886622');
        grad.addColorStop(1, '#332200');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.25, -h * 0.2);
        ctx.lineTo(w * 0.45, h * 0.0);
        ctx.lineTo(w * 0.4, h * 0.3);
        ctx.lineTo(w * 0.15, h * 0.45);
        ctx.lineTo(0, h * 0.35);
        ctx.lineTo(-w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.4, h * 0.3);
        ctx.lineTo(-w * 0.45, h * 0.0);
        ctx.lineTo(-w * 0.25, -h * 0.2);
        ctx.closePath();
        ctx.fill();

        // Shield ring
        ctx.strokeStyle = 'rgba(255,215,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.55, h * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Ornate lines
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.25, -h * 0.2);
        ctx.lineTo(w * 0.45, 0);
        ctx.stroke();
    },

    _drawBoss1(ctx, w, h, hp, maxHp) {
        // Massive biomechanical boss
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
        grad.addColorStop(0, '#aa2244');
        grad.addColorStop(0.7, '#441122');
        grad.addColorStop(1, '#220011');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.45);
        ctx.lineTo(w * 0.3, -h * 0.25);
        ctx.lineTo(w * 0.5, -h * 0.05);
        ctx.lineTo(w * 0.45, h * 0.2);
        ctx.lineTo(w * 0.3, h * 0.4);
        ctx.lineTo(w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.15, h * 0.45);
        ctx.lineTo(-w * 0.3, h * 0.4);
        ctx.lineTo(-w * 0.45, h * 0.2);
        ctx.lineTo(-w * 0.5, -h * 0.05);
        ctx.lineTo(-w * 0.3, -h * 0.25);
        ctx.closePath();
        ctx.fill();

        // Energy cores
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,0,50,${pulse})`;
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(-w * 0.2, -h * 0.05, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(w * 0.2, -h * 0.05, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, h * 0.15, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // HP bar for boss
        if (hp !== undefined && maxHp) {
            const barW = w * 0.8;
            const barH = 6;
            const barY = -h * 0.5 - 15;
            ctx.fillStyle = '#ffffff10';
            ctx.fillRect(-barW / 2, barY, barW, barH);
            const ratio = Math.max(0, hp / maxHp);
            const hpGrad = ctx.createLinearGradient(-barW / 2, 0, -barW / 2 + barW * ratio, 0);
            hpGrad.addColorStop(0, '#ff2244');
            hpGrad.addColorStop(1, '#ff6644');
            ctx.fillStyle = hpGrad;
            ctx.fillRect(-barW / 2, barY, barW * ratio, barH);
            ctx.strokeStyle = '#ff224466';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barW / 2, barY, barW, barH);
        }
    },

    _drawBoss2(ctx, w, h, hp, maxHp) {
        // Colossal overlord with tentacles
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.5);
        grad.addColorStop(0, '#8822aa');
        grad.addColorStop(0.6, '#442266');
        grad.addColorStop(1, '#110033');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tentacles
        const time = Date.now() * 0.002;
        ctx.strokeStyle = '#aa44ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * w * 0.35, Math.sin(angle) * h * 0.3);
            const cx = Math.cos(angle) * w * 0.55;
            const cy = Math.sin(angle) * h * 0.5;
            const ex = Math.cos(angle + 0.3) * w * 0.7;
            const ey = Math.sin(angle + 0.3) * h * 0.6;
            ctx.quadraticCurveTo(cx, cy, ex, ey);
            ctx.stroke();

            // Weapon pod at end
            ctx.fillStyle = '#00ff88';
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(ex, ey, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Central eye
        const eyePulse = Math.sin(time * 2) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(0,255,136,${eyePulse})`;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#003311';
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Neon veins
        ctx.strokeStyle = 'rgba(0,255,136,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * w * 0.35, Math.sin(a) * h * 0.3);
            ctx.stroke();
        }

        // HP bar
        if (hp !== undefined && maxHp) {
            const barW = w * 0.8;
            const barH = 8;
            const barY = -h * 0.4 - 20;
            ctx.fillStyle = '#ffffff10';
            ctx.fillRect(-barW / 2, barY, barW, barH);
            const ratio = Math.max(0, hp / maxHp);
            const hpGrad = ctx.createLinearGradient(-barW / 2, 0, -barW / 2 + barW * ratio, 0);
            hpGrad.addColorStop(0, '#aa44ff');
            hpGrad.addColorStop(1, '#00ff88');
            ctx.fillStyle = hpGrad;
            ctx.fillRect(-barW / 2, barY, barW * ratio, barH);
            ctx.strokeStyle = '#aa44ff66';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barW / 2, barY, barW, barH);
        }
    },

    // --- Bullets ---
    drawPlayerBullet(ctx, x, y, size, level) {
        ctx.save();
        ctx.translate(x, y);

        // Glow
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3);
        grad.addColorStop(0, 'rgba(0,240,255,0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(-size * 3, -size * 3, size * 6, size * 6);

        // Core
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.4, size * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.2, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    },

    drawEnemyBullet(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        const c = color || '#ff4444';

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
        grad.addColorStop(0, c.replace(')', ',0.4)').replace('rgb', 'rgba'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);

        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    },

    // --- Particles ---
    drawParticles(ctx, particles) {
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            if (p.type === 'explosion') {
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                grad.addColorStop(0, p.color || '#ffaa44');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            } else if (p.type === 'spark') {
                ctx.fillStyle = p.color || '#00f0ff';
                ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
            } else if (p.type === 'debris') {
                ctx.fillStyle = p.color || '#888';
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle || 0);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
    },

    // --- Power-ups ---
    drawPowerUp(ctx, x, y, type, time) {
        ctx.save();
        ctx.translate(x, y);

        const pulse = Math.sin(time * 0.005) * 0.3 + 0.7;
        const rotate = time * 0.002;

        // Outer glow
        const colors = { fire: '#ff8800', speed: '#00ccff', shield: '#00ff88', score: '#ffd700' };
        const c = colors[type] || '#00f0ff';
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = rotate + (i / 6) * Math.PI * 2;
            const r = 14;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Inner icon
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 10;
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { fire: 'F', speed: 'S', shield: 'H', score: '$' };
        ctx.fillText(icons[type] || '+', 0, 0);
        ctx.shadowBlur = 0;

        ctx.restore();
    },

    // --- Intro Scene Background ---
    drawIntroBackground(ctx, w, h, progress) {
        // Deep space with moving stars
        ctx.fillStyle = '#020508';
        ctx.fillRect(0, 0, w, h);

        // Distant nebula
        const nebGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.5);
        nebGrad.addColorStop(0, 'rgba(0,50,100,0.2)');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, w, h);

        // Holographic scan line
        const scanY = (progress * 3 % 1) * h;
        ctx.fillStyle = 'rgba(0,240,255,0.03)';
        ctx.fillRect(0, scanY - 30, w, 60);

        // Vignette
        const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, 'rgba(0,0,0,0.7)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);

        // Corner HUD decorations
        ctx.strokeStyle = 'rgba(0,240,255,0.15)';
        ctx.lineWidth = 1;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(20, 50);
        ctx.lineTo(20, 20);
        ctx.lineTo(50, 20);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(w - 20, h - 50);
        ctx.lineTo(w - 20, h - 20);
        ctx.lineTo(w - 50, h - 20);
        ctx.stroke();
    },

    // --- Menu Background ---
    drawMenuBackground(ctx, w, h, time) {
        ctx.fillStyle = '#050a14';
        ctx.fillRect(0, 0, w, h);

        // Animated nebula
        const nebX = w * 0.3 + Math.sin(time * 0.0003) * 50;
        const nebY = h * 0.4 + Math.cos(time * 0.0004) * 30;
        const nebGrad = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, w * 0.4);
        nebGrad.addColorStop(0, 'rgba(0,80,160,0.12)');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, w, h);

        const neb2X = w * 0.7 + Math.cos(time * 0.0005) * 40;
        const neb2Y = h * 0.6 + Math.sin(time * 0.0003) * 40;
        const neb2Grad = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, w * 0.3);
        neb2Grad.addColorStop(0, 'rgba(100,0,150,0.1)');
        neb2Grad.addColorStop(1, 'transparent');
        ctx.fillStyle = neb2Grad;
        ctx.fillRect(0, 0, w, h);

        // Grid lines (perspective)
        ctx.strokeStyle = 'rgba(0,240,255,0.03)';
        ctx.lineWidth = 1;
        const gridSpacing = 60;
        for (let x = 0; x < w; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        this.drawStars(ctx, 0);
    },

    // --- Hangar Ship Preview ---
    drawHangarShipPreview(canvas, shipType) {
        const ctx = canvas.getContext('2d');
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        ctx.clearRect(0, 0, size, size);

        // Try AIGC image
        const aigcImg = this._aigcImages['ship_' + shipType];
        if (aigcImg) {
            // Draw centered, fitting within the canvas
            const aspect = aigcImg.width / aigcImg.height;
            let dw, dh;
            if (aspect > 1) {
                dw = size * 0.9;
                dh = dw / aspect;
            } else {
                dh = size * 0.9;
                dw = dh * aspect;
            }
            ctx.drawImage(aigcImg, (size - dw) / 2, (size - dh) / 2, dw, dh);
            return;
        }

        // Fallback: procedural
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.scale(0.45, 0.45);

        if (shipType === 'interceptor') this._drawInterceptor(ctx, size, size);
        else if (shipType === 'fighter') this._drawFighter(ctx, size, size);
        else if (shipType === 'bomber') this._drawBomber(ctx, size, size);

        ctx.restore();
    },

    // --- Game Over Background ---
    drawGameOverBackground(ctx, w, h, time) {
        ctx.fillStyle = '#050208';
        ctx.fillRect(0, 0, w, h);

        // Red nebula for failure
        const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
        grad.addColorStop(0, 'rgba(80,0,0,0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Debris particles floating
        ctx.fillStyle = 'rgba(255,100,50,0.3)';
        for (let i = 0; i < 30; i++) {
            const x = ((Math.sin(i * 127.1 + time * 0.0003) + 1) / 2) * w;
            const y = ((Math.cos(i * 311.7 + time * 0.0002) + 1) / 2) * h;
            ctx.fillRect(x, y, 2, 2);
        }
    }
};