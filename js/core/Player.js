/**
 * PLAYER / SUBMARINE
 * [ES] Gestión del jugador (el submarino) y sus subsistemas críticos (movimiento, iluminación, sónar y colisiones lógicas).
 * [EN] Player (submarine) management and its critical subsystems (movement, lighting, sonar, and logical collisions).
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

        // Sistema de iluminación (Faro)
        this.lightOn = false;
        this.lightFlickerIntensity = 1.0;

        // Sistema de sónar
        this.sonarCooldown = 0;
        this.sonarMaxCooldown = PLAYER_CONFIG.sonarMaxCooldown;
        this.sonarActive = false;
        this.sonarCharging = false;
        this.sonarRadius = 0;

        this.energy = 100;

        // Sistema de Soporte Vital
        this.oxygen = 100;
        this.co2 = 0.04; // Nivel base habitual 
        this.poisonTimer = 0;
        this.isDead = false;
        this.activeScrubberIndex = 0; // 0 o 1
        this.scrubbers = [
            { percentage: 100, needsReplacement: false, replacementTimer: 0 },
            { percentage: 100, needsReplacement: false, replacementTimer: 0 }
        ];

        // Estado inicial: acoplado a la base
        this.isLocked = true;
        this.lockY = this.y;
    }

    /**
     * [ES] Bucle principal de físicas y lógica del jugador. Gestiona inputs, físicas, gasto de batería y colisiones contra límites del nivel.
     * [EN] Main physics and logic loop for the player. Handles inputs, physics, battery drain, and collisions against level boundaries.
     */
    update(keys, controlScheme, world, canvas, dtMult = 1.0, floorHeight = 0) {
        // Pausa TOTAL si el menú de ESC está abierto
        if (typeof isMenuOpen !== 'undefined' && isMenuOpen) {
            return false; // No hay movimiento
        }

        // Actualizar sónar
        if (this.sonarActive) {
            // Si hay apagón o se apaga empíricamente el circuito, cancelar sonar
            if (typeof energyManager !== 'undefined' && (energyManager.isBlackout || !energyManager.switches.sonar)) {
                this.sonarActive = false;
                this.sonarCharging = false;
                this.sonarCooldown = 0;
            } else {
                this.sonarRadius += PLAYER_CONFIG.sonarExpansionSpeed * dtMult;
                if (this.sonarRadius > PLAYER_CONFIG.sonarMaxRadius) {
                    this.sonarActive = false;
                    this.sonarCharging = true;
                }
            }
        }

        if (this.sonarCharging) {
            if (this.sonarCooldown > 0) {
                this.sonarCooldown -= (1 / 60) * dtMult;
            } else {
                this.sonarCharging = false;
            }
        }

        // El consumo y regeneración del Faro ahora lo gestiona de forma centralizada el EnergyManager.
        // Aquí solo nos aseguramos de apagar la luz si nos quedamos sin energía principal.
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
        if (typeof energyManager !== 'undefined' && (energyManager.isBlackout || !energyManager.switches.faro)) {
            this.lightOn = false;
        }

        // EFECTO DE BOMBILLA MURIÉNDOSE: parpadeo agresivo cuando la reserva principal baja del 10%
        if (this.lightOn && mainBattery < 10 && mainBattery > 0) {
            const dying = 1 - (mainBattery / 10);
            const flickerSpeed = 0.015 + dying * 0.08;
            const noise = (Math.random() - 0.5) * dying * 1.2;
            this.lightFlickerIntensity = Math.max(0, Math.min(1,
                0.5 + Math.sin(Date.now() * flickerSpeed) * 0.5 + noise
            ));
        } else {
            this.lightFlickerIntensity = 1.0;
        }

        // Movimiento - velocidad horizontal reducida para juego vertical
        const horizontalSpeedReduction = 0.5;  // 50% de velocidad horizontal
        let currentSpeed = this.speed * (keys['ShiftLeft'] ? this.boost : 1);

        // Bloquear motores de propulsión si no hay energía o están apagados en tablero
        if (typeof energyManager !== 'undefined' && (energyManager.isBlackout || !energyManager.switches.motores)) {
            currentSpeed = 0;
        }

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
        this.vx *= Math.pow(world.friction, dtMult);
        this.vy *= Math.pow(world.friction, dtMult);

        // Actualizar posición
        this.x += this.vx * dtMult;
        this.y += this.vy * dtMult;

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
        this.angle += (this.targetAngle - this.angle) * 0.1 * dtMult;

        // --- LÍMITES VERTICALES Y FONDO ---

        // Bloqueo de ascenso (colisión con el casco inferior de la Base Abisal)
        if (!this.isLocked && this.y < 160) {
            this.y = 160;
            if (this.vy < 0) this.vy *= -0.3;
        }

        // LÍMITE DEL FONDO ABISAL DINÁMICO (Traspasable hasta la MITAD de la imagen)
        const FLOOR_START_Y = 110000;
        // El límite absoluto es ahora la MITAD de la altura de la imagen
        const FLOOR_LIMIT_Y = FLOOR_START_Y + (floorHeight / 2) - (this.h / 2);
        
        // Eliminado el efecto de resistencia/empuje hacia arriba para permitir
        // una navegación sencilla por la capa superior del suelo.

        // Clamp duro final: el punto medio de la imagen/mundo
        if (this.y >= FLOOR_LIMIT_Y) {
            this.y = FLOOR_LIMIT_Y;
            if (this.vy > 0) this.vy = 0;
        }

        // Si está bloqueado, forzar posición
        if (this.isLocked) {
            this.y = this.lockY;
            this.vy = 0;
            this.vx = 0;
        }

        return moving;
    }

    /**
     * [ES] Gestiona los sistemas de soporte vital: oxígeno, CO2 y filtros de cal sodada (scrubbers).
     * [EN] Manages life support systems: oxygen, CO2, and soda lime filters (scrubbers).
     */
    updateLifeSupport(dtMult) {
        const isMenuOpenGlobal = (typeof isMenuOpen !== 'undefined' ? isMenuOpen : false);
        const canSimulate = !this.isLocked && !isMenuOpenGlobal;

        // Factores de conversión
        const co2ProdPerTick = (FILTER_CONFIG.cabinCo2RiseRate / 60);
        const scrubberDrainPerTick = (100 / (FILTER_CONFIG.scrubberDuration * 60 * 60));
        // Eficiencia del scrubber: debe ser capaz de contrarrestar el ascenso
        const scrubberEfficiency = co2ProdPerTick * 1.5;

        if (canSimulate) {
            // Producción de CO2
            this.co2 += co2ProdPerTick * dtMult;
            if (this.co2 > 20.0) this.co2 = 20.0; // Cap sumidero suave

            // Filtrado de CO2 (Scrubber activo)
            const activeScrubber = this.scrubbers[this.activeScrubberIndex];

            // Solo funciona si no hay apagón y el interruptor interno está activado
            const hasPower = typeof energyManager !== 'undefined' ? (!energyManager.isBlackout && energyManager.switches.scrubbers) : true;

            if (activeScrubber.percentage > 0 && hasPower) {
                activeScrubber.percentage -= scrubberDrainPerTick * dtMult;
                if (activeScrubber.percentage < 0) activeScrubber.percentage = 0;

                // Eliminar CO2 (Solo si el filtro tiene carga)
                this.co2 -= scrubberEfficiency * dtMult;
            }
        }

        // Recuperar el scrubber activo fuera del if para la lógica de intoxicación
        const activeScrubber = this.scrubbers[this.activeScrubberIndex];
        const overlay = document.getElementById('co2-poison-overlay');
        const countdown = document.getElementById('co2-critical-countdown');

        // Lógica de alerta y muerte por Anoxia (Oxígeno)
        const isAnoxiaCritical = (typeof oxygenManager !== 'undefined' && oxygenManager.cabinOxygen < 7.0);

        // Detectar si el jugador está solucionando los problemas activamente
        this.isCo2Improving = false;
        if (typeof energyManager !== 'undefined') {
            const hasPower = !energyManager.isBlackout && energyManager.switches.scrubbers;
            if (activeScrubber && activeScrubber.percentage > 0 && hasPower) this.isCo2Improving = true;
        }
        if (typeof oxygenManager !== 'undefined' && oxygenManager.isPurging) {
            this.isCo2Improving = true;
        }

        // Control de visibilidad del contador (Solo fuera de menús técnicos o generales)
        const isTechMenuOpen =
            (typeof subManagementManager !== 'undefined' && subManagementManager.isOpen) ||
            (typeof uiManager !== 'undefined' && (
                uiManager.isSubManagementOpen ||
                uiManager.isDiscoveryModalOpen ||
                uiManager.isScanModalOpen
            ));
        const canShowTimer = !isMenuOpenGlobal && !isTechMenuOpen;

        if ((this.co2 >= 15.0 || isAnoxiaCritical) && !this.isDead) {
            // Verificar si el problema específico que está causando la emergencia se está solucionando
            const isCo2Fixing = (this.co2 >= 15.0 && this.isCo2Improving);
            const isO2Fixing = (isAnoxiaCritical && typeof oxygenManager !== 'undefined' && oxygenManager.isO2Improving);
            
            // Si hay emergencia por alguna de las dos o ambas, y se están arreglando TODAS las alarmas activas
            const fixingAll = (this.co2 >= 15.0 ? isCo2Fixing : true) && (isAnoxiaCritical ? isO2Fixing : true);
            
            if (fixingAll) {
                if (canSimulate && this.poisonTimer > 0) {
                    this.poisonTimer -= (2 / 60) * dtMult;
                    if (this.poisonTimer < 0) this.poisonTimer = 0;
                }
            } else if (canSimulate) {
                this.poisonTimer += (1 / 60) * dtMult;

                if (this.poisonTimer >= FILTER_CONFIG.co2PoisoningGracePeriod) {
                    if (isAnoxiaCritical && !isO2Fixing) {
                        this.triggerGameOver('MUERTE POR ANOXIA', 'anoxia');
                    } else {
                        this.triggerGameOver('INTOXICACIÓN POR CO2', 'critical');
                    }
                }
            }
        } else if (!isAnoxiaCritical && this.co2 < 15.0 && !this.isDead) {
            if (canSimulate && this.poisonTimer > 0) {
                this.poisonTimer -= (2 / 60) * dtMult;
                if (this.poisonTimer < 0) this.poisonTimer = 0;
            }
        }

        // Mostrar u ocultar el contador según estado y visibilidad de menús
        if (countdown) {
            const isCriticalAtmo = (this.co2 >= 15.0 || isAnoxiaCritical);
            if (isCriticalAtmo && canShowTimer && !this.isDead) {
                countdown.classList.remove('hidden');
                const timerVal = document.getElementById('co2-timer-value');
                const statusLabel = countdown.querySelector('span');
                const timerCircle = countdown.querySelector('svg circle:nth-child(2)');

                if (timerVal) {
                    const remaining = Math.max(0, FILTER_CONFIG.co2PoisoningGracePeriod - this.poisonTimer);
                    timerVal.innerText = remaining.toFixed(1);
                }

                if (statusLabel) {
                    if (isAnoxiaCritical) {
                        statusLabel.innerText = "EMERGENCIA O2";
                        statusLabel.className = "text-cyan-500 text-[6px] font-black tracking-widest uppercase mt-1 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30";
                    } else {
                        statusLabel.innerText = "EMERGENCIA CO2";
                        statusLabel.className = "text-red-500 text-[6px] font-black tracking-widest uppercase mt-1 bg-black/60 px-2 py-0.5 rounded border border-red-500/30";
                    }
                }

                if (timerCircle) {
                    timerCircle.style.stroke = isAnoxiaCritical ? "#06b6d4" : "#ef4444";
                    const progress = Math.min(1, this.poisonTimer / FILTER_CONFIG.co2PoisoningGracePeriod);
                    timerCircle.style.strokeDashoffset = (progress * 150).toString();
                }
            } else {
                countdown.classList.add('hidden');
            }
        }

        // Efecto visual progresivo de Rojo (Escalado a 15%)
        if (overlay) {
            let redOpacity = 0;
            if (this.co2 >= 2.0 && this.co2 < 5.0) {
                redOpacity = (this.co2 - 2.0) * 0.05;
            } else if (this.co2 < 10.0) {
                redOpacity = 0.15 + (this.co2 - 5.0) * 0.05;
            } else if (this.co2 < 15.0) {
                redOpacity = 0.4 + (this.co2 - 10.0) * 0.04;
            } else if (this.co2 >= 15.0) {
                redOpacity = 0.6;
            }
            
            // Caching values
            const rOpacity = (Math.round(redOpacity * 100) / 100).toString();
            // Reducir la distorsión global haciéndolo jugable (max 3px de blur)
            const rBlur = Math.round(redOpacity * 3).toString();
            
            if (overlay.dataset.lastOp !== rOpacity) {
                overlay.style.opacity = rOpacity;
                overlay.dataset.lastOp = rOpacity;
            }
            if (overlay.dataset.lastBlur !== rBlur) {
                overlay.style.backdropFilter = `blur(${rBlur}px)`;
                overlay.dataset.lastBlur = rBlur;
            }
        }

        // Gestionar temporizadores de mantenimiento para los inactivos QUE NO ESTÉN LLENOS
        this.scrubbers.forEach((s, idx) => {
            // Un filtro está listo para mantenimiento si NO es el activo y NO está al 100%
            if (idx !== this.activeScrubberIndex && s.percentage < 100) {
                // Iniciar contador si no estaba ya en marcha o si acaba de ser desconectado
                if (!s.needsReplacement) {
                    s.needsReplacement = true;
                    s.replacementTimer = FILTER_CONFIG.scrubberReplacementTime * 60;
                }

                // Descontar tiempo
                if (s.replacementTimer > 0) {
                    s.replacementTimer -= (1 / 60) * dtMult;
                    if (s.replacementTimer < 0) s.replacementTimer = 0;
                }
            } else if (idx === this.activeScrubberIndex) {
                // ...
            }
        });

        // CO2 no puede ser negativo y se limita a 100
        this.co2 = Math.max(0, Math.min(100, this.co2));
    }

    /**
     * [ES] Activa la secuencia de fin de juego por intoxicación o asfixia.
     */
    triggerGameOver(reason = 'INTOXICACIÓN POR CO2', theme = 'critical') {
        if (this.isDead) return;
        this.isDead = true;

        if (typeof endGame !== 'undefined' && endGame) {
            endGame.show(reason, theme);
        } else {
            // Fallback de seguridad
            location.reload();
        }
    }

    switchScrubber(index) {
        if (index >= 0 && index < this.scrubbers.length) {
            this.activeScrubberIndex = index;
            if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('toggle', 0.5);
        }
    }

    replaceScrubber(index) {
        const s = this.scrubbers[index];
        if (s.needsReplacement && s.replacementTimer <= 0) {
            s.percentage = 100;
            s.needsReplacement = false;
            s.replacementTimer = 0;
            if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('hook', 0.6);
            return true;
        }
        return false;
    }

    /**
     * [ES] Libera al submarino de su anclaje inicial a la base, dándole un impulso mecánico hacia abajo.
     * [EN] Releases the submarine from its initial docking at the base, giving it a mechanical downward boost.
     */
    unlock() {
        if (!this.isLocked) return;
        this.isLocked = false;
        this.vy = 5.0; // Impulso inicial muy fuerte para salir expulsado de la base
    }

    /**
     * [ES] Interpreta la pulsación de teclas adaptándose al esquema de control activo (WASD o Flechas).
     * [EN] Interprets key presses adapting to the active control scheme (WASD or Arrows).
     */
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

    /**
     * [ES] Activa el sistema de sónar si no está en tiempo de recarga (cooldown), iniciando la onda de detección.
     * [EN] Activates the sonar system if it's not on cooldown, starting the detection wave.
     */
    activateSonar() {
        if (typeof energyManager !== 'undefined' && (energyManager.isBlackout || !energyManager.switches.sonar)) {
            return false; // Sin energía
        }

        if (this.sonarCooldown <= 0 && !this.sonarActive) {
            this.sonarActive = true;
            this.sonarRadius = 0;
            this.sonarCooldown = this.sonarMaxCooldown;
            return true;
        }
        return false;
    }

    /**
     * [ES] Alterna el estado del foco de luz principal (encendido/apagado) y reproduce el efecto de sonido correspondiente.
     * [EN] Toggles the main spotlight state (on/off) and plays the corresponding sound effect.
     */
    toggleLight() {
        if (typeof energyManager !== 'undefined' && (energyManager.isBlackout || !energyManager.switches.faro)) {
            return;
        }

        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
        if (mainBattery > 0.5) {
            this.lightOn = !this.lightOn;
            GlobalAudioPool.play('light', 0.4);
        }
    }

    /**
     * [ES] Renderiza el sprite del submarino en pantalla, calculando la opacidad base según la oscuridad de la zona profunda actual.
     * [EN] Renders the submarine sprite on screen, calculating base opacity according to the darkness of the current depth zone.
     */
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
            // Fallback: dibujar submarino esquemático
            ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
            ctx.fillRect(-this.w / 2, -this.h / 4, this.w, this.h / 2);
            ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.w / 2, -this.h / 4, this.w, this.h / 2);
        }

        ctx.restore();
    }

    /**
     * [ES] Dibuja los halos de luz (direccional y radial) emitidos por el submarino cuando la linterna está encendida.
     * [EN] Draws the light halos (directional and radial) emitted by the submarine when the flashlight is on.
     */
    drawLight(ctx, camera) {
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
        if (!this.lightOn || mainBattery <= 0) return;

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

    /**
     * [ES] Dibuja el anillo expansivo del pulso del sónar cuando está activo.
     * [EN] Draws the expanding ring of the sonar pulse when it's active.
     */
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
