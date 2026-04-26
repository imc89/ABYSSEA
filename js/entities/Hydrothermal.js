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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.emitTimer = 0;
        this.active = true;
    }

    update(dtMult, camera, canvas) {
        // Culling vertical: solo simular si está relativamente cerca de la pantalla
        const screenY = this.y - camera.y;
        if (screenY < -2000 || screenY > canvas.height + 2000) return;

        // Emitir partículas de humo/fluido hidrotermal continuamente
        this.emitTimer += dtMult;
        if (this.emitTimer > 0.8) { // Alta tasa de emisión para un humo denso y continuo
            this.emitTimer = 0;

            // Variación aleatoria para que no sea una línea recta perfecta
            this.particles.push({
                x: this.x + (Math.random() * 20 - 10),
                y: this.y,
                vx: (Math.random() * 2.0 - 1.0),
                vy: -(Math.random() * 5 + 4),     // Impulso inicial fuerte hacia arriba
                life: 1.0,
                size: Math.random() * 40 + 30,    // Nace con un tamaño decente
                maxLife: Math.random() * 150 + 100, // Tarda bastante en disiparse
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() * 0.04 - 0.02)
            });
        }

        // Actualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];

            p.x += p.vx * dtMult;
            p.y += p.vy * dtMult;
            p.rotation += p.rotSpeed * dtMult;

            // Turbulencia natural (corrientes de agua)
            p.vx += (Math.random() * 0.3 - 0.15) * dtMult;
            // Tendencia suave a ir hacia un lado u otro para simular corrientes
            p.vx *= 0.99;

            // Se frena un poco la subida con la fricción del agua pesada
            p.vy *= Math.pow(0.985, dtMult);

            p.life -= (1 / p.maxLife) * dtMult;

            // El humo hidrotermal se expande muchísimo a medida que pierde calor y presión
            p.size += 1.2 * dtMult;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, camera) {
        const screenY = this.y - camera.y;
        // Solo dibujar si la base está cerca o si las partículas pueden llegar
        if (screenY < -3000 || screenY > ctx.canvas.height + 1000) return;

        // Utilizamos screen para que el humo se acumule y brille de forma volumétrica
        ctx.globalCompositeOperation = 'screen';

        for (let p of this.particles) {
            const pScreenX = p.x - camera.x;
            const pScreenY = p.y - camera.y;

            // Transición suave de opacidad
            // Al nacer (life=1) es visible, y muere lentamente
            const alpha = Math.max(0, p.life * Math.min(1, (1 - p.life) * 5) * 0.8);

            if (alpha > 0.01) {
                ctx.globalAlpha = alpha;

                // Rotación y dibujo centrado
                ctx.translate(pScreenX, pScreenY);
                ctx.rotate(p.rotation);
                ctx.drawImage(smokeCanvas, -p.size / 2, -p.size / 2, p.size, p.size);
                ctx.rotate(-p.rotation);
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
    }

    init(canvasWidth) {
        // El fondo del juego está en Y = 110000. Restauramos este valor.
        // Si se pone en 0, las fumarolas se renderizarán en la superficie del océano.
        const floorY = 110000;

        // Distribuimos 6 fumarolas a lo ancho de la pantalla
        this.vents = [
            new HydrothermalVent(canvasWidth * 0.15, floorY + 40),
            new HydrothermalVent(canvasWidth * 0.32, floorY + 25),
            new HydrothermalVent(canvasWidth * 0.48, floorY + 50),
            new HydrothermalVent(canvasWidth * 0.65, floorY + 30),
            new HydrothermalVent(canvasWidth * 0.82, floorY + 15),
            new HydrothermalVent(canvasWidth * 0.90, floorY + 45)
        ];

        this.initialized = true;
    }

    update(dtMult, camera, canvas) {
        if (!this.initialized && canvas) {
            this.init(canvas.width);
        }

        for (let vent of this.vents) {
            vent.update(dtMult, camera, canvas);
        }
    }

    draw(ctx, camera) {
        if (!this.initialized) return;

        for (let vent of this.vents) {
            vent.draw(ctx, camera);
        }
    }
}

// Instancia global para ser usada en el loop principal
const hydrothermalManager = new HydrothermalManager();
