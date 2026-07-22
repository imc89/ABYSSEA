/**
 * PARTICLE CLASS
 * [ES] Partícula de "Nieve Marina" ambiental que genera profundidad visual simulando un fuerte desplazamiento de perspectiva (Parallax) respecto al jugador.
 * [EN] Environmental "Marine Snow" particle generating visual depth by simulating strong perspective shift (Parallax) relative to the player.
 */

class Particle {
    constructor() {
        this.reset();
        // Inicialización aleatoria en pantalla
        if (typeof window !== 'undefined') {
            this.x = Math.random() * window.innerWidth;
            this.y = Math.random() * window.innerHeight;
        }
    }

    /**
     * [ES] Reinicia la partícula con los nuevos parámetros de movimiento solicitados.
     * [EN] Resets the particle with the new requested movement parameters.
     */
    reset(canvas) {
        const w = (canvas && canvas.width) ? canvas.width : (typeof window !== 'undefined' ? window.innerWidth : 800);
        this.x = Math.random() * w;
        this.y = -20;
        this.width = Math.random() * 1.0 + 0.3;
        this.height = this.width * 0.8;
        this.baseAlpha = Math.random() * 0.12 + 0.04;

        // 1. Velocidad Base (Vy): Ultra lenta
        this.speedY = Math.random() * 0.05 + 0.05; // Caída base ahora mucho más lenta (0.05 a 0.1)

        // 2. Oscilación Horizontal (Vx): Frecuencia reducida
        this.oscOffset = Math.random() * Math.PI * 2;
        this.oscSpeed = 0.0004 + Math.random() * 0.0006; // "Baile" más pausado
        this.oscMagnitude = 0.15 + Math.random() * 0.3; // Amplitud ligeramente menor

        // 3. Deriva Constante reducida
        this.constantDriftX = 0.02; // Corriente casi imperceptible

        this.parallax = 0.3 + Math.random() * 0.6;
    }

    /**
     * [ES] Actualiza la posición aplicando el patrón de movimiento: caída lenta, oscilación senoidal y deriva.
     * [EN] Updates position applying the movement pattern: slow fall, sine oscillation and drift.
     */
    update(player, canvas, camera, dtMult = 1.0) {
        const time = Date.now();

        // Cálculo de oscilación horizontal (Seno con desfase)
        const oscillation = Math.sin(time * this.oscSpeed + this.oscOffset) * this.oscMagnitude;

        // Movimiento final: (Oscilación + Deriva + Parallax) | (Caída Lenta + Parallax)
        // Nota: player.vx y player.vy ya están afectados indirectamente por el ciclo del jugador, 
        // pero la componente de partícula propia sí debe multiplicarse.
        this.x += ((oscillation + this.constantDriftX) - player.vx * this.parallax) * dtMult;
        this.y += (this.speedY - player.vy * this.parallax) * dtMult;

        // Envolvimiento de pantalla (Screen Wrapping)
        const margin = 20;
        if (this.y > canvas.height + margin) {
            this.reset(canvas);
        } else if (this.y < -margin) {
            this.y = canvas.height;
        }

        if (this.x < -margin) {
            this.x = canvas.width;
        } else if (this.x > canvas.width + margin) {
            this.x = -margin;
        }
    }

    /**
     * [ES] Dibuja la partícula con iluminación por cono (spotlight) y fade abisal consistente.
     * [EN] Draws the particle with cone-based lighting (spotlight) and consistent abyssal fade.
     */
    draw(ctx, player, camera, ambientAlpha, canvas, spotScreenX, spotScreenY, cosAngle, sinAngle, cosLightAngleSq) {
        // Fallback en caso de que no se pasen los valores precalculados
        if (spotScreenX === undefined) {
            spotScreenX = player.x - camera.x;
            spotScreenY = player.y - camera.y + WORLD.lightOffsetY;
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
            cosAngle = Math.cos(lookDir);
            sinAngle = Math.sin(lookDir);
            const cosLightAngle = Math.cos(WORLD.lightAngle);
            cosLightAngleSq = cosLightAngle * cosLightAngle;
        }

        const dx = this.x - spotScreenX;
        const dy = this.y - spotScreenY;
        const dSq = dx * dx + dy * dy;

        // Alpha base según la luz ambiental del mundo (ambientAlpha ya viene calculado de main.js)
        let alpha = this.baseAlpha * ambientAlpha;

        // ILUMINACIÓN POR CONO (Spotlight)
        let lightIntensity = 0;
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;

        // Optimización: Solo calcular iluminación si el faro está encendido y tiene batería
        if (player.lightOn && mainBattery > 0) {
            const spotRangeSq = WORLD.lightSpotRange * WORLD.lightSpotRange;
            const glowRangeSq = WORLD.lightGlowRange * WORLD.lightGlowRange;
            const maxRangeSq = spotRangeSq > glowRangeSq ? spotRangeSq : glowRangeSq;

            if (dSq < maxRangeSq) {
                if (dSq < spotRangeSq) {
                    // Producto escalar rápido para verificar el cono de luz
                    const dot = dx * cosAngle + dy * sinAngle;

                    if (dot > 0 && (dot * dot) > (cosLightAngleSq * dSq)) {
                        const dist = Math.sqrt(dSq);
                        const angle = Math.acos(dot / dist);
                        const edgeFade = Math.max(0, 1 - (angle / WORLD.lightAngle - 0.8) / 0.2);
                        lightIntensity = (1 - dist / WORLD.lightSpotRange) * edgeFade * (player.lightFlickerIntensity || 1.0);
                    } else if (dSq < glowRangeSq) {
                        const dist = Math.sqrt(dSq);
                        lightIntensity = (1 - dist / WORLD.lightGlowRange) * (player.lightFlickerIntensity || 1.0);
                    }
                } else if (dSq < glowRangeSq) {
                    const dist = Math.sqrt(dSq);
                    lightIntensity = (1 - dist / WORLD.lightGlowRange) * (player.lightFlickerIntensity || 1.0);
                }
            }
        }

        const finalAlpha = alpha > lightIntensity ? alpha : lightIntensity;

        if (finalAlpha > 0.01) {
            ctx.fillStyle = '#c8e6ff';
            ctx.globalAlpha = finalAlpha;
            ctx.fillRect(this.x - this.width, this.y - this.width, this.width * 2, this.width * 2);
            ctx.globalAlpha = 1.0;
            return true;
        }
        return false;
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Particle = Particle;
}
