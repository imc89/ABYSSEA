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

    /**
     * Tabla de subtítulos legibles por bioma (clave → texto mostrado en HUD).
     */
    static BIOME_LABELS = {
        'fumarolas_hidrotermales': 'Fumarolas Hidrotermales',
        'llanura_abisal': 'Llanura Abisal',
        'mar_abierto': 'Mar Abierto',
        'rocas': 'Suelo Rocoso'
    };

    /**
     * Textura de humo pre-renderizada (igual que en Hydrothermal.js).
     * Se comparte entre todas las instancias de MacroManager para óptimo rendimiento.
     */
    static SMOKE_CANVAS = (() => {
        const sc = document.createElement('canvas');
        sc.width = 128; sc.height = 128;
        const sCtx = sc.getContext('2d');
        const g = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(240, 245, 250, 0.8)');
        g.addColorStop(0.3, 'rgba(180, 200, 220, 0.5)');
        g.addColorStop(0.7, 'rgba(120, 140, 160, 0.1)');
        g.addColorStop(1, 'rgba(100, 120, 140, 0)');
        sCtx.fillStyle = g;
        sCtx.fillRect(0, 0, 128, 128);
        return sc;
    })();

    constructor() {
        this.isOpen = false;
        this.rafId = null;
        this.isGif = false;
        this.currentBiome = 'rocas';

        this.state = {
            creatures: [],
            elapsedMs: 0,
            revealed: false,
            lightOn: true,
            crosshairX: 0,
            crosshairY: 0,
            canvas: null,
            ctx: null,
            creatureImg: new Image(),
            gifOverlayEls: [],
            particles: [],
            rocks: [],
            vents: [],           // Emisores de humo para fumarolas_hidrotermales
            floorImg: null,      // Imagen floor.png cargada al entrar en fumarolas
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
        // Leer subtitle desde el catálogo según la especie activa
        const sId = this.currentSpecieId || null;
        const macroData = sId && window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : null;
        const biomeKey = (macroData && macroData.subtitle) ? macroData.subtitle : this.currentBiome;
        const subtitle = MacroManager.BIOME_LABELS[biomeKey] || 'Entorno Abisal';
        return {
            title: "DETECCIÓN MACRO",
            subtitle,
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

        // --- BIOMA: leer del catálogo y generar entorno ---
        this.currentBiome = (macroData && macroData.subtitle) ? macroData.subtitle : 'rocas';
        this._generateBiome(this.currentBiome);

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
    // ---------------------------------------------------------------------------
    // GENERACIÓN Y RENDERIZADO DE BIOMAS
    // ---------------------------------------------------------------------------

    _generateProceduralRockTexture(W, H) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Fondo base oscuro
        ctx.fillStyle = '#0a0503';
        ctx.fillRect(0, 0, W, H);

        // Generar múltiples capas de rocas poliédricas para la textura
        for (let layer = 0; layer < 3; layer++) {
            const count = 60 + layer * 40;
            for (let i = 0; i < count; i++) {
                const cx = Math.random() * W;
                const cy = Math.random() * H;
                const size = (3 - layer) * (60 + Math.random() * 80);

                ctx.beginPath();
                const points = 5 + Math.floor(Math.random() * 5);
                for (let j = 0; j < points; j++) {
                    const angle = (j / points) * Math.PI * 2;
                    const dist = size * (0.5 + Math.random() * 0.5);
                    const px = cx + Math.cos(angle) * dist;
                    const py = cy + Math.sin(angle) * dist;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();

                // Colores de basalto volcánico oscuro con variaciones
                const val = 15 + layer * 5 + Math.random() * 15;
                const heat = layer === 0 ? Math.random() * 15 : 0;
                ctx.fillStyle = `rgb(${val + 5 + heat}, ${val}, ${val - 3})`;
                ctx.fill();

                // Grietas oscuras
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.4 + Math.random() * 0.5})`;
                ctx.lineWidth = 2 + Math.random() * 3;
                ctx.stroke();

                // Resalte iluminado tenue en un borde simulando profundidad
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + Math.random() * 0.04})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Sombreado ambiental
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0,0,0,0.6)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
        grad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        return canvas;
    }

    /**
     * Genera los arrays `rocks` y `particles` del state según el bioma indicado.
     * Cada bioma tiene su propia paleta, densidad y distribución espacial.
     */
    _generateBiome(biome) {
        const W = this.state.canvas.width;
        const H = this.state.canvas.height;
        this.state.rocks = [];
        this.state.particles = [];

        if (biome === 'fumarolas_hidrotermales') {
            // === FUMAROLA MUY DE CERCA (TEXTURA ROCOSA PROCEDURAL Y DISTORSIÓN) ===
            this.state.vents = [];
            this.state.bgRocks = [];

            // Generar textura rocosa procedural si no existe o cambió tamaño
            if (!this.state.rockTextureCanvas || this.state.rockTextureCanvas.width !== W) {
                this.state.rockTextureCanvas = this._generateProceduralRockTexture(W, H);
            }

            // Lluvia densa y lenta de partículas de ceniza por toda la pantalla
            for (let i = 0; i < 200; i++) {
                this.state.particles.push({
                    type: 'ash',
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.2, // Deriva lateral sutil y casi imperceptible
                    vy: 0.05 + Math.random() * 0.1, // Caída extremadamente lenta (sensación de flotabilidad)
                    size: 0.8 + Math.random() * 2.5, // Partículas pequeñas
                    life: Math.random() * 100 // Fase para animación
                });
            }

        } else if (biome === 'llanura_abisal') {
            // --- Llanura abisal realista ---
            // Sedimento arcilloso/silíceo: beige-marrón muy oscuro con tinte frío

            // Ondulaciones de corriente de fondo (ripple marks)
            const rippleCount = 8 + Math.floor(Math.random() * 6);
            for (let i = 0; i < rippleCount; i++) {
                this.state.rocks.push({
                    type: 'ripple',
                    x: Math.random() * W,
                    y: H - 8 - Math.random() * 30,  // pegado al suelo
                    w: 60 + Math.random() * 180,     // anchura de la onda
                    amplitude: 2 + Math.random() * 5 // altura de la cresta
                });
            }

            // Nódulos de manganeso (esferas negras mate dispersas en el fondo)
            const noduleCount = 12 + Math.floor(Math.random() * 10);
            for (let i = 0; i < noduleCount; i++) {
                const nd = Math.random();
                this.state.rocks.push({
                    type: 'nodule',
                    x: Math.random() * W,
                    y: H - 4 - Math.random() * 18,
                    r: 3 + Math.random() * 9,
                    // Negro con reflejo azulado-metálico
                    color: `rgba(${18 + nd * 12}, ${20 + nd * 12}, ${22 + nd * 14}, 1)`
                });
            }

            // Montículos de bioturbación (organismos que remueven el sedimento)
            const moundCount = 4 + Math.floor(Math.random() * 4);
            for (let i = 0; i < moundCount; i++) {
                this.state.rocks.push({
                    type: 'mound',
                    x: Math.random() * W,
                    y: H,
                    w: 30 + Math.random() * 70,
                    h: 8 + Math.random() * 18
                });
            }

            // Nieve marina muy lenta (sedimento que cae)
            for (let i = 0; i < 90; i++) {
                this.state.particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 0.2 + Math.random() * 0.9,
                    vx: (Math.random() - 0.5) * 0.08,
                    vy: 0.04 + Math.random() * 0.08, // desciende muy lento
                    r: 185, g: 175, b: 160,          // tono beige-arcilloso
                    flickerOffset: Math.random() * Math.PI * 2,
                    flickerSpeed: 0.8 + Math.random() * 1.5
                });
            }
            // Partículas de agua intersticial (bioluminiscencia tenue)
            for (let i = 0; i < 30; i++) {
                this.state.particles.push({
                    x: Math.random() * W,
                    y: H - Math.random() * (H * 0.4),
                    z: 0.5 + Math.random() * 1.2,
                    vx: (Math.random() - 0.5) * 0.06,
                    vy: (Math.random() - 0.5) * 0.05,
                    r: 80, g: 180, b: 200,
                    flickerOffset: Math.random() * Math.PI * 2,
                    flickerSpeed: 1 + Math.random() * 2
                });
            }

        } else if (biome === 'mar_abierto') {
            // =====================================================================
            // MAR ABIERTO — Ecosistema abisal procedural multicapa
            // Capas: nieve marina (3 estratos de paralaje), plancton bioluminiscente,
            //        filamentos de corriente, medusas fantasma
            // =====================================================================

            // --- ESTRATO 1: Polvo orgánico lejano (fondo, muy lento, casi estático) ---
            for (let i = 0; i < 320; i++) {
                this.state.particles.push({
                    type: 'snow',
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 0.08 + Math.random() * 0.25,
                    vx: -0.015 - Math.random() * 0.02,
                    vy: 0.018 + Math.random() * 0.025,
                    r: 170, g: 182, b: 195,
                    opacity: 0.06 + Math.random() * 0.18,
                    phase: Math.random() * Math.PI * 2, // fase seno para meandro
                    freq: 0.0004 + Math.random() * 0.0006
                });
            }

            // --- ESTRATO 2: Agregados medianos (plano medio) ---
            for (let i = 0; i < 80; i++) {
                this.state.particles.push({
                    type: 'snow_large',
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 0.5 + Math.random() * 0.7,
                    vx: -0.03 - Math.random() * 0.035,
                    vy: 0.03 + Math.random() * 0.045,
                    r: 155, g: 168, b: 182,
                    opacity: 0.04 + Math.random() * 0.11,
                    phase: Math.random() * Math.PI * 2,
                    freq: 0.0003 + Math.random() * 0.0004
                });
            }

            // --- ESTRATO 3: Copos grandes cercanos a la cámara (paralaje) ---
            for (let i = 0; i < 25; i++) {
                this.state.particles.push({
                    type: 'snow_close',
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 1.4 + Math.random() * 1.8,
                    vx: -0.07 - Math.random() * 0.06,
                    vy: 0.06 + Math.random() * 0.06,
                    r: 140, g: 155, b: 172,
                    opacity: 0.03 + Math.random() * 0.07,
                    phase: Math.random() * Math.PI * 2,
                    freq: 0.0002 + Math.random() * 0.0003
                });
            }

            // --- PLANCTON BIOLUMINISCENTE: puntos vivos con pulso propio ---
            for (let i = 0; i < 55; i++) {
                const hue = 160 + Math.random() * 60; // cian-verde-azul abisal
                const sat = 70 + Math.random() * 30;
                // Pre-calcular color RGB desde HSL aproximado
                const h = hue / 360, s = sat / 100, l = 0.55;
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p2 = 2 * l - q;
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1; if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                const pr = Math.round(hue2rgb(p2, q, h + 1/3) * 255);
                const pg = Math.round(hue2rgb(p2, q, h) * 255);
                const pb = Math.round(hue2rgb(p2, q, h - 1/3) * 255);
                this.state.particles.push({
                    type: 'plankton',
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 0.6 + Math.random() * 1.0,
                    vx: (Math.random() - 0.5) * 0.08,
                    vy: (Math.random() - 0.5) * 0.06,
                    r: pr, g: pg, b: pb,
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.0008 + Math.random() * 0.0016, // velocidad de latido
                    baseOpacity: 0.15 + Math.random() * 0.45,
                    phase: Math.random() * Math.PI * 2,
                    freq: 0.0003 + Math.random() * 0.0005
                });
            }

            // --- FILAMENTOS DE CORRIENTE: partículas alargadas que trazan el flujo ---
            for (let i = 0; i < 18; i++) {
                this.state.particles.push({
                    type: 'current',
                    x: Math.random() * W,
                    y: 80 + Math.random() * (H - 160),
                    len: 18 + Math.random() * 40, // longitud del filamento
                    vx: -0.18 - Math.random() * 0.22,
                    vy: (Math.random() - 0.5) * 0.04,
                    phase: Math.random() * Math.PI * 2,
                    freq: 0.0002 + Math.random() * 0.0003,
                    opacity: 0.04 + Math.random() * 0.09,
                    r: 130, g: 180, b: 210
                });
            }

            // --- MEDUSAS FANTASMA: siluetas circulares translúcidas que derivan ---
            for (let i = 0; i < 4; i++) {
                const jellyR = 22 + Math.random() * 38;
                this.state.particles.push({
                    type: 'jellyfish',
                    x: Math.random() * W,
                    y: 60 + Math.random() * (H - 120),
                    r: 120, g: 200, b: 240,
                    radius: jellyR,
                    vx: (Math.random() - 0.5) * 0.12,
                    vy: -0.04 - Math.random() * 0.06, // ascienden muy lento
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.0005 + Math.random() * 0.001,
                    opacity: 0.03 + Math.random() * 0.07,
                    tentacles: 5 + Math.floor(Math.random() * 5)
                });
            }

        } else {
            // === ROCAS (SUELO ROCOSO — por defecto) ===
            // Suelo con rocas irregulares procedurales, fondo oscuro y partículas de agua.
            for (let i = 0; i < 40; i++) {
                const r = Math.random();
                this.state.rocks.push({
                    type: 'rock',
                    x: Math.random() * W,
                    y: H - (Math.random() * 60),
                    size: 20 + Math.random() * 100,
                    color: `rgba(${10 + r * 10}, ${10 + r * 10}, ${20 + r * 10}, 1)`,
                    glowColor: `rgba(0, 255, 255, 0.05)`,
                    segments: this.generateRockShape()
                });
            }
            // Partículas estándar de agua
            for (let i = 0; i < 150; i++) {
                this.state.particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    z: 0.5 + Math.random() * 2.5,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.3 + 0.2,
                    r: 200, g: 240, b: 255,
                    flickerOffset: Math.random() * Math.PI * 2,
                    flickerSpeed: 3 + Math.random() * 5
                });
            }
        }
    }

    /**
     * Dibuja el suelo/entorno del bioma activo.
     * Llamado desde draw() ANTES de las partículas y criaturas.
     */
    _drawBiome(ctx, canvas, elapsedMs) {
        const biome = this.currentBiome;
        const H = canvas.height;
        const W = canvas.width;
        const timeS = elapsedMs * 0.001;

        if (biome === 'fumarolas_hidrotermales') {
            // === RENDER FUMAROLA HIDROTERMAL (MUY DE CERCA PROCEDURAL) ===

            // Dibujar la textura rocosa procedural llenando la pantalla
            if (this.state.rockTextureCanvas) {
                ctx.drawImage(this.state.rockTextureCanvas, 0, 0);
            } else {
                ctx.fillStyle = 'rgba(15, 8, 5, 1)';
                ctx.fillRect(0, 0, W, H);
            }

        } else if (biome === 'llanura_abisal') {
            // ---- SUELO ABISAL REALISTA ----
            // Capa de sedimento profunda: arcilla roja + sílice biogénico
            // Gradiente principal del suelo (tono beige-marrón muy oscuro con base cálida)
            const floorDepth = 90;
            const floorGrad = ctx.createLinearGradient(0, H - floorDepth, 0, H);
            floorGrad.addColorStop(0, 'rgba(28, 22, 16, 0)');
            floorGrad.addColorStop(0.35, 'rgba(38, 29, 20, 0.7)');
            floorGrad.addColorStop(0.75, 'rgba(48, 36, 24, 0.95)');
            floorGrad.addColorStop(1, 'rgba(52, 40, 26, 1)');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, H - floorDepth, W, floorDepth);

            // Textura de sedimento fino: bandas horizontales translúcidas muy sutiles
            for (let b = 0; b < 6; b++) {
                const by = H - floorDepth + b * (floorDepth / 6) + Math.sin(b * 1.3) * 3;
                const ba = 0.03 + b * 0.01;
                ctx.fillStyle = `rgba(${55 + b * 3}, ${42 + b * 2}, ${28 + b}, ${ba})`;
                ctx.fillRect(0, by, W, floorDepth / 6);
            }

            // Dibujar elementos: montículos, ondulaciones, nódulos
            this.state.rocks.forEach(rock => {
                if (rock.type === 'mound') {
                    // Montículo de bioturbación: protuberancia suave en el sedimento
                    ctx.save();
                    const mGrad = ctx.createRadialGradient(
                        rock.x, rock.y - rock.h * 0.5, 0,
                        rock.x, rock.y, rock.w * 0.6
                    );
                    mGrad.addColorStop(0, 'rgba(62, 48, 30, 0.9)');
                    mGrad.addColorStop(0.5, 'rgba(50, 38, 24, 0.6)');
                    mGrad.addColorStop(1, 'rgba(40, 30, 18, 0)');
                    ctx.fillStyle = mGrad;
                    ctx.beginPath();
                    ctx.ellipse(rock.x, rock.y, rock.w * 0.5, rock.h, 0, Math.PI, 0, true);
                    ctx.fill();
                    ctx.restore();

                } else if (rock.type === 'ripple') {
                    // Ondulación de corriente: línea sinusoidal suave
                    ctx.save();
                    ctx.strokeStyle = 'rgba(70, 55, 35, 0.55)';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    const steps = Math.ceil(rock.w / 6);
                    for (let s = 0; s <= steps; s++) {
                        const rx = rock.x - rock.w / 2 + s * (rock.w / steps);
                        const ry = rock.y + Math.sin((s / steps) * Math.PI * 2) * rock.amplitude;
                        s === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
                    }
                    ctx.stroke();
                    // Sombra de la cresta (highlight)
                    ctx.strokeStyle = 'rgba(95, 75, 50, 0.2)';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    for (let s = 0; s <= steps; s++) {
                        const rx = rock.x - rock.w / 2 + s * (rock.w / steps);
                        const ry = rock.y + Math.sin((s / steps) * Math.PI * 2) * rock.amplitude - 1.5;
                        s === 0 ? ctx.moveTo(rx, ry) : ctx.lineTo(rx, ry);
                    }
                    ctx.stroke();
                    ctx.restore();

                } else if (rock.type === 'nodule') {
                    // Nódulo de manganeso: esfera negra mate con tinte metálico
                    ctx.save();
                    const nGrad = ctx.createRadialGradient(
                        rock.x - rock.r * 0.3, rock.y - rock.r * 0.3, rock.r * 0.05,
                        rock.x, rock.y, rock.r
                    );
                    nGrad.addColorStop(0, 'rgba(55, 58, 65, 0.9)');
                    nGrad.addColorStop(0.4, rock.color);
                    nGrad.addColorStop(1, 'rgba(8, 8, 10, 1)');
                    ctx.beginPath();
                    ctx.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
                    ctx.fillStyle = nGrad;
                    ctx.fill();
                    // Oclusión ambiental: sombra débil bajo el nódulo
                    const shadowGrad = ctx.createRadialGradient(
                        rock.x, rock.y + rock.r * 0.9, 0,
                        rock.x, rock.y + rock.r * 0.9, rock.r * 1.4
                    );
                    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
                    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = shadowGrad;
                    ctx.fill();
                    ctx.restore();
                }
            });

        } else if (biome === 'mar_abierto') {
            // =================================================================
            // MAR ABIERTO — Fondo abisal multicapa con efectos volumétricos
            // =================================================================

            // 1. Gradiente de profundidad principal (arriba ligeramente más azul → negro puro abajo)
            const depthGrad = ctx.createLinearGradient(0, 0, 0, H);
            depthGrad.addColorStop(0, 'rgba(3, 7, 18, 1)');
            depthGrad.addColorStop(0.38, 'rgba(2, 5, 12, 1)');
            depthGrad.addColorStop(0.72, 'rgba(1, 2, 6, 1)');
            depthGrad.addColorStop(1, 'rgba(0, 0, 2, 1)');
            ctx.fillStyle = depthGrad;
            ctx.fillRect(0, 0, W, H);

            // 2. Rayos cáusticos procedurales (luz filtrada desde superficie lejana)
            //    Solo se ven en la mitad superior, muy tenues y en movimiento
            ctx.save();
            ctx.globalAlpha = 1;
            const numRays = 6;
            for (let ri = 0; ri < numRays; ri++) {
                const rPhase = (ri / numRays) * Math.PI * 2;
                const oscX = Math.sin(timeS * 0.18 + rPhase) * 40;
                const rx = (W * (0.12 + ri * 0.14)) + oscX;
                const rayAlpha = 0.012 + 0.008 * Math.sin(timeS * 0.25 + rPhase * 1.7);
                const rayWidth = 18 + 12 * Math.sin(timeS * 0.12 + rPhase);
                const rayGrad = ctx.createLinearGradient(rx, 0, rx + rayWidth * 0.5, H * 0.65);
                rayGrad.addColorStop(0, `rgba(30, 80, 140, ${(rayAlpha * 1.5).toFixed(4)})`);
                rayGrad.addColorStop(0.35, `rgba(15, 50, 100, ${rayAlpha.toFixed(4)})`);
                rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = rayGrad;
                ctx.beginPath();
                ctx.moveTo(rx - rayWidth * 0.2, 0);
                ctx.lineTo(rx + rayWidth, 0);
                ctx.lineTo(rx + rayWidth * 1.6 + oscX * 0.3, H * 0.65);
                ctx.lineTo(rx - rayWidth * 0.8 + oscX * 0.3, H * 0.65);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // 3. Velo de niebla abisal (bruma volumétrica en plano medio)
            //    Gradiente radial en movimiento lento que da sensación de densidad
            ctx.save();
            const fogCx = W * 0.5 + Math.sin(timeS * 0.07) * W * 0.18;
            const fogCy = H * 0.5 + Math.cos(timeS * 0.05) * H * 0.12;
            const fogGrad = ctx.createRadialGradient(fogCx, fogCy, 0, fogCx, fogCy, W * 0.7);
            fogGrad.addColorStop(0, 'rgba(4, 12, 30, 0.18)');
            fogGrad.addColorStop(0.5, 'rgba(2, 6, 15, 0.08)');
            fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();

        } else {
            // === RENDER ROCAS (suelo por defecto) ===

            // Gradiente de suelo oscuro
            const floorGrad = ctx.createLinearGradient(0, H - 80, 0, H);
            floorGrad.addColorStop(0, 'rgba(5, 8, 18, 0)');
            floorGrad.addColorStop(1, 'rgba(5, 8, 18, 1)');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, H - 80, W, 80);

            this.state.rocks.forEach(rock => {
                ctx.save();
                ctx.translate(rock.x, rock.y);
                ctx.beginPath();
                rock.segments.forEach((seg, i) => {
                    const px = Math.cos(seg.angle) * rock.size * seg.dist;
                    const py = Math.sin(seg.angle) * rock.size * seg.dist;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.fillStyle = rock.color;
                ctx.fill();
                ctx.strokeStyle = rock.glowColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            });
        }
    }

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

        // 3. AVANCE DE VENTS (humo hidrotermal, solo si el bioma es fumarolas)
        if (this.currentBiome === 'fumarolas_hidrotermales' && this.state.vents.length > 0) {
            const spawnInterval = 0.2;
            this.state.vents.forEach(vent => {
                vent.emitTimer += dt * 0.55; // más lento que en el mundo (juego pausado)
                if (vent.emitTimer > spawnInterval) {
                    vent.emitTimer = 0;
                    const baseSize = 8 + vent.density * 14;
                    const jetForce = 3 + vent.density * 2.5;
                    const ventX = vent.xRatio * canvas.width;
                    vent.particles.push({
                        x: ventX + (Math.random() * baseSize * 0.5 - baseSize * 0.25),
                        y: vent.topY,
                        vx: (Math.random() * 0.6 - 0.3),
                        vy: -(Math.random() * 1.5 + jetForce),
                        life: 1.0,
                        size: Math.random() * 5 + baseSize,
                        maxLife: Math.random() * 90 + 70,
                        stretch: Math.random() * 1.5 + 2.0
                    });
                }
                for (let i = vent.particles.length - 1; i >= 0; i--) {
                    const p = vent.particles[i];
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vx += (Math.random() * 0.2 - 0.1) * dt;
                    p.vx *= Math.pow(0.98, dt);
                    p.vy *= Math.pow(0.96, dt);
                    p.life -= (1 / p.maxLife) * dt;
                    const expandRate = 1.0 + (1.0 - Math.min(1.0, Math.abs(p.vy) / 8));
                    p.size += expandRate * 1.5 * dt;
                    p.stretch = Math.max(1.0, p.stretch - 0.03 * dt);
                    if (p.life <= 0) vent.particles.splice(i, 1);
                }
            });
        }

        // 4. MOVIMIENTO DE PARTÍCULAS
        const elapsedS = this.state.elapsedMs * 0.001;
        this.state.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.type === 'ash') {
                // Movimiento flotante e ingrávido muy sutil
                p.x += Math.sin(p.life * 5 + p.y * 0.02) * 0.2 * dt;
                p.life += dt * 0.02; // Animaciones (parpadeo y rotación) mucho más lentas

            } else if (p.type === 'snow' || p.type === 'snow_large' || p.type === 'snow_close') {
                // Meandro sinusoidal horizontal: simula microcorrientes abisales
                p.x += Math.sin(elapsedS * (p.freq || 0.0005) * 1000 + (p.phase || 0)) * 0.18 * dt;

            } else if (p.type === 'plankton') {
                // Deriva sinusoidal bidireccional suave + fase propia
                p.x += Math.sin(elapsedS * (p.freq || 0.0004) * 1000 + (p.phase || 0)) * 0.22 * dt;
                p.y += Math.cos(elapsedS * (p.freq || 0.0004) * 800 + (p.phase || 0) * 0.7) * 0.12 * dt;

            } else if (p.type === 'current') {
                // Los filamentos de corriente oscilan verticalmente al avanzar
                p.y += Math.sin(elapsedS * (p.freq || 0.0003) * 1000 + (p.phase || 0)) * 0.15 * dt;

            } else if (p.type === 'jellyfish') {
                // Las medusas ascienden con pulsación de campana y meandro lateral muy suave
                p.x += Math.sin(elapsedS * 0.15 + (p.pulsePhase || 0)) * 0.08 * dt;
            }

            // Wrap-around (las medusas reaparecen por abajo al salir por arriba)
            if (p.x < -50) p.x = canvas.width + 50;
            if (p.x > canvas.width + 50) p.x = -50;
            if (p.type === 'jellyfish') {
                if (p.y < -80) p.y = canvas.height + 80;
            } else {
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            }
            if (p.y < 0 && p.type !== 'jellyfish') p.y = canvas.height;
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

        // Capa de entorno (bioma: rocas, chimeneas, suelo, etc.)
        this._drawBiome(ctx, canvas, elapsedMs);

        // Partículas
        particles.forEach(p => {
            const pr = p.r !== undefined ? p.r : 200;
            const pg = p.g !== undefined ? p.g : 240;
            const pb = p.b !== undefined ? p.b : 255;

            ctx.beginPath();

            if (p.type === 'snow') {
                // Polvo orgánico lejano: círculo puntual con meandro suave
                const snowOpacity = p.opacity * (0.75 + 0.25 * Math.sin(timeS * 1.1 + (p.phase || 0)));
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${snowOpacity.toFixed(3)})`;
                ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'snow_close') {
                // Copos cercanos: núcleo + halo difuso más pronunciado
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${p.opacity.toFixed(3)})`;
                ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(p.opacity * 0.25).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.z * 2.2, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'snow_large') {
                // Nieve marina de plano medio: núcleo + halo difuso
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${p.opacity.toFixed(3)})`;
                ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(p.opacity * 0.28).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.z * 1.7, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'plankton') {
                // Plancton bioluminiscente: pulso de brillo individual
                const pulse = 0.5 + 0.5 * Math.sin(timeS * (p.pulseSpeed || 0.001) * 1000 + (p.pulsePhase || 0));
                const glow = p.baseOpacity * pulse;
                // Núcleo brillante
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${Math.min(1, glow * 1.4).toFixed(3)})`;
                ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
                ctx.fill();
                // Corona de bioluminiscencia
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(glow * 0.35).toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.z * 2.8, 0, Math.PI * 2);
                ctx.fill();
                // Halo exterior muy difuso
                if (glow > 0.12) {
                    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(glow * 0.1).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.z * 5.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (p.type === 'current') {
                // Filamento de corriente: línea translúcida con gradiente de opacidad
                const cAlpha = p.opacity * (0.6 + 0.4 * Math.sin(timeS * 0.4 + (p.phase || 0)));
                const grad = ctx.createLinearGradient(p.x, p.y, p.x - p.len, p.y);
                grad.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${cAlpha.toFixed(3)})`);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.len, p.y + Math.sin(timeS * 0.3 + (p.phase || 0)) * 4);
                ctx.strokeStyle = grad;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            } else if (p.type === 'jellyfish') {
                // Medusa fantasma: campana semitransparente con tentáculos
                const jPulse = 0.7 + 0.3 * Math.sin(timeS * (p.pulseSpeed || 0.001) * 1000 + (p.pulsePhase || 0));
                const jR = p.radius * jPulse;
                const jAlpha = p.opacity * jPulse;
                // Campana principal (semilunar)
                const jGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, jR);
                jGrad.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${(jAlpha * 0.55).toFixed(3)})`);
                jGrad.addColorStop(0.6, `rgba(${p.r}, ${p.g}, ${p.b}, ${(jAlpha * 0.2).toFixed(3)})`);
                jGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, jR, Math.PI, 0); // semicírculo superior
                ctx.closePath();
                ctx.fillStyle = jGrad;
                ctx.fill();
                // Borde inferior de la campana
                ctx.beginPath();
                ctx.arc(p.x, p.y, jR, Math.PI, 0);
                ctx.strokeStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${(jAlpha * 0.35).toFixed(3)})`;
                ctx.lineWidth = 0.7;
                ctx.stroke();
                // Tentáculos (líneas sinusoidales hacia abajo)
                const tCount = p.tentacles || 5;
                for (let ti = 0; ti < tCount; ti++) {
                    const tx = p.x + (ti / (tCount - 1) - 0.5) * jR * 1.6;
                    const tLen = jR * (0.8 + 0.4 * Math.sin(timeS * 0.5 + ti));
                    ctx.beginPath();
                    ctx.moveTo(tx, p.y);
                    const cp1x = tx + Math.sin(timeS * 0.3 + ti * 1.2) * 6;
                    ctx.quadraticCurveTo(cp1x, p.y + tLen * 0.5, tx + Math.sin(timeS * 0.5 + ti) * 4, p.y + tLen);
                    ctx.strokeStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${(jAlpha * 0.25).toFixed(3)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
                ctx.beginPath(); // Resetear path para próxima partícula
            } else if (p.type === 'ash') {
                // Cenizas minerales flotando muy lentamente por toda la pantalla
                const twinkle = 0.6 + 0.4 * Math.sin(p.life * 40 + p.x);
                const alpha = Math.max(0, 0.8 * twinkle).toFixed(3);
                const softAlpha = Math.max(0, 0.3 * twinkle).toFixed(3);
                
                const val = Math.floor(120 + Math.sin(p.life * 10) * 30);
                const apparentSizeY = p.size * (0.3 + 0.7 * Math.abs(Math.sin(p.life * 18 + p.y)));
                
                // Núcleo sólido de la ceniza
                ctx.fillStyle = `rgba(${val}, ${val + 10}, ${val + 20}, ${alpha})`;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size, Math.max(0.2, apparentSizeY), p.vx * 0.4, 0, Math.PI * 2);
                ctx.fill();

                // Halo exterior transparente para suavizar bordes (elimina aspecto cuadrado en baja escala)
                ctx.fillStyle = `rgba(${val}, ${val + 10}, ${val + 20}, ${softAlpha})`;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size * 1.8, Math.max(0.3, apparentSizeY * 1.8), p.vx * 0.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Partículas originales con flicker (biomas estándar)
                const flicker = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(timeS * p.flickerSpeed + p.flickerOffset));
                ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(0.4 * flicker).toFixed(3)})`;
                ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
                ctx.fill();

                if (p.z > 1.5) {
                    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${(0.05 * flicker).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.z * 3, 0, Math.PI * 2);
                    ctx.fill();
                }
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

        // --- ABERRACIÓN CROMÁTICA SUBMARINA (solo mar_abierto) ---
        // El agua profunda dispersa los canales de color de forma diferente:
        // el azul viaja más lejos, el rojo se absorbe antes.
        // Se simula desfasando levemente cada canal en el borde del cono de luz.
        if (this.currentBiome === 'mar_abierto' && lightOn) {
            // Reutilizar o crear canvas auxiliar
            if (!this.state.chromaCanvas) {
                this.state.chromaCanvas = document.createElement('canvas');
                this.state.chromaCtx = this.state.chromaCanvas.getContext('2d');
            }
            const cc = this.state.chromaCanvas;
            const cCtx = this.state.chromaCtx;
            if (cc.width !== canvas.width || cc.height !== canvas.height) {
                cc.width = canvas.width;
                cc.height = canvas.height;
            }

            // Copiar el frame actual al canvas auxiliar
            cCtx.clearRect(0, 0, cc.width, cc.height);
            cCtx.drawImage(canvas, 0, 0);

            // Canal ROJO desplazado a la derecha (+1.8px) — más absorbido en agua
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.06;
            ctx.filter = 'saturate(4) hue-rotate(0deg) brightness(0.8)';
            ctx.drawImage(cc, 1.8, 0);
            ctx.restore();

            // Canal AZUL desplazado a la izquierda (-1.2px) — domina en aguas profundas
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.07;
            ctx.filter = 'saturate(4) hue-rotate(200deg) brightness(0.7)';
            ctx.drawImage(cc, -1.2, 0);
            ctx.restore();
        }

        // --- EFECTO SCHLIEREN (Distorsión por calor de fumarolas) ---
        if (this.currentBiome === 'fumarolas_hidrotermales') {
            ctx.save();
            if (!this.state.hazeCanvas) {
                this.state.hazeCanvas = document.createElement('canvas');
                this.state.hazeCtx = this.state.hazeCanvas.getContext('2d');
            }
            // Asegurar el mismo tamaño que el canvas principal
            if (this.state.hazeCanvas.width !== canvas.width || this.state.hazeCanvas.height !== canvas.height) {
                this.state.hazeCanvas.width = canvas.width;
                this.state.hazeCanvas.height = canvas.height;
            }

            // Capturar el canvas actual (con la máscara aplicada)
            this.state.hazeCtx.clearRect(0, 0, canvas.width, canvas.height);
            this.state.hazeCtx.drawImage(canvas, 0, 0);

            // Limpiar el canvas original para redibujarlo con distorsión
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const time = elapsedMs * 0.003;
            const sliceH = 4;
            for (let i = 0; i < canvas.height; i += sliceH) {
                // Aumentamos aún más la amplitud para una distorsión muy evidente
                const wave = Math.sin(time + i * 0.04) * 9.0 +
                    Math.sin(time * 0.6 + i * 0.1) * 4.0;

                // Intensidad es mayor abajo (fuente de calor) y decrece un poco arriba
                const intensity = Math.min(1.0, (i / canvas.height) + 0.4);
                const finalOffset = wave * intensity;

                // Dibujamos estirando mucho los bordes (+30) para evitar cortes
                ctx.drawImage(this.state.hazeCanvas, 0, i, canvas.width, sliceH, finalOffset - 15, i, canvas.width + 30, sliceH);
            }
            ctx.restore();
        }

        // Efecto visual de lente (Vignette) — tinte azul abisal en mar_abierto
        if (this.currentBiome === 'mar_abierto') {
            // Vignette con tinte azul marino profundo
            const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 5, canvas.width / 2, canvas.height / 2, canvas.width / 1.1);
            vignette.addColorStop(0, 'rgba(0, 0, 4, 0)');
            vignette.addColorStop(0.55, 'rgba(0, 2, 12, 0.5)');
            vignette.addColorStop(1, 'rgba(0, 1, 8, 0.92)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Pulso de bioluminiscencia ambiental (respira lento sobre el fondo)
            const bioPhase = timeS * 0.38;
            const bioPulse = 0.5 + 0.5 * Math.sin(bioPhase);
            const bioCx = canvas.width * (0.3 + 0.4 * Math.sin(timeS * 0.11));
            const bioCy = canvas.height * (0.4 + 0.2 * Math.cos(timeS * 0.09));
            const bioGrad = ctx.createRadialGradient(bioCx, bioCy, 0, bioCx, bioCy, canvas.width * 0.55);
            bioGrad.addColorStop(0, `rgba(0, 180, 140, ${(0.025 * bioPulse).toFixed(4)})`);
            bioGrad.addColorStop(0.5, `rgba(0, 80, 120, ${(0.012 * bioPulse).toFixed(4)})`);
            bioGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = bioGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 4, canvas.width / 2, canvas.height / 2, canvas.width / 1.2);
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Brillo visual de la linterna (Halo) — biome-aware para mar_abierto
        if (lightOn) {
            ctx.save();
            if (this.currentBiome === 'mar_abierto') {
                // Lámpara submarina realista:
                // — Núcleo blanco cálido (xenón bajo el agua parece amarillo-blanco)
                const hotGrad = ctx.createRadialGradient(crosshairX, crosshairY, 0, crosshairX, crosshairY, 55);
                hotGrad.addColorStop(0, 'rgba(255, 248, 220, 0.30)');
                hotGrad.addColorStop(0.4, 'rgba(220, 235, 255, 0.15)');
                hotGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = hotGrad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // — Dispersión de Rayleigh: halo azul amplio (el agua absorbe el rojo primero)
                const scatterGrad = ctx.createRadialGradient(crosshairX, crosshairY, 30, crosshairX, crosshairY, 320);
                scatterGrad.addColorStop(0, 'rgba(20, 120, 200, 0.09)');
                scatterGrad.addColorStop(0.4, 'rgba(5, 60, 140, 0.045)');
                scatterGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = scatterGrad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                // Halo genérico (resto de biomas)
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
            }
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
