/**
 * MacroManager - Gestiona el minijuego de observación a micro-escala
 */

class MacroManager {
    /**
     * CONFIGURACIÓN DE PUNTOS DE INTERÉS (POI) EN EL MAPA
     * Ajusta estos valores para cambiar la apariencia de los círculos concéntricos en el mundo.
     */
    static POI_CONFIG = {
        innerRadius: 5,            // Radio del punto central brillante
        outerRadiusMultiplier: 1.0, // Multiplicador del radio exterior pulsante
        glowBlur: 20,              // Intensidad del brillo (shadowBlur)
        pulseSpeed: 0.005,         // Velocidad de la animación de pulsación
        innerColor: "rgba(255, 255, 255, 0.9)", // Color del punto central
        outerColor: "rgba(0, 255, 255, 0.4)",  // Color del anillo exterior
        glowColor: "cyan"          // Color del resplandor
    };

    constructor() {
        this.isOpen = false;
        this.state = {
            // Posición y movimiento de la criatura
            creatureX: 0,
            creatureY: 0,
            creatureVX: 0,
            creatureVY: 0,
            creatureScale: 0.4,

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
            keys: {}
        };
    }

    /**
     * Dibuja un Punto de Interés (POI) en las coordenadas especificadas.
     * Centraliza la lógica visual de los puntos de descubrimiento en el mapa.
     */
    static drawPOI(ctx, x, y, pulse) {
        const config = MacroManager.POI_CONFIG;

        ctx.save();

        // 1. Círculo exterior pulsante (Anillo de detección)
        const ringScale = 0.8 + Math.sin(pulse) * 0.15; // Un poco más pequeño y controlado
        const ringAlpha = 0.2 + Math.sin(pulse) * 0.15;

        ctx.beginPath();
        ctx.arc(x, y, 40 * ringScale * config.outerRadiusMultiplier, 0, Math.PI * 2);
        ctx.strokeStyle = config.outerColor.replace('0.4', ringAlpha.toFixed(2));
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 2. Punto brillante central (Núcleo)
        ctx.beginPath();
        ctx.arc(x, y, config.innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = config.innerColor;
        ctx.shadowBlur = config.glowBlur;
        ctx.shadowColor = config.glowColor;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Devuelve los datos necesarios para mostrar la información en el HUD
     * cuando el jugador está cerca de un punto de descubrimiento Macro.
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
        this.currentSpecieId = specieId; // Guardar la especie actual para cargar sus datos
        const modal = document.getElementById('discovery-modal');
        if (modal) modal.classList.add('active');

        // Inicializar minijuego (asíncrono)
        setTimeout(() => this.init(specieId), 100);

        // Sonido de transición/zoom
        const zoomAudio = new Audio('audio/sonar.mp3');
        zoomAudio.volume = 0.5;
        zoomAudio.play().catch(e => { });
    }

    close() {
        this.isOpen = false;
        const modal = document.getElementById('discovery-modal');
        if (modal) modal.classList.remove('active');
    }

    /**
     * Inicializa el minijuego Macro.
     * Se encarga de limpiar el estado anterior y generar el nuevo entorno (rocas, partículas, etc).
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
        // Obtenemos la información técnica de la especie desde el catálogo centralizado
        const macroData = window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : {
            id: 'fallback',
            imagen: './img/little/Eurythenes.png',
            escala: 0.4,
            velocidadX: 1.5,
            velocidadY: 0.8
        };

        // --- POSICIONAMIENTO INICIAL ---
        // Situamos a la criatura aleatoriamente dejando un margen de seguridad en los bordes
        this.state.creatureX = 150 + Math.random() * (this.state.canvas.width - 300);
        this.state.creatureY = 150 + Math.random() * (this.state.canvas.height - 300);
        this.state.creatureVX = (Math.random() - 0.5) * macroData.velocidadX;
        this.state.creatureVY = (Math.random() - 0.5) * macroData.velocidadY;
        this.state.creatureScale = macroData.escala;
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
        const successUI = document.getElementById('macro-success-ui');
        if (successUI) successUI.classList.remove('active');
        const hint = document.getElementById('macro-hint');
        if (hint) hint.style.opacity = "1";
        const exitBtn = document.getElementById('macro-exit-btn');
        if (exitBtn) exitBtn.classList.add('opacity-0', 'pointer-events-none');

        // Iniciar el bucle de renderizado
        this.loop();
    }

    /**
     * Genera una serie de puntos para crear una forma de roca irregular.
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
     * Bucle principal de animación a 60fps (vía requestAnimationFrame).
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
     * Actualiza la lógica de movimiento y colisiones.
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

        // 2. MOVIMIENTO DE LA CRIATURA
        this.state.creatureX += this.state.creatureVX * dt;
        this.state.creatureY += this.state.creatureVY * dt;

        // Efecto de respiración/escala latente
        this.state.creatureScale = 0.4 + Math.sin(Date.now() * 0.001) * 0.015;

        // Rebote en paredes
        if (this.state.creatureX < 50 || this.state.creatureX > canvas.width - 50) this.state.creatureVX *= -1;
        if (this.state.creatureY < 50 || this.state.creatureY > canvas.height - 50) this.state.creatureVY *= -1;

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

    draw() {
        const { ctx, canvas, creatureX, creatureY, creatureImg, revealed, crosshairX, crosshairY, rocks, particles, creatureScale, lightOn } = this.state;
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

        // Dibujar criatura
        ctx.save();
        ctx.translate(creatureX, creatureY);
        ctx.scale(creatureScale, creatureScale);
        const w = 300;
        const h = 200;
        ctx.globalAlpha = revealed ? 1.0 : 0.7;

        // Efecto de brillo detrás de la criatura si está revelada
        if (revealed) {
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
            glow.addColorStop(0, 'rgba(0, 255, 255, 0.2)');
            glow.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(-200, -200, 400, 400);
        }

        ctx.drawImage(creatureImg, -w / 2, -h / 2, w, h);
        ctx.restore();

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

        // Hint visual si estamos enfocando a la criatura no revelada
        if (lightOn && !revealed) {
            const dist = Math.hypot(crosshairX - creatureX, crosshairY - creatureY);
            if (dist < 100) {
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

    onEnter() {
        const { lightOn, revealed, crosshairX, crosshairY, creatureX, creatureY } = this.state;
        if (revealed) {
            this.close();
            return;
        }
        if (lightOn) {
            const dist = Math.hypot(crosshairX - creatureX, crosshairY - creatureY);
            if (dist < 80) {
                this.state.revealed = true;
                this.onSuccess();
            }
        }
    }

    onSuccess() {
        // Actualizar UI de éxito con los datos de la especie actual
        const sId = this.currentSpecieId || 'eurythenes';
        const macroData = window.MACRO_CATALOG ? window.MACRO_CATALOG[sId] : null;

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

        setTimeout(() => {
            const successUI = document.getElementById('macro-success-ui');
            if (successUI) successUI.classList.add('active');
            const hint = document.getElementById('macro-hint');
            if (hint) hint.style.opacity = "0";
            const exitBtn = document.getElementById('macro-exit-btn');
            if (exitBtn) exitBtn.classList.remove('opacity-0', 'pointer-events-none');
            const successAudio = new Audio('audio/sonar.mp3');
            successAudio.volume = 0.5;
            successAudio.play().catch(e => { });
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
