/**
 * HYDROTHERMAL VENTS
 * [ES] Gestión de fumarolas hidrotermales en el fondo abisal. Genera humo blanquecino y chorros de agua caliente.
 * [EN] Management of hydrothermal vents on the abyssal floor. Generates whitish smoke and hot water jets.
 */

// Pre-renderizar textura procedural de humo suave para máximo realismo y rendimiento
const smokeCanvas = document.createElement('canvas');
smokeCanvas.width = 128;
smokeCanvas.height = 128;
const sCtx = smokeCanvas.getContext('2d');
const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
// Blanco intenso en el centro, difuminándose hacia un gris turbio y transparente
sGrad.addColorStop(0, 'rgba(240, 245, 250, 0.8)');
sGrad.addColorStop(0.3, 'rgba(180, 200, 220, 0.5)');
sGrad.addColorStop(0.7, 'rgba(120, 140, 160, 0.1)');
sGrad.addColorStop(1, 'rgba(100, 120, 140, 0)');
sCtx.fillStyle = sGrad;
sCtx.fillRect(0, 0, 128, 128);

class HydrothermalVent {
    constructor(xRatio, y, density = 1.0) {
        this.xRatio = xRatio; // Proporción del ancho de la pantalla (0.0 a 1.0)
        this.y = y;
        this.density = Math.max(0.1, density); // Evita dividir por cero
        this.particles = [];
        this.emitTimer = 0;
        this.active = true;
    }

    update(dtMult, camera, canvas) {
        // Culling vertical: solo simular si está relativamente cerca de la pantalla
        const screenY = this.y - camera.y;
        if (screenY < -2000 || screenY > canvas.height + 2000) return;

        // Fumarola continua: emitimos constantemente para evitar "nubecitas separadas"
        this.emitTimer += dtMult;

        // Intervalo fijo y muy rápido para crear un chorro continuo
        const spawnInterval = 0.2;

        if (this.emitTimer > spawnInterval) {
            this.emitTimer = 0;

            // La densidad afecta a la fuerza, al grosor inicial y a la opacidad visual, NO al número de cortes
            const jetForce = 4 + (this.density * 3);
            const baseSize = 8 + (this.density * 12);

            // La posición X real depende del ancho de pantalla actual
            const currentX = this.xRatio * canvas.width;

            this.particles.push({
                x: currentX + (Math.random() * baseSize * 0.5 - baseSize * 0.25),
                y: this.y,
                vx: (Math.random() * 0.8 - 0.4),
                vy: -(Math.random() * 2 + jetForce), // Impulso inicial
                life: 1.0,
                size: Math.random() * 5 + baseSize,  // Nace estrecho en la boquilla
                maxLife: Math.random() * 100 + 80,
                stretch: Math.random() * 1.5 + 2.0,  // Factor de estiramiento vertical inicial
                baseXRatio: this.xRatio              // Guardamos su proporción inicial para reescalados
            });
        }

        // Actualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            // Si la ventana cambia de tamaño, ajustamos suavemente su posición X
            // calculando dónde debería estar basado en su ratio original
            const targetX = p.baseXRatio * canvas.width;

            // p.x original se desplaza si el targetX ha cambiado drásticamente (resize)
            // Se le suma la velocidad horizontal (vx) normal
            p.x += p.vx * dtMult;

            // Fuerza sutil de anclaje para mantenerlo en su columna proporcional si se redimensiona
            p.x += (targetX - p.x) * 0.1 * dtMult;

            p.y += p.vy * dtMult;

            // Turbulencia natural (corrientes de agua)
            p.vx += (Math.random() * 0.2 - 0.1) * dtMult;
            // Tendencia suave a ir hacia un lado u otro
            p.vx *= 0.98;

            // Fricción pesada del agua: frena el chorro a medida que sube
            p.vy *= Math.pow(0.96, dtMult);

            p.life -= (1 / p.maxLife) * dtMult;

            // El humo hidrotermal se expande lateralmente rápido a medida que pierde velocidad
            const expandRate = 1.0 + (1.0 - Math.min(1.0, Math.abs(p.vy) / 10));
            p.size += expandRate * 1.5 * dtMult;

            // El estiramiento vertical se reduce a medida que frena, volviéndose más redondo arriba
            p.stretch = Math.max(1.0, p.stretch - 0.03 * dtMult);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, camera, player, ambientAlpha) {
        const screenY = this.y - camera.y;
        // Solo dibujar si la base está cerca o si las partículas pueden llegar
        if (screenY < -3000 || screenY > ctx.canvas.height + 1000) return;

        const currentX = this.xRatio * ctx.canvas.width;

        // "No se verán por partes, se veran totalmente o no se verán dependiendo si les da un minimo de luz o no"
        let isIlluminated = false;

        if (ambientAlpha > 0.05) {
            isIlluminated = true; // Superficie / aguas iluminadas
        } else {
            const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
            if (player.lightOn && mainBattery > 0) {
                // Iteramos sobre las partículas. Si la luz roza a AL MENOS UNA, iluminamos TODO el chorro.
                // Esto permite que apuntes a la punta de la columna de humo y se vea entera hacia abajo.
                for (let p of this.particles) {
                    const dSq = distanceSq(p.x, p.y, player.x, player.y + WORLD.lightOffsetY);

                    if (dSq < WORLD.lightSpotRange * WORLD.lightSpotRange) {
                        const dist = Math.sqrt(dSq);
                        const angToParticle = Math.atan2(
                            p.y - (player.y + WORLD.lightOffsetY),
                            p.x - player.x
                        );
                        const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
                        const MathAngleDelta = clampAngleDelta(angToParticle, lookDir);

                        if (MathAngleDelta < WORLD.lightAngle || dist < WORLD.lightGlowRange) {
                            isIlluminated = true;
                            break; // Con que reciba un mínimo de luz una parte, iluminamos totalmente
                        }
                    }
                }
            }
        }

        // Si no recibe un mínimo de luz, no dibujamos ninguna partícula de este chorro
        if (!isIlluminated) return;

        // Utilizamos screen para que el humo se acumule de forma volumétrica
        ctx.globalCompositeOperation = 'screen';

        // La opacidad base del chorro depende directamente de la densidad configurada
        const baseAlpha = 0.6 * Math.min(1.0, this.density);

        for (let p of this.particles) {
            const pScreenX = p.x - camera.x;
            const pScreenY = p.y - camera.y;

            // Transición suave de opacidad ligada únicamente a la vida de la partícula (ya está 100% iluminada globalmente)
            const alpha = Math.max(0, p.life * Math.min(1, (1 - p.life) * 5) * baseAlpha);

            if (alpha > 0.01) {
                ctx.globalAlpha = alpha;

                ctx.translate(pScreenX, pScreenY);

                // Efecto de rastro de fluido (Streak)
                const width = p.size;
                const height = p.size * p.stretch;

                ctx.drawImage(smokeCanvas, -width / 2, -height, width, height);

                ctx.translate(-pScreenX, -pScreenY);
            }
        }

        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}

class HydrothermalManager {
    constructor() {
        this.vents = [];
        this.initialized = false;
        this.audio = new Audio('audio/hydrothermal.mp3');
        this.audio.loop = true;
        this.audio.volume = 0;
    }

    init() {
        // El fondo del juego está en Y = 110000. 
        const floorY = 110100;

        // Las posiciones X ahora son proporciones relativas al tamaño de pantalla (0.0 a 1.0).
        // Así, si se abre el inspector o se encoge la ventana, la fumarola se reubica 
        // dinámicamente y siempre se dibuja sobre la misma roca de la textura de fondo.
        // Ejemplo: 0.21 = 21% de la pantalla (aprox 410px en Full HD).
        this.vents = [
            new HydrothermalVent(0.41, floorY - 0, 0.1),    // Pequeña y poco densa (aprox 410px)
            new HydrothermalVent(0.15, floorY + 60, 0.1),    // Pequeña y poco densa (aprox 410px)

        ];

        this.initialized = true;
    }

    update(dtMult, camera, canvas) {
        if (!this.initialized) {
            this.init();
        }

        // Control de audio basado en profundidad
        if (typeof player !== 'undefined' && typeof WORLD !== 'undefined') {
            const depthMeters = player.y / WORLD.depthScale;

            if (depthMeters >= 10800) {
                // Interpolar volumen: 0 en 10800m, 1 en 10900m
                let vol = (depthMeters - 10800) / 100;
                vol = Math.max(0, Math.min(1, vol));

                this.audio.volume = vol;

                if (this.audio.paused && vol > 0) {
                    this.audio.play().catch(e => { });
                }
            } else {
                if (!this.audio.paused) {
                    this.audio.volume = 0;
                    this.audio.pause();
                }
            }
        }

        for (let vent of this.vents) {
            vent.update(dtMult, camera, canvas);
        }
    }

    draw(ctx, camera, player, ambientAlpha) {
        if (!this.initialized) return;

        for (let vent of this.vents) {
            vent.draw(ctx, camera, player, ambientAlpha);
        }
    }
}

// Instancia global para ser usada en el loop principal
const hydrothermalManager = new HydrothermalManager();
