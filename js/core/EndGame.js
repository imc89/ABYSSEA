/**
 * END GAME
 * [ES] Pantalla de fin de juego (Derrota). Gestiona la transición final, mensajes de error y reinicio.
 * [EN] End game screen (Defeat). Manages the final transition, error messages, and restart.
 */

class EndGame {
    constructor() {
        this.container = null;
        this.isOpen = false;
    }

    /**
     * [ES] Muestra la pantalla de fin de juego con un motivo específico.
     * @param {string} reason - Motivo de la muerte (ej: "INTOXICACIÓN POR CO2")
     */
    show(reason = "FALLO DE SISTEMAS") {
        if (this.isOpen) return;
        this.isOpen = true;

        // Crear contenedor dinámico
        this.container = document.createElement('div');
        this.container.id = 'end-game-screen';
        this.container.className = 'fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-black/95 text-center p-10 opacity-0 transition-opacity duration-1000 pointer-events-auto';

        this.container.innerHTML = `
            <!-- Grid Background de emergencia -->
            <div class="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>
            <!-- Vignette opresivo oscuro -->
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_90%)] pointer-events-none"></div>
            
            <div class="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center animate-[fadeInTop_0.8s_ease-out]">
                
                <!-- Warning Circular Hardware Component -->
                <div class="relative w-36 h-36 flex items-center justify-center mb-10 group mt-10">
                    <!-- Base circular container -->
                    <div class="absolute inset-0 bg-black/50 rounded-full border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)]"></div>
                    <!-- Inner pulsating circle -->
                    <div class="absolute inset-3 bg-red-900/30 rounded-full border-2 border-red-500/50 animate-[pulse-alert_2s_infinite_alternate] transition-transform duration-1000 group-hover:scale-105 shadow-[inset_0_0_20px_rgba(0,0,0,1)]"></div>
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                        <i data-lucide="skull" class="text-red-500 w-16 h-16 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"></i>
                    </div>
                </div>

                <!-- Título Monumental -->
                <div class="flex flex-col items-center w-full mb-10">
                    <div class="w-full flex items-center justify-center gap-6 mb-3 relative">
                        <div class="absolute left-0 w-[40%] h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-red-500/80"></div>
                        <h1 class="text-red-500 text-6xl md:text-7xl font-black uppercase tracking-[0.25em] drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] leading-[1.1] z-10" style="font-family: 'Arial Black', Impact, sans-serif;">FIN DEL VIAJE</h1>
                        <div class="absolute right-0 w-[40%] h-[1px] bg-gradient-to-l from-transparent via-red-500/20 to-red-500/80"></div>
                    </div>
                    <h2 class="text-white text-xl md:text-2xl font-bold tracking-[0.6em] uppercase mt-2 opacity-90 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] text-[#fca5a5]">${reason}</h2>
                </div>
                <!-- Mensaje de Lore Style Terminal (ARRIBA) -->
                <div class="w-full max-w-xl mx-auto mb-10 relative bg-[#0a0000] border border-red-500/20 p-6 shadow-[inset_0_0_40px_rgba(239,68,68,0.05),0_15px_30px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden transform relative">
                    <!-- Scanline de adorno -->
                    <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50"></div>
                    
                    <div class="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-red-600/80 to-red-900 shadow-[0_0_10px_#ef4444]"></div>
                    <div class="flex items-center gap-3 mb-4 border-b border-red-500/20 pb-2">
                        <div class="w-2 h-2 rounded-sm bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]"></div>
                        <span class="text-red-400 text-[10px] font-mono tracking-[0.2em] uppercase">SYSTEM_LOG :: CRITICAL_FAILURE</span>
                    </div>
                    
                    <p class="text-red-100/70 text-sm font-mono leading-relaxed text-left pl-3 tracking-wide">
                        Los sistemas de soporte vital han colapsado irremediablemente. La deficiencia en el purgado de toxinas ha resultado en niveles letales de la atmósfera interna.<br><br>
                        <strong>PROTOCOLOS DE EVACUACIÓN: FALLIDOS.</strong><br>
                        <span class="text-red-500 font-bold block mt-3">> ESTADO DE LA MISIÓN: PERDIDA_ <span class="animate-pulse">|</span></span>
                    </p>
                </div>

                <!-- Botón de Reinicio Mecánico Fuerte (ABAJO DEL LOG PERO COMPACTO) -->
                <button id="restart-btn" class="group relative px-10 md:px-16 py-6 bg-[#0a0202] border border-red-500/40 text-red-500 font-black uppercase tracking-[0.3em] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.9)] transition-all active:scale-[0.98] duration-200" style="margin-bottom: 50px;">
                    <div class="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(239,68,68,0.05)_10px,rgba(239,68,68,0.05)_20px)] opacity-50 z-0 pointer-events-none"></div>
                    <div class="absolute inset-x-0 bottom-0 h-0 bg-red-600 group-hover:h-full transition-all duration-300 ease-out pointer-events-none z-0"></div>
                    <span class="relative z-10 flex items-center justify-center gap-3 text-sm md:text-base group-hover:text-black transition-colors duration-300">
                        <i data-lucide="rotate-ccw" class="w-5 h-5 text-red-500 group-hover:text-black transition-colors duration-300"></i>
                        INICIAR SECUENCIA DE REINICIO
                    </span>
                    <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 group-hover:bg-black transition-colors z-10"></div>
                    <div class="absolute right-0 top-0 bottom-0 w-1.5 bg-red-500 group-hover:bg-black transition-colors z-10"></div>
                </button>
            </div>

            <!-- Datos Técnicos / Cinta de peligro animada en bucle -->
            <div class="absolute bottom-0 left-0 w-full overflow-hidden bg-red-900/30 border-t border-red-500/40 py-2.5 shadow-[0_-5px_20px_rgba(239,68,68,0.15)] flex">
                <div class="flex gap-16 font-mono text-[9px] uppercase font-bold text-red-300/60 whitespace-nowrap marquee-animation">
                    <span>• SIGNAL_LOST_0x882</span>
                    <span>• FATAL_ERROR_OX</span>
                    <span>• SYSTEM_HALT</span>
                    <span>• DEEP_RECOVERY_OFFLINE</span>
                    <span>• CREW_STATUS_KIA</span>
                    <span>• ABNORMAL_PRESSURE_DETECTED</span>
                    <span>• ALL_CHANNELS_SILENT</span>
                    <span>• SIGNAL_LOST_0x882</span>
                    <span>• FATAL_ERROR_OX</span>
                    <span>• SYSTEM_HALT</span>
                    <span>• DEEP_RECOVERY_OFFLINE</span>
                    <span>• CREW_STATUS_KIA</span>
                    <span>• ABNORMAL_PRESSURE_DETECTED</span>
                    <span>• ALL_CHANNELS_SILENT</span>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Inyectar animaciones si no existen
        this.injectStyles();

        // Inicializar iconos
        if (window.lucide) window.lucide.createIcons();

        // Mostrar con fundido
        setTimeout(() => {
            if (this.container) {
                this.container.classList.remove('opacity-0');
                this.container.classList.add('opacity-100');
            }
            
            // FORZAR CURSOR A TODA COSTA
            document.body.classList.remove('hide-cursor');
            document.body.style.setProperty('cursor', 'auto', 'important');
            
            // Notificar al gestor global para mostrar cursor (como extra)
            if (typeof window.updateCursorVisibility === 'function') {
                window.updateCursorVisibility();
            }
        }, 100);

        // Evento de reinicio
        const btn = this.container.querySelector('#restart-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    injectStyles() {
        if (document.getElementById('endgame-styles')) return;
        const style = document.createElement('style');
        style.id = 'endgame-styles';
        style.innerHTML = `
            @keyframes fadeInTop {
                from { opacity: 0; transform: translateY(-40px) scale(0.97); filter: blur(10px); }
                to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
            @keyframes slideLeft {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
            }
            .marquee-animation {
                animation: slideLeft 25s linear infinite;
                will-change: transform;
            }
        `;
        document.head.appendChild(style);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.EndGame = EndGame;
}
