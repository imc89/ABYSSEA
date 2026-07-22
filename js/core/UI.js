/**
 * UI MANAGER
 * [ES] Sistema gestor de la interfaz de usuario (HUD). Actualiza dinámicamente indicadores visuales en el DOM HTML.
 * [EN] User Interface (HUD) management system. Dynamically updates visual indicators in the HTML DOM.
 */

class UIManager {
    constructor() {
        this.currentZoneName = "ZONA EPIPELÁGICA";
        this.frameCount = 0;
        this.isScanModalOpen = false;
        this.activeScanTarget = null;

        // Gestores auxiliares (Decoupled)
        this.macroManager = new MacroManager();
        this.subManager = new SubManagementManager();

        this.dom = {};
        this.throttle = 0;
    }

    init() {
        this.dom = {
            sideMenu: document.getElementById('side-tactical-menu'),
            scrubDropdown: document.getElementById('scrubber-hud-dropdown'),
            vChevron: document.getElementById('v-chevron'),
            atmosStatus: document.getElementById('hud-atmos-status'),
            hudO2Bar: document.getElementById('hud-o2-bar'),
            hudO2Val: document.getElementById('hud-o2-val'),
            hudO2Dot: document.getElementById('hud-o2-dot'),
            hudCo2Bar: document.getElementById('hud-co2-bar'),
            hudCo2Val: document.getElementById('hud-co2-val'),
            hudCo2Dot: document.getElementById('hud-co2-dot'),
            tempCabin: document.getElementById('hud-temp-cabin'),
            humCabin: document.getElementById('hud-hum-cabin'),
            humExt: document.getElementById('hud-hum-ext'),
            tempExt: document.getElementById('hud-temp-ext'),
            depthDisplay: document.getElementById('depth-display'),
            depthBar: document.getElementById('depth-bar'),
            zoneDisplay: document.getElementById('zone-display'),
            batteryBar: document.getElementById('battery-bar'),
            batteryPercent: document.getElementById('battery-percent'),
            batteryLed: document.getElementById('battery-status-led-hud'),
            lightLabel: document.getElementById('hud-light-label'),
            radarLine: document.getElementById('sonar-radar-line'),
            progressRing: document.getElementById('sonar-progress-ring'),
            sonarStatus: document.getElementById('sonar-status'),
            sonarStatusDot: document.getElementById('sonar-status-dot'),
            scannerUI: document.getElementById('scanner-ui'),
            scanningIndicator: document.getElementById('scanning-indicator'),
            scanName: document.getElementById('scan-name'),
            scanGenus: document.getElementById('scan-genus'),
            scanRange: document.getElementById('scan-range'),
            scanBehavior: document.getElementById('scan-behavior'),
            speciesIndicators: document.getElementById('depth-species-indicators'),
            co2Countdown: document.getElementById('co2-critical-countdown'),
            tempCountdown: document.getElementById('temp-critical-countdown')
        };

        this.dom.scrubbers = [];
        for (let i = 0; i < 2; i++) {
            this.dom.scrubbers[i] = {
                bar: document.getElementById(`hud-scrub-bar-${i}`),
                val: document.getElementById(`hud-scrub-val-${i}`),
                dot: document.getElementById(`hud-scrub-dot-${i}`)
            };
        }

        this.dom.tanks = [];
        for (let i = 0; i < 2; i++) {
            this.dom.tanks[i] = {
                bar: document.getElementById(`hud-tank-bar-${i}`),
                val: document.getElementById(`hud-tank-val-${i}`),
                dot: document.getElementById(`hud-tank-dot-${i}`)
            };
        }
    }

    get isDiscoveryModalOpen() {
        return this.macroManager.isOpen;
    }

    get isSubManagementOpen() {
        return this.subManager.isOpen;
    }

    /**
     * [ES] Ciclo de actualización unificado de la interfaz. Principalmente gestiona indicadores dinámicos del HUD.
     */
    update(player, scannableTarget, fishCatalog, nearPOI, camera) {
        if (typeof isMenuOpen !== 'undefined' && isMenuOpen) return;
        if (!this.dom.depthDisplay) this.init();
        this.frameCount++;
        this.throttle++;

        // Actualización HUD principal (algunos throttled para ahorrar CPU)
        this.updateDepthDisplay(player);
        
        if (this.throttle % 2 === 0) {
            this.updateBatteryDisplay(player);
            this.updateEnvironmentalHUD(player);
            this.updateScrubberHUD(player);
        }

        if (this.throttle % 5 === 0) {
            this.updateZoneDisplay(player);
            this.updateScannerDisplay(scannableTarget, nearPOI);
        }

        if (this.throttle % 15 === 0) {
            this.updateDepthSpeciesIndicators(player, fishCatalog);
        }

        this.updateSonarDisplay(player);

        // Actualización de gestores internos
        this.subManager.update(player);

        // Posicionar marcador CO2 crítico
        if (camera) this.updatePoisonCountdownPos(player, camera);
        
        if (this.throttle > 60) this.throttle = 0;
    }

    /**
     * [ES] Posicionamiento dinámico de contadores de emergencia sobre la nave.
     */
    updatePoisonCountdownPos(player, camera) {
        const screenPos = camera.worldToScreen(player.x, player.y);
        const scale = window.scaleRatio || 1;

        let currentOffset = 120 * scale;

        // CO2 / O2 Countdown
        const countdown = this.dom.co2Countdown;
        if (countdown && !countdown.classList.contains('hidden')) {
            countdown.style.left = `${screenPos.x * scale}px`;
            countdown.style.top = `${screenPos.y * scale - currentOffset}px`;
            countdown.style.transform = 'translateX(-50%)';
            currentOffset += 60 * scale; // Stack offset para el siguiente
        }

        // Temperature Countdown
        const tempCountdown = this.dom.tempCountdown;
        if (tempCountdown && !tempCountdown.classList.contains('hidden')) {
            tempCountdown.style.left = `${screenPos.x * scale}px`;
            tempCountdown.style.top = `${screenPos.y * scale - currentOffset}px`;
            tempCountdown.style.transform = 'translateX(-50%)';
        }
    }

    /**
     * [ES] Abre/Cierra ventana de controles internos con animación de menú lateral táctico.
     */
    toggleSubManagement() {
        const isOpen = this.subManager.toggle();
        const sideMenu = this.dom.sideMenu;

        // Gestionar visibilidad global del cursor en el Body
        if (this.subManager.isOpen) {
            document.body.classList.add('cursor-active');
            if (sideMenu) sideMenu.classList.add('active');
            // Activar navegación por teclado entre pestañas
            if (typeof subTabManager !== 'undefined') subTabManager.attachKeyboard();
        } else {
            document.body.classList.remove('cursor-active');
            if (sideMenu) sideMenu.classList.remove('active');
            // Desactivar navegación por teclado al cerrar
            if (typeof subTabManager !== 'undefined') subTabManager.detachKeyboard();
        }
    }

    /**
     * [ES] Toggle del desplegable HUD de filtros inferiores (Tecla V).
     */
    toggleScrubberHUD() {
        const dropdown = this.dom.scrubDropdown;
        const chevron = this.dom.vChevron;
        if (dropdown) {
            const isVisible = dropdown.classList.contains('opacity-100');
            if (isVisible) {
                dropdown.classList.replace('opacity-100', 'opacity-0');
                dropdown.classList.replace('visible', 'invisible');
                dropdown.classList.add('-translate-y-4', 'scale-95', 'pointer-events-none');
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            } else {
                dropdown.classList.replace('opacity-0', 'opacity-100');
                dropdown.classList.replace('invisible', 'visible');
                dropdown.classList.remove('-translate-y-4', 'scale-95', 'pointer-events-none');
                if (chevron) chevron.style.transform = 'rotate(180deg)';
            }
        }
    }

    /**
     * [ES] Sincronización en tiempo real del HUD de los filtros (Saturación y electrolisis).
     */
    updateScrubberHUD(player) {
        player.scrubbers.forEach((s, i) => {
            const d = this.dom.scrubbers[i];
            if (!d) return;

            const rPerc = Math.round(s.percentage * 10) / 10;
            const rPercStr = rPerc.toString();

            if (d.bar && d.bar.dataset.last !== rPercStr) {
                d.bar.style.width = `${rPerc}%`;
                d.bar.dataset.last = rPercStr;
                if (s.percentage <= 25) d.bar.className = "h-full bg-red-500 shadow-[0_0_8px_#ef4444]";
                else if (s.percentage <= 60) d.bar.className = "h-full bg-amber-500 shadow-[0_0_8px_#f59e0b]";
                else d.bar.className = "h-full bg-emerald-500 shadow-[0_0_8px_#10b981]";
            }
            if (d.val && d.val.dataset.last !== rPercStr) {
                d.val.innerText = `${Math.floor(s.percentage)}%`;
                d.val.dataset.last = rPercStr;
            }

            const isActive = player.activeScrubberIndex === i;
            if (d.dot && d.dot.dataset.last !== String(isActive + '_' + rPercStr)) {
                if (isActive) d.dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse";
                else if (s.percentage > 25) d.dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500/40";
                else d.dot.className = "w-1.5 h-1.5 rounded-full bg-white/10";
                d.dot.dataset.last = String(isActive + '_' + rPercStr);
            }
        });

        const atmosStatus = this.dom.atmosStatus;
        if (atmosStatus) {
            const co2Level = player.co2 < 40 ? 0 : (player.co2 < 80 ? 1 : 2);
            if (atmosStatus.dataset.last !== String(co2Level)) {
                if (co2Level === 0) {
                    atmosStatus.innerText = "";
                }
                else if (co2Level === 1) {
                    atmosStatus.innerText = window.i18n ? window.i18n.t("hud_atm_warn") : "ATM: WARNING";
                    atmosStatus.className = "text-[7px] text-amber-500 font-bold uppercase tracking-widest font-mono";
                }
                else {
                    atmosStatus.innerText = window.i18n ? window.i18n.t("hud_atm_crit") : "ATM: CRITICAL";
                    atmosStatus.className = "text-[7px] text-red-500 font-bold uppercase tracking-widest font-mono animate-pulse";
                }
                atmosStatus.dataset.last = String(co2Level);
            }
        }

        // --- Tanques de O₂ en HUD V-dropdown ---
        if (typeof oxygenManager !== 'undefined') {
            oxygenManager.tanks.forEach((tank, i) => {
                const d = this.dom.tanks[i];
                if (!d) return;

                const rTank = Math.round(tank.percentage * 10) / 10;
                const rTankStr = rTank.toString();
                const isActive = oxygenManager.activeTankIndex === i;

                if (d.bar && d.bar.dataset.last !== rTankStr) {
                    d.bar.style.width = `${rTank.toFixed(1)}%`;
                    let cls = 'h-full transition-all duration-500 ';
                    if (tank.percentage <= 0) cls += 'bg-white/10';
                    else if (tank.percentage <= 20) cls += 'bg-red-500 shadow-[0_0_8px_#ef4444]' + (isActive ? ' animate-pulse' : '');
                    else if (tank.percentage <= 50) cls += 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
                    else cls += 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]';
                    d.bar.className = cls;
                    d.bar.dataset.last = rTankStr;
                }
                if (d.val && d.val.dataset.last !== rTankStr + isActive) {
                    d.val.textContent = tank.isRefilling ? (window.i18n ? window.i18n.t("hud_recarging") : 'RECARG...') : `${Math.floor(tank.percentage)}%`;
                    d.val.className = tank.percentage <= 20
                        ? 'text-[10px] text-red-400 font-mono font-bold'
                        : tank.percentage <= 50
                            ? 'text-[10px] text-amber-400 font-mono font-bold'
                            : 'text-[10px] text-cyan-400 font-mono font-bold';
                    d.val.dataset.last = rTankStr + isActive;
                }
                if (d.dot && d.dot.dataset.last !== rTankStr + isActive) {
                    if (tank.percentage <= 0) { d.dot.style.background = 'rgba(255,255,255,0.1)'; d.dot.style.boxShadow = 'none'; }
                    else if (isActive) { d.dot.style.background = '#06b6d4'; d.dot.style.boxShadow = '0 0 8px #06b6d4'; }
                    else if (tank.percentage <= 20) { d.dot.style.background = '#ef4444'; d.dot.style.boxShadow = '0 0 6px #ef4444'; }
                    else if (tank.percentage <= 50) { d.dot.style.background = '#fbbf24'; d.dot.style.boxShadow = '0 0 6px #fbbf24'; }
                    else { d.dot.style.background = '#67e8f9'; d.dot.style.boxShadow = '0 0 4px #67e8f9'; }
                    d.dot.dataset.last = rTankStr + isActive;
                }
            });
        }

        // --- O₂ y CO₂ en HUD V-dropdown ---
        const o2Val = typeof oxygenManager !== 'undefined' ? oxygenManager.cabinOxygen : 21.0;
        const co2Val = player.co2;

        // O₂ Cabina
        const rO2 = Math.round(o2Val * 10) / 10;
        const rO2Str = rO2.toString();
        // Barra proporcional: 21% = 100%, 0% = 0%
        const o2BarW = Math.max(0, Math.min(100, (o2Val / 21.0) * 100));
        if (this.dom.hudO2Bar && this.dom.hudO2Bar.dataset.last !== rO2Str) {
            this.dom.hudO2Bar.style.width = `${o2BarW.toFixed(1)}%`;
            let barCls = 'h-full transition-all duration-500 ';
            if (o2Val < 7.0) barCls += 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse';
            else if (o2Val < 15.0) barCls += 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
            else barCls += 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]';
            this.dom.hudO2Bar.className = barCls;
            this.dom.hudO2Bar.dataset.last = rO2Str;
        }
        if (this.dom.hudO2Val && this.dom.hudO2Val.dataset.last !== rO2Str) {
            this.dom.hudO2Val.textContent = `${rO2.toFixed(1)}%`;
            this.dom.hudO2Val.className = o2Val < 7.0 ? 'text-[10px] text-red-400 font-mono font-bold animate-pulse'
                : o2Val < 15.0 ? 'text-[10px] text-amber-400 font-mono font-bold'
                    : 'text-[10px] text-cyan-400 font-mono font-bold';
            this.dom.hudO2Val.dataset.last = rO2Str;
        }
        if (this.dom.hudO2Dot && this.dom.hudO2Dot.dataset.last !== rO2Str) {
            if (o2Val < 7.0) { this.dom.hudO2Dot.style.background = '#ef4444'; this.dom.hudO2Dot.style.boxShadow = '0 0 6px #ef4444'; }
            else if (o2Val < 15.0) { this.dom.hudO2Dot.style.background = '#fbbf24'; this.dom.hudO2Dot.style.boxShadow = '0 0 6px #fbbf24'; }
            else { this.dom.hudO2Dot.style.background = '#22d3ee'; this.dom.hudO2Dot.style.boxShadow = '0 0 6px #22d3ee'; }
            this.dom.hudO2Dot.dataset.last = rO2Str;
        }

        // CO₂
        const rCo2 = Math.round(co2Val * 10) / 10;
        const rCo2Str = rCo2.toString();
        // Barra: 0% = 0%, 20% (máx) = 100%
        const co2BarW = Math.max(0, Math.min(100, (co2Val / 20.0) * 100));
        if (this.dom.hudCo2Bar && this.dom.hudCo2Bar.dataset.last !== rCo2Str) {
            this.dom.hudCo2Bar.style.width = `${co2BarW.toFixed(1)}%`;
            let barCls = 'h-full transition-all duration-500 ';
            if (co2Val >= 15.0) barCls += 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse';
            else if (co2Val >= 5.0) barCls += 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
            else barCls += 'bg-emerald-400 shadow-[0_0_8px_#34d399]';
            this.dom.hudCo2Bar.className = barCls;
            this.dom.hudCo2Bar.dataset.last = rCo2Str;
        }
        if (this.dom.hudCo2Val && this.dom.hudCo2Val.dataset.last !== rCo2Str) {
            this.dom.hudCo2Val.textContent = `${rCo2.toFixed(1)}%`;
            this.dom.hudCo2Val.className = co2Val >= 15.0 ? 'text-[10px] text-red-400 font-mono font-bold animate-pulse'
                : co2Val >= 5.0 ? 'text-[10px] text-amber-400 font-mono font-bold'
                    : 'text-[10px] text-emerald-400 font-mono font-bold';
            this.dom.hudCo2Val.dataset.last = rCo2Str;
        }
        if (this.dom.hudCo2Dot && this.dom.hudCo2Dot.dataset.last !== rCo2Str) {
            if (co2Val >= 15.0) { this.dom.hudCo2Dot.style.background = '#ef4444'; this.dom.hudCo2Dot.style.boxShadow = '0 0 6px #ef4444'; }
            else if (co2Val >= 5.0) { this.dom.hudCo2Dot.style.background = '#fbbf24'; this.dom.hudCo2Dot.style.boxShadow = '0 0 6px #fbbf24'; }
            else { this.dom.hudCo2Dot.style.background = '#34d399'; this.dom.hudCo2Dot.style.boxShadow = '0 0 6px #34d399'; }
            this.dom.hudCo2Dot.dataset.last = rCo2Str;
        }
    }

    /**
     * [ES] Sincronización de temperatura y humedad en el HUD (Menú V).
     */
    updateEnvironmentalHUD(player) {
        if (typeof temperatureManager === 'undefined') return;

        // Temp Cabina
        const tempCabin = this.dom.tempCabin;
        const tVal = temperatureManager.internalTemp.toFixed(1);
        if (tempCabin && tempCabin.dataset.last !== tVal) {
            tempCabin.textContent = `${tVal}°C`;
            tempCabin.dataset.last = tVal;
            // Alerta visual si la temperatura es crítica
            if (temperatureManager.internalTemp > 35 || temperatureManager.internalTemp < 5) {
                tempCabin.className = "text-[10px] text-red-500 font-mono font-bold animate-pulse";
            } else if (temperatureManager.internalTemp > 28 || temperatureManager.internalTemp < 15) {
                tempCabin.className = "text-[10px] text-orange-400 font-mono font-bold";
            } else {
                tempCabin.className = "text-[10px] text-amber-400 font-mono font-bold";
            }
        }

        // Humedad Cabina
        const humCabin = this.dom.humCabin;
        const hVal = temperatureManager.humidity.toFixed(1);
        if (humCabin && humCabin.dataset.last !== hVal) {
            humCabin.textContent = `${hVal}%`;
            humCabin.dataset.last = hVal;
            if (temperatureManager.humidity > 80 || temperatureManager.humidity < 20) {
                humCabin.className = "text-[10px] text-red-400 font-mono font-bold";
            } else {
                humCabin.className = "text-[10px] text-cyan-400 font-mono font-bold";
            }
        }

        // Humedad Exterior (Fijo al 100% por estar bajo el agua)
        const humExt = this.dom.humExt;
        if (humExt && humExt.dataset.last !== '100') {
            humExt.textContent = "100%";
            humExt.dataset.last = '100';
        }

        // Temperatura Exterior
        const tempExt = this.dom.tempExt;
        if (tempExt) {
            const etVal = temperatureManager.externalTemp.toFixed(1);
            if (tempExt.dataset.last !== etVal) {
                tempExt.textContent = `${etVal}°C`;
                tempExt.dataset.last = etVal;
            }
        }
    }

    updateDepthDisplay(player) {
        const depth = Math.floor(player.y / WORLD.depthScale);
        const depthDisplay = this.dom.depthDisplay;
        if (depthDisplay && depthDisplay.dataset.last !== String(depth)) {
            depthDisplay.innerText = `${depth.toString().padStart(4, '0')}m`;
            depthDisplay.dataset.last = String(depth);
        }

        const depthBar = this.dom.depthBar;
        if (depthBar) {
            const perc = Math.round(Math.min(100, (player.y / WORLD.height) * 100) * 10) / 10;
            if (depthBar.dataset.last !== String(perc)) {
                depthBar.style.width = `${perc}%`;
                depthBar.dataset.last = String(perc);
            }
        }
    }

    updateZoneDisplay(player) {
        const depthMeters = player.y / WORLD.depthScale;
        const currentZone = WORLD.zones.slice().reverse().find(z => depthMeters >= z.depth) || WORLD.zones[0];
        if (this.currentZoneName !== currentZone.name) {
            const zd = this.dom.zoneDisplay;
            if (zd) {
                zd.classList.add('zone-change');
                setTimeout(() => {
                    zd.innerText = window.i18n ? window.i18n.t(currentZone.name) : currentZone.name;
                    zd.classList.remove('zone-change');
                }, 800);
                this.currentZoneName = currentZone.name;
            }
        }
    }

    updateBatteryDisplay(player) {
        const batteryBar = this.dom.batteryBar;
        const batteryPercent = this.dom.batteryPercent;
        const batteryLed = this.dom.batteryLed;

        // [ES] Ahora usamos la Reserva Principal de Energía (Global) de energyManager
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
        const battVal = Math.floor(mainBattery);
        const isLow = battVal < 20;

        if (batteryBar && batteryBar.dataset.last !== String(battVal)) {
            batteryBar.style.width = `${battVal}%`;
            if (isLow) batteryBar.classList.replace('bg-yellow-500', 'bg-red-500');
            else batteryBar.classList.replace('bg-red-500', 'bg-yellow-500');
            batteryBar.dataset.last = String(battVal);
        }

        if (batteryPercent && batteryPercent.dataset.last !== String(battVal)) {
            batteryPercent.innerText = `${battVal}%`;
            if (isLow) batteryPercent.classList.add('text-red-500', 'animate-pulse');
            else batteryPercent.classList.remove('text-red-500', 'animate-pulse');
            batteryPercent.dataset.last = String(battVal);
        }

        if (batteryLed) {
            const ledState = isLow ? "low" : (player.lightOn ? "on" : "off");
            if (batteryLed.dataset.last !== ledState) {
                const lightLabel = this.dom.lightLabel;
                if (isLow) {
                    batteryLed.style.background = '#ef4444';
                    batteryLed.style.boxShadow = '0 0 6px #ef4444';
                    batteryLed.style.animation = 'pulse-alert 0.4s infinite alternate';
                    if (lightLabel) { lightLabel.textContent = window.i18n ? window.i18n.t("hud_batt_low") : 'BAJA'; lightLabel.className = 'text-[8px] font-bold uppercase tracking-widest text-red-400 animate-pulse'; }
                } else if (player.lightOn) {
                    batteryLed.style.background = '#eab308';
                    batteryLed.style.boxShadow = '0 0 8px #eab308';
                    batteryLed.style.animation = 'none';
                    if (lightLabel) { lightLabel.textContent = window.i18n ? window.i18n.t("hud_on") : 'ON'; lightLabel.className = 'text-[8px] font-bold uppercase tracking-widest text-yellow-400'; }
                } else {
                    batteryLed.style.background = 'rgba(255,255,255,0.08)';
                    batteryLed.style.boxShadow = 'none';
                    batteryLed.style.animation = 'none';
                    if (lightLabel) { lightLabel.textContent = window.i18n ? window.i18n.t("hud_off") : 'OFF'; lightLabel.className = 'text-[8px] font-bold uppercase tracking-widest text-white/20'; }
                }
                batteryLed.dataset.last = ledState;
            }
        }
    }

    updateSonarDisplay(player) {
        const radarLine = this.dom.radarLine;
        if (radarLine) {
            const rotSpeed = player.sonarActive ? 12 : 3;
            radarLine.style.transform = `rotate(${this.frameCount * rotSpeed}deg)`;
        }
        const progressRing = this.dom.progressRing;
        const statusText = this.dom.sonarStatus;
        const statusDot = this.dom.sonarStatusDot;
        if (progressRing && statusText && statusDot) {
            const stateHash = `${player.sonarActive}_${player.sonarCharging ? Math.ceil(player.sonarCooldown) : 0}`;
            if (progressRing.dataset.last !== stateHash) {
                const circumference = 150.8;
                if (player.sonarActive) {
                    progressRing.style.strokeDashoffset = 0; statusText.innerText = window.i18n ? window.i18n.t("sonar_ping") : "PING...";
                    statusText.className = "text-[7px] font-bold uppercase tracking-widest font-mono mr-1.5 text-emerald-400";
                    statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse";
                } else if (player.sonarCharging) {
                    const progress = 1 - (player.sonarCooldown / player.sonarMaxCooldown);
                    const offset = circumference * (1 - progress);
                    progressRing.style.strokeDashoffset = offset;
                    statusText.innerText = `${window.i18n ? window.i18n.t("sonar_charging") : "Cargando"} ${Math.ceil(player.sonarCooldown)}s`;
                    statusText.className = "text-[7px] font-bold uppercase tracking-widest font-mono mr-1.5 text-white/50";
                    statusDot.className = "w-1.5 h-1.5 rounded-full bg-yellow-500";
                } else {
                    progressRing.style.strokeDashoffset = 0; statusText.innerText = window.i18n ? window.i18n.t("sonar_ready") : "READY";
                    statusText.className = "text-[7px] font-bold uppercase tracking-widest font-mono mr-1.5 text-white/50";
                    statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]";
                }
                progressRing.dataset.last = stateHash;
            }
        }
    }

    updateScannerDisplay(scannableTarget, nearPOI) {
        const scannerUI = this.dom.scannerUI;
        const indicator = this.dom.scanningIndicator;
        if (nearPOI) {
            if (scannerUI) {
                scannerUI.style.opacity = "1"; scannerUI.style.transform = "translateX(-50%) translateY(0)";
                const hudData = this.macroManager.getHUDData();
                if (this.dom.scanName) this.dom.scanName.innerText = hudData.title;
                if (this.dom.scanGenus) this.dom.scanGenus.innerText = hudData.subtitle;
                if (this.dom.scanRange) this.dom.scanRange.innerText = "---";
                if (this.dom.scanBehavior) this.dom.scanBehavior.innerText = hudData.status;
                if (indicator) { indicator.innerText = hudData.prompt; indicator.style.display = 'block'; }
            }
            return;
        }
        if (scannableTarget && scannerUI) {
            scannerUI.style.opacity = "1"; scannerUI.style.transform = "translateX(-50%) translateY(0)";
            if (indicator) { indicator.innerText = window.i18n ? window.i18n.t("scan_analyze_prompt") : "PULSA [ENTER] ANALIZAR"; indicator.style.display = 'block'; }

            const cfg = scannableTarget.config;
            if (this.dom.scanName) {
                const name = window.i18n ? (window.i18n.t(cfg.nombreKey) || cfg.nombre) : (cfg.nombre || cfg.nombreKey);
                this.dom.scanName.innerText = name;
            }

            if (this.dom.scanGenus) {
                const sciName = window.i18n ? (window.i18n.t(cfg.cientificoKey) || cfg.cientifico) : (cfg.cientifico || cfg.cientificoKey);
                this.dom.scanGenus.innerText = sciName;
            }

            if (this.dom.scanRange) this.dom.scanRange.innerText = `${cfg.minProf}m - ${cfg.maxProf}m`;

            if (this.dom.scanBehavior) this.dom.scanBehavior.innerText = cfg.esCardumen ? (window.i18n ? window.i18n.t("scanner_school") : "Cardumen") : (window.i18n ? window.i18n.t("scanner_solitary") : "Solitario");

        } else if (scannerUI) {
            scannerUI.style.opacity = "0"; scannerUI.style.transform = "translateX(-50%) translateY(-100%)";
            if (indicator) indicator.style.display = 'none';
        }
    }

    toggleScanModal(target = null) {
        if (this.isScanModalOpen) {
            this.isScanModalOpen = false; this.activeScanTarget = null;
            const modal = document.getElementById('scan-modal');
            if (modal) modal.classList.remove('active');
        } else if (target) {
            this.isScanModalOpen = true; this.activeScanTarget = target;
            const modal = document.getElementById('scan-modal');
            const mImg = document.getElementById('modal-scan-img');
            const mName = document.getElementById('modal-scan-name');
            const mSci = document.getElementById('modal-scan-scientific');
            const mDesc = document.getElementById('modal-scan-description');
            const mDepth = document.getElementById('modal-scan-depth');
            const mBehav = document.getElementById('modal-scan-behavior');

            if (mImg) mImg.src = target.config.imagen;
            if (mName) {
                const name = window.i18n ? (window.i18n.t(target.config.nombreKey) || target.config.nombre) : (target.config.nombre || target.config.nombreKey);
                mName.innerText = name;
            }
            if (mSci) {
                const sciName = window.i18n ? (window.i18n.t(target.config.cientificoKey) || target.config.cientifico) : (target.config.cientifico || target.config.cientificoKey);
                mSci.innerText = sciName;
            }
            if (mDesc) {
                const desc = window.i18n ? (window.i18n.t(target.config.descripcionKey) || target.config.descripcion) : (target.config.descripcion || target.config.descripcionKey || "No hay datos descriptivos.");
                mDesc.innerText = desc;
            }
            if (mDepth) mDepth.innerText = `${target.config.minProf}m - ${target.config.maxProf}m`;
            if (mBehav) mBehav.innerText = target.config.esCardumen ? (window.i18n ? window.i18n.t("scanner_school") : "Cardumen") : (window.i18n ? window.i18n.t("scanner_solitary") : "Solitario");
            if (modal) modal.classList.add('active');

            // Backup de registro al abrir el modal (por si falló el avistamiento)
            if (typeof window.addSampleToLab === 'function') {
                window.addSampleToLab(target.config);
            }
        }
        if (typeof window.updateCursorVisibility === 'function') window.updateCursorVisibility();
    }

    toggleDiscoveryModal(specieId = null) {
        this.macroManager.toggle(specieId);
    }

    updateDepthSpeciesIndicators(player, fishCatalog) {
        const currentDepth = player.y;
        const container = this.dom.speciesIndicators;
        if (!container) return;
        const nearbySpecies = fishCatalog.filter(fish => currentDepth >= (fish.minProf * window.WORLD?.depthScale) && currentDepth <= (fish.maxProf * window.WORLD?.depthScale));
        
        // Cache visual para evitar innerHTML innecesario
        const speciesListHash = nearbySpecies.map(f => f.id).join(',');
        if (container.dataset.lastHash === speciesListHash) return;

        if (nearbySpecies.length > 0) {
            container.innerHTML = nearbySpecies.map(fish => `<span class="species-tag">${window.i18n ? (window.i18n.t(fish.nombreKey) || fish.nombre) : fish.nombre}</span>`).join('');
            container.style.opacity = "1";
        } else {
            container.style.opacity = "0.3"; container.innerHTML = `<span class="text-white/30">${window.i18n ? window.i18n.t("scanner_no_species") : "Sin especies"}</span>`;
        }
        container.dataset.lastHash = speciesListHash;
    }

    createSonarUIWaves() {
        const container = document.getElementById('sonar-wave-container');
        if (!container) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const wave = document.createElement('div');
                wave.className = 'ping-effect w-full h-full left-0 top-0 origin-center';
                container.appendChild(wave);
                setTimeout(() => wave.remove(), 2000);
            }, i * 400);
        }
    }
}

if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
