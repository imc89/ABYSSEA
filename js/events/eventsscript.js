/**
 * EVENT MANAGER & EVENT CREATURE
 * [ES] Gestiona eventos aleatorios como la aparición de criaturas especiales (Cachalote).
 * [EN] Manages random events such as the appearance of special creatures (Sperm Whale).
 */

class EventCreature {
    static pool = [];

    static get(player, catalogEntry) {
        if (EventCreature.pool.length > 0) {
            const e = EventCreature.pool.pop();
            e.init(player, catalogEntry);
            return e;
        }
        return new EventCreature(player, catalogEntry);
    }

    static release(e) {
        EventCreature.pool.push(e);
    }

    constructor(player, catalogEntry) {
        // [ES] SOLUCIÓN DEFINITIVA MIXTA PARA GIFS EN CANVAS (Chrome/Safari en macOS):
        //   1. El <img> debe estar en el viewport con sus dimensiones reales (1650x663) para cargarse a escala real.
        //   2. Su opacidad debe ser 1.0 (totalmente visible) para evitar que Chromium detenga la animación.
        //   3. Debe estar en primer plano (z-index: 99999) para evitar occlusion culling (el canvas opaco no lo ocluye).
        //   4. Para que sea 100% invisible para el jugador, usamos 'clip-path: circle(2px at 0px 0px)'. Esto recorta la
        //      imagen en el DOM a un círculo diminuto de 2 píxeles en la esquina superior izquierda de la pantalla.
        //   5. Al estar visible y renderizándose en primer plano, el navegador reproduce el GIF a 60 FPS.
        //   6. En el canvas, drawImage() dibuja la ballena leyéndola directamente de este <img> animado,
        //      permitiendo aplicar de forma realista la máscara de iluminación del submarino en su z-index correcto.
        // [EN] MIXED ULTIMATE SOLUTION FOR GIFS IN CANVAS (Chrome/Safari on macOS):
        //   1. The <img> must be inside the viewport with its real dimensions (1650x663) to load at full scale.
        //   2. Its opacity must be 1.0 (fully visible) to prevent Chromium from pausing the animation.
        //   3. It must be in the foreground (z-index: 99999) to avoid occlusion culling (not hidden by canvas).
        //   4. To make it 100% invisible to the player, we use 'clip-path: circle(2px at 0px 0px)'. This crops the
        //      DOM image to a tiny 2px circle at the top-left corner of the screen.
        //   5. With that pixel visible and rendering, the browser plays the GIF animation at 60 FPS.
        //   6. In the canvas, drawImage() draws the whale reading from this animated <img>, allowing us to
        //      apply the submarine spotlight mask realistically at the correct z-index layer.
        this.img = document.createElement('img');
        this.img.style.cssText = 'position:fixed;top:0;left:0;opacity:1;pointer-events:none;z-index:99999;display:block;clip-path:circle(2px at 0px 0px);-webkit-clip-path:circle(2px at 0px 0px);will-change:transform;';
        document.body.appendChild(this.img);

        this.init(player, catalogEntry);
    }

    init(player, catalogEntry) {
        const cfg = catalogEntry;

        this.config = {
            id: cfg.id,
            nombreKey: cfg.nombreKey,
            cientificoKey: cfg.cientificoKey,
            descripcionKey: cfg.descripcionKey,
            imagen: cfg.imagen,
            minProf: cfg.minProf,
            maxProf: cfg.maxProf,
            esCardumen: cfg.esCardumen,
            numLuces: cfg.numLuces
        };

        this.groupId = cfg.groupId;
        this.isSimulated = true;

        this.width = cfg.width;
        this.height = cfg.height;

        // [ES] Aplicar dimensiones reales en CSS para forzar la decodificación del GIF a su escala original
        this.img.style.width = cfg.width + 'px';
        this.img.style.height = cfg.height + 'px';

        // Determinar spawn
        const isMovingLeft = player.vx < -0.5 || (Math.abs(player.vx) <= 0.5 && player.dir === -1);
        const directionMult = isMovingLeft ? -1 : 1;

        this.x = player.x + (cfg.spawnOffsetX * directionMult);
        this.y = player.y + cfg.spawnOffsetY;

        this.baseVx = cfg.initialVx * directionMult;
        this.baseVy = cfg.initialVy;

        this.vx = this.baseVx;
        this.vy = this.baseVy;

        this.state = 'ENTERING';
        this.stateTimer = 0;

        // Cargar imagen solo si cambia
        const absoluteSrc = new URL(cfg.imagen, window.location.href).href;
        if (this.img.src !== absoluteSrc) {
            this.img.src = cfg.imagen;
        }

        this.fleeing = false;
        this.sonarDetection = 0;
    }

    hideDOM() {
        // En renderizado por Canvas no necesitamos ocultar la imagen diminuta en el DOM,
        // ya que simplemente no la dibujamos en el Canvas.
    }

    /**
     * [ES] Elimina el elemento <img> del DOM cuando la criatura se destruye definitivamente.
     * [EN] Removes the <img> element from the DOM when the creature is permanently destroyed.
     */
    destroyDOM() {
        if (this.img && this.img.parentNode) {
            this.img.parentNode.removeChild(this.img);
        }
    }

    /**
     * [ES] Bucle de actualización de la lógica de la criatura (movimiento y escaneo).
     * [EN] Update loop for the creature's logic (movement and scanning).
     */
    update(others, player, canvas, dtMult = 1.0) {
        this.stateTimer += dtMult;

        if (this.state === 'ENTERING') {
            this.vx = this.baseVx;
            this.vy = this.baseVy;
            // [ES] Se para después de avanzar lo suficiente para estar a la vista. 
            // 800 frames a vel 2.0 = 1600 px (aprox. la pantalla)
            if (this.stateTimer > 800) {
                this.state = 'STOPPED';
                this.stateTimer = 0;
            }
        } else if (this.state === 'STOPPED') {
            this.vx *= 0.95; // Frena suavemente
            this.vy *= 0.95;
            // [ES] Queda parado unos segundos antes de continuar.
            if (this.stateTimer > 400) {
                this.state = 'LEAVING';
                this.stateTimer = 0;
            }
        } else if (this.state === 'LEAVING') {
            // [ES] Acelera suavemente para irse
            this.vx += (this.baseVx - this.vx) * 0.01 * dtMult;
            this.vy += (this.baseVy - this.vy) * 0.01 * dtMult;
        }

        // [ES] Actualiza posición según la velocidad.
        // [EN] Updates position based on velocity.
        this.x += this.vx * dtMult;
        this.y += this.vy * dtMult;

        // [ES] Lógica de detección por Sónar (mejorada para el gran tamaño del cachalote).
        // [EN] Sonar detection logic (improved for the sperm whale's large size).
        if (player.sonarActive) {
            const sizeRadius = (this.width / 2) * 0.9;
            const dx = this.x - player.x;
            const dy = this.y - (player.y + (window.WORLD ? window.WORLD.lightOffsetY : 50));
            const distToCenter = Math.sqrt(dx * dx + dy * dy);

            // [ES] Calculamos la distancia al punto más cercano de su cuerpo.
            // [EN] Calculate distance to the closest point of its body.
            const closestDist = Math.max(0, distToCenter - sizeRadius);

            if (Math.abs(closestDist - player.sonarRadius) < 150) {
                this.sonarDetection = 1.0;
            }
        }
        this.sonarDetection *= Math.pow(0.96, dtMult); // [ES] Desvanecimiento del eco / [EN] Echo fade out
    }

    /**
     * [ES] Bucle de renderizado. Controla la visibilidad según la luz ambiental y el haz del submarino.
     * [EN] Rendering loop. Controls visibility based on ambient light and submarine spotlight.
     */
    draw(ctx, camera, imageCache, player, canvas) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // [ES] Culling visual: no procesar si está demasiado lejos de los márgenes de la pantalla. Ampliado para criaturas inmensas.
        // [EN] Visual culling: skip processing if it is too far from screen margins. Expanded for huge creatures.
        if (sy < -1000 || sy > canvas.height + 1000 || sx < -2500 || sx > canvas.width + 2500) {
            this.hideDOM();
            return false;
        }

        // [ES] Dibujado del contorno del Sónar (ajustado al tamaño masivo).
        // [EN] Drawing of the Sonar outline (adjusted to massive size).
        if (this.sonarDetection > 0.05) {
            ctx.strokeStyle = `rgba(16, 185, 129, ${this.sonarDetection})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            // [ES] Círculo de detección que rodea a toda la ballena.
            // [EN] Detection circle surrounding the entire whale.
            ctx.arc(sx, sy, (this.width / 2.1) + (1 - this.sonarDetection) * 50, 0, Math.PI * 2);
            ctx.stroke();
        }

        // [ES] Cálculo de la visibilidad ambiental según profundidad.
        // [EN] Calculation of ambient visibility based on depth.
        const depthMeters = this.y / (window.WORLD ? window.WORLD.depthScale : 10);
        let ambientAlpha = 1.0;
        if (depthMeters > 200 && depthMeters <= 1000) {
            ambientAlpha = 1 - (depthMeters - 200) / 800;
        } else if (depthMeters > 1000) {
            ambientAlpha = 0;
        }

        // [ES] Cálculo de la iluminación directa (foco) - Adaptado para que se ilumine al tocar cualquier parte.
        // [EN] Direct lighting calculation (spotlight) - Adapted to light up when touching any part.
        const sizeRadius = (this.width / 2) * 1.0;
        const dSq = (this.x - player.x) ** 2 + (this.y - (player.y + (window.WORLD ? window.WORLD.lightOffsetY : 50))) ** 2;
        let lightIntensity = 0;
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;

        const spotRange = (window.WORLD ? window.WORLD.lightSpotRange : 275) + sizeRadius;
        const glowRange = (window.WORLD ? window.WORLD.lightGlowRange : 250) + sizeRadius;

        if (player.lightOn && mainBattery > 0 && dSq < Math.max(spotRange, glowRange) ** 2) {
            const dist = Math.sqrt(dSq);
            const angToFish = Math.atan2(this.y - (player.y + (window.WORLD ? window.WORLD.lightOffsetY : 50)), this.x - player.x);
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;

            let MathAngleDelta = Math.abs(angToFish - lookDir);
            while (MathAngleDelta > Math.PI) MathAngleDelta = Math.abs(MathAngleDelta - 2 * Math.PI);

            // [ES] Calculamos el radio angular para que se ilumine al tocar cualquier parte.
            // [EN] Calculate angular radius so it lights up when touching any part.
            const angularRadius = sizeRadius / Math.max(1, dist);
            const effectiveAngleDelta = Math.max(0, MathAngleDelta - angularRadius);

            let spotInt = 0;
            if ((player.lightMode === 2 || player.lightMode === undefined) && effectiveAngleDelta < (window.WORLD ? window.WORLD.lightAngle : 0.24) && dist < spotRange) {
                // [ES] Dentro del cono de luz.
                const edgeFade = Math.max(0, 1 - (effectiveAngleDelta / (window.WORLD ? window.WORLD.lightAngle : 0.24) - 0.8) / 0.2);
                spotInt = Math.min(1, edgeFade + 0.0001) > 0.8 ? 1.0 : edgeFade;
            }

            let haloInt = 0;
            if ((player.lightMode >= 1 || player.lightMode === undefined) && dist < glowRange) {
                // [ES] Halo cercano alrededor de la nave.
                haloInt = (1 - dist / glowRange) * (window.WORLD ? window.WORLD.lightGlowIntensity : 0.24);
            }

            lightIntensity = Math.max(spotInt, haloInt);
        }

        const isLit = lightIntensity > 0;

        // [ES] Mostrar la imagen en el Canvas si es iluminado o hay luz ambiental.
        // [EN] Show image on the Canvas if illuminated or if there is ambient light.
        if (ambientAlpha > 0.01 || isLit) {
            const renderX = Math.round(sx - this.width / 2);
            const renderY = Math.round(sy - this.height / 2);

            // [ES] Rotar según velocidad para que mire en la dirección del movimiento (izquierda/abajo).
            // [EN] Rotate based on velocity to face the direction of movement (left/down).
            if (this.vx !== 0 || this.vy !== 0) {
                this.angleDeg = Math.atan2(this.vy, this.vx) * (180 / Math.PI);
            }
            const angleDeg = this.angleDeg || (Math.atan2(0.2, -1.5) * (180 / Math.PI));

            if (this.img && this.img.complete) {
                // [ES] PASO 1: Renderizado de Ambiente (Penumbra)
                // Se ve suavemente si hay luz residual de la superficie.
                if (ambientAlpha > 0.01) {
                    ctx.save();
                    ctx.globalAlpha = ambientAlpha;
                    this._drawWhaleImage(ctx, renderX, renderY, angleDeg);
                    ctx.restore();
                }

                // [ES] PASO 2: Renderizado del FOCO (Iluminación LOCAL Realista con bordes suaves)
                if (player.lightOn && mainBattery > 0) {
                    const scaleFactor = 1.0;
                    const sw = Math.floor(this.width * scaleFactor);
                    const sh = Math.floor(this.height * scaleFactor);

                    if (!this.scratchCanvas || this.scratchCanvas.width !== sw || this.scratchCanvas.height !== sh) {
                        this.scratchCanvas = document.createElement('canvas');
                        this.scratchCanvas.width = sw;
                        this.scratchCanvas.height = sh;
                        this.scratchCtx = this.scratchCanvas.getContext('2d');
                    }
                    const sCtx = this.scratchCtx;

                    // Limpiar el canvas temporal
                    sCtx.clearRect(0, 0, sw, sh);

                    // 1. Dibujar la MÁSCARA combinada (Halo + Foco) con source-over
                    sCtx.save();
                    sCtx.scale(scaleFactor, scaleFactor);
                    sCtx.translate(-renderX, -renderY);
                    this._drawLightConeGradient(sCtx, player, camera);
                    sCtx.restore();

                    // 2. Aplicar la imagen de la ballena (source-in) para que solo sea visible donde hay máscara
                    sCtx.globalCompositeOperation = 'source-in';
                    sCtx.save();
                    sCtx.scale(scaleFactor, scaleFactor);
                    sCtx.translate(this.width / 2, this.height / 2);
                    sCtx.rotate(angleDeg * Math.PI / 180);
                    if (Math.abs(angleDeg) > 90) {
                        sCtx.scale(1, -1);
                    }
                    sCtx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
                    sCtx.restore();

                    sCtx.globalCompositeOperation = 'source-over';

                    // 3. Pintar el resultado (escalado de vuelta) en el canvas principal
                    ctx.save();
                    ctx.globalAlpha = player.lightFlickerIntensity || 1.0;
                    ctx.drawImage(this.scratchCanvas, renderX, renderY, this.width, this.height);
                    ctx.restore();
                }
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * [ES] Dibuja la imagen del cachalote con las transformaciones necesarias.
     */
    _drawWhaleImage(ctx, renderX, renderY, angleDeg) {
        ctx.save();
        ctx.translate(renderX + this.width / 2, renderY + this.height / 2);
        ctx.rotate(angleDeg * Math.PI / 180);
        if (Math.abs(angleDeg) > 90) {
            ctx.scale(1, -1);
        }
        ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    /**
     * [ES] Dibuja el cono de luz y el halo con un gradiente para usarlo como máscara (suavidad realista).
     * [EN] Draws the light cone and halo with a gradient to use as a mask (realistic softness).
     */
    _drawLightConeGradient(ctx, player, camera) {
        const W = window.WORLD || { lightOffsetX: 75, lightOffsetY: 51, lightSpotRange: 275, lightGlowRange: 250, lightAngle: 0.24, lightStartWidth: 20 };
        const px = player.x - camera.x;
        const py = player.y - camera.y;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(player.angle);

        // 1. Halo Radial (Ambiental)
        if (player.lightMode >= 1 || player.lightMode === undefined) {
            const glowRange = (W.lightGlowRange || 250) * 0.75;
            const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRange);
            glowGrad.addColorStop(0, `rgba(255, 255, 255, 1.0)`);
            glowGrad.addColorStop(0.4, `rgba(255, 255, 255, 0.5)`);
            glowGrad.addColorStop(0.8, `rgba(255, 255, 255, 0.15)`);
            glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(0, 0, glowRange, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Foco Direccional (Spotlight)
        if (player.lightMode === 2 || player.lightMode === undefined) {
            ctx.translate(W.lightOffsetX * player.dir, W.lightOffsetY);
            const lightDir = player.dir === 1 ? 0 : Math.PI;

            const halfStartW = W.lightStartWidth / 2;
            const endW = W.lightStartWidth + (2 * W.lightSpotRange * Math.tan(W.lightAngle));
            const halfEndW = endW / 2;

            ctx.save();
            ctx.rotate(lightDir);

            // [ES] Crear gradiente radial que se desvanece progresivamente para simular luz difusa.
            const spotlightGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, W.lightSpotRange);
            spotlightGrad.addColorStop(0, `rgba(255, 255, 255, 1.0)`);
            spotlightGrad.addColorStop(0.3, `rgba(255, 255, 255, 0.8)`);
            spotlightGrad.addColorStop(0.7, `rgba(255, 255, 255, 0.3)`);
            spotlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = spotlightGrad;
            ctx.beginPath();
            ctx.moveTo(0, -halfStartW);
            ctx.lineTo(W.lightSpotRange, -halfEndW);
            ctx.lineTo(W.lightSpotRange, halfEndW);
            ctx.lineTo(0, halfStartW);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}

class EventManager {
    constructor() {
        // [ES] Temporizador por criatura, indexado por id.
        // [EN] Per-creature timer, indexed by id.
        this.timers = {};
        this.activeEvent = null;
    }

    /**
     * [ES] Bucle principal del gestor de eventos.
     * [EN] Event manager main loop.
     */
    update(dtMult, player, fishesArray) {
        if (typeof EVENT_CREATURES === 'undefined') return;

        // [ES] Limpieza: Destruir la entidad si se va fuera de la pantalla.
        // [EN] Cleanup: Destroy the entity if it goes off-screen.
        if (this.activeEvent) {
            const maxDist = 3500;
            if (this.activeEvent.x < player.x - maxDist || this.activeEvent.x > player.x + maxDist) {
                console.log("Evento finalizado: Liberando criatura", this.activeEvent.config.id);
                const idx = fishesArray.indexOf(this.activeEvent);
                if (idx > -1) fishesArray.splice(idx, 1);
                EventCreature.release(this.activeEvent);
                this.activeEvent = null;
            }
        }

        // [ES] Comprobar spawn periódico por cada criatura del catálogo.
        // [EN] Check periodic spawn for each creature in the catalog.
        if (!this.activeEvent) {
            const currentDepth = player.y / (window.WORLD ? window.WORLD.depthScale : 10);
            for (const creatureDef of EVENT_CREATURES) {
                // Inicializar temporizador individual si no existe
                if (this.timers[creatureDef.id] === undefined) {
                    this.timers[creatureDef.id] = 0;
                }

                this.timers[creatureDef.id] += dtMult / 60; // Acumular en segundos / Accumulate in seconds

                if (this.timers[creatureDef.id] >= creatureDef.checkInterval) {
                    this.timers[creatureDef.id] = 0;

                    // Solo spawnear si estamos dentro de su rango de profundidad
                    if (currentDepth >= creatureDef.minProf && currentDepth <= creatureDef.maxProf) {
                        if (Math.random() < creatureDef.spawnProbability) {
                            this.spawnEventCreature(creatureDef, player, fishesArray);
                            break;
                        }
                    }
                }
            }
        }
    }

    /**
     * [ES] Crea una criatura de evento a partir de su definición de catálogo.
     * [EN] Creates an event creature from its catalog definition.
     */
    spawnEventCreature(creatureDef, player, fishesArray) {
        const creature = EventCreature.get(player, creatureDef);
        fishesArray.push(creature);
        this.activeEvent = creature;

        // [ES] Registrar grupo boids vacío para evitar errores en el bucle de IA.
        // [EN] Register empty boids group to prevent errors in the AI loop.
        if (typeof window.globalBoidsGroups !== 'undefined') {
            if (!window.globalBoidsGroups[creature.groupId]) {
                window.globalBoidsGroups[creature.groupId] = [];
            }
            window.globalBoidsGroups[creature.groupId].push(creature);
        }
    }
}

// [ES] Exportación global para poder instanciarlo desde main.js.
// [EN] Global export to allow instantiation from main.js.
if (typeof window !== 'undefined') {
    window.EventManager = EventManager;
    window.EventCreature = EventCreature;
}
