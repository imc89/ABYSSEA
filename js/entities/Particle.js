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
    draw(ctx, player, camera, ambientAlpha, canvas) {
        // Coordenadas mundiales aproximadas para el cálculo de distancia/ángulo
        // (Similar a la lógica en Fish.js para consistencia total)
        const dSq = distanceSq(this.x + camera.x, this.y + camera.y, player.x, player.y + WORLD.lightOffsetY);

        // Alpha base según la luz ambiental del mundo (ambientAlpha ya viene calculado de main.js)
        let alpha = this.baseAlpha * ambientAlpha;

        // ILUMINACIÓN POR CONO (Spotlight)
        let lightIntensity = 0;
        if (player.lightOn && player.lightBattery > 0 && dSq < WORLD.lightSpotRange * WORLD.lightSpotRange) {
            const dist = Math.sqrt(dSq);
            const angToParticle = Math.atan2(
                (this.y + camera.y) - (player.y + WORLD.lightOffsetY),
                (this.x + camera.x) - player.x
            );
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
            
            // Función auxiliar clampAngleDelta (debe estar disponible globalmente como en Fish.js)
            const MathAngleDelta = typeof clampAngleDelta !== 'undefined' 
                ? clampAngleDelta(angToParticle, lookDir)
                : Math.abs(angToParticle - lookDir); // Fallback si no está definida

            if (MathAngleDelta < WORLD.lightAngle) {
                // Dentro del cono: intensidad basada en distancia y factor de parpadeo
                const edgeFade = Math.max(0, 1 - (MathAngleDelta / WORLD.lightAngle - 0.8) / 0.2);
                lightIntensity = (1 - dist / WORLD.lightSpotRange) * edgeFade * (player.lightFlickerIntensity || 1.0);
            } else if (dist < WORLD.lightGlowRange) {
                // Halo mínimo cerca del submarino
                lightIntensity = (1 - dist / WORLD.lightGlowRange) * WORLD.lightGlowIntensity;
            }
        }

        // Combinar alpha ambiental con iluminación del faro
        const finalAlpha = Math.max(alpha, lightIntensity);

        if (finalAlpha > 0.01) {
            ctx.fillStyle = `rgba(200, 230, 255, ${finalAlpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
            ctx.fill();
            return true;
        }
        return false;
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Particle = Particle;
}
