/**
 * BUBBLE CLASS - Sistema de burbujas con física realista
 */

class Bubble {
    constructor(x, y, vx, vy, isEngine = true) {
        this.x = x;
        this.y = y;
        this.vx = vx + (Math.random() - 0.5) * 0.8;
        this.vy = vy + (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * (isEngine ? 4.0 : 1.5) + 0.5;
        this.maxSize = this.size * (PHYSICS.bubbleSizeMultiplierMin + Math.random() *
            (PHYSICS.bubbleSizeMultiplierMax - PHYSICS.bubbleSizeMultiplierMin));
        this.life = 1.0;
        this.decay = PHYSICS.bubbleDecayMin + Math.random() *
            (PHYSICS.bubbleDecayMax - PHYSICS.bubbleDecayMin);
        this.buoyancy = PHYSICS.buoyancyMin + Math.random() *
            (PHYSICS.buoyancyMax - PHYSICS.buoyancyMin);
    }

    update() {
        // Aplicar resistencia del agua
        this.vx *= PHYSICS.bubbleVelocityDamping.x;
        this.vy *= PHYSICS.bubbleVelocityDamping.y;

        // Flotabilidad - las burbujas suben
        this.vy -= this.buoyancy;

        // Actualizar posición
        this.x += this.vx;
        this.y += this.vy;

        // Crecimiento de la burbuja
        if (this.size < this.maxSize) {
            this.size += PHYSICS.bubbleGrowthRate;
        }

        // Desgaste de vida
        this.life -= this.decay;
    }

    draw(ctx, camera, ambientAlpha, player, canvas) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Culling - no dibujar si está fuera del canvas
        if (sx < -50 || sx > canvas.width + 50 || sy < -50 || sy > canvas.height + 50) {
            return;
        }

        let visibility = ambientAlpha;
        const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
        if (player.lightOn && player.lightBattery > 0) {
            if (distToPlayer < WORLD.lightSpotRange) {
                const angToBubble = Math.atan2(this.y - player.y, this.x - player.x);
                const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
                let angleDiff = Math.abs(angToBubble - lookDir);
                while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                if (angleDiff < WORLD.lightAngle) {
                    visibility = Math.max(visibility,
                        player.lightFlickerIntensity * (1 - distToPlayer / WORLD.lightSpotRange));
                }
            }
            // Halo mínimo para burbujas en el área inmediata del submarino
            if (distToPlayer < WORLD.lightGlowRange) {
                const halo = (1 - distToPlayer / WORLD.lightGlowRange) * 0.5;
                visibility = Math.max(visibility, halo);
            }
        }

        const alpha = Math.max(0, this.life * visibility);
        if (alpha <= 0.02) return;

        const r = this.size;

        ctx.save();

        if (window.WORLD.useGradients) {
            // 1. Interior translúcido (volumen de vidrio)
            const interior = ctx.createRadialGradient(
                sx - r * 0.25, sy - r * 0.25, r * 0.05, // Centrado ligeramente arriba-izquierda
                sx, sy, r
            );
            interior.addColorStop(0, `rgba(210, 245, 255, ${alpha * 0.18})`);
            interior.addColorStop(0.6, `rgba(140, 210, 240, ${alpha * 0.06})`);
            interior.addColorStop(1, `rgba(80, 170, 220, 0)`);

            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fillStyle = interior;
            ctx.fill();

            // 2. Borde sólido (el borde del cristal de la burbuja)
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 240, 255, ${alpha * 0.75})`;
            ctx.lineWidth = Math.max(0.8, r * 0.18);
            ctx.stroke();

            // 3. Destello especular
            const hlX = sx - r * 0.35;
            const hlY = sy - r * 0.35;
            const hlR = r * 0.28;
            const highlight = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
            highlight.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.85})`);
            highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.beginPath();
            ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
            ctx.fillStyle = highlight;
            ctx.fill();

            // 4. Pequeño reflejo inferior (luna de la burbuja)
            const moonX = sx + r * 0.3;
            const moonY = sy + r * 0.4;
            const moonR = r * 0.12;
            const moon = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR);
            moon.addColorStop(0, `rgba(200, 240, 255, ${alpha * 0.45})`);
            moon.addColorStop(1, 'rgba(200, 240, 255, 0)');
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
            ctx.fillStyle = moon;
            ctx.fill();
        } else {
            // OPTIMIZACIÓN: Círculos translúcidos simples en lugar de 3 gradientes radiales pesados O(1) tiempo de GPU
            // 1. Interior translúcido (volumen de vidrio)
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(140, 210, 240, ${alpha * 0.1})`;
            ctx.fill();

            // 2. Borde sólido (el borde del cristal de la burbuja)
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 240, 255, ${alpha * 0.75})`;
            ctx.lineWidth = Math.max(0.8, r * 0.18);
            ctx.stroke();

            // 3. Destello especular (reflejo de luz en el vidrio — pequeño punto brillante)
            const hlX = sx - r * 0.35;
            const hlY = sy - r * 0.35;
            const hlR = r * 0.28;
            ctx.beginPath();
            ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx.fill();

            // 4. Pequeño reflejo inferior (luna de la burbuja)
            const moonX = sx + r * 0.3;
            const moonY = sy + r * 0.4;
            const moonR = r * 0.12;
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 240, 255, ${alpha * 0.3})`;
            ctx.fill();
        }

        ctx.restore();
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Bubble = Bubble;
}
