/**
 * SUB TAB MANAGER
 * [ES] Gestiona la navegación entre paneles del modal de gestión interna.
 *      Soporta navegación por click, teclas W/S y flechas arriba/abajo.
 * [EN] Manages panel navigation within the internal management modal.
 *      Supports click, W/S keys and up/down arrow navigation.
 */

class SubTabManager {
    constructor() {
        this.tabs = ['energia', 'temperatura', 'caudal', 'scrubbers', 'muestras'];

        this.panelTitles = {
            energia: 'Sistema de Energía',
            temperatura: 'Monitor Térmico',
            caudal: 'Caudalímetro de Flujo',
            scrubbers: 'Scrubbers CO₂',
            muestras: 'Laboratorio de Muestras'
        };

        this.currentIndex = 0; // Energía activo por defecto
        this._keyHandler = this._onKey.bind(this);
        this._keyHandlerAttached = false;
    }

    /** Devuelve el ID de la pestaña actualmente activa */
    get currentTab() {
        return this.tabs[this.currentIndex];
    }

    /**
     * Selecciona una pestaña por ID.
     * @param {string} tabId - ID de la pestaña (ej. 'energia')
     */
    selectTab(tabId) {
        const idx = this.tabs.indexOf(tabId);
        if (idx === -1) return;
        this.currentIndex = idx;
        this._applySelection();
    }

    /**
     * Mueve la selección hacia arriba (índice menor).
     * Si está en el inicio, salta al final (circular).
     */
    moveUp() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            this.currentIndex = this.tabs.length - 1; // Salto de Energía a Muestras
        }
        this._applySelection();
    }

    /**
     * Mueve la selección hacia abajo (índice mayor).
     * Si está en el final, salta al inicio (circular).
     */
    moveDown() {
        if (this.currentIndex < this.tabs.length - 1) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0; // Salto de Muestras a Energía
        }
        this._applySelection();
    }

    /**
     * Aplica el estado visual activo a la pestaña y panel correctos.
     * @private
     */
    _applySelection() {
        const tabId = this.tabs[this.currentIndex];

        // 1. Actualizar items del menú lateral
        document.querySelectorAll('.side-nav-item[data-tab]').forEach(el => {
            const isActive = el.dataset.tab === tabId;
            el.classList.toggle('side-nav-item-active', isActive);
        });

        // 2. Mostrar/ocultar paneles del modal
        this.tabs.forEach(id => {
            const panel = document.getElementById(`panel-${id}`);
            if (panel) panel.classList.toggle('active', id === tabId);
        });

        // 3. Actualizar título del header del modal
        const titleEl = document.getElementById('mgmt-panel-title');
        if (titleEl) {
            titleEl.style.opacity = '0';
            titleEl.style.transform = 'translateY(-4px)';
            titleEl.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
            setTimeout(() => {
                titleEl.textContent = this.panelTitles[tabId] || tabId;
                titleEl.style.opacity = '1';
                titleEl.style.transform = 'translateY(0)';
            }, 120);
        }

        // 4. Notificar a los managers específicos si su pestaña está activa
        if (typeof energyManager !== 'undefined') {
            energyManager.isOpen = (tabId === 'energia');
            if (energyManager.isOpen) energyManager.forceUIDraw();
        }
    }

    /**
     * Handler de teclado — sólo activo mientras el modal está abierto.
     * @private
     */
    _onKey(e) {
        // Solo actuar si el modal de gestión está visible
        const modal = document.getElementById('sub-management-modal');
        if (!modal || !modal.classList.contains('active')) return;

        // Allow navigation keys (W/S/Arrows) even if focus is on a checkbox/switch.
        // We only block if the user is typing in a text-like input.
        const isTextInput = ['TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
            (e.target.tagName === 'INPUT' && !['checkbox', 'radio'].includes(e.target.type));
        if (isTextInput) return;

        switch (e.key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                e.preventDefault();
                this.moveUp();
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                e.preventDefault();
                this.moveDown();
                break;
        }
    }

    /**
     * Activa el listener de teclado (llamar cuando se abre el modal).
     */
    attachKeyboard() {
        if (!this._keyHandlerAttached) {
            window.addEventListener('keydown', this._keyHandler);
            this._keyHandlerAttached = true;
        }
    }

    /**
     * Desactiva el listener de teclado (llamar cuando se cierra el modal).
     */
    detachKeyboard() {
        if (this._keyHandlerAttached) {
            window.removeEventListener('keydown', this._keyHandler);
            this._keyHandlerAttached = false;
        }
    }
}

// Instancia global
if (typeof window !== 'undefined') {
    window.SubTabManager = SubTabManager;
    window.subTabManager = new SubTabManager();

    // Inicializar desde localStorage si existe
    const storedSamples = localStorage.getItem('abyss_scanned_samples');
    window.ScannedSamples = storedSamples ? JSON.parse(storedSamples) : [];

    // Inicializar Puntos de Análisis
    window.AnalysisPoints = parseInt(localStorage.getItem('abyss_analysis_points')) || 0;

    // Función para añadir una muestra descubierta al inventario
    window.addSampleToLab = function (macroData) {
        // En UI.js usamos id normal o specieId
        const incomingId = macroData.id || macroData.specieId;

        if (!window.ScannedSamples.find(s => s.id === incomingId)) {
            // Guardar infinito o los últimos 6, la UI mostrará los primeros 6 o los últimos 6
            // Mostraremos siempre los últimos 6 (los más recientes)
            window.ScannedSamples.push({
                id: incomingId,
                nombre: macroData.nombre || `SAMPLE ${window.ScannedSamples.length + 1}`,
                imagen: macroData.imagen,
                depth: macroData.minProf ? `-${macroData.minProf}M` : (macroData.depth ? `-${macroData.depth}M` : "-340M"), // Profundidad real
                pointsYield: macroData.points || Math.floor(15 + Math.random() * 35),
                status: "ESTABLE",
                timestamp: Date.now()
            });

            // Guardar local storage
            localStorage.setItem('abyss_scanned_samples', JSON.stringify(window.ScannedSamples));

            window.updateSamplesUI();
        }
    };

    // Función para generar o actualizar el UI dinámico de las muestras
    window.updateSamplesUI = function () {
        const container = document.getElementById('muestras-grid-container');
        if (!container) return;

        let html = '';

        // Coger las 6 muestras más recientes (sacadas del final o el principio)
        // Usaremos las 6 últimas descubiertas
        const recentSamples = window.ScannedSamples.slice(-6);

        for (let i = 0; i < 6; i++) {
            const sample = recentSamples[i];
            const sampleNum = String(i + 1).padStart(3, '0');

            if (sample) {
                // Formatting date for card
                const date = new Date(sample.timestamp || Date.now());
                const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const isSyn = sample.status === "ANALIZADO";
                // Compatibilidad hacia atrás
                const depthStr = sample.depth || "---";
                const pointsStr = sample.pointsYield || Math.floor(15 + Math.random() * 35);

                // Slot lleno con la especie escaneada
                html += `
                <div class="bg-[#050a10]/80 rounded-xl border ${isSyn ? 'border-cyan-900/30' : 'border-white/5'} p-3 flex gap-4 items-center hover:bg-cyan-900/10 hover:border-cyan-500/20 transition-all group overflow-hidden relative">
                    
                    ${isSyn ? '<div class="absolute inset-0 bg-[url(\\\'img/controls/dark.jpg\\\')] mix-blend-screen opacity-30 z-0"></div><div class="absolute inset-0 bg-cyan-900/5 z-0 border border-cyan-500/30 rounded-xl"></div>' : ''}

                    <div class="tank-body flex flex-col drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] z-10" style="width: 70px; height: 100px; padding: 4px; box-shadow: none;">
                        <div class="tank-metal-cap tank-metal-cap-top" style="height: 12px; ${isSyn ? 'filter: hue-rotate(180deg);' : ''}"></div>
                        <div class="tank-glass flex items-center justify-center relative bg-gradient-to-t ${isSyn ? 'from-cyan-900/10' : 'from-cyan-900/40'} to-transparent border-x border-[#111]">
                            <div class="absolute inset-0 ${isSyn ? 'bg-cyan-500/5' : 'bg-blue-500/10'} mix-blend-color"></div>
                            <img src="${sample.imagen}" onerror="this.style.display='none'" alt="Sample" class="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] group-hover:scale-110 transition-transform duration-500 ${isSyn ? 'opacity-80' : ''}">
                            ${isSyn ? '<div class="absolute inset-0 bg-cyan-500/10 animate-pulse pointer-events-none"></div>' : ''}
                        </div>
                        <div class="tank-metal-cap tank-metal-cap-bottom" style="height: 12px; ${isSyn ? 'filter: hue-rotate(180deg);' : ''}"></div>
                    </div>
                    <div class="flex flex-col flex-1 pb-1 z-10 h-full">
                        <h4 class="${isSyn ? 'text-white/80' : 'text-white'} text-[11px] font-bold tracking-widest uppercase mb-0.5" style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">${sample.nombre}</h4>
                        <span class="text-[7px] text-white/40 tracking-[0.2em] mb-1">CAPTURA: ${timeStr} HRS</span>
                        <div class="w-full h-px bg-white/10 mb-1"></div>
                        
                        <div class="flex justify-between items-center text-[7px] tracking-widest text-white/60 mb-1">
                            <span>PROFUNDIDAD</span>
                            <span class="font-bold text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">${depthStr}</span>
                        </div>
                        <div class="flex justify-between items-center text-[7px] tracking-widest text-white/60 mb-2">
                            <span>RENDIMIENTO</span>
                            <span class="font-bold ${isSyn ? 'text-cyan-500/50' : 'text-emerald-400 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]'}">+${pointsStr} PTS</span>
                        </div>

                        ${isSyn ? `
                            <div class="flex flex-col gap-1 w-full mt-auto">
                                <div class="w-full text-center py-1 bg-cyan-900/40 border border-cyan-500/40 rounded text-[7px] text-cyan-400 font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                    DATOS EXTRAÍDOS
                                </div>
                                <button onclick="window.viewSampleInfo('${sample.id}')" class="w-full py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[6px] tracking-widest transition-all hover:shadow-[0_0_4px_white]">
                                    INFO DE LA ESPECIE
                                </button>
                            </div>
                        ` : `
                            <div class="flex gap-1 w-full mt-auto">
                                <button onclick="window.viewSampleInfo('${sample.id}')" class="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[6px] tracking-widest transition-all hover:shadow-[0_0_4px_white]">
                                    INFO
                                </button>
                                <button onclick="window.processSample('${sample.id}')" class="flex-[2] py-1 rounded bg-cyan-900/30 hover:bg-cyan-400 hover:text-black hover:drop-shadow-[0_0_8px_cyan] border border-cyan-500/30 text-cyan-400 font-bold text-[6px] tracking-widest transition-all">
                                    ANALIZAR
                                </button>
                            </div>
                        `}
                    </div>
                </div>`;
            } else {
                // Slot vacío
                html += `
                <div class="bg-[#050a10]/40 rounded-xl border border-white/5 p-3 flex gap-4 items-center transition-all group opacity-50 grayscale">
                    <div class="tank-body flex flex-col drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" style="width: 70px; height: 100px; padding: 4px; box-shadow: none;">
                        <div class="tank-metal-cap tank-metal-cap-top" style="height: 12px;"></div>
                        <div class="tank-glass flex items-center justify-center relative bg-gradient-to-t from-gray-900/40 to-transparent border-x border-[#111]">
                            <div class="absolute inset-0 bg-blue-500/5 mix-blend-color"></div>
                        </div>
                        <div class="tank-metal-cap tank-metal-cap-bottom" style="height: 12px;"></div>
                    </div>
                    <div class="flex flex-col flex-1 pb-1">
                        <h4 class="text-white/50 text-[11px] font-bold tracking-widest uppercase mb-0.5">SLOT ${sampleNum}</h4>
                        <span class="text-[7px] text-white/40 tracking-[0.2em] mb-1">ESPERANDO MUESTRA</span>
                        <div class="w-full h-px bg-white/10 mb-1"></div>
                        <div class="flex justify-between items-center text-[7px] tracking-widest text-white/60 mb-2">
                            <span>PROFUNDIDAD</span>
                            <span class="font-bold text-white/40">--</span>
                        </div>
                        <div class="w-full py-1 mt-auto rounded bg-white/5 border border-white/10 text-white/20 font-bold text-[7px] tracking-widest text-center">
                            DESCONECTADO
                        </div>
                    </div>
                </div>`;
            }
        }

        container.innerHTML = html;

        // Actualizar UI Puntos
        const pointsCounter = document.getElementById('biomass-counter');
        if (pointsCounter) {
            pointsCounter.innerText = parseInt(window.AnalysisPoints) || 0;
        }
    };

    window.isSequencing = false;

    // Funciones globales para botones
    window.processSample = function (id) {
        if (window.isSequencing) return;

        const sample = window.ScannedSamples.find(s => s.id === id || String(s.id) === String(id));
        if (!sample || sample.status === "ANALIZADO") return;

        window.isSequencing = true;

        // --- 1. ACTIVAR ANIMACIÓN ---
        const seqAnim = document.getElementById('dna-sequencer-animation');
        const seqStatus = document.getElementById('sequencer-status');
        const seqProgCont = document.getElementById('sequencer-progress-container');
        const seqProgBar = document.getElementById('sequencer-progress-bar');

        if (seqAnim) {
            seqAnim.classList.remove('sequencer-idle', 'grayscale', 'opacity-30');
            const laser = seqAnim.querySelector('.laser');
            if (laser) laser.classList.remove('hidden');
        }

        if (seqStatus) {
            seqStatus.innerText = "ANALIZANDO: " + (sample.nombre || "MUESTRA DESCONOCIDA").substring(0, 10).toUpperCase();
            seqStatus.classList.add('text-cyan-400', 'animate-pulse');
        }

        if (seqProgCont && seqProgBar) {
            seqProgCont.classList.remove('opacity-0');
            seqProgBar.style.transitionDuration = '0ms';
            seqProgBar.style.width = '0%';

            // Force reflow
            void seqProgBar.offsetWidth;

            seqProgBar.style.transitionDuration = '3000ms';
            seqProgBar.style.width = '100%';
        }

        // --- 2. ESPERAR Y COMPLETAR ---
        setTimeout(() => {
            // Calcular puntos y asegurar suma numérica pura
            const currentPoints = parseInt(window.AnalysisPoints) || 0;
            const pointsYield = parseInt(sample.pointsYield) || Math.floor(15 + Math.random() * 35);

            window.AnalysisPoints = currentPoints + pointsYield;
            localStorage.setItem('abyss_analysis_points', window.AnalysisPoints);

            sample.status = "ANALIZADO";
            localStorage.setItem('abyss_scanned_samples', JSON.stringify(window.ScannedSamples));

            window.updateSamplesUI();

            // Reset UI
            if (seqAnim) {
                seqAnim.classList.add('sequencer-idle', 'grayscale', 'opacity-30');
                const laser = seqAnim.querySelector('.laser');
                if (laser) laser.classList.add('hidden');
            }
            if (seqStatus) {
                seqStatus.innerText = "EN ESPERA";
                seqStatus.classList.remove('text-cyan-400', 'animate-pulse');
            }
            if (seqProgCont && seqProgBar) {
                seqProgCont.classList.add('opacity-0');
                seqProgBar.style.transitionDuration = '0ms';
                seqProgBar.style.width = '0%';
            }

            window.isSequencing = false;
        }, 3000);
    };

    window.viewSampleInfo = function (id) {
        const sample = window.ScannedSamples.find(s => String(s.id) === String(id));
        if (!sample) return;

        let fullData = null;
        if (typeof window.FISH_CATALOG !== 'undefined') {
            fullData = window.FISH_CATALOG.find(f => String(f.specieId) === String(id) || String(f.id) === String(id));
        }
        if (!fullData && typeof window.macroDefinitions !== 'undefined') {
            const key = Object.keys(window.macroDefinitions).find(k => String(window.macroDefinitions[k].id) === String(id) || String(window.macroDefinitions[k].specieId) === String(id));
            if (key) fullData = window.macroDefinitions[key];
        }

        const infoHtml = `
            <div class="bg-[#050a10]/95 border border-cyan-500/30 p-8 rounded-xl max-w-2xl w-full flex flex-col gap-6 drop-shadow-[0_0_20px_rgba(6,182,212,0.2)] relative animate-in fade-in zoom-in duration-300">
                <button onclick="document.getElementById('muestras-info-overlay').classList.add('hidden')" class="absolute top-4 right-4 text-white/50 hover:text-white text-xl border border-white/10 hover:border-white/30 rounded px-3 py-1 bg-white/5 transition-all">X</button>
                <div class="flex items-start gap-6 border-b border-white/5 pb-6">
                    <img src="${sample.imagen}" class="w-40 h-40 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] bg-cyan-900/10 rounded-xl p-4 border border-white/5" onerror="this.style.display='none'" />
                    <div class="flex flex-col gap-2 flex-1 pt-2">
                        <h2 class="text-3xl font-bold tracking-wider text-cyan-400 capitalize drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">${sample.nombre}</h2>
                        <span class="text-xs tracking-[0.3em] font-bold text-white/40 uppercase font-mono">${fullData ? (fullData.cientifico || fullData.scientific || fullData.nombre) : 'SPECIMEN_0xUNKNOWN'}</span>
                        <div class="flex gap-2 text-[10px] mt-4 font-mono text-white/60">
                            <span class="bg-white/5 px-2 py-1 rounded">RANGO: ${fullData && fullData.minProf ? (fullData.minProf + 'm - ' + fullData.maxProf + 'm') : (sample.depth || 'Desconocido')}</span>
                            <span class="bg-white/5 px-2 py-1 rounded border ${sample.status === 'ANALIZADO' ? 'border-emerald-500/30 text-emerald-400' : 'border-cyan-500/30 text-cyan-400'}">${sample.status === 'ANALIZADO' ? 'GENOMA EXTRAÍDO' : 'PENDIENTE DE ANÁLISIS'}</span>
                        </div>
                    </div>
                </div>
                <div class="text-sm text-white/70 leading-relaxed max-h-48 overflow-y-auto pr-4 font-light tracking-wide">
                    ${fullData ? (fullData.descripcion || fullData.desc || "Aún no se ha descifrado el genoma completo de esta especie en la base de datos de la expedición Borealis. Por favor procesa la muestra en el secuenciador.") : "Datos corruptos o no disponibles en la red neural de la nave. Es probable que se trate de un fragmento biológico genérico."}
                </div>
            </div>
        `;

        const overlay = document.getElementById('muestras-info-overlay');
        if (overlay) {
            overlay.innerHTML = infoHtml;
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        }
    };

    window.injectBiomass = function () {
        if (!window.AnalysisPoints || window.AnalysisPoints <= 0) return;

        const batteryBoost = window.AnalysisPoints / 10;
        if (typeof energyManager !== 'undefined') {
            energyManager.battery = Math.min(200, energyManager.battery + batteryBoost); // Permite sobrecargar batería base!
        }

        // Efecto visual flash pantalla
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 z-[9999] bg-cyan-500 pointer-events-none mix-blend-screen transition-opacity duration-1000";
        overlay.style.opacity = "0.5";
        document.body.appendChild(overlay);
        setTimeout(() => overlay.style.opacity = "0", 100);
        setTimeout(() => overlay.remove(), 1000);

        window.AnalysisPoints = 0;
        localStorage.setItem('abyss_analysis_points', window.AnalysisPoints);
        window.updateSamplesUI();
    };

    // Trigger initial render when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        window.updateSamplesUI();
    });
}

