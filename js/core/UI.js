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

        // Gestor del minijuego Macro (decoupled)
        this.macroManager = new MacroManager();

        // Gestor de Gestión del Submarino
        this.subManager = new SubManagementManager();
    }

    // El getter isDiscoveryModalOpen ahora se maneja directamente viendo el estado de macroManager
    get isDiscoveryModalOpen() {
        return this.macroManager.isOpen;
    }

    get isSubManagementOpen() {
        return this.subManager.isOpen;
    }

    /**
     * [ES] Ciclo de actualización unificado de la interfaz. Coordina la sincronización de datos físicos con elementos visuales en pantalla.
     * [EN] Unified UI update cycle. Coordinates the synchronization of physical data with on-screen visual elements.
     */
    update(player, scannableTarget, fishCatalog, nearPOI, camera) {
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

        // Actualizar mini HUD de filtros (Dropdown V)
        this.updateScrubberHUD(player);

        // Actualizar ventana de gestión interna si está abierta
        this.subManager.update(player);

        // Actualizar posición del contador de veneno si es necesario
        if (camera) {
            this.updatePoisonCountdownPos(player, camera);
        }
    }

    /**
     * [ES] Posiciona el contador de CO2 crítico sobre el submarino.
     */
    updatePoisonCountdownPos(player, camera) {
        const countdown = document.getElementById('co2-critical-countdown');
        if (!countdown || countdown.classList.contains('hidden')) return;

        const screenPos = camera.worldToScreen(player.x, player.y);
        
        // Colocar un poco por encima del centro del submarino
        countdown.style.left = `${screenPos.x}px`;
        countdown.style.top = `${screenPos.y - 120}px`;
        countdown.style.transform = 'translateX(-50%)';
    }

    /**
     * [ES] Abre o cierra la ventana de gestión técnica del submarino.
     * [EN] Opens or closes the submarine's technical management window.
     */
    toggleSubManagement() {
        this.subManager.toggle();
    }

    /**
     * [ES] Abre o cierra el mini-menú desplegable de filtros en el HUD principal.
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
     * [ES] Actualiza en tiempo real los valores de los filtros en el mini desplegable del HUD.
     */
    updateScrubberHUD(player) {
        player.scrubbers.forEach((s, i) => {
            const bar = document.getElementById(`hud-scrub-bar-${i}`);
            const val = document.getElementById(`hud-scrub-val-${i}`);
            const dot = document.getElementById(`hud-scrub-dot-${i}`);

            if (bar) {
                bar.style.width = `${s.percentage}%`;
                // Cambio de color según carga
                if (s.percentage <= 25) {
                    bar.className = "h-full bg-red-500 shadow-[0_0_8px_#ef4444] transition-all duration-300";
                } else if (s.percentage <= 60) {
                    bar.className = "h-full bg-amber-500 shadow-[0_0_8px_#f59e0b] transition-all duration-300";
                } else {
                    bar.className = "h-full bg-emerald-500 shadow-[0_0_8px_#10b981] transition-all duration-300";
                }
            }

            if (val) {
                val.innerText = `${Math.floor(s.percentage)}%`;
                // Resaltar el activo
                if (player.activeScrubberIndex === i) {
                    val.classList.remove('text-white/20');
                    val.classList.add('text-emerald-400');
                } else {
                    val.classList.add('text-white/20');
                    val.classList.remove('text-emerald-400');
                }
            }

            if (dot) {
                if (player.activeScrubberIndex === i) {
                    dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse";
                } else {
                    dot.className = "w-1.5 h-1.5 rounded-full bg-white/10";
                }
            }
        });

        // Estatus de atmosfera en el mini HUD
        const atmosStatus = document.getElementById('hud-atmos-status');
        if (atmosStatus) {
            if (player.co2 < 40) {
                atmosStatus.innerText = "ATM: NOMINAL";
                atmosStatus.className = "text-[7px] text-emerald-500/60 uppercase font-bold tracking-widest font-mono";
            } else if (player.co2 < 80) {
                atmosStatus.innerText = "ATM: WARNING";
                atmosStatus.className = "text-[7px] text-amber-500 font-bold uppercase tracking-widest font-mono";
            } else {
                atmosStatus.innerText = "ATM: CRITICAL";
                atmosStatus.className = "text-[7px] text-red-500 font-bold uppercase tracking-widest font-mono animate-pulse";
            }
        }
    }

    /**
     * [ES] Actualiza el contador de profundidad numérico y la barra lateral de progreso de la inmersión.
     * [EN] Updates the numeric depth counter and the vertical dive progress sidebar.
     */
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

    /**
     * [ES] Evalúa la profundidad actual para determinar y mostrar el nombre científico de la zona pelágica vigente (ej. Abisopelágica).
     * [EN] Evaluates the current depth to determine and display the scientific name of the active pelagic zone (e.g., Abyssopelagic).
     */
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

    /**
     * [ES] Sincroniza el nivel de batería interna del submarino con la barra visual de energía.
     * [EN] Synchronizes the internal battery level of the submarine with the visual energy bar.
     */
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

    /**
     * [ES] Anima el anillo de recarga del sónar, su radar, y cambia los estados de texto y colores (Listo, Cargando, Escaneando).
     * [EN] Animates the sonar recharge ring, its radar, and changes text status and colors (Ready, Loading, Scanning).
     */
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

    /**
     * [ES] Controla el panel lateral del escáner bioluminiscente, mostrando detalles preliminares si hay especies analizables cerca.
     * [EN] Controls the bioluminescent scanner side panel, showing preliminary details if scannable species are nearby.
     */
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

    /**
     * [ES] Abre o cierra el modal a pantalla completa con la tarjeta de información detallada tras un escaneo.
     * [EN] Opens or closes the full-screen modal with detailed information card after a scan.
     */
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

        if (typeof window.updateCursorVisibility === 'function') {
            window.updateCursorVisibility();
        }
    }

    /**
     * [ES] Delega la apertura/cierre del modal interactivo a micro-escala al MacroManager.
     * [EN] Delegates the opening/closing of the interactive micro-scale modal to the MacroManager.
     */
    toggleDiscoveryModal(specieId = null) {
        this.macroManager.toggle(specieId);
    }




    /**
     * [ES] Filtra y muestra los nombres de especies marinas nativas de la franja de profundidad actual.
     * [EN] Filters and displays the names of marine species native to the current depth bracket.
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

    /**
     * [ES] Instancia elementos DOM temporales para simular el efecto de eco visual al usar el sónar.
     * [EN] Instantiates temporary DOM elements to simulate the visual echo effect when using the sonar.
     */
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
