/**
 * UI TELEMETRY
 * [ES] Panel de depuración en pantalla. Muestra FPS, entidades visibles y otras métricas de rendimiento.
 *      Se activa/desactiva con la tecla '<'.
 * [EN] On-screen debug panel. Displays FPS, visible entities, and other performance metrics.
 *      Toggleable with the '<' key.
 */

class UITelemetry {
    constructor() {
        this.isVisible = false;
        this.fps = 60;
        this.framesDelivered = 0;
        this.lastFpsTime = performance.now();

        // Referencias al DOM
        this._panel = null;
        this._elFps = null;
        this._elFishes = null;
        this._elParticles = null;
        this._elBubbles = null;

        this._createUI();
    }

    /**
     * [ES] Crea la estructura del panel de telemetría dinámicamente.
     * [EN] Creates the telemetry panel structure dynamically.
     */
    _createUI() {
        if (document.getElementById('telemetry-ui')) return;

        const container = document.createElement('div');
        container.id = 'telemetry-ui';
        container.className = 'absolute bottom-4 left-4 hud-glass p-3 rounded-lg border-l-4 border-l-purple-500 shadow-2xl hidden z-50 pointer-events-none transition-opacity duration-300';
        container.style.opacity = '0';

        container.innerHTML = `
            <div class="flex items-center justify-between mb-2 border-b border-purple-500/30 pb-1">
                <h1 class="text-purple-400 text-[9px] font-bold tracking-[0.2em] uppercase opacity-80">
                    SISTEMA DE TELEMETRÍA
                </h1>
                <span class="text-[8px] text-purple-500/50 font-mono">v1.2.0</span>
            </div>
            
            <div class="space-y-2 text-[10px] font-mono">
                <!-- Rendimiento -->
                <div class="flex justify-between items-center bg-white/5 p-1 rounded">
                    <span class="text-white/40 uppercase tracking-tighter">Frecuencia (FPS)</span>
                    <span id="tel-fps" class="text-green-300 font-bold">60</span>
                </div>
                
                <!-- Entidades -->
                <div class="grid grid-cols-1 gap-1">
                    <div class="flex justify-between border-b border-white/5 pb-0.5">
                        <span class="text-white/40 uppercase tracking-tighter">Peces Visibles</span>
                        <span id="tel-fishes" class="text-cyan-400 font-bold">0 / 0</span>
                    </div>
                    <p class="text-[8px] text-white/20 italic mb-1">Ratio: Renderizado vs Simulado (IA)</p>
                    
                    <div class="flex justify-between">
                        <span class="text-white/40 uppercase tracking-tighter">Nieve Marina</span>
                        <span id="tel-particles" class="text-emerald-400 font-bold">0</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="text-white/40 uppercase tracking-tighter">Burbujas (FX)</span>
                        <span id="tel-bubbles" class="text-yellow-400 font-bold">0</span>
                    </div>
                </div>
            </div>
            
            <div class="mt-2 pt-1 border-t border-white/5 text-[8px] text-white/30 flex justify-between">
                <span>ABYSS_ENGINE</span>
                <span>CTRL: [<] TOGGLE</span>
            </div>
        `;

        document.body.appendChild(container);
        this._resolveDOM();
    }

    /**
     * [ES] Resuelve y cachea las referencias a los elementos del DOM del panel.
     * [EN] Resolves and caches DOM element references for the panel.
     */
    _resolveDOM() {
        if (this._panel) return; // Ya resueltos
        this._panel = document.getElementById('telemetry-ui');
        this._elFps = document.getElementById('tel-fps');
        this._elFishes = document.getElementById('tel-fishes');
        this._elParticles = document.getElementById('tel-particles');
        this._elBubbles = document.getElementById('tel-bubbles');
    }

    /**
     * [ES] Alterna la visibilidad del panel de telemetría.
     * [EN] Toggles the visibility of the telemetry panel.
     */
    toggle() {
        this._resolveDOM();
        this.isVisible = !this.isVisible;

        if (!this._panel) return;

        if (this.isVisible) {
            this._panel.classList.remove('hidden');
            this._panel.style.opacity = '1';
        } else {
            this._panel.style.opacity = '0';
            setTimeout(() => this._panel.classList.add('hidden'), 300);
        }
    }

    /**
     * [ES] Actualiza todos los contadores del panel. No hace nada si el panel está oculto.
     * [EN] Updates all counters in the panel. Does nothing if hidden.
     * @param {number} activeFishes  – Peces con IA activa (en rango de culling)
     * @param {number} visibleFishes – Peces renderizados en pantalla (draw devolvió true)
     * @param {number} particles     – Partículas que han sido dibujadas en este frame
     * @param {number} bubbles       – Burbujas que han sido dibujadas en este frame
     */
    update(activeFishes, visibleFishes, particles, bubbles) {
        if (!this.isVisible) return;
        this._resolveDOM();

        // Calcular FPS usando una ventana de 500ms para suavizar el número
        const now = performance.now();
        this.framesDelivered++;
        if (now - this.lastFpsTime >= 500) {
            this.fps = Math.round((this.framesDelivered * 1000) / (now - this.lastFpsTime));
            this.framesDelivered = 0;
            this.lastFpsTime = now;

            if (this._elFps) {
                this._elFps.innerText = this.fps;
                // Código de color: verde > 50fps, amarillo > 30fps, rojo por debajo
                if (this.fps < 30) this._elFps.className = 'text-red-400 font-bold';
                else if (this.fps < 50) this._elFps.className = 'text-yellow-400 font-bold';
                else this._elFps.className = 'text-green-300 font-bold';
            }
        }

        if (this._elFishes) this._elFishes.innerText = `${visibleFishes} / ${activeFishes}`;
        if (this._elParticles) this._elParticles.innerText = particles;
        if (this._elBubbles) this._elBubbles.innerText = bubbles;
    }
}

// Exportar para uso en otros módulos
if (typeof window !== 'undefined') {
    window.UITelemetry = UITelemetry;
}
