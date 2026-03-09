/**
 * UI - Sistema de actualización de interfaz
 */

class UIManager {
    constructor() {
        this.currentZoneName = "ZONA EPIPELÁGICA";
        this.frameCount = 0;
        this.isScanModalOpen = false;
        this.activeScanTarget = null;

        // Gestor del minijuego Macro (decoupled)
        this.macroManager = new MacroManager();
    }

    // El getter isDiscoveryModalOpen ahora se maneja directamente viendo el estado de macroManager
    get isDiscoveryModalOpen() {
        return this.macroManager.isOpen;
    }

    update(player, scannableTarget, fishCatalog, nearPOI) {
        this.frameCount++;

        // Actualizar telemetría de profundidad
        this.updateDepthDisplay(player);

        // Actualizar zona
        this.updateZoneDisplay(player);

        // Actualizar batería
        this.updateBatteryDisplay(player);

        // Actualizar sónar
        this.updateSonarDisplay(player);

        // Actualizar scanner de objetivos
        this.updateScannerDisplay(scannableTarget, nearPOI);

        // Actualizar indicadores de especies por profundidad
        this.updateDepthSpeciesIndicators(player, fishCatalog);
    }

    updateDepthDisplay(player) {
        const depth = Math.floor(player.y / WORLD.depthScale);
        const depthDisplay = document.getElementById('depth-display');
        if (depthDisplay) {
            depthDisplay.innerText = `${depth.toString().padStart(4, '0')}m`;
        }

        const depthBar = document.getElementById('depth-bar');
        if (depthBar) {
            depthBar.style.width = `${Math.min(100, (player.y / WORLD.height) * 100)}%`;
        }
    }

    updateZoneDisplay(player) {
        const depthMeters = player.y / WORLD.depthScale;
        let zone = WORLD.zones[0].name;

        // Buscar la zona actual recorriendo el array de constantes
        for (let i = WORLD.zones.length - 1; i >= 0; i--) {
            if (depthMeters >= WORLD.zones[i].depth) {
                zone = WORLD.zones[i].name;
                break;
            }
        }

        if (this.currentZoneName !== zone) {
            const zd = document.getElementById('zone-display');
            if (zd) {
                zd.classList.add('zone-change');
                setTimeout(() => {
                    zd.innerText = zone;
                    zd.classList.remove('zone-change');
                }, 800);
                this.currentZoneName = zone;
            }
        }
    }

    updateBatteryDisplay(player) {
        const batteryBar = document.getElementById('battery-bar');
        if (batteryBar) {
            batteryBar.style.width = `${player.lightBattery}%`;
        }

        const batteryPercent = document.getElementById('battery-percent');
        if (batteryPercent) {
            batteryPercent.innerText = `${Math.floor(player.lightBattery)}%`;
        }
    }

    updateSonarDisplay(player) {
        const radarLine = document.getElementById('sonar-radar-line');
        if (radarLine) {
            // Rotación constante, pero más rápida si el sonar está expandiéndose pulsado
            const rotSpeed = player.sonarActive ? 12 : 3;
            radarLine.style.transform = `rotate(${this.frameCount * rotSpeed}deg)`;
        }

        const progressRing = document.getElementById('sonar-progress-ring');
        const statusText = document.getElementById('sonar-status');
        const statusDot = document.getElementById('sonar-status-dot');

        if (progressRing && statusText && statusDot) {
            const circumference = 150.8; // 2 * PI * 24

            if (player.sonarActive) {
                // Durante la expansión, el anillo está lleno o vaciándose
                progressRing.style.strokeDashoffset = 0;
                statusText.innerText = "PING...";
                statusText.classList.add('text-emerald-400');
                statusDot.className = "w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse";
            } else if (player.sonarCharging) {
                // Durante la recarga (10s), el anillo se va llenando
                const progress = 1 - (player.sonarCooldown / player.sonarMaxCooldown);
                const offset = circumference * (1 - progress);
                progressRing.style.strokeDashoffset = offset;

                statusText.innerText = `Cargando ${Math.ceil(player.sonarCooldown)}s`;
                statusText.classList.remove('text-emerald-400');
                statusDot.className = "w-1.5 h-1.5 bg-yellow-500 rounded-full";
            } else {
                // Listo para usar
                progressRing.style.strokeDashoffset = 0;
                statusText.innerText = "READY";
                statusText.classList.remove('text-emerald-400');
                statusDot.className = "w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_#10b981]";
            }
        }
    }

    updateScannerDisplay(scannableTarget, nearPOI) {
        const scannerUI = document.getElementById('scanner-ui');
        const indicator = document.getElementById('scanning-indicator');

        if (nearPOI) {
            // Caso especial: Punto de Descubrimiento (Zoom)
            if (scannerUI) {
                scannerUI.style.opacity = "1";
                scannerUI.style.transform = "translateX(0)";

                const hudData = this.macroManager.getHUDData();

                const scanName = document.getElementById('scan-name');
                if (scanName) scanName.innerText = hudData.title;

                const scanGenus = document.getElementById('scan-genus');
                if (scanGenus) scanGenus.innerText = hudData.subtitle;

                const scanRange = document.getElementById('scan-range');
                if (scanRange) scanRange.innerText = "---";

                const scanBehavior = document.getElementById('scan-behavior');
                if (scanBehavior) scanBehavior.innerText = hudData.status;

                if (indicator) {
                    indicator.innerText = hudData.prompt;
                    indicator.style.display = 'block';
                }
            }
            return;
        }

        if (scannableTarget && scannerUI) {
            scannerUI.style.opacity = "1";
            scannerUI.style.transform = "translateX(0)";
            if (indicator) {
                indicator.innerText = "PULSA [ENTER] ANALIZAR";
                indicator.style.display = 'block';
            }

            const scanName = document.getElementById('scan-name');
            if (scanName) {
                scanName.innerText = scannableTarget.config.nombre;
            }

            const scanGenus = document.getElementById('scan-genus');
            if (scanGenus) {
                scanGenus.innerText = scannableTarget.config.cientifico;
            }

            const scanRange = document.getElementById('scan-range');
            if (scanRange) {
                // Config values are already in meters, display directly
                scanRange.innerText = `${scannableTarget.config.minProf}m - ${scannableTarget.config.maxProf}m`;
            }

            const scanBehavior = document.getElementById('scan-behavior');
            if (scanBehavior) {
                scanBehavior.innerText = scannableTarget.config.esCardumen ? "Cardumen" : "Solitario";
            }
        } else if (scannerUI) {
            scannerUI.style.opacity = "0";
            scannerUI.style.transform = "translateX(20px)";
            if (indicator) indicator.style.display = 'none';
        }
    }

    toggleScanModal(target = null) {
        if (this.isScanModalOpen) {
            // Cerrar
            this.isScanModalOpen = false;
            this.activeScanTarget = null;
            const modal = document.getElementById('scan-modal');
            if (modal) modal.classList.remove('active');
        } else if (target) {
            // Abrir con datos
            this.isScanModalOpen = true;
            this.activeScanTarget = target;

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
            if (mDesc) mDesc.innerText = target.config.descripcion || "No hay datos descriptivos disponibles para este espécimen en la base de datos central.";
            if (mDepth) mDepth.innerText = `${target.config.minProf}m - ${target.config.maxProf}m`;
            if (mBehav) mBehav.innerText = target.config.esCardumen ? "Comportamiento Grupal" : "Comportamiento Solitario";

            if (modal) modal.classList.add('active');
        }
    }

    toggleDiscoveryModal(specieId = null) {
        this.macroManager.toggle(specieId);
    }




    /**
     * NUEVA FUNCIÓN: Muestra qué especies se pueden encontrar a la profundidad actual
     */
    updateDepthSpeciesIndicators(player, fishCatalog) {
        const currentDepth = player.y;
        const indicatorContainer = document.getElementById('depth-species-indicators');

        if (!indicatorContainer) return;

        // Encontrar especies en el rango actual
        // currentDepth is in game units, config is in meters, so convert
        const nearbySpecies = fishCatalog.filter(fish =>
            currentDepth >= (fish.minProf * WORLD.depthScale) && currentDepth <= (fish.maxProf * WORLD.depthScale)
        );

        if (nearbySpecies.length > 0) {
            indicatorContainer.innerHTML = nearbySpecies
                .map(fish => `<span class="species-tag">${fish.nombre}</span>`)
                .join('');
            indicatorContainer.style.opacity = "1";
        } else {
            indicatorContainer.style.opacity = "0.3";
            indicatorContainer.innerHTML = '<span class="text-white/30">Sin especies en esta zona</span>';
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

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
