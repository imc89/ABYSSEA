/**
 * FISH CLASS (CANVAS OPTIMIZED)
 * [ES] Entidad inteligente de pez marino con algoritmo de cardumen (Boids) optimizado.
 * [EN] Intelligent marine fish entity with optimized schooling algorithm (Boids).
 */

class Fish {
    constructor(config, groupIndex) {
        this.config = config;
        this.groupIndex = groupIndex;

        // CONVERSIÓN AUTOMÁTICA: metros → game units (Mínimo forzado de 45m para evitar colisión visual con la base)
        this.minProf = Math.max(45, config.minProf) * WORLD.depthScale;
        this.maxProf = Math.max(this.minProf / WORLD.depthScale + 1, config.maxProf) * WORLD.depthScale;

        // Posición inicial DENTRO del rango de profundidad
        this.x = Math.random() * WORLD.width;
        this.y = this.minProf + Math.random() * (this.maxProf - this.minProf);

        // Velocidad inicial
        this.vx = (Math.random() - 0.5) * 2.0;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.currentAngle = Math.atan2(this.vy, this.vx); // Ángulo visual para giros suaves

        // Propiedades visuales
        const sizeVariation = 0.8 + Math.random() * 0.4;
        if (config.ancho && config.alto) {
            this.width = config.ancho * sizeVariation;
            this.height = config.alto * sizeVariation;
            this.size = Math.max(this.width, this.height) / 2;
        } else {
            this.size = (15 + Math.random() * 10) * (config.escala || 1);
            this.width = this.size * 2;
            this.height = this.size;
        }

        this.maxSpeed = config.velocidadBase + Math.random() * 0.5;
        this.sonarDetection = 0;
        this.timeOffset = Math.random() * 10000;
        this.fleeing = false;

        // Image loading (Canvas only)
        this.img = new Image();
        this.img.src = config.imagen;

        // Cache para gradientes
        this._glowCache = {};

        // Asignación de profundidad (Z-Index relativo a criaturas gigantes)
        // 40% de los peces irán por delante, 60% por detrás
        this.isForeground = Math.random() < 0.4;
    }

    update(others, player, canvas, dtMult = 1.0) {
        const PERCEPTION = 240;  // Percepción ampliada para detectar a la escuela completa y formar ríos
        const SEP_RADIUS = 45;   // Separación ideal para no chocarse pero ir compactos
        const MAX_FORCE = 0.05;  // Giros suaves y majestuosos, cero movimientos robóticos
        const MIN_SPEED = this.maxSpeed * 0.4;

        if (this.config.esCardumen && others) {
            if (this._steerX === undefined) this._steerX = 0;
            if (this._steerY === undefined) this._steerY = 0;

            // OPTIMIZACIÓN: Solo recalcular IA periódicamente
            if (Math.random() < (window.WORLD.aiThrottleRate || 0.3)) {
                let sepX = 0, sepY = 0;
                let aliX = 0, aliY = 0;
                let cohX = 0, cohY = 0;
                let count = 0;

                for (let i = 0; i < others.length; i++) {
                    const other = others[i];
                    if (other === this || !other.isSimulated) continue;

                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const dSq = dx * dx + dy * dy;

                    if (dSq < PERCEPTION * PERCEPTION && dSq > 0) {
                        const d = Math.sqrt(dSq);

                        // Separación (Repulsión)
                        if (d < SEP_RADIUS) {
                            sepX -= (dx / d) * (SEP_RADIUS - d) / SEP_RADIUS;
                            sepY -= (dy / d) * (SEP_RADIUS - d) / SEP_RADIUS;
                        }

                        aliX += other.vx;
                        aliY += other.vy;
                        cohX += other.x;
                        cohY += other.y;
                        count++;
                    }
                }

                if (count > 0) {
                    aliX /= count;
                    aliY /= count;
                    cohX = (cohX / count - this.x);
                    cohY = (cohY / count - this.y);

                    // Normalizar y aplicar fuerzas (Pesos balanceados para "Schooling" fluido real)
                    const magCoh = Math.sqrt(cohX * cohX + cohY * cohY) || 1;
                    const magAli = Math.sqrt(aliX * aliX + aliY * aliY) || 1;

                    // Weights: 
                    // - Separación (2.2): vital para no superponerse.
                    // - Alineación (1.2): fuerza principal para que naden paralelos como un río.
                    // - Cohesión (0.8): los mantiene juntos atrayéndolos al centro de masa.
                    this._steerX = (sepX * 2.2) + (aliX / magAli) * 1.2 + (cohX / magCoh) * 0.8;
                    this._steerY = (sepY * 2.2) + (aliY / magAli) * 1.2 + (cohY / magCoh) * 0.8;

                    // Micro-turbulencia natural: evita que las trayectorias sean líneas perfectas
                    this._steerX += (Math.random() - 0.5) * 0.15;
                    this._steerY += (Math.random() - 0.5) * 0.15;

                    // Limitar fuerza total
                    const steerMag = Math.sqrt(this._steerX * this._steerX + this._steerY * this._steerY);
                    if (steerMag > MAX_FORCE) {
                        this._steerX = (this._steerX / steerMag) * MAX_FORCE;
                        this._steerY = (this._steerY / steerMag) * MAX_FORCE;
                    }
                } else {
                    this._steerX *= 0.9; // Decaimiento si no hay vecinos
                    this._steerY *= 0.9;
                }
            }

            this.vx += this._steerX * dtMult;
            this.vy += this._steerY * dtMult;
        }

        // Límites de profundidad (Suavizado)
        if (this.y < this.minProf) this.vy += 0.08 * dtMult;
        if (this.y > this.maxProf) this.vy -= 0.08 * dtMult;

        let currentMaxSpeed = this.maxSpeed;

        // Comportamiento de huida condicional
        // Solo huyen si el submarino está en movimiento activo (generando ruido/corrientes)
        const playerIsMoving = Math.abs(player.vx) > 0.15 || Math.abs(player.vy) > 0.15;

        if (this.config.huyeDelJugador && playerIsMoving) {
            const dxP = this.x - player.x;
            const dyP = this.y - (player.y + 50); // Ajuste al centro del submarino
            const distSqP = dxP * dxP + dyP * dyP;
            const fleeRadius = 600; // Radio amplio de detección de amenaza

            if (distSqP < fleeRadius * fleeRadius) {
                const d = Math.sqrt(distSqP) || 1;
                // Fuerza de huida suave y natural
                const force = (1 - d / fleeRadius) * 1.2;
                this.vx += (dxP / d) * force * dtMult;
                this.vy += (dyP / d) * force * dtMult;
                this.fleeing = true;
                // Aumento de velocidad orgánico (nado un poco más rápido de lo normal)
                currentMaxSpeed = this.maxSpeed * 1.6;
            } else {
                this.fleeing = false;
            }
        } else {
            this.fleeing = false;
            // Si no huyen, su IA o velocidad natural sigue su curso, 
            // permitiendo nadar tranquilamente al lado del submarino sin inmutarse ni rotar agresivamente.
        }

        // --- DEAMBULACIÓN ORGÁNICA (Wander) ---
        // Genera curvas sinuosas lentamente para que el banco serpenteé como en un documental
        // y no nade siempre en línea recta infinita.
        const timeFactor = Date.now() * 0.0003 + this.timeOffset;
        this.vx += Math.cos(timeFactor) * 0.012 * dtMult;
        this.vy += Math.sin(timeFactor * 0.8) * 0.008 * dtMult;

        // Limitador de velocidad dinámico
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > currentMaxSpeed) {
            this.vx = (this.vx / speed) * currentMaxSpeed;
            this.vy = (this.vy / speed) * currentMaxSpeed;
        } else if (speed < MIN_SPEED) {
            this.vx = (this.vx / speed) * MIN_SPEED;
            this.vy = (this.vy / speed) * MIN_SPEED;
        }

        // --- CÁLCULO DE ROTACIÓN SUAVE (BANKING) ---
        // En lugar de hacer snap (giro instantáneo) hacia donde va el pez, 
        // interpolamos su ángulo visual de rotación buscando el camino más corto.
        const targetAngle = Math.atan2(this.vy, this.vx);
        let angleDiff = targetAngle - this.currentAngle;

        // Normalizar la diferencia a [-PI, PI] para no girar hacia el lado largo
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Suavizado angular: el pez tiene masa y necesita tiempo para girar su cuerpo
        this.currentAngle += angleDiff * 0.1 * dtMult;

        this.x += this.vx * dtMult;
        this.y += this.vy * dtMult;

        // --- COLISIONES FÍSICAS RÍGIDAS ---

        // Bloqueo de ascenso: Colisión con el casco de la Base (Sincronizado con el submarino a 16m)
        const BASE_HARD_LIMIT = 160;
        if (this.y < BASE_HARD_LIMIT) {
            this.y = BASE_HARD_LIMIT;
            if (this.vy < 0) this.vy *= -0.2; // Rebote muy leve
        }

        // Envolvimiento horizontal
        if (this.x < -100) this.x = WORLD.width + 100;
        if (this.x > WORLD.width + 100) this.x = -100;

        if (player.sonarActive) {
            const dS = distanceSq(this.x, this.y, player.x, player.y);
            const d = Math.sqrt(dS);
            if (Math.abs(d - player.sonarRadius) < 50) {
                this.sonarDetection = 1.0;
            }
        }
        this.sonarDetection *= Math.pow(0.96, dtMult);
    }

    draw(ctx, camera, imageCache, player, canvas) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Culling visual
        const margin = Math.max(this.width, this.height, 100);
        if (sy < -margin || sy > canvas.height + margin ||
            sx < -margin || sx > canvas.width + margin) {
            return false;
        }

        // Efecto Sónar
        if (this.sonarDetection > 0.05) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${this.sonarDetection})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, this.size + (1 - this.sonarDetection) * 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Visibilidad ambiental
        const depthMeters = this.y / WORLD.depthScale;
        let ambientAlpha = 1.0;
        if (depthMeters > 200 && depthMeters <= 1000) {
            ambientAlpha = 1 - (depthMeters - 200) / 800;
        } else if (depthMeters > 1000) {
            ambientAlpha = 0;
        }

        // Iluminación del foco — dot-product en lugar de Math.atan2 (mismo método que Particle.js)
        const lightOriginY = player.y + WORLD.lightOffsetY;
        const dxL = this.x - player.x;
        const dyL = this.y - lightOriginY;
        const dSq = dxL * dxL + dyL * dyL;
        let lightIntensity = 0;
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;

        if (player.lightOn && mainBattery > 0 && dSq < WORLD.lightSpotRange * WORLD.lightSpotRange) {
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
            const cosLook = Math.cos(lookDir);
            const sinLook = Math.sin(lookDir);

            // dot product de (dx,dy) normalizado con dirección del foco
            const dist = Math.sqrt(dSq);
            const dotVal = (dxL / dist) * cosLook + (dyL / dist) * sinLook;
            const cosThreshold = Math.cos(WORLD.lightAngle);

            if (dotVal >= cosThreshold) {
                // Dentro del cono principal
                const dotEdge = Math.cos(WORLD.lightAngle * 0.8);
                const edgeFade = Math.max(0, 1 - (cosThreshold - dotVal) / (cosThreshold - dotEdge) * 5);
                lightIntensity = dotVal >= dotEdge ? 1.0 : edgeFade;
            } else if (dSq < WORLD.lightGlowRange * WORLD.lightGlowRange) {
                lightIntensity = (1 - dist / WORLD.lightGlowRange) * WORLD.lightGlowIntensity;
            }
        }

        const alpha = Math.max(ambientAlpha, lightIntensity * (player.lightFlickerIntensity || 1.0));

        if (alpha > 0.01 || this.config.numLuces > 0) {
            const angleRad = this.currentAngle;
            const isFlipped = Math.cos(angleRad) < 0;

            // 1. Luces de fondo (Back lights)
            this._drawLights(ctx, sx, sy, angleRad, isFlipped, 'back');

            // 2. Cuerpo del pez — ctx.setTransform es ~3× más rápido que save/translate/rotate/restore
            if (this.img.complete) {
                const cosA = Math.cos(angleRad);
                const sinA = Math.sin(angleRad);
                const scaleY = isFlipped ? -1 : 1;
                const hw = this.width / 2;
                const hh = this.height / 2;

                ctx.globalAlpha = alpha;
                // setTransform(a, b, c, d, e, f) = [cosA, sinA*scaleY, -sinA, cosA*scaleY, sx, sy]
                ctx.setTransform(cosA, sinA * scaleY, -sinA, cosA * scaleY, sx, sy);
                ctx.drawImage(this.img, -hw, -hh, this.width, this.height);
                ctx.resetTransform();
                ctx.globalAlpha = 1;
            }

            // 3. Luces frontales (Front lights)
            this._drawLights(ctx, sx, sy, angleRad, isFlipped, 'front');

            return true;
        }
        return false;
    }

    _drawLights(ctx, sx, sy, angleRad, isFlipped, layer) {
        if (!this.config.numLuces) return;

        for (let i = 1; i <= this.config.numLuces; i++) {
            const capa = this.config[`capaluz${i}`] || 'back';
            if (capa !== layer) continue;

            const pos = this.config[`posluz${i}`];
            const power = this.config[`powerluz${i}`];
            const color = this.config[`colorluz${i}`] || this.config.colorluz;
            const onof = this.config[`onofluz${i}`];

            let isLightOn = true;
            if (onof) {
                const sleep = this.config[`sleepluz${i}`] || 1000;
                isLightOn = Math.floor((Date.now() + this.timeOffset) / sleep) % 2 === 0;
            }

            if (isLightOn && pos) {
                const pulse = 0.8 + Math.sin(Date.now() * 0.005 + i) * 0.2;
                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(angleRad);
                if (isFlipped) ctx.scale(1, -1);

                ctx.globalAlpha = pulse;

                // Simulación de brillo (Glow)
                if (window.WORLD.drawFishGlows) {
                    const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, power);
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.fillRect(pos.x - power, pos.y - power, power * 2, power * 2);
                } else {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, power * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.Fish = Fish;
}
