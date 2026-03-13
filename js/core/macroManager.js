/**
 * MACRO MANAGER
 * [ES] Gestiona el minijuego de observación a micro-escala. Instancia un ecosistema procedural para examinar criaturas diminutas.
 * [EN] Manages the micro-scale observation minigame. Instantiates a procedural ecosystem to examine tiny creatures.
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
        this.state = {
            // Posición y movimiento de las criaturas
            creatures: [],
            breathingScale: 1,

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
            const scale = 18 * (0.9 + Math.sin(layerPulse) * 0.1); // Radio reducido de 25 a 18
            const alpha = 0.4 * (0.5 + Math.sin(layerPulse) * 0.5);

            ctx.beginPath();
            ctx.arc(x, y, scale, 0, Math.PI * 2);
            ctx.strokeStyle = config.haloColor.replace('0.2', alpha.toFixed(3));
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 2. RESPLANDOR EXTERIOR (Glow suave)
            const corePulse = Math.sin(pulse) * 0.2 + 0.8;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 * corePulse); // Radio reducido de 30 a 20
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

        // Audio AL ENTRAR (como pidió el usuario)
        const macroStartAudio = new Audio('audio/macro.mp3');
        macroStartAudio.volume = 0.5;
        macroStartAudio.play().catch(e => { });

        // Inicializar minijuego (asíncrono)
        setTimeout(() => this.init(specieId), 100);


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

        const successUI = document.getElementById('macro-success-ui');
        if (successUI) {
            successUI.classList.remove('active');
            // Forzar ocultación inmediata y absoluta por estilo
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

        // Vaciado total para prevenir el "flash" de información antigua
        if (mImg) mImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        if (mTitle) mTitle.innerHTML = "";
        if (mGenus) mGenus.innerHTML = "";
        if (mDesc) mDesc.innerHTML = "";
    }

    close() {
        this.isOpen = false;

        // Limpiar UI inmediatamente
        this._clearSpecieUI();

        const modal = document.getElementById('discovery-modal');
        if (modal) modal.classList.remove('active');

        this.state.revealed = false;
        this.currentSpecieId = null;
    }

    /**
     * [ES] Inicia y prepara el minijuego Macro. Limpia el estado anterior y genera el entorno submarino en el canvas secundario.
     * [EN] Initializes and prepares the Macro minigame. Clears previous state and generates the submarine environment in the secondary canvas.
     */
    init(specieId = null) {
        this.state.canvas = document.getElementById('macro-canvas');
        if (!this.state.canvas) return;
        this.state.ctx = this.state.canvas.getContext('2d');

        // Ajustar canvas al tamaño real del modal para evitar distorsiones
        const modal = document.getElementById('discovery-modal');
        this.state.canvas.width = modal.offsetWidth;
        this.state.canvas.height = modal.offsetHeight;

        this.state.revealed = false;
        this.state.keys = {}; // Reset de controles

        // Usar la especie pasada o fallback a eurythenes
        const sId = specieId || this.currentSpecieId || 'eurythenes';

        // --- CONFIGURACIÓN DE DATOS ---
        const macroData = window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : {
            id: 'fallback',
            imagen: './img/little/Eurythenes.png',
            ancho: 120,
            alto: 80,
            velocidadX: 1.5,
            velocidadY: 0.8,
            minEspecimenes: 1,
            maxEspecimenes: 1
        };

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

        this.state.breathingScale = 1;
        this.state.lightOn = true;

        // Carga de textura principal
        this.state.creatureImg.src = macroData.imagen;

        // --- GENERACIÓN DEL ENTORNO (FONDO) ---
        // Generamos rocas exclusivamente en la parte inferior para simular el lecho marino
        this.state.rocks = [];
        for (let i = 0; i < 40; i++) {
            this.state.rocks.push({
                x: Math.random() * this.state.canvas.width,
                y: this.state.canvas.height - (Math.random() * 60),
                size: 20 + Math.random() * 100, // Variedad de tamaños para profundidad visual
                color: `rgba(${10 + Math.random() * 10}, ${10 + Math.random() * 10}, ${20 + Math.random() * 10}, 1)`,
                segments: this.generateRockShape() // Forma procedural simplificada
            });
        }

        // Generamos partículas de "nieve marina" para añadir atmósfera
        this.state.particles = [];
        for (let i = 0; i < 150; i++) {
            this.state.particles.push({
                x: Math.random() * this.state.canvas.width,
                y: Math.random() * this.state.canvas.height,
                z: 0.5 + Math.random() * 2.5, // Profundidad simulada (radio de la partícula)
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.3 + 0.2 // Tendencia a caer lentamente
            });
        }

        this.state.lastTime = Date.now();
        // Empezar con la luz en el centro de la pantalla
        this.state.crosshairX = this.state.canvas.width / 2;
        this.state.crosshairY = this.state.canvas.height / 2;

        // --- RESET DE INTERFAZ HTML ---
        this._clearSpecieUI();

        // Iniciar el bucle de renderizado
        this.loop();
    }

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
     * [ES] Bucle principal de animación nativo del minijuego balanceando el timestep a 60fps.
     * [EN] Native animation main loop for the minigame balancing timestep to 60fps.
     */
    loop() {
        if (!this.isOpen) return;
        const now = Date.now();
        const dt = (now - this.state.lastTime) / 16.67; // Normalización a 60fps
        this.state.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.loop());
    }

    /**
     * [ES] Actualiza la lógica espacial (posición de linterna, de criaturas sueltas y de partículas suspendidas).
     * [EN] Updates spatial logic (flashlight position, free creatures, and suspended particles).
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

        // Actualizar posición del elemento DOM del cursor (crosshair visual decorativo)
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

        // Efecto de respiración (multiplicador relativo)
        this.state.breathingScale = 1 + Math.sin(Date.now() * 0.001) * 0.03;

        // 3. MOVIMIENTO DE PARTÍCULAS
        this.state.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Wrap-around (reaparecen por el lado opuesto)
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        });
    }

    /**
     * [ES] Pinta las capas del minijuego (fondo, partículas, siluetas, y la rica simulación de luz de linterna).
     * [EN] Paints the minigame layers (background, particles, silhouettes, and the heavily stylized flashlight simulation).
     */
    draw() {
        const { ctx, canvas, creatures, creatureImg, revealed, crosshairX, crosshairY, rocks, particles, breathingScale, lightOn } = this.state;
        if (!ctx) return;

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

        // Partículas mejoradas con brillo
        particles.forEach(p => {
            const flicker = 0.7 + Math.random() * 0.3;
            ctx.fillStyle = `rgba(200, 240, 255, ${0.4 * flicker})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.z, 0, Math.PI * 2);
            ctx.fill();

            // Halo sutil para partículas más grandes
            if (p.z > 1.5) {
                ctx.fillStyle = `rgba(0, 255, 255, ${0.05 * flicker})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.z * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Dibujar criaturas
        creatures.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            const w = c.w * breathingScale;
            const h = c.h * breathingScale;
            ctx.globalAlpha = revealed ? 1.0 : 0.7;

            ctx.drawImage(creatureImg, -w / 2, -h / 2, w, h);
            ctx.restore();
        });

        // MÁSCARA DE LUZ (Linterna Atmosférica)
        ctx.save();
        ctx.globalCompositeOperation = 'destination-in';
        if (lightOn) {
            const radius = revealed ? 600 : 220;
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
                return dist < 100; // Radio del hint
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
     * [ES] Gestiona el intento de análisis. Comprueba si la luz recae sobre una criatura esquiva al clickear/Enter.
     * [EN] Manages the scan attempt. Checks if light overlaps an elusive creature when clicked/Enter.
     */
    onEnter() {
        const { lightOn, revealed, crosshairX, crosshairY, creatures } = this.state;
        if (revealed) {
            // --- LIMPIEZA AGRESIVA ---
            // Limpiar ANTES de cerrar para evitar que la info se vea un solo frame
            this._clearSpecieUI();
            this.close();
            return;
        }
        if (lightOn) {
            // Verificar si alguna criatura está cerca del cursor
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
     * [ES] Accionado al iluminar con precisión una criatura. Despliega la UI de éxito extrayendo biografía del Macro Catalog.
     * [EN] Triggered upon precisely illuminating a creature. Deploys success UI extracting biography from the Macro Catalog.
     */
    onSuccess() {
        this.state.revealed = true;

        // Obtener datos del catálogo
        const sId = this.currentSpecieId || 'eurythenes';
        const macroData = window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : null;

        // NO cargamos los datos aquí. Los cargamos DENTRO del timeout 
        // para que no haya ni un frame de información vieja.

        this.state.successTimeout = setTimeout(() => {
            const successUI = document.getElementById('macro-success-ui');
            if (successUI && this.isOpen) {
                // Poblamos los datos síncronamente JUSTO antes de mostrar la UI
                if (macroData) {
                    const mImg = document.getElementById('macro-discovery-img');
                    const mTitle = document.getElementById('macro-discovery-title');
                    const mGenus = document.getElementById('macro-discovery-genus');
                    const mDesc = document.getElementById('macro-discovery-desc');

                    if (mImg) mImg.src = macroData.imagen;
                    if (mTitle) mTitle.innerText = macroData.nombre;
                    if (mGenus) mGenus.innerText = macroData.cientifico;
                    if (mDesc) mDesc.innerText = macroData.descripcion;
                }

                // Mostrar UI
                successUI.style.setProperty('display', 'flex', 'important');
                successUI.style.setProperty('opacity', '1', 'important');
                successUI.classList.add('active');

                const exitBtn = document.getElementById('macro-exit-btn');
                if (exitBtn) {
                    exitBtn.classList.remove('opacity-0', 'pointer-events-none');
                    exitBtn.style.setProperty('opacity', '1', 'important');
                    exitBtn.style.setProperty('pointer-events', 'auto', 'important');
                }

                // NO sonido aquí (el usuario pidió que el sonido macro.mp3 solo suene al entrar)
            }
        }, 500);
    }

    toggleLight() {
        this.state.lightOn = !this.state.lightOn;
        const clickAudio = new Audio('audio/light.mp3');
        clickAudio.volume = 0.3;
        clickAudio.play().catch(e => { });
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
