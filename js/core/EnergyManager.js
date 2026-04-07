class EnergyManager {
    constructor() {
        this.isOpen = false;

        // Estado
        this.battery = 100.0;
        this.cells = [
            { id: 'A', state: 'full', timer: 0 },
            { id: 'B', state: 'full', timer: 0 },
            { id: 'C', state: 'full', timer: 0 }
        ]; // state: full, empty, charging

        // Interruptores booleanos
        this.switches = {
            faro: true,
            sonar: true,
            motores: true,
            scrubbers: true,
            calefactor: true
        };

        this.isBlackout = false;
        this.isSwapping = false;
        this.swapTimer = 0;

        this._lastTotalConsumption = -1;
    }

    init() {
        this.dom = {
            gaugeArc: document.getElementById('energy-gauge-arc'),
            gaugeNeedle: document.getElementById('energy-gauge-needle'),
            pctText: document.getElementById('energy-pct-text'),
            consText: document.getElementById('energy-consumption-text'),
            effBar: document.getElementById('energy-efficiency-bar'),
            effStatus: document.getElementById('energy-efficiency-status'),
            cellsContainer: document.getElementById('energy-cells-container'),
            swapWarning: document.getElementById('energy-swap-warning'),
            swapTimerText: document.getElementById('energy-swap-timer')
        };

        // Init cache for switches
        this.domSwitches = {};
        for (let key in this.switches) {
            this.domSwitches[key] = {
                wrapper: document.getElementById(`sw-${key}`),
                status: document.getElementById(`status-sw-${key}`)
            };
        }
    }

    startBatterySwap(cellIndex = -1) {
        if (this.isSwapping) return;

        // Si no nos pasan un índice, buscamos el primero disponible
        let targetIndex = cellIndex;
        if (targetIndex === -1) {
            targetIndex = this.cells.findIndex(c => c.state === 'full');
        }

        if (targetIndex === -1 || this.cells[targetIndex].state !== 'full') return;

        this.isSwapping = true;
        this.swapTimer = window.ENERGY_CONFIG.swapTime * 60; // Convert to seconds internal

        // Iniciar apagón de transición
        this.isBlackout = true;

        // La celda seleccionada pasa a estar vacía/cargándose
        this.cells[targetIndex].state = 'charging';
        this.cells[targetIndex].timer = window.ENERGY_CONFIG.cellRechargeTime * 60; // Convert to seconds internal

        // Forzar redibujado de todas las celdas
        this.drawUI(true);
    }

    toggleSwitch(sysKey) {
        if (this.isBlackout) return; // No se puede tocar sin energía
        if (this.switches[sysKey] !== undefined) {
            this.switches[sysKey] = !this.switches[sysKey];
            this.forceUIDraw();

            // Sonido de clac
            if (window.audioManager) {
                // Reproducir un sfx de switch si existe
            }
        }
    }

    update(dt, player) {
        // Recarga de celdas
        let cellsUpdated = false;
        for (let c of this.cells) {
            if (c.state === 'charging') {
                c.timer -= dt;
                cellsUpdated = true;
                if (c.timer <= 0) {
                    c.timer = 0;
                    c.state = 'full';
                }
            }
        }

        // Swap en progreso
        if (this.isSwapping) {
            this.swapTimer -= dt;
            if (this.swapTimer <= 0) {
                this.isSwapping = false;
                this.isBlackout = false;
                this.battery = 100.0;
                cellsUpdated = true;
            }
            if (this.isOpen) this.drawUI(true);
            return; // No se descarga mientras se cambia
        }

        // Desacoplado
        const isUndocked = player ? !player.isLocked : false;

        if (isUndocked && !this.isBlackout) {
            // Calcular consumo
            let consumow = window.ENERGY_CONFIG.baseDischargeRate / 60; // Convert per minute to per second base

            const cfg = window.ENERGY_CONFIG.consumptionParams;
            if (this.switches.faro) consumow += cfg.faro;
            if (this.switches.sonar) consumow += cfg.sonar;
            if (this.switches.motores) consumow += cfg.motores;
            if (this.switches.scrubbers) consumow += cfg.scrubbers;
            if (this.switches.calefactor) consumow += cfg.calefactor;

            const drainRate = consumow * 0.005; // 0.005 % por segundo por W
            this.battery -= drainRate * dt;
            if (this.battery <= 0) {
                this.battery = 0;
                this.isBlackout = true;
            }
        }

        if (this.isOpen) {
            this.drawUI(cellsUpdated);
        }
    }

    forceUIDraw() {
        this._lastTotalConsumption = -1;
        this._lastBat = -1; // Forzar redibujado de la aguja y el arco
        this.drawUI(true);
    }

    drawUI(cellsUpdated) {
        if (!this.dom) this.init();

        // Calcular consumo real para gauge
        const cfg = window.ENERGY_CONFIG.consumptionParams;
        let cTotal = 0;
        if (this.switches.faro) cTotal += cfg.faro;
        if (this.switches.sonar) cTotal += cfg.sonar;
        if (this.switches.motores) cTotal += cfg.motores;
        if (this.switches.scrubbers) cTotal += cfg.scrubbers;
        if (this.switches.calefactor) cTotal += cfg.calefactor;

        if (this.isBlackout) cTotal = 0;

        // Bateria
        if (this._lastBat !== this.battery) {
            this.dom.pctText.innerText = Math.floor(this.battery);

            // Aguja: 100% -> 90 grados, 0% -> -90 grados (rango de 180 deg)
            const angle = -90 + (this.battery / 100) * 180;
            this.dom.gaugeNeedle.style.transform = `rotate(${angle}deg)`;

            // Arc dashoffset: 100% -> 0, 0% -> full dash length.
            // Recalculated for R=84 semicircle (264px length)
            const dash = 264;
            const offset = dash - (this.battery / 100) * dash;
            this.dom.gaugeArc.style.strokeDashoffset = offset;

            this._lastBat = this.battery;
        }

        // SWAP WARNING & COUNTER OVERLAY
        if (this.isSwapping) {
            if (this.dom.swapWarning) this.dom.swapWarning.style.opacity = '1';
            let formattedTime = Math.max(0, this.swapTimer).toFixed(1);
            if (this.dom.swapTimerText && this._lastSwapTimerText !== formattedTime) {
                this.dom.swapTimerText.innerText = formattedTime;
                this._lastSwapTimerText = formattedTime;
            }
        } else {
            if (this.dom.swapWarning && this.dom.swapWarning.style.opacity !== '0') {
                this.dom.swapWarning.style.opacity = '0';
            }
        }

        // Eficiencia
        if (this._lastTotalConsumption !== cTotal) {
            this.dom.consText.innerText = cTotal;

            // Limites
            const th = window.ENERGY_CONFIG.efficiencyThresholds;
            let effColor = 'bg-emerald-500';
            let textColor = 'text-emerald-400';
            let effStr = 'ESTABLE';
            let dropShadow = 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]';

            if (cTotal > th.yellow) {
                effColor = 'bg-red-500';
                textColor = 'text-red-400';
                effStr = 'CRÍTICO';
                dropShadow = 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
            } else if (cTotal > th.green) {
                effColor = 'bg-amber-500';
                textColor = 'text-amber-400';
                effStr = 'SOBRECARGA';
                dropShadow = 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]';
            }

            this.dom.effBar.className = `h-full transition-all duration-300 ${effColor} ${dropShadow}`;
            // Max gauge assumed to be 50W
            const pct = Math.min(100, (cTotal / 50) * 100);
            this.dom.effBar.style.width = `${pct}%`;

            this.dom.effStatus.innerText = effStr;
            this.dom.effStatus.className = `text-[8px] uppercase tracking-widest font-bold ${textColor}`;

            // Draw Switches
            for (let key in this.switches) {
                const s = this.switches[key];
                const d = this.domSwitches[key];
                if (d.wrapper) {
                    const topOffset = key === 'calefactor' ? 'top-5 right-5' : 'top-3 right-3';
                    if (s && !this.isBlackout) {
                        d.wrapper.checked = true;
                        if (d.status) d.status.className = `w-2 h-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_8px_rgba(16,185,129,0.8)] absolute ${topOffset} shadow-emerald-500/50 transition-colors`;
                    } else {
                        d.wrapper.checked = false;
                        if (d.status) d.status.className = `w-2 h-2 rounded-full bg-red-900 border border-black absolute ${topOffset} shadow-[inset_0_2px_2px_rgba(0,0,0,0.8)] transition-colors`;
                    }
                }
            }

            this._lastTotalConsumption = cTotal;
        }

        // Celdas
        //[ES] Si la batería está por debajo del 10%, resaltamos la primera celda disponible
        const canSwap = this.battery < 10 && !this.isSwapping;

        const stateKey = canSwap + "_" + this.cells.map(c => c.state).join("-");

        if (this._lastCellsStateStr !== stateKey) {
            let highlightedOne = false;
            let html = '';
            this.cells.forEach((c, index) => {
                if (c.state === 'full') {
                    // CELDA CARGADA (OK)
                    // [ES] Si canSwap es true, TODAS las celdas llenas brillan como recambios listos.
                    const isReadyToSwap = canSwap;

                    const activeClick = canSwap;

                    html += `
                    <div class="flex-1 h-12 bg-emerald-950/20 rounded-lg border ${isReadyToSwap ? 'border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.25)] animate-pulse' : 'border-emerald-500/30 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]'} flex items-center justify-between px-3 relative overflow-hidden group battery-item ${activeClick ? 'cursor-pointer pointer-events-auto hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all' : ''}"
                         ${activeClick ? `onclick="window.energyManager.startBatterySwap(${index}); event.stopPropagation();"` : ''}>
                        
                        <!-- Holographic background effect -->
                        <div class="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-emerald-500/10 pointer-events-none"></div>
                        ${isReadyToSwap ? '<div class="absolute inset-0 bg-cyan-400/10 pointer-events-none"></div>' : ''}

                        <div class="flex items-center gap-2 z-10 pointer-events-none">
                            <div class="p-1 rounded ${isReadyToSwap ? 'bg-cyan-500/30 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.6)]' : 'bg-emerald-500/10 border border-transparent shadow-[0_0_8px_rgba(16,185,129,0.2)]'}">
                                <i data-lucide="battery" class="w-3.5 h-3.5 ${isReadyToSwap ? 'text-cyan-300' : 'text-emerald-400'}"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[7px] ${isReadyToSwap ? 'text-white drop-shadow-md' : 'text-emerald-500/60'} uppercase font-black tracking-widest leading-none">${isReadyToSwap ? 'SWAP READY' : 'Status'}</span>
                                <span class="text-[9px] ${isReadyToSwap ? 'text-cyan-300 font-black drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : 'text-emerald-400 font-bold'} uppercase tracking-tight">${isReadyToSwap ? 'CLICK TO SWAP' : 'READY'}</span>
                            </div>
                        </div>

                        <!-- Side glow indicator -->
                        <div class="w-1 h-6 ${isReadyToSwap ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'} rounded-full pointer-events-none"></div>
                    </div>`;
                } else {
                    // CELDA CARGANDO (CHARGING)
                    const prog = 100 - ((c.timer / (window.ENERGY_CONFIG.cellRechargeTime * 60)) * 100);
                    // EFECTO ACTIVO DE CARGA EXTRA
                    html += `
                    <div class="flex-1 h-12 bg-black/60 rounded-lg border border-cyan-500/20 flex items-center justify-between px-3 relative overflow-hidden group battery-item shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]">
                        <!-- Pulsing background aura -->
                        <div class="absolute inset-0 bg-cyan-500/5 animate-pulse pointer-events-none"></div>
                        
                        <!-- Progress vertical build-up with gradient top edge -->
                        <div id="cell-prog-bar-${index}" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600/50 to-cyan-400/40 border-t border-cyan-300/40 shadow-[0_-2px_12px_rgba(34,211,238,0.4)]" style="height: ${prog}%"></div>
                        
                        <div class="flex items-center gap-2 z-10 pointer-events-none">
                            <div class="p-1 rounded bg-black/40 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                                <i data-lucide="zap" class="w-3.5 h-3.5 text-cyan-400 animate-bounce"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-[7px] text-cyan-200/80 uppercase font-black tracking-widest leading-none drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] animate-pulse">Power Up</span>
                                <span id="cell-prog-text-${index}" class="text-[10px] text-white font-mono font-black drop-shadow-[0_0_8px_rgba(255,255,255,1)]">${Math.floor(prog)}%</span>
                            </div>
                        </div>

                        <!-- Micro-metering on the right glows -->
                        <div class="flex flex-col gap-1 z-10 opacity-80 pointer-events-none">
                            <div class="w-2.5 h-0.5 bg-cyan-400/50 shadow-[0_0_4px_#22d3ee]"></div>
                            <div class="w-4 h-0.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse"></div>
                            <div class="w-2.5 h-0.5 bg-cyan-400/50 shadow-[0_0_4px_#22d3ee]"></div>
                        </div>
                    </div>`;
                }
            });

            this.dom.cellsContainer.innerHTML = html;

            // Refrescar iconos de Lucide
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            this._lastCellsStateStr = stateKey;
            this._lastCanSwap = canSwap;
        } else {
            // Actualización ligera sin reconstruir el DOM cada frame (soluciona el bug del click en las recargas)
            this.cells.forEach((c, index) => {
                if (c.state === 'charging') {
                    const prog = 100 - ((c.timer / (window.ENERGY_CONFIG.cellRechargeTime * 60)) * 100);
                    const bar = document.getElementById(`cell-prog-bar-${index}`);
                    const text = document.getElementById(`cell-prog-text-${index}`);
                    if (bar) bar.style.height = `${prog}%`;
                    if (text) text.innerText = `${Math.floor(prog)}%`;
                }
            });
        }
    }
}

// Global instance
window.energyManager = new EnergyManager();
