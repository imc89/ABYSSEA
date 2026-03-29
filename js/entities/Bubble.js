/**
 * BUBBLE CLASS
 * [ES] Sistema de partículas fluido (burbujas). Incluye simulaciones realistas de flotabilidad, desgaste, rozamiento y absorción de luz.
 * [EN] Fluid particle system (bubbles). Includes realistic simulations of buoyancy, decay, drag, and light absorption.
 */

class Bubble {
    // Cache estático para burbujas pre-renderizadas por tamaño (radio entero)
    static renderCache = {};

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

    /**
     * [ES] Aplica la física de la burbuja en cada frame: sube por el agua, reduce velocidad horizontal, se agranda y finalmente desaparece (muere).
     * [EN] Applies bubble physics every frame: it rises through water, lowers horizontal speed, grows, and finally vanishes (dies).
     */
    update(dtMult = 1.0) {
        // Aplicar resistencia del agua
        this.vx *= Math.pow(PHYSICS.bubbleVelocityDamping.x, dtMult);
        this.vy *= Math.pow(PHYSICS.bubbleVelocityDamping.y, dtMult);

        // Flotabilidad - las burbujas suben
        this.vy -= this.buoyancy * dtMult;

        // Actualizar posición
        this.x += this.vx * dtMult;
        this.y += this.vy * dtMult;

        // Crecimiento de la burbuja
        if (this.size < this.maxSize) {
            this.size += PHYSICS.bubbleGrowthRate * dtMult;
        }

        // Desgaste de vida
        this.life -= this.decay * dtMult;
    }

    /**
     * [ES] Renderizado óptico de la burbuja emulando volumen de cristal 3D mediante degradados múltiples frente a fuentes de luz dinámica.
     * [EN] Optical rendering of the bubble emulating 3D glass volume using multiple gradients against dynamic light sources.
     */
    draw(ctx, camera, ambientAlpha, player, canvas) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;

        // Culling - no dibujar si está fuera del canvas
        if (sx < -50 || sx > canvas.width + 50 || sy < -50 || sy > canvas.height + 50) {
            return;
        }

        let visibility = ambientAlpha;
        const distToPlayerSq = distanceSq(this.x, this.y, player.x, player.y);
        if (player.lightOn && player.lightBattery > 0) {
            if (distToPlayerSq < WORLD.lightSpotRange * WORLD.lightSpotRange) {
                const distToPlayer = Math.sqrt(distToPlayerSq);
                const angToBubble = Math.atan2(this.y - player.y, this.x - player.x);
                const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;
                const angleDiff = clampAngleDelta(angToBubble, lookDir);

                if (angleDiff < WORLD.lightAngle) {
                    visibility = Math.max(visibility,
                        player.lightFlickerIntensity * (1 - distToPlayer / WORLD.lightSpotRange));
                }
            }
            // Halo mínimo para burbujas en el área inmediata del submarino
            if (distToPlayerSq < WORLD.lightGlowRange * WORLD.lightGlowRange) {
                const distToPlayer = Math.sqrt(distToPlayerSq);
                const halo = (1 - distToPlayer / WORLD.lightGlowRange) * 0.5;
                visibility = Math.max(visibility, halo);
            }
        }

        const alpha = Math.max(0, this.life * visibility);
        if (alpha <= 0.02) return;

        const r = this.size;

        ctx.save();
        ctx.globalAlpha = alpha; // Ya hemos validado que alpha > 0.02

        if (window.WORLD.useGradients) {
            // CACHING: Pre-renderizar modelo de burbuja rotunda en offscreen canvas por tamaño (r redondeado x 2 para resolución)
            const rKey = Math.ceil(this.size * 2) / 2; // Key con precision 0.5 para no tener cache infinita
            
            if (!Bubble.renderCache[rKey]) {
                const offC = document.createElement('canvas');
                const padding = 2; // Extra padding
                offC.width = rKey * 2 + padding * 2;
                offC.height = rKey * 2 + padding * 2;
                const oCtx = offC.getContext('2d');
                
                // Centramos cordenadas en off-canvas
                const cx = rKey + padding;
                const cy = rKey + padding;

                // 1. Interior translúcido (volumen de vidrio)
                const interior = oCtx.createRadialGradient(
                    cx - rKey * 0.25, cy - rKey * 0.25, rKey * 0.05,
                    cx, cy, rKey
                );
                interior.addColorStop(0, `rgba(210, 245, 255, 0.18)`);
                interior.addColorStop(0.6, `rgba(140, 210, 240, 0.06)`);
                interior.addColorStop(1, `rgba(80, 170, 220, 0)`);

                oCtx.beginPath();
                oCtx.arc(cx, cy, rKey, 0, Math.PI * 2);
                oCtx.fillStyle = interior;
                oCtx.fill();

                // 2. Borde sólido (el borde del cristal de la burbuja)
                oCtx.beginPath();
                oCtx.arc(cx, cy, rKey, 0, Math.PI * 2);
                oCtx.strokeStyle = `rgba(200, 240, 255, 0.75)`;
                oCtx.lineWidth = Math.max(0.8, rKey * 0.18);
                oCtx.stroke();

                // 3. Destello especular
                const hlX = cx - rKey * 0.35;
                const hlY = cy - rKey * 0.35;
                const hlR = rKey * 0.28;
                const highlight = oCtx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
                highlight.addColorStop(0, `rgba(255, 255, 255, 0.85)`);
                highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                oCtx.beginPath();
                oCtx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
                oCtx.fillStyle = highlight;
                oCtx.fill();

                // 4. Pequeño reflejo inferior (luna de la burbuja)
                const moonX = cx + rKey * 0.3;
                const moonY = cy + rKey * 0.4;
                const moonR = rKey * 0.12;
                const moon = oCtx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR);
                moon.addColorStop(0, `rgba(200, 240, 255, 0.45)`);
                moon.addColorStop(1, 'rgba(200, 240, 255, 0)');
                oCtx.beginPath();
                oCtx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
                oCtx.fillStyle = moon;
                oCtx.fill();

                Bubble.renderCache[rKey] = offC;
            }

            // Render del prerenderizado cacheado
            const cachedCanvas = Bubble.renderCache[rKey];
            const renderX = sx - rKey - 2; // - padding
            const renderY = sy - rKey - 2; // - padding
            ctx.drawImage(cachedCanvas, renderX, renderY);

        } else {
            // OPTIMIZACIÓN: Círculos translúcidos simples en lugar de 3 gradientes radiales pesados O(1) tiempo de GPU
            // 1. Interior translúcido (volumen de vidrio)
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(140, 210, 240, 0.1)`;
            ctx.fill();

            // 2. Borde sólido (el borde del cristal de la burbuja)
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 240, 255, 0.75)`;
            ctx.lineWidth = Math.max(0.8, r * 0.18);
            ctx.stroke();

            // 3. Destello especular (reflejo de luz en el vidrio — pequeño punto brillante)
            const hlX = sx - r * 0.35;
            const hlY = sy - r * 0.35;
            const hlR = r * 0.28;
            ctx.beginPath();
            ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, 0.6)`;
            ctx.fill();

            // 4. Pequeño reflejo inferior (luna de la burbuja)
            const moonX = sx + r * 0.3;
            const moonY = sy + r * 0.4;
            const moonR = r * 0.12;
            ctx.beginPath();
            ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 240, 255, 0.3)`;
            ctx.fill();
        }

        ctx.restore();
        return true;
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Bubble = Bubble;
}
