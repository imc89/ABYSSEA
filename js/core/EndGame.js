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
            <div class="mb-4 animate-[fadeIn_1s_ease-out]">
                <!-- Icono de Peligro -->
                <div class="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse">
                    <i data-lucide="skull" class="text-red-500 w-12 h-12"></i>
                </div>

                <!-- Títulos -->
                <h1 class="text-red-500 text-6xl font-black uppercase tracking-[0.3em] mb-4 drop-shadow-[0_0_50px_#ef4444]">Fin del Viaje</h1>
                <h2 class="text-white text-2xl font-bold tracking-[0.5em] uppercase mb-10 opacity-90">${reason}</h2>
                
                <!-- Mensaje de Lore -->
                <div class="max-w-md mx-auto mb-16 relative">
                    <div class="absolute -left-6 top-1/2 -translate-y-1/2 w-1 h-12 bg-red-500/30"></div>
                    <p class="text-white/40 text-sm font-mono leading-relaxed px-4">
                        Los sistemas de soporte vital han fallado definitivamente. El protocolo de evacuación no fue ejecutado a tiempo. La misión se considera perdida.
                    </p>
                </div>
            </div>

            <!-- Botón de Reinicio -->
            <button id="restart-btn" class="group relative px-12 py-5 bg-red-600/10 border-2 border-red-500/50 text-red-500 font-black uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all rounded shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] overflow-hidden">
                <span class="relative z-10">Reiniciar Sistemas</span>
                <div class="absolute inset-0 bg-red-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out pointer-events-none"></div>
            </button>

            <!-- Datos Técnicos (Decorativos) -->
            <div class="absolute bottom-10 flex gap-10 opacity-10 font-mono text-[9px] text-white">
                <span>SIGNAL_LOST_0x882</span>
                <span>SYSTEM_HALT</span>
                <span>DEEP_RECOVERY_OFFLINE</span>
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
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.EndGame = EndGame;
}
