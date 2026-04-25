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
        this.frameCount++;

        // Actualización HUD principal
        this.updateDepthDisplay(player);
        this.updateZoneDisplay(player);
        this.updateBatteryDisplay(player);
        this.updateSonarDisplay(player);
        this.updateScannerDisplay(scannableTarget, nearPOI);
        this.updateDepthSpeciesIndicators(player, fishCatalog);
        this.updateScrubberHUD(player);

        // Actualización de gestores internos
        this.subManager.update(player);

        // Posicionar marcador CO2 crítico
        if (camera) this.updatePoisonCountdownPos(player, camera);
    }

    /**
     * [ES] Posicionamiento dinámico de contadores de emergencia sobre la nave.
     */
    updatePoisonCountdownPos(player, camera) {
        const screenPos = camera.worldToScreen(player.x, player.y);
        
        // CO2 / O2 Countdown
        const countdown = document.getElementById('co2-critical-countdown');
        if (countdown && !countdown.classList.contains('hidden')) {
            countdown.style.left = `${screenPos.x}px`;
            countdown.style.top = `${screenPos.y - 120}px`;
            countdown.style.transform = 'translateX(-50%)';
        }

        // Temperature Countdown
        const tempCountdown = document.getElementById('temp-critical-countdown');
        if (tempCountdown && !tempCountdown.classList.contains('hidden')) {
            tempCountdown.style.left = `${screenPos.x}px`;
            tempCountdown.style.top = `${screenPos.y - 120}px`;
            tempCountdown.style.transform = 'translateX(-50%)';
        }
    }

    /**
     * [ES] Abre/Cierra ventana de controles internos con animación de menú lateral táctico.
     */
    toggleSubManagement() {
        const isOpen = this.subManager.toggle();
        const sideMenu = document.getElementById('side-tactical-menu');

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
        const dropdown = document.getElementById('scrubber-hud-dropdown');
        const chevron = document.getElementById('v-chevron');
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
     * [ES] Sincronización en tiempo real del HUD de los filtros (Saturación y estado).
     */
    updateScrubberHUD(player) {
        player.scrubbers.forEach((s, i) => {
            const bar = document.getElementById(`hud-scrub-bar-${i}`);
            const val = document.getElementById(`hud-scrub-val-${i}`);
            const dot = document.getElementById(`hud-scrub-dot-${i}`);

            const rPerc = Math.round(s.percentage * 10) / 10;
            const rPercStr = rPerc.toString();

            if (bar && bar.dataset.last !== rPercStr) {
                bar.style.width = `${rPerc}%`;
                bar.dataset.last = rPercStr;
                if (s.percentage <= 25) bar.className = "h-full bg-red-500 shadow-[0_0_8px_#ef4444]";
                else if (s.percentage <= 60) bar.className = "h-full bg-amber-500 shadow-[0_0_8px_#f59e0b]";
                else bar.className = "h-full bg-emerald-500 shadow-[0_0_8px_#10b981]";
            }
            if (val && val.dataset.last !== rPercStr) {
                val.innerText = `${Math.floor(s.percentage)}%`;
                val.dataset.last = rPercStr;
            }

            const isActive = player.activeScrubberIndex === i;
            if (dot && dot.dataset.last !== String(isActive + '_' + rPercStr)) {
                if (isActive) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse";
                else if (s.percentage > 25) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500/40";
                else dot.className = "w-1.5 h-1.5 rounded-full bg-white/10";
                dot.dataset.last = String(isActive + '_' + rPercStr);
            }
        });

        const atmosStatus = document.getElementById('hud-atmos-status');
        if (atmosStatus) {
            const co2Level = player.co2 < 40 ? 0 : (player.co2 < 80 ? 1 : 2);
            if (atmosStatus.dataset.last !== String(co2Level)) {
                if (co2Level === 0) { atmosStatus.innerText = "ATM: NOMINAL"; atmosStatus.className = "text-[7px] text-emerald-500/60 uppercase font-bold tracking-widest font-mono"; }
                else if (co2Level === 1) { atmosStatus.innerText = "ATM: WARNING"; atmosStatus.className = "text-[7px] text-amber-500 font-bold uppercase tracking-widest font-mono"; }
                else { atmosStatus.innerText = "ATM: CRITICAL"; atmosStatus.className = "text-[7px] text-red-500 font-bold uppercase tracking-widest font-mono animate-pulse"; }
                atmosStatus.dataset.last = String(co2Level);
            }
        }

        // --- Tanques de O₂ en HUD V-dropdown ---
        if (typeof oxygenManager !== 'undefined') {
            oxygenManager.tanks.forEach((tank, i) => {
                const tankBar = document.getElementById(`hud-tank-bar-${i}`);
                const tankVal = document.getElementById(`hud-tank-val-${i}`);
                const tankDot = document.getElementById(`hud-tank-dot-${i}`);
                const rTank = Math.round(tank.percentage * 10) / 10;
                const rTankStr = rTank.toString();
                const isActive = oxygenManager.activeTankIndex === i;

                if (tankBar && tankBar.dataset.last !== rTankStr) {
                    tankBar.style.width = `${rTank.toFixed(1)}%`;
                    let cls = 'h-full transition-all duration-500 ';
                    if (tank.percentage <= 0) cls += 'bg-white/10';
                    else if (tank.percentage <= 20) cls += 'bg-red-500 shadow-[0_0_8px_#ef4444]' + (isActive ? ' animate-pulse' : '');
                    else if (tank.percentage <= 50) cls += 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
                    else cls += 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]';
                    tankBar.className = cls;
                    tankBar.dataset.last = rTankStr;
                }
                if (tankVal && tankVal.dataset.last !== rTankStr + isActive) {
                    tankVal.textContent = tank.isRefilling ? 'RECARG...' : `${Math.floor(tank.percentage)}%`;
                    tankVal.className = tank.percentage <= 20
                        ? 'text-[10px] text-red-400 font-mono font-bold'
                        : tank.percentage <= 50
                            ? 'text-[10px] text-amber-400 font-mono font-bold'
                            : 'text-[10px] text-cyan-400 font-mono font-bold';
                    tankVal.dataset.last = rTankStr + isActive;
                }
                if (tankDot && tankDot.dataset.last !== rTankStr + isActive) {
                    if (tank.percentage <= 0) { tankDot.style.background = 'rgba(255,255,255,0.1)'; tankDot.style.boxShadow = 'none'; }
                    else if (isActive) { tankDot.style.background = '#06b6d4'; tankDot.style.boxShadow = '0 0 8px #06b6d4'; }
                    else if (tank.percentage <= 20) { tankDot.style.background = '#ef4444'; tankDot.style.boxShadow = '0 0 6px #ef4444'; }
                    else if (tank.percentage <= 50) { tankDot.style.background = '#fbbf24'; tankDot.style.boxShadow = '0 0 6px #fbbf24'; }
                    else { tankDot.style.background = '#67e8f9'; tankDot.style.boxShadow = '0 0 4px #67e8f9'; }
                    tankDot.dataset.last = rTankStr + isActive;
                }
            });
        }

        // --- O₂ y CO₂ en HUD V-dropdown ---
        const o2Val = typeof oxygenManager !== 'undefined' ? oxygenManager.cabinOxygen : 21.0;
        const co2Val = player.co2;

        // O₂ Cabina
        const hudO2Bar = document.getElementById('hud-o2-bar');
        const hudO2Val = document.getElementById('hud-o2-val');
        const hudO2Dot = document.getElementById('hud-o2-dot');
        const rO2 = Math.round(o2Val * 10) / 10;
        const rO2Str = rO2.toString();
        // Barra proporcional: 21% = 100%, 0% = 0%
        const o2BarW = Math.max(0, Math.min(100, (o2Val / 21.0) * 100));
        if (hudO2Bar && hudO2Bar.dataset.last !== rO2Str) {
            hudO2Bar.style.width = `${o2BarW.toFixed(1)}%`;
            let barCls = 'h-full transition-all duration-500 ';
            if (o2Val < 7.0) barCls += 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse';
            else if (o2Val < 15.0) barCls += 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
            else barCls += 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]';
            hudO2Bar.className = barCls;
            hudO2Bar.dataset.last = rO2Str;
        }
        if (hudO2Val && hudO2Val.dataset.last !== rO2Str) {
            hudO2Val.textContent = `${rO2.toFixed(1)}%`;
            hudO2Val.className = o2Val < 7.0 ? 'text-[10px] text-red-400 font-mono font-bold animate-pulse'
                : o2Val < 15.0 ? 'text-[10px] text-amber-400 font-mono font-bold'
                    : 'text-[10px] text-cyan-400 font-mono font-bold';
            hudO2Val.dataset.last = rO2Str;
        }
        if (hudO2Dot && hudO2Dot.dataset.last !== rO2Str) {
            if (o2Val < 7.0) { hudO2Dot.style.background = '#ef4444'; hudO2Dot.style.boxShadow = '0 0 6px #ef4444'; }
            else if (o2Val < 15.0) { hudO2Dot.style.background = '#fbbf24'; hudO2Dot.style.boxShadow = '0 0 6px #fbbf24'; }
            else { hudO2Dot.style.background = '#22d3ee'; hudO2Dot.style.boxShadow = '0 0 6px #22d3ee'; }
            hudO2Dot.dataset.last = rO2Str;
        }

        // CO₂
        const hudCo2Bar = document.getElementById('hud-co2-bar');
        const hudCo2Val = document.getElementById('hud-co2-val');
        const hudCo2Dot = document.getElementById('hud-co2-dot');
        const rCo2 = Math.round(co2Val * 10) / 10;
        const rCo2Str = rCo2.toString();
        // Barra: 0% = 0%, 20% (máx) = 100%
        const co2BarW = Math.max(0, Math.min(100, (co2Val / 20.0) * 100));
        if (hudCo2Bar && hudCo2Bar.dataset.last !== rCo2Str) {
            hudCo2Bar.style.width = `${co2BarW.toFixed(1)}%`;
            let barCls = 'h-full transition-all duration-500 ';
            if (co2Val >= 15.0) barCls += 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse';
            else if (co2Val >= 5.0) barCls += 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
            else barCls += 'bg-emerald-400 shadow-[0_0_8px_#34d399]';
            hudCo2Bar.className = barCls;
            hudCo2Bar.dataset.last = rCo2Str;
        }
        if (hudCo2Val && hudCo2Val.dataset.last !== rCo2Str) {
            hudCo2Val.textContent = `${rCo2.toFixed(1)}%`;
            hudCo2Val.className = co2Val >= 15.0 ? 'text-[10px] text-red-400 font-mono font-bold animate-pulse'
                : co2Val >= 5.0 ? 'text-[10px] text-amber-400 font-mono font-bold'
                    : 'text-[10px] text-emerald-400 font-mono font-bold';
            hudCo2Val.dataset.last = rCo2Str;
        }
        if (hudCo2Dot && hudCo2Dot.dataset.last !== rCo2Str) {
            if (co2Val >= 15.0) { hudCo2Dot.style.background = '#ef4444'; hudCo2Dot.style.boxShadow = '0 0 6px #ef4444'; }
            else if (co2Val >= 5.0) { hudCo2Dot.style.background = '#fbbf24'; hudCo2Dot.style.boxShadow = '0 0 6px #fbbf24'; }
            else { hudCo2Dot.style.background = '#34d399'; hudCo2Dot.style.boxShadow = '0 0 6px #34d399'; }
            hudCo2Dot.dataset.last = rCo2Str;
        }
    }

    updateDepthDisplay(player) {
        const depth = Math.floor(player.y / WORLD.depthScale);
        const depthDisplay = document.getElementById('depth-display');
        if (depthDisplay && depthDisplay.dataset.last !== String(depth)) {
            depthDisplay.innerText = `${depth.toString().padStart(4, '0')}m`;
            depthDisplay.dataset.last = String(depth);
        }

        const depthBar = document.getElementById('depth-bar');
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
        let zone = WORLD.zones[0].name;
        for (let i = WORLD.zones.length - 1; i >= 0; i--) if (depthMeters >= WORLD.zones[i].depth) { zone = WORLD.zones[i].name; break; }
        if (this.currentZoneName !== zone) {
            const zd = document.getElementById('zone-display');
            if (zd) {
                zd.classList.add('zone-change');
                setTimeout(() => { zd.innerText = zone; zd.classList.remove('zone-change'); }, 800);
                this.currentZoneName = zone;
            }
        }
    }

    updateBatteryDisplay(player) {
        const batteryBar = document.getElementById('battery-bar');
        const batteryPercent = document.getElementById('battery-percent');
        const batteryLed = document.getElementById('battery-status-led-hud');

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
                const lightLabel = document.getElementById('hud-light-label');
                if (isLow) {
                    batteryLed.style.background = '#ef4444';
                    batteryLed.style.boxShadow = '0 0 6px #ef4444';
                    batteryLed.style.animation = 'pulse-alert 0.4s infinite alternate';
                    if (lightLabel) { lightLabel.textContent = 'BAJA'; lightLabel.className = 'text-[8px] font-bold uppercase tracking-widest text-red-400 animate-pulse'; }
                } else if (player.lightOn) {
                    batteryLed.style.background = '#eab308';
                    batteryLed.style.boxShadow = '0 0 8px #eab308';
                    batteryLed.style.animation = 'none';
                    if (lightLabel) { lightLabel.textContent = 'ON'; lightLabel.className = 'text-[8px] font-bold uppercase tracking-widest text-yellow-400'; }
                } else {
                    batteryLed.style.background = 'rgba(255,255,255,0.08)';
                    batteryLed.style.boxShadow = 'none';
                    batteryLed.style.animation = 'none';
                    if (lightLabel) { lightLabel.textContent = 'OFF'; lightLabel.className = 'text-[8px] font-bold uppercase tracking-widest text-white/20'; }
                }
                batteryLed.dataset.last = ledState;
            }
        }
    }

    updateSonarDisplay(player) {
        const radarLine = document.getElementById('sonar-radar-line');
        if (radarLine) {
            const rotSpeed = player.sonarActive ? 12 : 3;
            radarLine.style.transform = `rotate(${this.frameCount * rotSpeed}deg)`;
        }
        const progressRing = document.getElementById('sonar-progress-ring');
        const statusText = document.getElementById('sonar-status');
        const statusDot = document.getElementById('sonar-status-dot');
        if (progressRing && statusText && statusDot) {
            const stateHash = `${player.sonarActive}_${player.sonarCharging ? Math.ceil(player.sonarCooldown) : 0}`;
            if (progressRing.dataset.last !== stateHash) {
                const circumference = 150.8;
                if (player.sonarActive) {
                    progressRing.style.strokeDashoffset = 0; statusText.innerText = "PING...";
                    statusText.className = "text-[7px] font-bold uppercase tracking-widest font-mono mr-1.5 text-emerald-400";
                    statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse";
                } else if (player.sonarCharging) {
                    const progress = 1 - (player.sonarCooldown / player.sonarMaxCooldown);
                    const offset = circumference * (1 - progress);
                    progressRing.style.strokeDashoffset = offset;
                    statusText.innerText = `Cargando ${Math.ceil(player.sonarCooldown)}s`;
                    statusText.className = "text-[7px] font-bold uppercase tracking-widest font-mono mr-1.5 text-white/50";
                    statusDot.className = "w-1.5 h-1.5 rounded-full bg-yellow-500";
                } else {
                    progressRing.style.strokeDashoffset = 0; statusText.innerText = "READY";
                    statusText.className = "text-[7px] font-bold uppercase tracking-widest font-mono mr-1.5 text-white/50";
                    statusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]";
                }
                progressRing.dataset.last = stateHash;
            }
        }
    }

    updateScannerDisplay(scannableTarget, nearPOI) {
        const scannerUI = document.getElementById('scanner-ui');
        const indicator = document.getElementById('scanning-indicator');
        if (nearPOI) {
            if (scannerUI) {
                scannerUI.style.opacity = "1"; scannerUI.style.transform = "translateX(0)";
                const hudData = this.macroManager.getHUDData();
                const scanName = document.getElementById('scan-name'); if (scanName) scanName.innerText = hudData.title;
                const scanGenus = document.getElementById('scan-genus'); if (scanGenus) scanGenus.innerText = hudData.subtitle;
                const scanRange = document.getElementById('scan-range'); if (scanRange) scanRange.innerText = "---";
                const scanBehavior = document.getElementById('scan-behavior'); if (scanBehavior) scanBehavior.innerText = hudData.status;
                if (indicator) { indicator.innerText = hudData.prompt; indicator.style.display = 'block'; }
            }
            return;
        }
        if (scannableTarget && scannerUI) {
            scannerUI.style.opacity = "1"; scannerUI.style.transform = "translateX(0)";
            if (indicator) { indicator.innerText = "PULSA [ENTER] ANALIZAR"; indicator.style.display = 'block'; }
            
            const cfg = scannableTarget.config;
            const scanName = document.getElementById('scan-name'); if (scanName) scanName.innerText = cfg.nombre;
            const scanGenus = document.getElementById('scan-genus'); if (scanGenus) scanGenus.innerText = cfg.cientifico;
            const scanRange = document.getElementById('scan-range'); if (scanRange) scanRange.innerText = `${cfg.minProf}m - ${cfg.maxProf}m`;
            const scanBehavior = document.getElementById('scan-behavior'); if (scanBehavior) scanBehavior.innerText = cfg.esCardumen ? "Cardumen" : "Solitario";

        } else if (scannerUI) {
            scannerUI.style.opacity = "0"; scannerUI.style.transform = "translateX(20px)";
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
            if (mName) mName.innerText = target.config.nombre;
            if (mSci) mSci.innerText = target.config.cientifico;
            if (mDesc) mDesc.innerText = target.config.descripcion || "No hay datos descriptivos.";
            if (mDepth) mDepth.innerText = `${target.config.minProf}m - ${target.config.maxProf}m`;
            if (mBehav) mBehav.innerText = target.config.esCardumen ? "Cardumen" : "Solitario";
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
        const indicatorContainer = document.getElementById('depth-species-indicators');
        if (!indicatorContainer) return;
        const nearbySpecies = fishCatalog.filter(fish => currentDepth >= (fish.minProf * window.WORLD?.depthScale) && currentDepth <= (fish.maxProf * window.WORLD?.depthScale));
        if (nearbySpecies.length > 0) {
            indicatorContainer.innerHTML = nearbySpecies.map(fish => `<span class="species-tag">${fish.nombre}</span>`).join('');
            indicatorContainer.style.opacity = "1";
        } else {
            indicatorContainer.style.opacity = "0.3"; indicatorContainer.innerHTML = '<span class="text-white/30">Sin especies</span>';
        }
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
