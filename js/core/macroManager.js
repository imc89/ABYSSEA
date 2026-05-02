/**
 * MACRO MANAGER
 * [ES] Gestiona el minijuego de observación a micro-escala. Instancia un ecosistema procedural para examinar criaturas diminutas.
 * [EN] Manages the micro-scale observation minigame. Instantiates a procedural ecosystem to examine tiny creatures.
 *
 * CHANGELOG (Performance + GIF fix):
 *  - Bucle usa timestamp nativo de requestAnimationFrame (no Date.now())
 *  - cancelAnimationFrame() al cerrar el modal para evitar loop fantasma
 *  - dt clampeado a 3 para evitar saltos si la pestaña pierde foco
 *  - Flicker de partículas pre-calculado con offset sinusoidal (sin Math.random() en draw)
 *  - GIF: si la imagen de la criatura es un .gif, se usa un <img> DOM superpuesto
 *    en lugar de ctx.drawImage (el canvas congela el primer frame de los GIFs)
 *  - breathingScale usa el timestamp acumulado en lugar de Date.now() extra
 *  - Crosshair DOM actualizado con transform en vez de left/top (evita layout thrashing)
 */

class MacroManager {
    /**
     * CONFIGURACIÓN DE PUNTOS DE INTERÉS (POI) EN EL MAPA
     * Ajusta estos valores para cambiar la apariencia de los círculos concéntricos en el mundo.
     */
    static POI_CONFIG = {
        innerRadius: 4,            // Radio del punto central
        glowBlur: 25,              // Intensidad del brillo
        pulseSpeed: 0.004,         // Velocidad de la animación
        innerColor: "rgba(255, 255, 255, 1.0)", // Blanco puro para el núcleo
        accentColor: "rgba(49, 181, 181, 0.8)",  // Cian brillante
        haloColor: "rgba(0, 255, 255, 0.2)"    // Cian suave para los halos
    };

    constructor() {
        this.isOpen = false;
        this.rafId = null;          // ID del requestAnimationFrame activo
        this.isGif = false;         // ¿La criatura actual es un GIF?

        this.state = {
            // Posición y movimiento de las criaturas
            creatures: [],
            elapsedMs: 0,           // Tiempo acumulado (ms) para animaciones deterministas

            // Estado del minijuego
            revealed: false,
            lightOn: true,

            // Posición de la linterna/mira
            crosshairX: 0,
            crosshairY: 0,

            // Referencias de renderizado
            canvas: null,
            ctx: null,
            creatureImg: new Image(),
            gifOverlayEls: [],    // Lista de elementos <img> DOM para GIFs animados
            particles: [],
            rocks: [],

            // Gestión de tiempo y entrada
            lastTime: 0,
            keys: {},
            successTimeout: null
        };
    }

    /**
     * [ES] Dibuja un Punto de Interés (POI) en las coordenadas especificadas del mapa principal marcando anomalías descubribles.
     * [EN] Draws a Point of Interest (POI) at the specified coordinates on the main map marking discoverable anomalies.
     */
    static drawPOI(ctx, x, y, pulse, isLit) {
        const config = MacroManager.POI_CONFIG;

        ctx.save();

        if (isLit) {
            // 1. ANILLO ÚNICO ELEGANTE (Solo si está iluminado)
            const layerPulse = (pulse + 0.8) % (Math.PI * 2);
            const scale = 18 * (0.9 + Math.sin(layerPulse) * 0.1);
            const alpha = 0.4 * (0.5 + Math.sin(layerPulse) * 0.5);

            ctx.beginPath();
            ctx.arc(x, y, scale, 0, Math.PI * 2);
            ctx.strokeStyle = config.haloColor.replace('0.2', alpha.toFixed(3));
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 2. RESPLANDOR EXTERIOR (Glow suave)
            const corePulse = Math.sin(pulse) * 0.2 + 0.8;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 * corePulse);
            gradient.addColorStop(0, config.accentColor.replace('0.8', (0.4 * corePulse).toFixed(2)));
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 20 * corePulse, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. NÚCLEO BRILLANTE (Siempre visible pero más pequeño en oscuridad)
        ctx.beginPath();
        const coreSize = isLit ? config.innerRadius : config.innerRadius * 0.7;
        ctx.arc(x, y, coreSize, 0, Math.PI * 2);
        ctx.fillStyle = isLit ? config.innerColor : "rgba(255, 255, 255, 1)";
        ctx.shadowBlur = isLit ? config.glowBlur : 10;
        ctx.shadowColor = "cyan";
        ctx.fill();

        ctx.restore();
    }

    /**
     * [ES] Devuelve los datos necesarios para mostrar la información rápida en el HUD al acercarse a un POI Macro.
     * [EN] Returns the necessary data to show quick information on the HUD when approaching a Macro POI.
     */
    getHUDData() {
        return {
            title: "DETECCIÓN MACRO",
            subtitle: "Rocas Abisales",
            status: "ENTORNO ANALIZABLE",
            prompt: "PULSA [ENTER] PARA ZOOM"
        };
    }

    toggle(specieId = null) {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(specieId);
        }
    }

    open(specieId = null) {
        this.isOpen = true;
        this.currentSpecieId = specieId;

        // Limpieza absoluta antes de que el modal sea visible
        this.state.revealed = false;
        this.state.lightOn = true;
        this._clearSpecieUI();

        const modal = document.getElementById('discovery-modal');
        if (modal) modal.classList.add('active');

        // Audio AL ENTRAR
        GlobalAudioPool.play('macro', 0.5);

        // Inicializar minijuego (asíncrono para dejar que el modal se pinte)
        setTimeout(() => this.init(specieId), 100);

        if (typeof window.updateCursorVisibility === 'function') {
            window.updateCursorVisibility();
        }
    }

    _clearSpecieUI() {
        if (this.state.successTimeout) {
            clearTimeout(this.state.successTimeout);
            this.state.successTimeout = null;
        }

        // Limpiar Canvas inmediatamente si existe
        if (this.state.ctx && this.state.canvas) {
            this.state.ctx.fillStyle = '#020205';
            this.state.ctx.fillRect(0, 0, this.state.canvas.width, this.state.canvas.height);
        }

        // NOTA: el ciclo de vida del gifOverlay se gestiona de forma explícita en init() y close()
        // No lo eliminamos aquí para no destruirlo cuando _clearSpecieUI es llamado desde init()

        const successUI = document.getElementById('macro-success-ui');
        if (successUI) {
            successUI.classList.remove('active');
            successUI.style.setProperty('display', 'none', 'important');
            successUI.style.setProperty('opacity', '0', 'important');
            successUI.style.setProperty('pointer-events', 'none', 'important');
        }

        const exitBtn = document.getElementById('macro-exit-btn');
        if (exitBtn) {
            exitBtn.classList.add('opacity-0', 'pointer-events-none');
            exitBtn.style.setProperty('opacity', '0', 'important');
        }

        const mImg = document.getElementById('macro-discovery-img');
        const mTitle = document.getElementById('macro-discovery-title');
        const mGenus = document.getElementById('macro-discovery-genus');
        const mDesc = document.getElementById('macro-discovery-desc');
        const mTargetUI = document.getElementById('macro-target-ui');
        const mTargetName = document.getElementById('macro-target-name');
        const mTargetGenus = document.getElementById('macro-target-genus');

        // Vaciado total para prevenir el "flash" de información antigua
        if (mImg) mImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        if (mTitle) mTitle.innerHTML = "";
        if (mGenus) mGenus.innerHTML = "";
        if (mDesc) mDesc.innerHTML = "";

        // Limpiar UI de objetivo
        if (mTargetUI) {
            mTargetUI.style.display = 'flex';
            mTargetUI.style.opacity = '0.8';
        }
        if (mTargetName) mTargetName.innerText = "---";
        if (mTargetGenus) mTargetGenus.innerText = "---";
    }

    close() {
        this.isOpen = false;

        // *** Cancelar el bucle de animación para no seguir consumiendo recursos ***
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Limpiar UI inmediatamente
        this._clearSpecieUI();

        const modal = document.getElementById('discovery-modal');
        if (modal) modal.classList.remove('active');

        this.state.revealed = false;
        this.currentSpecieId = null;

        if (typeof window.updateCursorVisibility === 'function') {
            window.updateCursorVisibility();
        }
    }

    /**
     * [ES] Inicia y prepara el minijuego Macro.
     * [EN] Initializes and prepares the Macro minigame.
     */
    init(specieId = null) {
        // Cancelar cualquier RAF previo antes de iniciar uno nuevo
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        this.state.canvas = document.getElementById('macro-canvas');
        if (!this.state.canvas) return;
        this.state.ctx = this.state.canvas.getContext('2d');

        // Ajustar canvas al tamaño real del modal para evitar distorsiones
        const modal = document.getElementById('discovery-modal');
        this.state.canvas.width = modal.offsetWidth;
        this.state.canvas.height = modal.offsetHeight;

        this.state.revealed = false;
        this.state.keys = {};
        this.state.elapsedMs = 0;

        // Usar la especie pasada o fallback a eurythenes
        const sId = specieId || this.currentSpecieId || 'eurythenes';

        // --- CONFIGURACIÓN DE DATOS ---
        const macroData = window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : {
            id: 'fallback',
            imagen: 'img/little/Eurythenes.png',
            ancho: 120,
            alto: 80,
            velocidadX: 1.5,
            velocidadY: 0.8,
            minEspecimenes: 1,
            maxEspecimenes: 1
        };

        // Detectar si la imagen es un GIF animado
        this.isGif = typeof macroData.imagen === 'string' && macroData.imagen.toLowerCase().endsWith('.gif');

        // --- POSICIONAMIENTO DE CRIATURAS ---
        this.state.creatures = [];
        const numSpecimens = macroData.minEspecimenes + Math.floor(Math.random() * (macroData.maxEspecimenes - macroData.minEspecimenes + 1));

        for (let i = 0; i < numSpecimens; i++) {
            this.state.creatures.push({
                x: 150 + Math.random() * (this.state.canvas.width - 300),
                y: 150 + Math.random() * (this.state.canvas.height - 300),
                vx: (Math.random() - 0.5) * macroData.velocidadX,
                vy: (Math.random() - 0.5) * macroData.velocidadY,
                w: macroData.ancho,
                h: macroData.alto,
                rangoDeteccion: macroData.rangoDeteccion || 80
            });
        }

        this.state.lightOn = true;

        // Carga de imagen
        this.state.creatureImg.src = macroData.imagen;

        // --- RESET DE INTERFAZ HTML (ANTES de crear el overlay GIF) ---
        // CRÍTICO: debe ir ANTES de _createGifOverlay; si fuera después,
        // _clearSpecieUI podría eliminar el overlay recién creado.
        this._clearSpecieUI();

        // --- OVERLAY GIF: crear un <img> DOM encima del canvas ---
        // Siempre limpiar el overlay anterior antes de crear uno nuevo
        this._removeGifOverlay();
        if (this.isGif) {
            this._createGifOverlay(macroData.imagen, macroData.ancho, macroData.alto);
        }

        // --- GENERACIÓN DEL ENTORNO (FONDO) ---
        this.state.rocks = [];
        for (let i = 0; i < 40; i++) {
            this.state.rocks.push({
                x: Math.random() * this.state.canvas.width,
                y: this.state.canvas.height - (Math.random() * 60),
                size: 20 + Math.random() * 100,
                color: `rgba(${10 + Math.random() * 10}, ${10 + Math.random() * 10}, ${20 + Math.random() * 10}, 1)`,
                segments: this.generateRockShape()
            });
        }

        // Partículas con offset pre-calculado para flicker determinista (sin Math.random en draw)
        this.state.particles = [];
        for (let i = 0; i < 150; i++) {
            this.state.particles.push({
                x: Math.random() * this.state.canvas.width,
                y: Math.random() * this.state.canvas.height,
                z: 0.5 + Math.random() * 2.5,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.3 + 0.2,
                flickerOffset: Math.random() * Math.PI * 2,
                flickerSpeed: 3 + Math.random() * 5
            });
        }

        // --- ACTUALIZAR UI DE OBJETIVO ---
        const mTargetName = document.getElementById('macro-target-name');
        const mTargetGenus = document.getElementById('macro-target-genus');
        if (mTargetName) mTargetName.innerText = macroData.nombre || "Desconocido";
        if (mTargetGenus) mTargetGenus.innerText = macroData.cientifico || "Incertae sedis";

        this.state.lastTime = 0;
        this.state.crosshairX = this.state.canvas.width / 2;
        this.state.crosshairY = this.state.canvas.height / 2;

        // Iniciar el bucle de renderizado con timestamp nativo de rAF
        this.rafId = requestAnimationFrame(ts => this.loop(ts));
    }

    // ---------------------------------------------------------------------------
    // GIF DOM OVERLAY
    // ---------------------------------------------------------------------------

    /**
     * [ES] Crea (o recicla) un elemento <img> posicionado en el modal del canvas para renderizar GIFs animados.
     * [EN] Creates (or recycles) a positioned <img> element in the canvas modal to render animated GIFs.
     */
    _createGifOverlay(src, w, h) {
        this._removeGifOverlay(); // Limpiar el anterior si existe

        const modal = document.getElementById('discovery-modal');
        if (!modal || !this.state.creatures.length) return;

        this.state.creatures.forEach((c, index) => {
            const img = document.createElement('img');
            img.src = src;
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.width = w + 'px';
            img.style.height = h + 'px';
            img.style.opacity = '0';
            img.style.pointerEvents = 'none';
            img.style.zIndex = '3';
            img.style.transformOrigin = 'center'; // Cambiado a center para facilitar scaleX flipping
            img.style.willChange = 'transform, opacity, filter';
            modal.appendChild(img);
            this.state.gifOverlayEls.push(img);
        });
    }

    /**
     * [ES] Elimina el overlay GIF del DOM y limpia la referencia.
     * [EN] Removes the GIF overlay from the DOM and clears the reference.
     */
    _removeGifOverlay() {
        if (this.state.gifOverlayEls && this.state.gifOverlayEls.length > 0) {
            this.state.gifOverlayEls.forEach(el => el.remove());
            this.state.gifOverlayEls = [];
        }
    }

    /**
     * [ES] Actualiza la posición del overlay GIF sincronizándola con la lógica de la criatura.
     *      El GIF es SIEMPRE visible (el canvas ya aplica la oscuridad ambiental encima mediante
     *      destination-in). Solo se usa un CSS brightness suave para reforzar la linterna.
     * [EN] Updates the GIF overlay position in sync with the creature logic.
     *      The GIF is ALWAYS visible (the canvas already applies ambient darkness via destination-in).
     *      A soft CSS brightness hint reinforces the flashlight without hiding the creature.
     */
    _syncGifOverlay(breathingScale) {
        if (!this.state.gifOverlayEls.length || !this.state.creatures.length) return;

        const revealed = this.state.revealed;

        this.state.creatures.forEach((c, i) => {
            const img = this.state.gifOverlayEls[i];
            if (!img) return;

            // Flipping según dirección horizontal (vx)
            // Si vx > 0 mira a la derecha (scaleX 1), si vx < 0 mira a la izquierda (scaleX -1)
            const flip = c.vx < 0 ? -1 : 1;

            // Ajuste de traslación para centrar el img en (c.x, c.y)
            const tx = c.x - c.w / 2;
            const ty = c.y - c.h / 2;
            img.style.transform = `translate(${tx}px, ${ty}px) scaleX(${flip * breathingScale}) scaleY(${breathingScale})`;

            if (!this.state.lightOn) {
                img.style.opacity = '0';
                img.style.filter = '';
                return;
            }

            const dist = Math.hypot(this.state.crosshairX - c.x, this.state.crosshairY - c.y);
            const radius = revealed ? 600 : 130;

            if (dist > radius) {
                img.style.opacity = '0';
                img.style.filter = '';
                return;
            }

            const opacityMult = Math.pow(Math.max(0, 1 - dist / radius), 1.5);
            img.style.opacity = revealed ? '1' : (0.1 + 0.9 * opacityMult).toFixed(2);

            const bright = 0.6 + 0.8 * opacityMult;
            img.style.filter = `brightness(${bright.toFixed(2)})`;
        });
    }

    // ---------------------------------------------------------------------------
    // BUCLE PRINCIPAL
    // ---------------------------------------------------------------------------

    /**
     * [ES] Genera una serie aleatoria de vértices para dibujar una forma de roca irregular procedural.
     * [EN] Generates a random series of vertices to draw a procedural irregular rock shape.
     */
    generateRockShape() {
        const segments = [];
        const points = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const dist = 0.5 + Math.random() * 0.5;
            segments.push({ angle, dist });
        }
        return segments;
    }

    /**
     * [ES] Bucle principal de animación. Recibe el timestamp nativo de rAF para máxima precisión.
     *      El dt se clampea a un máximo de 3 para evitar saltos grandes si la pestaña pierde foco.
     * [EN] Main animation loop. Receives the native rAF timestamp for maximum accuracy.
     *      dt is clamped to a maximum of 3 to prevent large jumps if the tab loses focus.
     */
    loop(timestamp) {
        if (!this.isOpen) return;

        // Primer tick: inicializar lastTime
        if (this.state.lastTime === 0) {
            this.state.lastTime = timestamp;
        }

        const rawDt = (timestamp - this.state.lastTime) / 16.67; // Normalizado a 60fps
        const dt = Math.min(rawDt, 3); // Clamp: evitar saltos si el tab pierde foco
        this.state.lastTime = timestamp;
        this.state.elapsedMs = timestamp; // Usar timestamp absoluto para senos deterministas

        this.update(dt);
        this.draw();

        this.rafId = requestAnimationFrame(ts => this.loop(ts));
    }

    /**
     * [ES] Actualiza la lógica espacial (posición de linterna, criaturas y partículas).
     * [EN] Updates spatial logic (flashlight, creatures, and particles positions).
     */
    update(dt) {
        const { canvas, keys } = this.state;

        // 1. CONTROL DE LA LINTERNA (Input del jugador)
        const lightSpeed = 6 * dt;
        if (keys['ArrowLeft'] || keys['KeyA']) this.state.crosshairX -= lightSpeed;
        if (keys['ArrowRight'] || keys['KeyD']) this.state.crosshairX += lightSpeed;
        if (keys['ArrowUp'] || keys['KeyW']) this.state.crosshairY -= lightSpeed;
        if (keys['ArrowDown'] || keys['KeyS']) this.state.crosshairY += lightSpeed;

        // Limitar la luz a los bordes del canvas
        this.state.crosshairX = Math.max(0, Math.min(canvas.width, this.state.crosshairX));
        this.state.crosshairY = Math.max(0, Math.min(canvas.height, this.state.crosshairY));

        // Actualizar posición del crosshair visual (left/top es correcto aquí porque el CSS
        // animation usa transform: translate(-50%,-50%) para centrado; mezclar ambos causaría conflicto)
        const ch = document.getElementById('macro-crosshair');
        if (ch) {
            ch.style.left = `${this.state.crosshairX}px`;
            ch.style.top = `${this.state.crosshairY}px`;
        }

        // 2. MOVIMIENTO DE LAS CRIATURAS
        this.state.creatures.forEach(c => {
            c.x += c.vx * dt;
            c.y += c.vy * dt;

            // Rebote en paredes
            if (c.x < 50 || c.x > canvas.width - 50) c.vx *= -1;
            if (c.y < 50 || c.y > canvas.height - 50) c.vy *= -1;
        });

        // Efecto de respiración usando el timestamp acumulado (determinista, sin Date.now() extra)
        const breathingScale = 1 + Math.sin(this.state.elapsedMs * 0.001) * 0.03;

        // Sincronizar GIF overlay si aplica
        if (this.isGif) {
            this._syncGifOverlay(breathingScale);
        }

        // 3. MOVIMIENTO DE PARTÍCULAS
        this.state.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Wrap-around
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        });

        return breathingScale;
    }

    /**
     * [ES] Pinta las capas del minijuego.
     *      Las partículas usan offsetFlicker determinista en vez de Math.random() por frame.
     *      Si la criatura es GIF, se omite ctx.drawImage (el overlay DOM se ocupa de renderizarla).
     * [EN] Paints the minigame layers.
     *      Particles use deterministic flicker offset instead of per-frame Math.random().
     *      If creature is a GIF, ctx.drawImage is skipped (DOM overlay handles rendering).
     */
    draw() {
        const { ctx, canvas, creatures, creatureImg, revealed, crosshairX, crosshairY, rocks, particles, lightOn, elapsedMs } = this.state;
        if (!ctx) return;

        const breathingScale = 1 + Math.sin(elapsedMs * 0.001) * 0.03;
        const timeS = elapsedMs * 0.001; // Tiempo en segundos para senos

        // Limpiar fondo
        ctx.fillStyle = '#020205';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Capa de objetos - Rocas
        rocks.forEach(rock => {
            ctx.save();
            ctx.translate(rock.x, rock.y);
            ctx.beginPath();
            rock.segments.forEach((seg, i) => {
                const px = Math.cos(seg.angle) * rock.size * seg.dist;
                const py = Math.sin(seg.angle) * rock.size * seg.dist;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.fillStyle = rock.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,255,255,0.05)';
            ctx.stroke();
            ctx.restore();
        });

        // Partículas con flicker determinista (sin Math.random por frame)
        particles.forEach(p => {
            const flicker = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(timeS * p.flickerSpeed + p.flickerOffset));
            ctx.fillStyle = `rgba(200, 240, 255, ${(0.4 * flicker).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
            ctx.fill();

            if (p.z > 1.5) {
                ctx.fillStyle = `rgba(0, 255, 255, ${(0.05 * flicker).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.z * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Dibujar criaturas (solo si NO es GIF; para GIF se usa el overlay DOM)
        if (!this.isGif) {
            creatures.forEach(c => {
                ctx.save();
                ctx.translate(c.x, c.y);

                // Flipping horizontal según dirección
                const flip = c.vx < 0 ? -1 : 1;
                ctx.scale(flip, 1);

                const w = c.w * breathingScale;
                const h = c.h * breathingScale;

                // Visibilidad basada en distancia antes de la máscara (para coherencia con GIFs)
                const dist = Math.hypot(crosshairX - c.x, crosshairY - c.y);
                const radius = revealed ? 600 : 130;
                const opacityMult = Math.pow(Math.max(0, 1 - dist / radius), 1.5);

                ctx.globalAlpha = revealed ? 1.0 : (0.1 + 0.9 * opacityMult);

                if (creatureImg.complete && creatureImg.naturalWidth > 0) {
                    ctx.drawImage(creatureImg, -w / 2, -h / 2, w, h);
                } else {
                    // Fallback visual en caso de error de carga
                    ctx.fillStyle = revealed ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 255, 255, 0.2)';
                    ctx.beginPath();
                    ctx.arc(0, 0, w / 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'cyan';
                    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                    ctx.stroke();
                }
                ctx.restore();
            });
        }

        // MÁSCARA DE LUZ (Linterna Atmosférica)
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        if (lightOn) {
            const radius = revealed ? 600 : 130; // Radio reducido
            const lightGrad = ctx.createRadialGradient(crosshairX, crosshairY, 20, crosshairX, crosshairY, radius);
            lightGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
            lightGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.9)');
            lightGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
            lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = lightGrad;
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Efecto visual de lente (Vignette)
        const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 4, canvas.width / 2, canvas.height / 2, canvas.width / 1.2);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Brillo visual de la linterna (Halo)
        if (lightOn) {
            ctx.save();
            const hotGrad = ctx.createRadialGradient(crosshairX, crosshairY, 0, crosshairX, crosshairY, 50);
            hotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
            hotGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = hotGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const glowGrad = ctx.createRadialGradient(crosshairX, crosshairY, 40, crosshairX, crosshairY, 250);
            glowGrad.addColorStop(0, 'rgba(0, 255, 255, 0.08)');
            glowGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.03)');
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // Hint visual si estamos enfocando a alguna criatura no revelada
        if (lightOn && !revealed) {
            const isNear = creatures.some(c => {
                const dist = Math.hypot(crosshairX - c.x, crosshairY - c.y);
                return dist < 100;
            });

            if (isNear) {
                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(crosshairX, crosshairY, 60, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    /**
     * [ES] Gestiona el intento de análisis al pulsar Enter o hacer click.
     * [EN] Manages the scan attempt on Enter press or click.
     */
    onEnter() {
        const { lightOn, revealed, crosshairX, crosshairY, creatures } = this.state;
        if (revealed) {
            this._clearSpecieUI();
            this.close();
            return;
        }
        if (lightOn) {
            const isNear = creatures.some(c => {
                const dist = Math.hypot(crosshairX - c.x, crosshairY - c.y);
                return dist < c.rangoDeteccion;
            });

            if (isNear) {
                this.state.revealed = true;
                this.onSuccess();
            }
        }
    }

    /**
     * [ES] Accionado al iluminar con precisión una criatura. Despliega la UI de éxito.
     * [EN] Triggered upon precisely illuminating a creature. Deploys success UI.
     */
    onSuccess() {
        this.state.revealed = true;

        const sId = this.currentSpecieId || 'eurythenes';
        const macroData = window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : null;

        this.state.successTimeout = setTimeout(() => {
            const successUI = document.getElementById('macro-success-ui');
            if (successUI && this.isOpen) {
                if (macroData) {
                    const mImg = document.getElementById('macro-discovery-img');
                    const mTitle = document.getElementById('macro-discovery-title');
                    const mGenus = document.getElementById('macro-discovery-genus');
                    const mDesc = document.getElementById('macro-discovery-desc');

                    // Para GIFs: asignar src directamente; el <img> del panel SÍ reproduce GIFs animados
                    if (mImg) mImg.src = macroData.imagen;
                    if (mTitle) mTitle.innerText = macroData.nombre;
                    if (mGenus) mGenus.innerText = macroData.cientifico;
                    if (mDesc) mDesc.innerText = macroData.descripcion;

                    // Almacenaje real en la base de muestras del laboratorio
                    if (typeof window.addSampleToLab === 'function') {
                        window.addSampleToLab(macroData);
                    }
                }

                // Mostrar UI
                successUI.style.setProperty('display', 'flex', 'important');
                successUI.style.setProperty('opacity', '1', 'important');
                successUI.classList.add('active');

                // Ocultar los overlays GIF del canvas cuando se muestra el panel de éxito
                if (this.isGif && this.state.gifOverlayEls.length > 0) {
                    this.state.gifOverlayEls.forEach(el => el.style.opacity = '0');
                }

                const exitBtn = document.getElementById('macro-exit-btn');
                if (exitBtn) {
                    exitBtn.classList.remove('opacity-0', 'pointer-events-none');
                    exitBtn.style.setProperty('opacity', '1', 'important');
                    exitBtn.style.setProperty('pointer-events', 'auto', 'important');
                }

                // Ocultar UI de objetivo al tener éxito
                const mTargetUI = document.getElementById('macro-target-ui');
                if (mTargetUI) mTargetUI.style.display = 'none';
            }
        }, 500);
    }

    toggleLight() {
        this.state.lightOn = !this.state.lightOn;

        // Si se apaga la luz, ocultar también los overlays GIF
        if (this.isGif && this.state.gifOverlayEls.length > 0) {
            this.state.gifOverlayEls.forEach(el => el.style.opacity = this.state.lightOn ? '' : '0');
        }

        GlobalAudioPool.play('light', 0.3);
    }

    handleMouseMove(e) {
        if (!this.isOpen) return;
        const modal = document.getElementById('discovery-modal');
        const rect = modal.getBoundingClientRect();

        this.state.crosshairX = e.clientX - rect.left;
        this.state.crosshairY = e.clientY - rect.top;
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.MacroManager = MacroManager;
}
