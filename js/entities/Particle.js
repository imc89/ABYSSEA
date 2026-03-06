/**
 * PARTICLE CLASS - Nieve marina con efecto parallax
 */

class Particle {
    constructor() {
        this.reset();
        // En la inicialización, distribuir en toda la altura del canvas
        this.y = Math.random() * window.innerHeight;
    }

    reset() {
        this.x = Math.random() * window.innerWidth;
        this.y = -20;
        this.width = Math.random() * 1.0 + 0.3;
        this.height = this.width * 0.8;
        this.baseAlpha = Math.random() * 0.12 + 0.04;
        this.speedX = (Math.random() - 0.5) * 0.1;
        this.speedY = Math.random() * 0.1 + 0.05;
        this.parallax = 0.3 + Math.random() * 0.6;
    }

    update(player, canvas) {
        this.x += (this.speedX) - player.vx * this.parallax;
        this.y += (this.speedY) - player.vy * this.parallax;

        // Reposicionar cuando sale del canvas
        if (this.y > canvas.height + 20) {
            this.reset();
        } else if (this.y < -20) {
            this.y = canvas.height;
        }

        if (this.x < -20) {
            this.x = canvas.width;
        } else if (this.x > canvas.width + 20) {
            this.x = -20;
        }
    }

    draw(ctx, player, camera, ambientAlpha) {
        let isIlluminated = false;
        let illuminationFactor = 0;

        const distPlayer = Math.hypot(
            this.x - (player.x - camera.x),
            this.y - (player.y - camera.y)
        );

        let alpha = this.baseAlpha * ambientAlpha;

        // Iluminación 1: Halo Radial Ambiental alrededor del jugador
        let haloIllumination = 0;

        // El halo solo debe iluminar las partículas si la luz está encendida
        if (player.lightOn && player.lightBattery > 0) {
            // Usa el rango configurado en el mundo (WORLD.lightGlowRange)
            if (distPlayer < WORLD.lightGlowRange) {
                const normalizedHaloDist = distPlayer / WORLD.lightGlowRange;

                // Para las partículas, queremos que el halo las ilumine casi tan fuerte como el foco
                // Multiplicamos por un factor alto (ej: 1.5) en lugar del tenue lightGlowIntensity del fondo
                haloIllumination = Math.pow(1 - normalizedHaloDist, 1.2) * 1.5;

                // El alpha visual sube bastante con el halo
                alpha = Math.min(1, alpha + haloIllumination);

                if (haloIllumination > 0.1) {
                    isIlluminated = true;
                    // El illuminationFactor determina cuánto brillan/crecen (shadowBlur). Le damos fuerza.
                    illuminationFactor = Math.max(illuminationFactor, haloIllumination * 0.8);
                }
            }
        }

        // Iluminación 2: El cono del faro direccional (más intenso)
        if (player.lightOn && player.lightBattery > 0 && distPlayer < WORLD.lightSpotRange) {
            const angToParticle = Math.atan2(
                this.y - (player.y - camera.y),
                this.x - (player.x - camera.x)
            );
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
            let angleDiff = Math.abs(angToParticle - lookDir);
            while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (angleDiff < WORLD.lightAngle) {
                const normalizedDist = distPlayer / WORLD.lightSpotRange;
                let coneFactor = Math.pow(1 - normalizedDist, 1.2);

                // Si la partícula está muy cerca del centro del haz de luz, brilla más
                const centerFocus = 1 - (angleDiff / WORLD.lightAngle);

                const coneIntensity = coneFactor * centerFocus * player.lightFlickerIntensity * 2.0;
                alpha = Math.min(1, alpha + coneIntensity);

                isIlluminated = true;
                illuminationFactor = Math.max(illuminationFactor, coneFactor);
            }
        }

        if (alpha > 0.01) {
            ctx.save();

            // Incremento sutil del tamaño (max +20% en lugar de +60%)
            const drawRadius = this.width * (1 + (illuminationFactor * 0.2));

            ctx.beginPath();
            ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);

            // Efecto de iluminación refinado (sin blur y sin ser un círculo sólido gigante)
            if (isIlluminated && illuminationFactor > 0.1) {
                // Crear un gradiente radial sutil para dar volumen a la partícula en vez de un color plano
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, drawRadius
                );

                // Centro muy brillante blanco
                gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, alpha + 0.3)})`);
                // Borde suave azulado translúcido
                gradient.addColorStop(1, `rgba(180, 230, 255, ${alpha * 0.3})`);

                ctx.fillStyle = gradient;
            } else {
                // Color azul translúcido oscuro por defecto en penumbra
                ctx.fillStyle = `rgba(160, 200, 240, ${alpha * 0.8})`;
            }

            ctx.fill();
            ctx.restore();
        }
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Particle = Particle;
}
