/**
 * FISH CLASS
 * [ES] Entidad inteligente de pez marino con algoritmo de cardumen (Boids) optimizado y sensibilidad estricta a rangos de profundidad.
 * [EN] Intelligent marine fish entity with optimized schooling algorithm (Boids) and strict sensitivity to depth ranges.
 */

class Fish {
    constructor(config, groupIndex) {
        this.config = config;
        this.groupIndex = groupIndex;

        // CONVERSIÓN AUTOMÁTICA: metros → game units
        this.minProf = config.minProf * WORLD.depthScale;
        this.maxProf = config.maxProf * WORLD.depthScale;

        // Posición inicial DENTRO del rango de profundidad
        this.x = Math.random() * WORLD.width;
        this.y = this.minProf + Math.random() * (this.maxProf - this.minProf);

        // Velocidad inicial
        this.vx = (Math.random() - 0.5) * 2.0;
        this.vy = (Math.random() - 0.5) * 1.5;

        // Propiedades visuales
        const sizeVariation = 0.8 + Math.random() * 0.4; // Variación aleatoria de +/- 20%

        if (config.ancho && config.alto) {
            this.width = config.ancho * sizeVariation;
            this.height = config.alto * sizeVariation;
            this.size = Math.max(this.width, this.height) / 2; // Aproximación para físicas/colisiones
        } else {
            this.size = (15 + Math.random() * 10) * (config.escala || 1);
            this.width = this.size * 2;
            this.height = this.size;
        }

        this.maxSpeed = config.velocidadBase + Math.random() * 0.5;

        // Estado del sónar
        this.sonarDetection = 0;

        // Offset de tiempo único para que no todos los peces parpadeen a la misma vez
        this.timeOffset = Math.random() * 10000;

        // Estado de huida para efectos sonoros
        this.fleeing = false;

        // DOM Element setup para rendering nativo de GIFs sin CORS
        // Modificación (Lazy Load): Este elemento se anexará posteriormente para ahorrar RAM/CPU
        this.domElement = document.createElement('img');
        this.domElement.src = config.imagen;
        this.domElement.style.position = 'absolute';
        this.domElement.style.pointerEvents = 'none';
        this.domElement.style.display = 'none';
        this.domElement.style.width = `${this.width}px`;
        this.domElement.style.height = `${this.height}px`;
        this.domElement.style.transformOrigin = "50% 50%";

        this.isLazyLoaded = false;
        
        // Inicializar el array de luces del DOM (se annexan lazily en draw())
        this.lightElements = [];
        if (config.numLuces > 0) {
            for (let i = 1; i <= config.numLuces; i++) {
                const capa = config[`capaluz${i}`] || 'back';
                if (capa === 'front') {
                    const lightPulse = document.createElement('div');
                    lightPulse.style.position = 'absolute';
                    lightPulse.style.pointerEvents = 'none';
                    lightPulse.style.borderRadius = '50%';
                    lightPulse.style.zIndex = '5';
                    this.lightElements[i] = lightPulse;
                }
            }
        }
    }

    /**
     * [ES] Aplica matemáticas destructivas solo si es verdaderamente necesario desmontarlo de cámara.
     * [EN] Destructive math applies only if really needed to unmount.
     */
    hideDOM() {
        if (this.domElement && this.domElement.style.display !== 'none') {
            this.domElement.style.display = 'none';
        }
        
        if (this.lightElements) {
            for (let i = 1; i < this.lightElements.length; i++) {
                if (this.lightElements[i] && this.lightElements[i].style.display !== 'none') {
                    this.lightElements[i].style.display = 'none';
                }
            }
        }
    }

    /**
     * [ES] Lógica iterativa del espécimen. Calcula comportamiento grupal (cohesión, alineación, separación), huida del cazador y colisión de bordes oceánicos.
     * [EN] Iterative logic of the specimen. Calculates group behavior (cohesion, alignment, separation), hunter fleeing, and ocean border collision.
     */
    update(others, player, canvas, dtMult = 1.0) {
        const PERCEPTION = 180;  // Radio de percepción del vecindario
        const SEP_RADIUS = 45;   // Radio de separación personal
        const MAX_FORCE = 0.04; // Fuerza máxima de dirección por tick
        const MIN_SPEED = this.maxSpeed * 0.4; // Velocidad mínima — siempre nadando

        // COMPORTAMIENTO DE CARDUMEN (solo si esCardumen = true)
        if (this.config.esCardumen) {
            // OPTIMIZACIÓN CPU: Reducir coste algorítmico computando la IA el ~25% de las veces
            // Guarda el vector de escape/dirección anterior y lo reaplica en ciclos 'inactivos' de pensar
            if (this._steerX === undefined) this._steerX = 0;
            if (this._steerY === undefined) this._steerY = 0;

            if (Math.random() < window.WORLD.aiThrottleRate) {
                let sepX = 0, sepY = 0;
                let aliX = 0, aliY = 0;
                let cohX = 0, cohY = 0;
                let count = 0;

                for (let other of others) {
                    if (other === this ||
                        other.config.id !== this.config.id ||
                        other.groupIndex !== this.groupIndex) continue;

                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const dSq = dx * dx + dy * dy;

                    if (dSq < PERCEPTION * PERCEPTION && dSq > 0) {
                        const d = Math.sqrt(dSq);

                        // Separación: repulsión suave con caída cuadrática inversa
                        if (d < SEP_RADIUS) {
                            const strength = (SEP_RADIUS - d) / SEP_RADIUS; // 1 muy cerca, 0 en borde
                            sepX -= (dx / d) * strength * strength;
                            sepY -= (dy / d) * strength * strength;
                        }

                        // Alineación y cohesión solo en radio lejano
                        aliX += other.vx;
                        aliY += other.vy;
                        cohX += other.x;
                        cohY += other.y;
                        count++;
                    }
                }

                if (count > 0) {
                    // --- Alineación: Vel. deseada = vel. media del grupo ---
                    const aliDesX = (aliX / count);
                    const aliDesY = (aliY / count);

                    // --- Cohesión: Vel. deseada = dirección al centroide ---
                    const cxTarget = cohX / count;
                    const cyTarget = cohY / count;
                    const cohDist = Math.sqrt((cxTarget - this.x) * (cxTarget - this.x) + (cyTarget - this.y) * (cyTarget - this.y));
                    const cohDesX = cohDist > 0 ? (cxTarget - this.x) / cohDist * this.maxSpeed : 0;
                    const cohDesY = cohDist > 0 ? (cyTarget - this.y) / cohDist * this.maxSpeed : 0;

                    // --- Separación: Ya normalizada por fuerza ---
                    const sepMag = Math.sqrt(sepX * sepX + sepY * sepY);
                    const sepNX = sepMag > 0 ? sepX / sepMag : 0;
                    const sepNY = sepMag > 0 ? sepY / sepMag : 0;

                    // Acumulación de fuerzas ponderadas → steering suave (limitado a MAX_FORCE)
                    let steerX = sepNX * 0.7 + (aliDesX - this.vx) * 0.3 + (cohDesX - this.vx) * 0.15;
                    let steerY = sepNY * 0.7 + (aliDesY - this.vy) * 0.3 + (cohDesY - this.vy) * 0.15;

                    // Limitar la fuerza de steering para suavidad
                    const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
                    if (steerMag > MAX_FORCE) {
                        steerX = (steerX / steerMag) * MAX_FORCE;
                        steerY = (steerY / steerMag) * MAX_FORCE;
                    }

                    this._steerX = steerX;
                    this._steerY = steerY;
                }
            }

            this.vx += this._steerX * dtMult;
            this.vy += this._steerY * dtMult;
        }

        // FUERZA DE WANDER orgánica — oscilación suave independiente para cada pez
        const t = (Date.now() * 0.0008) + this.timeOffset;
        this.vx += Math.sin(t * 1.3) * 0.008 * dtMult;
        this.vy += Math.cos(t * 0.97) * 0.005 * dtMult;

        // EVITAR AL JUGADOR
        if (this.config.huyeDelJugador !== false) {
            const dSqPlayer = distanceSq(this.x, this.y, player.x, player.y + WORLD.lightOffsetY);
            if (dSqPlayer < 40000) { // 200 * 200
                const dPlayer = Math.sqrt(dSqPlayer);
                const ang = Math.atan2(this.y - player.y, this.x - player.x);
                const fleeStr = Math.max(0, 1 - dPlayer / 200) * 0.4 * dtMult;
                this.vx += Math.cos(ang) * fleeStr;
                this.vy += Math.sin(ang) * fleeStr;

                // Solo reproducir sonido al empezar a huir
                if (!this.fleeing) {
                    this.fleeing = true;
                    GlobalAudioPool.play('fish_escape', 0.05);
                }
            } else {
                this.fleeing = false;
            }
        }

        // LÍMITES DE PROFUNDIDAD
        const absoluteRoof = 200;
        const effectiveMinProf = Math.max(this.minProf, absoluteRoof);

        if (this.y < effectiveMinProf) {
            const strength = (effectiveMinProf - this.y) * 0.05 * dtMult;
            this.vy += Math.min(strength, 1.0);
            if (this.y < absoluteRoof) {
                this.y = absoluteRoof;
                if (this.vy < 0) this.vy *= -0.5;
            }
        }
        if (this.y > this.maxProf) {
            const strength = (this.y - this.maxProf) * 0.01 * dtMult;
            this.vy -= Math.min(strength, 0.5);
        }

        // LÍMITES HORIZONTALES
        const canvasWidth = canvas ? canvas.width : 1600;
        const edgeMargin = 100;
        const maxForce = 0.4;

        if (this.x < edgeMargin) {
            this.vx += ((edgeMargin - this.x) / edgeMargin) * maxForce * dtMult;
            if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx) * 0.5; }
        }
        if (this.x > canvasWidth - edgeMargin) {
            this.vx -= ((this.x - (canvasWidth - edgeMargin)) / edgeMargin) * maxForce * dtMult;
            if (this.x > canvasWidth) { this.x = canvasWidth; this.vx = -Math.abs(this.vx) * 0.5; }
        }

        // LÍMITE DE VELOCIDAD (techo)
        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx *= this.maxSpeed / speed;
            this.vy *= this.maxSpeed / speed;
        }

        // VELOCIDAD MÍNIMA — el pez nunca se queda quieto
        speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed < MIN_SPEED && speed > 0) {
            this.vx = (this.vx / speed) * MIN_SPEED;
            this.vy = (this.vy / speed) * MIN_SPEED;
        } else if (speed === 0) {
            // Pez "muerto" — darle un empujón en la dirección de wander
            this.vx = Math.sin(t) * MIN_SPEED;
            this.vy = Math.cos(t * 0.7) * MIN_SPEED * 0.3;
        }

        // ACTUALIZAR POSICIÓN
        this.x += this.vx * dtMult;
        this.y += this.vy * dtMult;

        // DETECCIÓN POR SÓNAR
        if (player.sonarActive) {
            const distToPlayerForSonarSq = distanceSq(this.x, this.y, player.x, player.y + WORLD.lightOffsetY);
            // Optimización: si no está cerca, evitarnos hacer Math.sqrt
            const maxRadiusSq = (player.sonarRadius + 150) * (player.sonarRadius + 150);
            const minRadiusSq = (player.sonarRadius - 150) * (player.sonarRadius - 150);
            if (distToPlayerForSonarSq > minRadiusSq && distToPlayerForSonarSq < maxRadiusSq) {
                 const distToPlayerForSonar = Math.sqrt(distToPlayerForSonarSq);
                 if (Math.abs(distToPlayerForSonar - player.sonarRadius) < 120) {
                     this.sonarDetection = 1.0;
                 }
            }
        }
        this.sonarDetection *= Math.pow(0.96, dtMult);  // Decaimiento del efecto
    }

    /**
     * [ES] Sistema visual dual. Renderiza un DOM HTML <img> sobre el lienzo rotando con CSS. Calcula relámpagos de espécimen (luces abisales) en Canvas si tiene.
     * [EN] Dual visual system. Renders a HTML DOM <img> floating over canvas rotating with CSS. Calculates specimen flashes (abyssal lights) on Canvas if any.
     */
    draw(ctx, camera, imageCache, player, canvas) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Culling visual - no dibujar si está fuera de la pantalla
        // (Damos un margen extra usando WORLD.lightSpotRange para que la luz que desprendan se vea entrar)
        if (sy < -WORLD.lightSpotRange * 2 || sy > canvas.height + WORLD.lightSpotRange * 2 ||
            sx < -WORLD.lightSpotRange * 2 || sx > canvas.width + WORLD.lightSpotRange * 2) {
            this.hideDOM();
            return false;
        }

        // Lazy DOM Append
        if (typeof document !== 'undefined' && !this.isLazyLoaded) {
            const container = document.getElementById('fish-layer');
            if (container) {
                container.appendChild(this.domElement);
                if (this.lightElements) {
                    for(let i = 1; i < this.lightElements.length; i++) {
                        if (this.lightElements[i]) container.appendChild(this.lightElements[i]);
                    }
                }
                this.isLazyLoaded = true;
            }
        }

        // EFECTO VISUAL DEL SÓNAR (se dibuja en el canvas)
        if (this.sonarDetection > 0.05) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${this.sonarDetection})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 15 + (1 - this.sonarDetection) * 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        // CÁLCULO DE VISIBILIDAD BASADO EN ZONAS CIENTÍFICAS
        const depthMeters = this.y / WORLD.depthScale;
        let ambientAlpha = 1.0;
        if (depthMeters > 200 && depthMeters <= 1000) {
            ambientAlpha = 1 - (depthMeters - 200) / 800;
        } else if (depthMeters > 1000) {
            ambientAlpha = 0;
        }
        const dSq = distanceSq(this.x, this.y, player.x, player.y + WORLD.lightOffsetY);

        // Dentro del cono = opacidad plena. La caída ocurre en los bordes angulares y al salir del rango.
        let lightIntensity = 0;
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
        if (player.lightOn && mainBattery > 0 && dSq < WORLD.lightSpotRange * WORLD.lightSpotRange) {
            const dist = Math.sqrt(dSq);
            const angToFish = Math.atan2(
                this.y - (player.y + WORLD.lightOffsetY),
                this.x - player.x
            );
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
            
            const MathAngleDelta = clampAngleDelta(angToFish,lookDir);

            if (MathAngleDelta < WORLD.lightAngle) {
                // El pez está dentro del cono: plena visibilidad.
                // Solo fade suave en el borde angular del cono (último 20% del ángulo)
                const edgeFade = Math.max(0, 1 - (MathAngleDelta / WORLD.lightAngle - 0.8) / 0.2);
                lightIntensity = Math.min(1, edgeFade + 0.0001) > 0.8 ? 1.0 : edgeFade;
            } else if (dist < WORLD.lightGlowRange) {
                // Halo radial mínimo solo para peces MUY cercanos al submarino
                lightIntensity = (1 - dist / WORLD.lightGlowRange) * WORLD.lightGlowIntensity;
            }
        }
        const isLit = lightIntensity > 0;
        const hasOwnLight = this.config.numLuces > 0;

        // Solo dibujar si hay suficiente luz o si tiene luz el propio pez
        if (ambientAlpha > 0.1 || isLit || hasOwnLight) {
            // Dibujar las luces bioluminiscentes
            if (hasOwnLight) {
                const angleRad = Math.atan2(this.vy, this.vx);
                const isFlipped = this.vx < 0;

                for (let i = 1; i <= this.config.numLuces; i++) {
                    const pos = this.config[`posluz${i}`];
                    const power = this.config[`powerluz${i}`];
                    const colorAttr = i === 1 ? (this.config.colorluz1 || this.config.colorluz) : this.config[`colorluz${i}`];
                    const color = colorAttr || this.config.colorluz;
                    const capa = this.config[`capaluz${i}`] || 'back';

                    if (pos && power && color) {
                        let isLightOn = true;
                        const onof = this.config[`onofluz${i}`];

                        if (onof) {
                            const sleep = this.config[`sleepluz${i}`] || 1000;
                            const timeCycle = Math.floor((Date.now() + this.timeOffset) / sleep) % 2;
                            isLightOn = (timeCycle === 0);
                        }

                        if (isLightOn) {
                            const pulse = 0.8 + Math.sin(Date.now() * 0.005 + i) * 0.2;

                            if (capa === 'back') {
                                // Dibujar en Canvas (Capa trasera)
                                ctx.save();
                                ctx.translate(sx, sy);
                                ctx.rotate(angleRad);
                                if (isFlipped) ctx.scale(1, -1);

                                // OPTIMIZACIÓN EXTREMA para nivel BAJO: Dos círculos superpuestos o usar el HD solo cuando es iluminado
                                let useHDGlow = window.WORLD.drawFishGlows;

                                // Si estamos en calidad BAJA pero el pez está muy iluminado por el jugador,
                                // le devolvemos transitoriamente el gráfico de alta calidad por estética
                                if (!useHDGlow && typeof this.isIlluminated !== 'undefined' && this.isIlluminated && this.illuminationFactor > 0.6) {
                                    useHDGlow = true;
                                }

                                if (!useHDGlow) {
                                    // 1. Halo extendido muy tenue
                                    ctx.globalAlpha = pulse * 0.15;
                                    ctx.fillStyle = color;
                                    ctx.beginPath();
                                    ctx.arc(pos.x, pos.y, power * 0.8, 0, Math.PI * 2);
                                    ctx.fill();

                                    // 2. Núcleo más brillante y pequeño
                                    ctx.globalAlpha = pulse * 0.45;
                                    ctx.beginPath();
                                    ctx.arc(pos.x, pos.y, power * 0.35, 0, Math.PI * 2);
                                    ctx.fill();
                                } else {
                                    // NIVEL MEDIO/ALTO o Pez iluminado directamente: Usa el canvas hd en cache con degradados
                                    if (!this._glowCache) this._glowCache = {};
                                    const cacheKey = `${power}_${color}`;

                                    if (!this._glowCache[cacheKey]) {
                                        this._glowCache[cacheKey] = createPreRenderedRadialGradient(power, [
                                            { stop: 0, color: color },
                                            { stop: 1, color: 'transparent' }
                                        ]);
                                    }

                                    if (this._glowCache[cacheKey]) {
                                        ctx.globalAlpha = pulse;
                                        ctx.drawImage(this._glowCache[cacheKey], pos.x - power, pos.y - power);
                                    }
                                }

                                ctx.restore();
                            } else if (capa === 'front' && this.lightElements[i]) {
                                // Dibujar en DOM (Capa delantera) — OPTIMIZADO PARA PREVENIR DOM THRASHING
                                const el = this.lightElements[i];
                                
                                // Propiedades constantes y caras (solo se setean una vez)
                                if (!el._isInitialized) {
                                    el.style.display = 'block';
                                    el.style.width = `${power * 2}px`;
                                    el.style.height = `${power * 2}px`;
                                    el.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
                                    el._isInitialized = true;
                                }

                                // Redondear opacidad a 2 decimales para evitar seteos continuos
                                const rPulse = Math.round(pulse * 100) / 100;
                                if (el._lastOpacity !== rPulse) {
                                    el.style.opacity = rPulse;
                                    el._lastOpacity = rPulse;
                                }

                                // Calcular posición relativa rotada
                                let lx = pos.x;
                                let ly = isFlipped ? -pos.y : pos.y;

                                const cos = Math.cos(angleRad);
                                const sin = Math.sin(angleRad);

                                const rx = lx * cos - ly * sin;
                                const ry = lx * sin + ly * cos;

                                // Limitar actualizaciones del transform a pixeles enteros
                                const transX = Math.round(sx + rx - power);
                                const transY = Math.round(sy + ry - power);
                                const rTransform = `translate3d(${transX}px, ${transY}px, 0)`;
                                
                                if (el._lastTransform !== rTransform) {
                                    el.style.transform = rTransform;
                                    el._lastTransform = rTransform;
                                }
                            }
                        } else {
                            if (this.lightElements[i] && this.lightElements[i].style.display !== 'none') {
                                this.lightElements[i].style.display = 'none';
                                this.lightElements[i]._isInitialized = false; // Reset para posible cambio visual al reactivarse
                            }
                        }
                    }
                }
            }

            if (this.domElement) {
                this.domElement.style.display = 'block';

                // Ángulo en grados para CSS rotate
                const MathAngleDeg = Math.atan2(this.vy, this.vx) * (180 / Math.PI);

                // Si va a la izquierda, flip vertical (scaleY) porque el pez está rotado.
                const flip = this.vx < 0 ? 'scaleY(-1)' : '';
                
                // CACHING: Only apply DOM writes when numbers change significantly
                const renderX = Math.round(sx - this.width / 2);
                const renderY = Math.round(sy - this.height / 2);
                const renderAngle = Math.round(MathAngleDeg * 10) / 10; // Redondear angulo a 1 decimal
                
                const newTransform = `translate3d(${renderX}px, ${renderY}px, 0) rotate(${renderAngle}deg) ${flip}`;
                if (this._lastTransform !== newTransform) {
                    this.domElement.style.transform = newTransform;
                    this._lastTransform = newTransform;
                }

                // Opacidad: plena dentro del cono, se va oscureciendo al salir
                let alpha = isLit
                    ? Math.max(ambientAlpha, player.lightFlickerIntensity * lightIntensity)
                    : ambientAlpha;
                
                alpha = Math.round(Math.min(1, alpha) * 100) / 100; // a 2 decimales
                if (this._lastOpacity !== alpha) {
                    this.domElement.style.opacity = alpha;
                    this._lastOpacity = alpha;
                }
            }
            return true;
        } else {
            this.hideDOM();
            return false;
        }
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Fish = Fish;
}
