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
     * [ES] Posicionamiento dinámico del contador de CO2 sobre la nave.
     */
    updatePoisonCountdownPos(player, camera) {
        const countdown = document.getElementById('co2-critical-countdown');
        if (!countdown || countdown.classList.contains('hidden')) return;
        const screenPos = camera.worldToScreen(player.x, player.y);
        countdown.style.left = `${screenPos.x}px`;
        countdown.style.top = `${screenPos.y - 120}px`;
        countdown.style.transform = 'translateX(-50%)';
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

            if (bar) {
                bar.style.width = `${s.percentage}%`;
                if (s.percentage <= 25) bar.className = "h-full bg-red-500 shadow-[0_0_8px_#ef4444]";
                else if (s.percentage <= 60) bar.className = "h-full bg-amber-500 shadow-[0_0_8px_#f59e0b]";
                else bar.className = "h-full bg-emerald-500 shadow-[0_0_8px_#10b981]";
            }
            if (val) val.innerText = `${Math.floor(s.percentage)}%`;
            if (dot) {
                if (player.activeScrubberIndex === i) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse";
                else if (s.percentage > 25) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500/40";
                else dot.className = "w-1.5 h-1.5 rounded-full bg-white/10";
            }
        });

        const atmosStatus = document.getElementById('hud-atmos-status');
        if (atmosStatus) {
            if (player.co2 < 40) { atmosStatus.innerText = "ATM: NOMINAL"; atmosStatus.className = "text-[7px] text-emerald-500/60 uppercase font-bold tracking-widest font-mono"; }
            else if (player.co2 < 80) { atmosStatus.innerText = "ATM: WARNING"; atmosStatus.className = "text-[7px] text-amber-500 font-bold uppercase tracking-widest font-mono"; }
            else { atmosStatus.innerText = "ATM: CRITICAL"; atmosStatus.className = "text-[7px] text-red-500 font-bold uppercase tracking-widest font-mono animate-pulse"; }
        }
    }

    updateDepthDisplay(player) {
        const depth = Math.floor(player.y / WORLD.depthScale);
        const depthDisplay = document.getElementById('depth-display');
        if (depthDisplay) depthDisplay.innerText = `${depth.toString().padStart(4, '0')}m`;
        const depthBar = document.getElementById('depth-bar');
        if (depthBar) depthBar.style.width = `${Math.min(100, (player.y / WORLD.height) * 100)}%`;
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
        const battVal = Math.floor(player.lightBattery);
        if (batteryBar) {
            batteryBar.style.width = `${battVal}%`;
            if (battVal < 20) batteryBar.classList.replace('bg-yellow-500', 'bg-red-500');
            else batteryBar.classList.replace('bg-red-500', 'bg-yellow-500');
        }
        if (batteryPercent) {
            batteryPercent.innerText = `${battVal}%`;
            if (battVal < 20) batteryPercent.classList.add('text-red-500', 'animate-pulse');
            else batteryPercent.classList.remove('text-red-500', 'animate-pulse');
        }
        if (batteryLed) {
            if (battVal < 20) { batteryLed.style.background = '#ef4444'; batteryLed.style.boxShadow = '0 0 6px #ef4444'; batteryLed.style.animation = 'pulse-alert 0.4s infinite alternate'; }
            else if (player.lightOn) { batteryLed.style.background = '#eab308'; batteryLed.style.boxShadow = '0 0 6px #eab308'; batteryLed.style.animation = 'none'; }
            else { batteryLed.style.background = 'rgba(255,255,255,0.08)'; batteryLed.style.boxShadow = 'none'; batteryLed.style.animation = 'none'; }
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
            const circumference = 150.8;
            if (player.sonarActive) {
                progressRing.style.strokeDashoffset = 0; statusText.innerText = "PING...";
                statusText.classList.add('text-emerald-400');
                statusDot.className = "w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse";
            } else if (player.sonarCharging) {
                const progress = 1 - (player.sonarCooldown / player.sonarMaxCooldown);
                const offset = circumference * (1 - progress);
                progressRing.style.strokeDashoffset = offset;
                statusText.innerText = `Cargando ${Math.ceil(player.sonarCooldown)}s`;
                statusText.classList.remove('text-emerald-400');
                statusDot.className = "w-1.5 h-1.5 bg-yellow-500 rounded-full";
            } else {
                progressRing.style.strokeDashoffset = 0; statusText.innerText = "READY";
                statusText.classList.remove('text-emerald-400');
                statusDot.className = "w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_#10b981]";
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
            const scanName = document.getElementById('scan-name'); if (scanName) scanName.innerText = scannableTarget.config.nombre;
            const scanGenus = document.getElementById('scan-genus'); if (scanGenus) scanGenus.innerText = scannableTarget.config.cientifico;
            const scanRange = document.getElementById('scan-range'); if (scanRange) scanRange.innerText = `${scannableTarget.config.minProf}m - ${scannableTarget.config.maxProf}m`;
            const scanBehavior = document.getElementById('scan-behavior'); if (scanBehavior) scanBehavior.innerText = scannableTarget.config.esCardumen ? "Cardumen" : "Solitario";
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
        const nearbySpecies = fishCatalog.filter(fish => currentDepth >= (fish.minProf * WORLD.depthScale) && currentDepth <= (fish.maxProf * WORLD.depthScale));
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
