/**
 * PLAYER / SUBMARINE - Gestión del jugador y sus sistemas
 */

class Player {
    constructor() {
        this.x = PLAYER_CONFIG.startX;
        this.y = PLAYER_CONFIG.startY;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = PLAYER_CONFIG.speed;
        this.boost = PLAYER_CONFIG.boost;
        this.w = PLAYER_CONFIG.width;
        this.h = PLAYER_CONFIG.height;
        this.dir = 1;  // 1 = derecha, -1 = izquierda

        // Sistema de iluminación
        this.lightOn = false;
        this.lightBattery = 100;
        this.lightFlickerIntensity = 1.0;

        // Sistema de sónar
        this.sonarCooldown = 0;
        this.sonarMaxCooldown = PLAYER_CONFIG.sonarMaxCooldown;
        this.sonarActive = false;
        this.sonarCharging = false;
        this.sonarRadius = 0;

        this.energy = 100;

        // Estado inicial: acoplado a la base
        this.isLocked = true;
        this.lockY = this.y;
    }

    update(keys, controlScheme, world, canvas) {
        // Actualizar sónar
        if (this.sonarActive) {
            this.sonarRadius += PLAYER_CONFIG.sonarExpansionSpeed;
            if (this.sonarRadius > PLAYER_CONFIG.sonarMaxRadius) {
                this.sonarActive = false;
                this.sonarCharging = true;
            }
        }

        if (this.sonarCharging) {
            if (this.sonarCooldown > 0) {
                this.sonarCooldown -= 1 / 60;
            } else {
                this.sonarCharging = false;
            }
        }

        // Gestión de batería del faro
        if (this.lightOn) {
            this.lightBattery -= PLAYER_CONFIG.lightDrainRate;
            if (this.lightBattery <= 0) {
                this.lightBattery = 0;
                this.lightOn = false;
            }
        } else if (this.lightBattery < 100) {
            this.lightBattery += PLAYER_CONFIG.lightRechargeRate;
        }

        // EFECTO DE BOMBILLA MURIÉNDOSE: parpadeo agresivo cuando la batería baja del 10%
        if (this.lightOn && this.lightBattery < 10) {
            // Cuánto de cerca está de 0 (0=llena al 10%, 1=muerta)
            const dying = 1 - (this.lightBattery / 10);
            // Frecuencia de parpadeo se acelera al morir
            const flickerSpeed = 0.015 + dying * 0.08;
            // Ruido aleatorio que aumenta según se muere
            const noise = (Math.random() - 0.5) * dying * 1.2;
            // Onda sinusoidal + ruido aleatorio
            this.lightFlickerIntensity = Math.max(0, Math.min(1,
                0.5 + Math.sin(Date.now() * flickerSpeed) * 0.5 + noise
            ));
        } else {
            this.lightFlickerIntensity = 1.0;
        }

        // Movimiento - velocidad horizontal reducida para juego vertical
        const horizontalSpeedReduction = 0.5;  // 50% de velocidad horizontal
        const currentSpeed = this.speed * (keys['ShiftLeft'] ? this.boost : 1);
        let moving = false;

        if (this.isKeyPressed('left', keys, controlScheme)) {
            this.vx -= currentSpeed * horizontalSpeedReduction;
            this.dir = -1;
            this.targetAngle = -0.1;
            moving = true;
        }
        if (this.isKeyPressed('right', keys, controlScheme)) {
            this.vx += currentSpeed * horizontalSpeedReduction;
            this.dir = 1;
            this.targetAngle = 0.1;
            moving = true;
        }
        if (this.isKeyPressed('up', keys, controlScheme)) {
            this.vy -= currentSpeed;
            moving = true;
        }
        if (this.isKeyPressed('down', keys, controlScheme)) {
            this.vy += currentSpeed;
            moving = true;
        }

        if (!moving) {
            this.targetAngle *= 0.9;
        }

        // Aplicar fricción
        this.vx *= world.friction;
        this.vy *= world.friction;

        // Actualizar posición
        this.x += this.vx;
        this.y += this.vy;

        // LÍMITES HORIZONTALES - bordes naturales del canvas
        const margin = 80;

        // Empujar suavemente cerca de bordes
        if (this.x < margin) {
            const push = (margin - this.x) / margin;
            this.vx += push * 0.8;
        }
        if (this.x > canvas.width - margin) {
            const push = (this.x - (canvas.width - margin)) / margin;
            this.vx -= push * 0.8;
        }

        // LÍMITE DURO - nunca salir de pantalla
        if (this.x < 0) {
            this.x = 0;
            this.vx = Math.abs(this.vx) * 0.2;  // Rebote
        }
        if (this.x > canvas.width) {
            this.x = canvas.width;
            this.vx = -Math.abs(this.vx) * 0.2;  // Rebote
        }

        // Suavizar ángulo
        this.angle += (this.targetAngle - this.angle) * 0.1;

        // Bloqueo de ascenso (colisión con el casco inferior de la Base Abisal)
        // La estructura térmica principal bloquea el paso por encima de la cota Y=160.
        if (!this.isLocked && this.y < 160) {
            this.y = 160;
            if (this.vy < 0) this.vy *= -0.3; // Rebote mecánico contra el metal grueso
        }

        // Si está bloqueado, forzar posición
        if (this.isLocked) {
            this.y = this.lockY;
            this.vy = 0;
            this.vx = 0;
        }

        return moving;
    }

    unlock() {
        if (!this.isLocked) return;
        this.isLocked = false;
        this.vy = 5.0; // Impulso inicial muy fuerte para salir expulsado de la base
    }

    isKeyPressed(action, keys, controlScheme) {
        if (controlScheme === 'WASD') {
            if (action === 'up') return keys['KeyW'];
            if (action === 'down') return keys['KeyS'];
            if (action === 'left') return keys['KeyA'];
            if (action === 'right') return keys['KeyD'];
        } else {
            if (action === 'up') return keys['ArrowUp'];
            if (action === 'down') return keys['ArrowDown'];
            if (action === 'left') return keys['ArrowLeft'];
            if (action === 'right') return keys['ArrowRight'];
        }
        return false;
    }

    activateSonar() {
        if (this.sonarCooldown <= 0 && !this.sonarActive) {
            this.sonarActive = true;
            this.sonarRadius = 0;
            this.sonarCooldown = this.sonarMaxCooldown;
            return true;
        }
        return false;
    }

    toggleLight() {
        if (this.lightBattery > 2) {
            this.lightOn = !this.lightOn;
            const lightAudio = new Audio('audio/light.mp3');
            lightAudio.volume = 0.4;
            lightAudio.play().catch(e => console.warn("Could not play light audio", e));
        }
    }

    draw(ctx, camera, playerImage, ambientAlpha, canvas) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle);

        if (this.dir === -1) {
            ctx.scale(-1, 1);
        }

        // CÁLCULO DE VISIBILIDAD BASADO EN ZONAS CIENTÍFICAS
        const depthMeters = this.y / WORLD.depthScale;
        let ambientAlphaSub = 1.0;
        if (depthMeters > 200 && depthMeters <= 1000) {
            ambientAlphaSub = 1 - (depthMeters - 200) / 800;
        } else if (depthMeters > 1000) {
            ambientAlphaSub = 0;
        }

        ctx.globalAlpha = this.lightOn ? 1.0 : ambientAlphaSub;

        if (!safeDrawImage(ctx, playerImage, -this.w / 2, -this.h / 2, this.w, this.h)) {
            // Fallback: dibujar rectángulo amarillo
            ctx.fillStyle = "transparent";
            ctx.fillRect(-this.w / 2, -this.h / 4, this.w, this.h / 2);
        }

        ctx.restore();
    }

    drawLight(ctx, camera) {
        if (!this.lightOn) return;

        const px = this.x - camera.x;
        const py = this.y - camera.y + WORLD.lightOffsetY;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(this.angle);

        const lightDir = this.dir === 1 ? 0 : Math.PI;

        // Halo radial configurable desde WORLD.lightGlowRange / lightGlowIntensity
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, WORLD.lightGlowRange);
        glowGrad.addColorStop(0, `rgba(255, 255, 220, ${WORLD.lightGlowIntensity * this.lightFlickerIntensity})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, WORLD.lightGlowRange, 0, Math.PI * 2);
        ctx.fill();

        // Foco direccional configurable desde WORLD.lightSpotRange
        // El gradiente empieza OSCURO en el submarino y alcanza su máximo brillo más adelante,
        // evitando el falso "glow radial" causado por el centro brillante del gradiente.
        const spotlightGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, WORLD.lightSpotRange);
        spotlightGrad.addColorStop(0, `rgba(255, 255, 250, 0)`);                                       // oscuro en el origen
        spotlightGrad.addColorStop(0.08, `rgba(255, 255, 250, ${0.45 * this.lightFlickerIntensity})`);    // pico de brillo cercano
        spotlightGrad.addColorStop(0.5, `rgba(255, 255, 240, ${0.25 * this.lightFlickerIntensity})`);    // se va apagando
        spotlightGrad.addColorStop(1, 'transparent');                                                   // transparent en el borde

        ctx.fillStyle = spotlightGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, WORLD.lightSpotRange, lightDir - WORLD.lightAngle, lightDir + WORLD.lightAngle);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    drawSonar(ctx, camera) {
        if (!this.sonarActive) return;

        ctx.save();
        ctx.strokeStyle = `rgba(16, 185, 129, ${1 - this.sonarRadius / PLAYER_CONFIG.sonarMaxRadius})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.sonarRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.Player = Player;
}
