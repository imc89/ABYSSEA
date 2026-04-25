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
     * @param {string} theme - Tema visual ("critical" | "anoxia")
     */
    show(reason = "FALLO DE SISTEMAS", theme = "critical") {
        if (this.isOpen) return;
        this.isOpen = true;

        const isHypo = reason === "HIPOTERMIA";
        const isHyper = reason === "HIPERTERMIA";
        const isAnoxia = theme === "anoxia";

        let primaryColor, accentColor, glowColor, icon, bodyClass, gridColor, cTheme, logTitle, logText, textColor;

        if (isAnoxia) {
            primaryColor = "#06b6d4";
            accentColor = "text-cyan-400";
            glowColor = "rgba(6,182,212,0.8)";
            icon = "wind";
            bodyClass = "bg-[#000a0f]";
            gridColor = "rgba(6,182,212,0.05)";
            cTheme = "cyan";
            logTitle = "ASPHYXIATION_ALERT";
            logText = "La saturación de oxígeno en cabina ha caído por debajo del umbral mínimo biológico. El personal ha perdido la consciencia debido a una anoxia cerebral masiva. Los sistemas automatizados han cesado su actividad.";
            textColor = "text-cyan-100/70";
        } else if (isHypo) {
            primaryColor = "#3b82f6"; 
            accentColor = "text-blue-400";
            glowColor = "rgba(59,130,246,0.8)";
            icon = "snowflake";
            bodyClass = "bg-[#000510]";
            gridColor = "rgba(59,130,246,0.05)";
            cTheme = "blue";
            logTitle = "HYPOTHERMIA_ALERT";
            logText = "La temperatura interna ha caído por debajo del umbral de supervivencia. El metabolismo del piloto se ha detenido debido a una hipotermia severa y congelación. Los sistemas vitales han cesado su actividad.";
            textColor = "text-blue-100/70";
        } else if (isHyper) {
            primaryColor = "#f97316"; 
            accentColor = "text-orange-500";
            glowColor = "rgba(249,115,22,0.8)";
            icon = "flame";
            bodyClass = "bg-[#100500]";
            gridColor = "rgba(249,115,22,0.05)";
            cTheme = "orange";
            logTitle = "HYPERTHERMIA_ALERT";
            logText = "La temperatura interna ha excedido el límite biológico soportable por más de 20 segundos. El personal ha sufrido un golpe de calor letal por hipertermia y deshidratación severa. Fallo catastrófico de soporte vital.";
            textColor = "text-orange-100/70";
        } else {
            primaryColor = "#ef4444";
            accentColor = "text-red-500";
            glowColor = "rgba(239,68,68,0.8)";
            icon = "skull";
            bodyClass = "bg-[#0a0000]";
            gridColor = "rgba(239,68,68,0.05)";
            cTheme = "red";
            logTitle = "TOXICITY_ALERT";
            logText = "Los sistemas de soporte vital han colapsado irremediablemente. La deficiencia en el purgado de toxinas ha resultado en niveles letales de la atmósfera interna.";
            textColor = "text-red-100/70";
        }
        
        // Crear contenedor dinámico
        this.container = document.createElement('div');
        this.container.id = 'end-game-screen';
        this.container.className = `fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-black/95 text-center p-10 opacity-0 transition-opacity duration-1000 pointer-events-auto`;

        this.container.innerHTML = `
            <!-- Grid Background de emergencia -->
            <div class="absolute inset-0 bg-[linear-gradient(${gridColor}_1px,transparent_1px),linear-gradient(90deg,${gridColor}_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>
            <!-- Vignette opresivo oscuro -->
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_90%)] pointer-events-none"></div>
            
            <div class="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center animate-[fadeInTop_0.8s_ease-out]">
                
                <!-- Warning Circular Hardware Component -->
                <div class="relative w-36 h-36 flex items-center justify-center mb-10 group mt-10">
                    <!-- Base circular container -->
                    <div class="absolute inset-0 bg-black/50 rounded-full border border-${cTheme}-500/20 shadow-[0_0_40px_${primaryColor}26]"></div>
                    <!-- Inner pulsating circle -->
                    <div class="absolute inset-3 bg-${cTheme}-900/30 rounded-full border-2 border-${cTheme}-500/50 animate-[pulse-alert_2s_infinite_alternate] shadow-[inset_0_0_20px_rgba(0,0,0,1)]"></div>
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                        <i data-lucide="${icon}" class="${accentColor} w-16 h-16 drop-shadow-[0_0_15px_${glowColor}]"></i>
                    </div>
                </div>

                <!-- Título Monumental -->
                <div class="flex flex-col items-center w-full mb-10">
                    <div class="w-full flex items-center justify-center gap-6 mb-3 relative">
                        <div class="absolute left-0 w-[40%] h-[1px] bg-gradient-to-r from-transparent via-${cTheme}-500/20 to-${cTheme}-500/80"></div>
                        <h1 class="${accentColor} text-6xl md:text-7xl font-black uppercase tracking-[0.25em] drop-shadow-[0_0_30px_${glowColor}] leading-[1.1] z-10" style="font-family: 'Arial Black', Impact, sans-serif;">FIN DEL VIAJE</h1>
                        <div class="absolute right-0 w-[40%] h-[1px] bg-gradient-to-l from-transparent via-${cTheme}-500/20 to-${cTheme}-500/80"></div>
                    </div>
                    <h2 class="text-white text-xl md:text-2xl font-bold tracking-[0.6em] uppercase mt-2 opacity-90 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] text-[${primaryColor}]">${reason}</h2>
                </div>

                <!-- Mensaje de Lore Style Terminal -->
                <div class="w-full max-w-xl mx-auto mb-10 relative ${bodyClass} border border-${cTheme}-500/20 p-6 shadow-[inset_0_0_40px_${primaryColor}0D,0_15px_30px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden transform relative">
                    <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-${cTheme}-500/50 to-transparent opacity-50"></div>
                    <div class="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-${cTheme}-600/80 to-${cTheme}-900 shadow-[0_0_10px_${primaryColor}]"></div>
                    <div class="flex items-center gap-3 mb-4 border-b border-${cTheme}-500/20 pb-2">
                        <div class="w-2 h-2 rounded-sm bg-${cTheme}-500 animate-pulse shadow-[0_0_5px_${primaryColor}]"></div>
                        <span class="text-${cTheme}-400 text-[10px] font-mono tracking-[0.2em] uppercase">SYSTEM_LOG :: ${logTitle}</span>
                    </div>
                    
                    <p class="${textColor} text-sm font-mono leading-relaxed text-left pl-3 tracking-wide">
                        ${logText}<br><br>
                        <strong>PROTOCOLOS DE REANIMACIÓN: NO DISPONIBLES.</strong><br>
                        <span class="${accentColor} font-bold block mt-3">> ESTADO DE LA MISIÓN: PERDIDA_ <span class="animate-pulse">|</span></span>
                    </p>
                </div>

                <!-- Botón de Reinicio -->
                <button id="restart-btn" class="group relative px-10 md:px-16 py-6 bg-[#000205] border border-${cTheme}-500/40 ${accentColor} font-black uppercase tracking-[0.3em] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.9)] transition-all active:scale-[0.98] duration-200" style="margin-bottom: 50px;">
                    <div class="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,${primaryColor}0D_10px,${primaryColor}0D_20px)] opacity-50 z-0 pointer-events-none"></div>
                    <div class="absolute inset-x-0 bottom-0 h-0 bg-${cTheme}-600 group-hover:h-full transition-all duration-300 ease-out pointer-events-none z-0"></div>
                    <span class="relative z-10 flex items-center justify-center gap-3 text-sm md:text-base group-hover:text-black transition-colors duration-300">
                        <i data-lucide="rotate-ccw" class="w-5 h-5 ${accentColor} group-hover:text-black transition-colors duration-300"></i>
                        INICIAR SECUENCIA DE REINICIO
                    </span>
                    <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-${cTheme}-500 group-hover:bg-black transition-colors z-10"></div>
                    <div class="absolute right-0 top-0 bottom-0 w-1.5 bg-${cTheme}-500 group-hover:bg-black transition-colors z-10"></div>
                </button>
            </div>

            <!-- Datos Técnicos Footer -->
            <div class="absolute bottom-0 left-0 w-full overflow-hidden bg-${cTheme}-900/30 border-t border-${cTheme}-500/40 py-2.5 shadow-[0_-5px_20px_${primaryColor}26] flex">
                <div class="flex gap-16 font-mono text-[9px] uppercase font-bold text-${cTheme}-300/60 whitespace-nowrap marquee-animation">
                    <span>• SIGNAL_LOST_0x882</span>
                    <span>• FATAL_LOG_TEMP</span>
                    <span>• SYSTEM_HALT</span>
                    <span>• DEEP_RECOVERY_OFFLINE</span>
                    <span>• CREW_STATUS_KIA</span>
                    <span>• ABNORMAL_ENVIRONMENT_DETECTED</span>
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
