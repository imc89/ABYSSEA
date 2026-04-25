class OxygenManager {
    constructor() {
        this.tanks = [
            { percentage: 100, isRefilling: false, timer: 0 },
            { percentage: 100, isRefilling: false, timer: 0 }
        ];
        this.activeTankIndex = 0;

        // La cabina empieza con nivel de aire nominal
        this.cabinOxygen = 21.0;

        // Estado de Purga Manual
        this.isPurging = false;

        // Cache DOM
        this.dom = null;
        this._lastDrawn = {};
    }

    init() {
        this.dom = {
            tanksCanvas: [
                document.getElementById('oxygen-canvas-0'),
                document.getElementById('oxygen-canvas-1')
            ],
            tankPercents: [
                document.getElementById('oxygen-percent-0'),
                document.getElementById('oxygen-percent-1')
            ],
            tankStatus: [
                document.getElementById('oxygen-status-0'),
                document.getElementById('oxygen-status-1')
            ],
            tankTimers: [
                document.getElementById('oxygen-timer-box-0'),
                document.getElementById('oxygen-timer-box-1')
            ],
            tankButtons: [
                document.getElementById('oxygen-replace-0'),
                document.getElementById('oxygen-replace-1')
            ],
            fanBlades: document.getElementById('fan-blades'),
            btnManual: document.getElementById('btn-manual-oxygen'),
            btnPurge: document.getElementById('btn-purge-atmosphere'),
            cabinDisplay: document.getElementById('cabin-o2-display'),
            cabinStatusTag: document.getElementById('cabin-o2-status'),
            cabinCo2Display: document.getElementById('oxygen-cabin-co2-display'),
            cabinCo2Status: document.getElementById('oxygen-cabin-co2-status')
        };
    }

    replaceTank(index) {
        let tank = this.tanks[index];
        if (tank.percentage <= 0 && !tank.isRefilling) {
            tank.isRefilling = true;
            tank.timer = FILTER_CONFIG.tankRefillTime * 60; // to seconds
            if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('hook', 0.6);
            this.forceUIUpdate();
        }
    }

    injectManualOxygen() {
        const hasEnergy = typeof energyManager !== 'undefined' ? !energyManager.isBlackout : true;
        const ventilacionOn = typeof energyManager !== 'undefined' ? energyManager.switches.ventilacion : true;
        const isSystemActive = hasEnergy && ventilacionOn;
        // Solo inyecta oxígeno si el sistema automático está inactivo y la válvula está activa (brillo rojo)
        if (isSystemActive) return;

        // La animación de la palanca solo se dispara si está activa
        const lever = document.getElementById('valve-lever');
        if (lever) {
            lever.style.transition = 'none';
            lever.style.transform = 'rotate(0deg)';
            lever.getBoundingClientRect();
            lever.style.transition = 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)';
            lever.style.transform = 'rotate(90deg)';
            setTimeout(() => {
                lever.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                lever.style.transform = 'rotate(0deg)';
            }, 280);
        }

        let activeTank = this.tanks[this.activeTankIndex];
        if (activeTank.percentage > 0) {
            const injectAmount = 5.0;
            activeTank.percentage -= injectAmount;
            if (activeTank.percentage < 0) activeTank.percentage = 0;

            this.cabinOxygen = Math.min(21.0, this.cabinOxygen + (injectAmount * 1.5));
            if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('light', 0.5);
            this.forceUIUpdate();
        }
    }

    purgeAtmosphere() {
        // Bloqueo de seguridad: No se puede purgar si el submarino está anclado (isLocked)
        if (typeof player !== 'undefined' && player.isLocked) return;

        // Toggle Logic with Robust HTML Animation
        const purgeLever = document.getElementById('purge-valve-lever');

        if (!this.isPurging) {
            let activeTank = this.tanks[this.activeTankIndex];
            if (activeTank.percentage > 0) {
                this.isPurging = true;
                if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('sonar', 0.5);

                // Animación: Abre válvula (girar 90°)
                if (purgeLever) {
                    purgeLever.style.transition = 'none';
                    purgeLever.style.transform = 'rotate(0deg)';
                    purgeLever.getBoundingClientRect(); // forzar reflow
                    purgeLever.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    purgeLever.style.transform = 'rotate(90deg)';
                }
            }
        } else {
            this.isPurging = false; // Toggle off manual

            // Animación: Cierra válvula (volver a 0°)
            if (purgeLever) {
                purgeLever.style.transition = 'none';
                purgeLever.style.transform = 'rotate(90deg)';
                purgeLever.getBoundingClientRect(); // forzar reflow
                purgeLever.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                purgeLever.style.transform = 'rotate(0deg)';
            }
        }
        this.forceUIUpdate();
    }

    update(dt, player) {
        // La UI debe actualizarse siempre para mostrar los tanques aunque esté bloqueado
        this.drawUI(player);

        if (player.isLocked || (typeof isMenuOpen !== 'undefined' && isMenuOpen)) return;

        let uiNeedsUpdate = false;

        // 1. Gestionar recarga de tanques vacíos
        this.tanks.forEach((tank, idx) => {
            if (tank.isRefilling) {
                tank.timer -= dt;
                if (tank.timer <= 0) {
                    tank.timer = 0;
                    tank.isRefilling = false;
                    tank.percentage = 100;
                    uiNeedsUpdate = true;
                }
            } else if (tank.percentage <= 0 && idx !== this.activeTankIndex && !tank.isRefilling) {
                // Hacer el botón visible
                uiNeedsUpdate = true;
            }
        });

        const activeTank = this.tanks[this.activeTankIndex];
        const hasEnergy = typeof energyManager !== 'undefined' ? !energyManager.isBlackout : true;
        const ventilacionOn = typeof energyManager !== 'undefined' ? energyManager.switches.ventilacion : true;
        const isSystemActive = hasEnergy && ventilacionOn;

        this.isO2Improving = false;

        // Control de Purga (tiene prioridad visual y gasta tanque muy rapido)
        if (this.isPurging) {
            if (activeTank.percentage > 0) {
                this.isO2Improving = true;
                activeTank.percentage -= FILTER_CONFIG.purgeO2DrainRate * dt;
                player.co2 -= FILTER_CONFIG.purgeCO2ReductionRate * dt; // reduce CO2 del jugador
                if (player.co2 < 0) player.co2 = 0;

                // NIVELAR OXÍGENO: La purga inyecta aire puro masivamente recuperando el nivel de la cabina
                if (this.cabinOxygen < 21.0) {
                    this.cabinOxygen += 3.0 * dt; // Inyeccion rápida (3% por segundo)
                    if (this.cabinOxygen > 21.0) this.cabinOxygen = 21.0;
                }

                if (activeTank.percentage <= 0) {
                    activeTank.percentage = 0;
                    this.isPurging = false;
                }
            } else {
                this.isPurging = false;
            }
            uiNeedsUpdate = true;
        }

        // Tasa nominal de drenaje del tanque para mantener la cabina
        const drainPerSecond = 100 / (FILTER_CONFIG.tankDuration * 60);

        if (isSystemActive) {
            // El sistema intenta mantener la cabina a 21%
            if (activeTank.percentage > 0) {
                this.isO2Improving = true; // El sistema está inyectando oxígeno
                if (this.cabinOxygen < 21.0) {
                    this.cabinOxygen += 0.5 * dt; // Recupera la cabina
                    if (this.cabinOxygen > 21.0) this.cabinOxygen = 21.0;
                }
                activeTank.percentage -= drainPerSecond * dt;

                if (activeTank.percentage <= 0) {
                    activeTank.percentage = 0;
                    // Auto switch if needed
                    this.autoSwitchTank();
                }
            } else {
                // Se quedó sin aire el tanque actual, tratar de cambiar al otro
                if (this.autoSwitchTank()) {
                    // Si se cambió con éxito, en el siguiente frame bombeará
                } else {
                    // Ambos tanques vacíos, la cabina empieza a caer
                    this.cabinOxygen -= FILTER_CONFIG.cabinO2DropRate * dt;
                }
            }
        } else {
            // Si el motor / ventilación está apagado (apagón), la cabina cae.
            this.cabinOxygen -= FILTER_CONFIG.cabinO2DropRate * dt;
        }

        // Limites
        if (this.cabinOxygen < 0) this.cabinOxygen = 0;

        // Hypoxia / Anoxia Effects 
        let dangerEffect = 0; // 0 normal, 1 hypoxia, 2 anoxia
        if (this.cabinOxygen < 7.0) {
            dangerEffect = 2; // Anoxia Grave
        } else if (this.cabinOxygen < 15.0) {
            dangerEffect = 1; // Hipoxia incipiente
        }

        if (this._lastDangerEffect !== dangerEffect) {
            const canvasEl = document.getElementById('gameCanvas');
            if (canvasEl) {
                canvasEl.style.transition = "filter 2s ease-in-out";
                if (dangerEffect === 2) {
                    canvasEl.style.filter = "blur(2px)"; // Efecto reducido para permitir jugar
                } else if (dangerEffect === 1) {
                    canvasEl.style.filter = "blur(1px)";
                } else {
                    canvasEl.style.filter = "none";
                }
            }
            this._lastDangerEffect = dangerEffect;
        }

        // Efecto visual Blue Overlay para Anoxia
        const anoxiaOverlay = document.getElementById('o2-anoxia-overlay');

        if (this.cabinOxygen < 15.0) {
            if (anoxiaOverlay) {
                let blueOpacity = 0;
                if (this.cabinOxygen < 7.0) {
                    blueOpacity = 0.6;
                } else {
                    // 7% - 15% (0.0 a 0.6 opacity)
                    blueOpacity = (15.0 - this.cabinOxygen) / 8.0 * 0.6;
                }
                // Blur reducido para mantener visibilidad de UI y controles
                const blurVal = blueOpacity * 3;
                // Redondear para evitar actualizaciones imperceptibles pero costosas en CPU
                const rOpacity = (Math.round(blueOpacity * 100) / 100).toString();
                const rBlur = Math.round(blurVal).toString();

                if (anoxiaOverlay.dataset.lastOp !== rOpacity) {
                    anoxiaOverlay.style.opacity = rOpacity;
                    anoxiaOverlay.dataset.lastOp = rOpacity;
                }
                if (anoxiaOverlay.dataset.lastBlur !== rBlur) {
                    anoxiaOverlay.style.backdropFilter = `blur(${rBlur}px)`;
                    anoxiaOverlay.dataset.lastBlur = rBlur;
                }
            }
        } else {
            if (anoxiaOverlay && anoxiaOverlay.dataset.lastOp !== "0") {
                anoxiaOverlay.style.opacity = "0";
                anoxiaOverlay.style.backdropFilter = "blur(0px)";
                anoxiaOverlay.dataset.lastOp = "0";
                anoxiaOverlay.dataset.lastBlur = "0";
            }
        }
    }

    autoSwitchTank() {
        let otherIndex = this.activeTankIndex === 0 ? 1 : 0;
        let otherTank = this.tanks[otherIndex];
        if (otherTank.percentage > 0) {
            this.activeTankIndex = otherIndex;
            return true;
        }
        return false;
    }

    forceUIUpdate() {
        this._lastDrawn = {};
        this.drawUI();
    }

    drawUI(player) {
        if (!this.dom) this.init();
        if (!this.dom.cabinDisplay) return; // Not initialized strictly yet

        const isLocked = player ? player.isLocked : false;

        const hasEnergy = typeof energyManager !== 'undefined' ? !energyManager.isBlackout : true;
        const ventilacionOn = typeof energyManager !== 'undefined' ? energyManager.switches.ventilacion : true;
        const isSystemActive = hasEnergy && ventilacionOn;

        // ==== FAN BLADES ====
        if (isSystemActive) {
            if (this.dom.fanBlades.classList.contains('spin-stopped')) {
                this.dom.fanBlades.classList.remove('spin-stopped');
            }
        } else {
            if (!this.dom.fanBlades.classList.contains('spin-stopped')) {
                this.dom.fanBlades.classList.add('spin-stopped');
            }
        }

        // ==== MANUAL BOTON ====
        const valveLever = this.dom.btnManual ? this.dom.btnManual.querySelector('#valve-lever') : null;
        if (!isSystemActive && this.tanks[this.activeTankIndex].percentage > 0) {
            this.dom.btnManual.classList.remove('cursor-not-allowed', 'opacity-50');
            // Válvula disponible: mango rojo brillante
            if (valveLever) {
                valveLever.style.filter = 'drop-shadow(0 0 4px rgba(220,38,38,0.8))';
            }
        } else {
            this.dom.btnManual.classList.add('cursor-not-allowed', 'opacity-50');
            // Válvula bloqueada: palanca sin brillo
            if (valveLever) {
                valveLever.style.filter = 'none';
            }
        }

        // ==== PURGE BOTON ====
        const purgeText = document.getElementById('btn-purge-text');
        
        // Deshabilitar visualmente si está anclado
        if (isLocked) {
            this.dom.btnPurge.classList.add('cursor-not-allowed', 'opacity-50', 'grayscale-[0.5]');
            this.dom.btnPurge.style.pointerEvents = 'none';
        } else {
            this.dom.btnPurge.classList.remove('cursor-not-allowed', 'opacity-50', 'grayscale-[0.5]');
            this.dom.btnPurge.style.pointerEvents = 'auto';
        }

        if (this.isPurging) {
            this.dom.btnPurge.classList.add('shadow-[0_0_30px_rgba(239,68,68,0.8)]', 'animate-pulse');
            if (purgeText) purgeText.innerText = "DETENER PURGA";
        } else {
            this.dom.btnPurge.classList.remove('shadow-[0_0_30px_rgba(239,68,68,0.8)]', 'animate-pulse');
            if (purgeText) purgeText.innerText = "PURGA DE ATMÓSFERA";
        }

        // ==== CABIN O2 ====
        const cabinO2Str = this.cabinOxygen.toFixed(1);
        if (this._lastCabinO2Str !== cabinO2Str) {
            this.dom.cabinDisplay.innerText = cabinO2Str;
            this._lastCabinO2Str = cabinO2Str;
        }

        if (this.dom.cabinStatusTag) {
            if (this.cabinOxygen < 7.0) {
                if (this._lastCabinStatus !== "CRIT") {
                    this.dom.cabinDisplay.className = "text-red-500 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse";
                    this.dom.cabinStatusTag.innerText = "PELIGRO CRÍTICO";
                    this.dom.cabinStatusTag.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse";
                    this._lastCabinStatus = "CRIT";
                }
            } else if (this.cabinOxygen < 15.0) {
                if (this._lastCabinStatus !== "WARN") {
                    this.dom.cabinDisplay.className = "text-red-500 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]";
                    this.dom.cabinStatusTag.innerText = "PELIGRO";
                    this.dom.cabinStatusTag.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30";
                    this._lastCabinStatus = "WARN";
                }
            } else if (this.cabinOxygen < 19.0) {
                if (this._lastCabinStatus !== "LIGHTWARN") {
                    this.dom.cabinDisplay.className = "text-amber-400 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]";
                    this.dom.cabinStatusTag.innerText = "PELIGRO LEVE";
                    this.dom.cabinStatusTag.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30";
                    this._lastCabinStatus = "LIGHTWARN";
                }
            } else {
                if (this._lastCabinStatus !== "NORMAL") {
                    this.dom.cabinDisplay.className = "text-emerald-400 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                    this.dom.cabinStatusTag.innerText = "NORMAL";
                    this.dom.cabinStatusTag.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30";
                    this._lastCabinStatus = "NORMAL";
                }
            }
        }

        // ==== CABIN CO2 (DENTRO DEL PANEL DE OXIGENO) ====
        if (player && this.dom.cabinCo2Display) {
            const co2Str = player.co2.toFixed(1);
            this.dom.cabinCo2Display.innerText = co2Str;

            if (this.dom.cabinCo2Status) {
                const co2Level = player.co2 < 2.0 ? 0 : (player.co2 < 5.0 ? 1 : (player.co2 < 10.0 ? 2 : 3));
                if (co2Level === 0) {
                    this.dom.cabinCo2Display.className = "text-emerald-400 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                    this.dom.cabinCo2Status.innerText = "NORMAL";
                    this.dom.cabinCo2Status.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
                } else if (co2Level === 1) {
                    this.dom.cabinCo2Display.className = "text-amber-400 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]";
                    this.dom.cabinCo2Status.innerText = "PELIGRO LEVE";
                    this.dom.cabinCo2Status.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30";
                } else if (co2Level === 2) {
                    this.dom.cabinCo2Display.className = "text-orange-500 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]";
                    this.dom.cabinCo2Status.innerText = "PELIGRO";
                    this.dom.cabinCo2Status.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30";
                } else {
                    this.dom.cabinCo2Display.className = "text-red-500 font-mono text-xl tracking-tighter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse";
                    this.dom.cabinCo2Status.innerText = "PELIGRO CRÍTICO";
                    this.dom.cabinCo2Status.className = "mt-1 text-[7px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse";
                }
            }
        }

        // ==== TANKS ====
        this.tanks.forEach((tank, idx) => {
            const percEl = this.dom.tankPercents[idx];
            const statEl = this.dom.tankStatus[idx];
            const btnEl = this.dom.tankButtons[idx];
            const timEl = this.dom.tankTimers[idx];

            let active = (this.activeTankIndex === idx);

            const percStr = Math.round(tank.percentage) + "%";
            if (!this._lastTankPercs) this._lastTankPercs = [];
            if (this._lastTankPercs[idx] !== percStr) {
                percEl.innerText = percStr;
                this._lastTankPercs[idx] = percStr;
            }

            if (tank.isRefilling) {
                // Timer 
                btnEl.classList.add('hidden');
                timEl.classList.remove('opacity-0');
                const m = Math.floor(tank.timer / 60);
                const s = Math.floor(tank.timer % 60).toString().padStart(2, '0');
                
                const timeStr = `${m}:${s}`;
                if (timEl._lastText !== timeStr) {
                    timEl.innerText = timeStr;
                    timEl._lastText = timeStr;
                }
                
                if (statEl._lastText !== "REFILL") {
                    statEl.innerText = "Rellenando";
                    statEl.className = "text-orange-400 text-[10px] font-bold uppercase animate-pulse";
                    statEl._lastText = "REFILL";
                }
            } else if (tank.percentage <= 0) {
                timEl.classList.add('opacity-0');
                if (!tank.isRefilling) {
                    btnEl.classList.remove('hidden');
                    if (statEl._lastText !== "EMPTY") {
                        statEl.innerText = "Vacío";
                        statEl.className = "text-red-500 text-[10px] font-bold uppercase";
                        statEl._lastText = "EMPTY";
                    }
                }
            } else {
                timEl.classList.add('opacity-0');
                btnEl.classList.add('hidden');
                if (active) {
                    if (statEl._lastText !== "ACTIVE") {
                        statEl.innerText = "En Uso";
                        statEl.className = "text-cyan-400 text-[10px] font-bold uppercase";
                        statEl._lastText = "ACTIVE";
                    }
                } else {
                    if (statEl._lastText !== "RESERVE") {
                        statEl.innerText = "En Reserva";
                        statEl.className = "text-white/30 text-[10px] font-bold uppercase";
                        statEl._lastText = "RESERVE";
                    }
                }
            }

            const rPercCanvas = Math.round(tank.percentage * 10) / 10;
            if (!this._lastTankDraw) this._lastTankDraw = [];
            const cacheKey = rPercCanvas + "_" + active + "_" + this.isPurging;
            if (this._lastTankDraw[idx] !== cacheKey) {
                this.drawTankCanvas(idx, tank.percentage, active);
                this._lastTankDraw[idx] = cacheKey;
            }
        });
    }

    drawTankCanvas(idx, percentage, isActive) {
        if (!this.dom) return;
        const cvs = this.dom.tanksCanvas[idx];
        if (!cvs) return;

        let shouldResize = (cvs.width !== cvs.clientWidth * 2);
        if (shouldResize && cvs.clientWidth > 0) {
            cvs.width = cvs.clientWidth * 2;
            cvs.height = cvs.clientHeight * 2;
        }

        if (cvs.width === 0) return;

        const ctx = cvs.getContext('2d');
        const w = cvs.width;
        const h = cvs.height;

        ctx.clearRect(0, 0, w, h);

        // Fondo oscuro y profundo
        ctx.fillStyle = "#0c1014";
        ctx.fillRect(0, 0, w, h);

        // Sombra cilíndrica de fondo
        const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
        bgGrad.addColorStop(0, "rgba(0,0,0,0.8)");
        bgGrad.addColorStop(0.2, "rgba(0,0,0,0.2)");
        bgGrad.addColorStop(0.5, "rgba(255,255,255,0.05)");
        bgGrad.addColorStop(0.8, "rgba(0,0,0,0.2)");
        bgGrad.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();

        const fillH = (percentage / 100) * h;
        const fillY = h - fillH;

        if (percentage > 0) {
            // Gradiente volumétrico cian nebuloso (gas a presión)
            const gasGrad = ctx.createLinearGradient(0, fillY, 0, h);
            if (isActive) {
                gasGrad.addColorStop(0, "rgba(34, 211, 238, 0.9)"); // Cian brillante arriba
                gasGrad.addColorStop(0.4, "rgba(6, 182, 212, 0.7)");
                gasGrad.addColorStop(1, "rgba(8, 145, 178, 0.9)");  // Cian oscuro abajo
            } else {
                gasGrad.addColorStop(0, "rgba(34, 211, 238, 0.4)");
                gasGrad.addColorStop(0.4, "rgba(6, 182, 212, 0.3)");
                gasGrad.addColorStop(1, "rgba(8, 145, 178, 0.4)");
            }

            ctx.fillStyle = gasGrad;
            ctx.fillRect(0, fillY, w, fillH);

            // Reflejo interior metálico interactuando con el gas
            const innerReflect = ctx.createLinearGradient(0, 0, w, 0);
            innerReflect.addColorStop(0.1, "rgba(255, 255, 255, 0.2)");
            innerReflect.addColorStop(0.15, "transparent");
            innerReflect.addColorStop(0.85, "transparent");
            innerReflect.addColorStop(0.9, "rgba(255, 255, 255, 0.1)");
            ctx.fillStyle = innerReflect;
            ctx.fillRect(0, fillY, w, fillH);

            // Capa de condensación simulada arriba del gas
            const vaporGrad = ctx.createLinearGradient(0, fillY - 30, 0, fillY + 30);
            vaporGrad.addColorStop(0, "transparent");
            vaporGrad.addColorStop(0.4, isActive ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.1)");
            vaporGrad.addColorStop(1, "transparent");
            ctx.fillStyle = vaporGrad;
            ctx.fillRect(0, fillY - 30, w, 60);

            // Línea de la superficie nítida
            ctx.fillStyle = isActive ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.4)";
            ctx.fillRect(0, fillY, w, 2);
            ctx.fillStyle = isActive ? "rgba(34, 211, 238, 1)" : "rgba(34, 211, 238, 0.5)";
            ctx.fillRect(0, fillY + 2, w, 2);

            // Burbujas dinámicas (partículas gaseosas)
            if (isActive && this.isPurging) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                for (let i = 0; i < 20; i++) {
                    let bx = Math.random() * w;
                    let by = fillY + Math.random() * fillH;
                    ctx.beginPath();
                    ctx.arc(bx, by, Math.random() * 5 + 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (isActive) {
                // Micro burbujas regulares
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                for (let i = 0; i < 8; i++) {
                    let bx = Math.random() * w;
                    let by = fillY + Math.random() * fillH;
                    ctx.beginPath();
                    ctx.arc(bx, by, Math.random() * 2 + 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Brillos cilíndricos fijos superior/externos 
        const glassShine = ctx.createLinearGradient(0, 0, w, 0);
        glassShine.addColorStop(0, 'rgba(255,255,255,0)');
        glassShine.addColorStop(0.05, 'rgba(255,255,255,0.02)');
        glassShine.addColorStop(0.12, 'rgba(255,255,255,0.4)'); // Main highlight
        glassShine.addColorStop(0.18, 'rgba(255,255,255,0.05)');
        glassShine.addColorStop(0.85, 'rgba(255,255,255,0)');
        glassShine.addColorStop(0.95, 'rgba(255,255,255,0.15)'); // Small opposite highlight
        glassShine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glassShine;
        ctx.fillRect(0, 0, w, h);

        ctx.restore();
    }
}

// Global instance
window.oxygenManager = new OxygenManager();
