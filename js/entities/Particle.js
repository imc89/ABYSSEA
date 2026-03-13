/**
 * PARTICLE CLASS
 * [ES] Partícula de "Nieve Marina" ambiental que genera profundidad visual simulando un fuerte desplazamiento de perspectiva (Parallax) respecto al jugador.
 * [EN] Environmental "Marine Snow" particle generating visual depth by simulating strong perspective shift (Parallax) relative to the player.
 */

class Particle {
    constructor() {
        this.reset();
        // En la inicialización, distribuir en toda la altura del canvas
        this.y = Math.random() * window.innerHeight;
    }

    /**
     * [ES] Recicla la partícula cuando sale de los límites de pantalla en lugar de destruirla y crear nueva memora (Object Pooling).
     * [EN] Recycles the particle when it goes out of screen bounds instead of destroying it and creating new memory (Object Pooling).
     */
    reset(yPosition = -200) {
        this.x = Math.random() * WORLD.width;
        this.y = yPosition;
        this.width = Math.random() * 1.0 + 0.3;
        this.height = this.width * 0.8;
        this.baseAlpha = Math.random() * 0.12 + 0.04;
        this.speedX = (Math.random() - 0.5) * 0.1;
        this.speedY = Math.random() * 0.1 + 0.05;
        this.parallax = 0.3 + Math.random() * 0.6;
    }

    /**
     * [ES] Actualiza el movimiento de suspensión biológica acoplado a la inercia opuesta de la cámara del submarino.
     * [EN] Updates biological suspension movement coupled with the opposite inertia of the submarine's camera.
     */
    update(player, canvas, camera) {
        // Movimiento base + Parallax inverso al jugador para sensación de profundidad
        this.x += (this.speedX) - player.vx * (this.parallax * 0.1);
        this.y += (this.speedY) - player.vy * (this.parallax * 0.1);

        // Reposicionar usando WORLD bounds para que sean persistentes pero circulares alrededor del jugador
        const margin = 2000;
        if (this.y > player.y + margin) {
            this.y = player.y - margin;
            this.x = Math.random() * WORLD.width;
        } else if (this.y < player.y - margin) {
            this.y = player.y + margin;
        }

        if (this.x > player.x + margin) {
            this.x = player.x - margin;
        } else if (this.x < player.x - margin) {
            this.x = player.x + margin;
        }
    }

    /**
     * [ES] Dibuja el copillo de nieve prestando especial atención en capturar y refractar fuertemente la luz del foco del buque.
     * [EN] Draws the snow speck paying special attention to heavily catching and refracting the vessel's spotlight beam.
     */
    draw(ctx, player, camera, ambientAlpha, canvas) {
        // Convertir coordenadas de mundo a pantalla
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // CULLING ESTRICTO: Si no está en pantalla, ni siquiera calculamos luz
        if (sx < -20 || sx > canvas.width + 20 || sy < -20 || sy > canvas.height + 20) {
            return false;
        }

        let isIlluminated = false;
        let illuminationFactor = 0;

        const distPlayer = Math.hypot(
            sx - (player.x - camera.x),
            sy - (player.y - camera.y)
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
            ctx.arc(sx, sy, drawRadius, 0, Math.PI * 2);

            // Efecto de iluminación refinado (OPTIMIZACIÓN: sin gradientes)
            if (isIlluminated && illuminationFactor > 0.1) {
                // OPTIMIZACIÓN: Dos círculos superpuestos en vez de degradado radial pesado
                ctx.fillStyle = `rgba(180, 230, 255, ${alpha * 0.3})`;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(sx, sy, drawRadius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha + 0.3)})`;
                ctx.fill();
            } else {
                // Color azul translúcido oscuro por defecto en penumbra
                ctx.fillStyle = `rgba(160, 200, 240, ${alpha * 0.8})`;
                ctx.fill();
            }
            ctx.restore();
            return true; // Particle was visible and drawn
        }
        return false; // Not drawn (alpha too low)
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Particle = Particle;
}
