/**
 * SPLASH SCREEN
 * [ES] Pantalla de inicio del juego. Gestiona la presentación inicial y el botón de comienzo.
 * [EN] Game splash screen. Manages the initial presentation and the start button.
 */

class SplashScreen {
    constructor(onStart) {
        this.onStart = onStart;
        this.container = null;
        this.version = window.ABYSS_VERSION || 'v1.0.0';
        this._initAudio();
        this.init();
    }

    _initAudio() {
        this.splashMusic = new Audio('audio/abyssea.mp3');
        this.splashMusic.loop = true;
        this.splashMusic.volume = 0.5;
        this.splashMusic.muted = window.isMusicMuted || false;

        // --- MODAL DE BRIEFING FUTURISTA (Desbloqueador de Audio) ---
        const startPortal = document.createElement('div');
        startPortal.id = 'start-mission-portal';
        startPortal.className = 'fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-opacity duration-700';
        startPortal.innerHTML = `
            <style>
                @keyframes futuristic-pulse {
                    0%, 100% { border-color: rgba(6, 182, 212, 0.3); box-shadow: 0 0 20px rgba(6, 182, 212, 0.1); }
                    50% { border-color: rgba(34, 211, 238, 1); box-shadow: 0 0 40px rgba(6, 182, 212, 0.4); }
                }
                .futuristic-border {
                    animation: futuristic-pulse 3s infinite ease-in-out;
                    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .portal-dissolve {
                    opacity: 0 !important;
                    filter: blur(20px) !important;
                    transform: scale(1.1) translateY(-10px) !important;
                }
            </style>
            <div class="bg-[#000a12]/95 border-2 border-cyan-500/30 p-10 rounded-2xl max-w-md w-full mx-6 flex flex-col gap-8 font-mono relative overflow-hidden text-center futuristic-border">
                <!-- Sutil Resplandor de Fondo -->
                <div class="absolute -top-32 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl opacity-40"></div>
                
                <div class="flex flex-col items-center gap-2 relative z-10">
                    <h2 class="text-cyan-400 text-3xl font-bold tracking-[0.4em] uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">ABYSSEA</h2>
                    <span class="app-version-display text-[10px] text-cyan-500/50 tracking-[0.2em] uppercase">${this.version}</span>
                </div>
                
                <div class="text-white/80 text-[13px] leading-relaxed font-light opacity-95 relative z-10 ">
                    <p>Este juego está destinado a ofrecer una pequeña visión de la asombrosa diversidad de vida que habita en los rincones más profundos de nuestro planeta. Su propósito es enseñar criaturas fascinantes que prosperan en la oscuridad total, permitiéndote descubrir la belleza de un ecosistema tan vital como desconocido.</p>
                </div>

                <div class="flex flex-col items-center gap-6 relative z-10">
                    <button id="modal-start-btn" class="px-12 bg-cyan-500/5 border border-cyan-400/30 py-3 text-cyan-400 text-[11px] tracking-[0.4em] font-bold uppercase hover:bg-cyan-400 hover:text-black hover:scale-105 transition-all duration-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        COMENZAR
                    </button>
                    <span class="text-[9px] text-cyan-500/30 tracking-[0.3em] uppercase">Creado por IMC89</span>
                </div>
            </div>
        `;

        startPortal.onclick = (e) => {
            if (e.target.closest('#modal-start-btn')) {
                this._closeStartPortal();
            }
        };

        setTimeout(() => this.container.appendChild(startPortal), 50);
    }

    _closeStartPortal() {
        const portal = document.getElementById('start-mission-portal');
        if (portal) {
            if (this.splashMusic) this.splashMusic.play().catch(() => { });
            
            const modalContent = portal.querySelector('.futuristic-border');
            portal.classList.add('opacity-0', 'pointer-events-none');
            if (modalContent) {
                modalContent.classList.add('portal-dissolve');
            }

            setTimeout(() => portal.remove(), 800);
            return true;
        }
        return false;
    }

    init() {
        // Crear el contenedor principal
        this.container = document.createElement('div');
        this.container.id = 'splash-screen';
        this.container.className = 'fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#00040a] transition-opacity duration-1000 overflow-hidden';

        this.container.innerHTML = `
            <!-- Capas Cinematográficas de Fondo -->
            <div class="absolute inset-0 pointer-events-none">
                <!-- Gradiente Abisal Multicapa -->
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#0c4a6e_0%,_#000_120%)] opacity-60"></div>
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#06b6d420_0%,_transparent_70%)]"></div>
                
                <!-- Radar de Fondo (Sonar Sweep) -->
                <div class="absolute inset-0 opacity-[0.07] flex items-center justify-center">
                    <div class="w-[150vh] h-[150vh] border border-cyan-500/30 rounded-full animate-[ping_10s_linear_infinite]"></div>
                    <div class="absolute inset-0 bg-[conic-gradient(from_0deg,#06b6d430_0%,transparent_30%)] animate-[spin_12s_linear_infinite]"></div>
                </div>

                <!-- Efecto de Causticas / Luz Cenital -->
                <div id="caustics-overlay" class="absolute inset-0 opacity-10 mix-blend-screen"></div>

                <!-- Nieve Marina de Alta Fidelidad -->
                <div id="splash-particles-far" class="absolute inset-0 opacity-20"></div>
                <div id="splash-particles-mid" class="absolute inset-0 opacity-50 blur-[0.5px]"></div>
                <div id="splash-particles-near" class="absolute inset-0 opacity-80 blur-[1px]"></div>
            </div>

            <!-- Botón de Configuración Superior Derecha -->
            <div class="absolute top-8 right-8 z-[600]">
                <button id="splash-config-btn" class="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all group pointer-events-auto">
                    <i data-lucide="settings" class="w-6 h-6 text-cyan-400 group-hover:rotate-90 transition-transform duration-500"></i>
                </button>
            </div>

            <!-- Capa Decorativa de Datos (HUD Readout) -->
            <div class="absolute inset-0 pointer-events-none p-10 font-mono text-[7px] text-cyan-500/40 hidden md:block">
                <div class="flex flex-col gap-1 animate-[fadeIn_2s_ease-out]">
                    <span>COORD: 11.3483° N, 142.2000° E</span>
                    <span>PRESSURE: 108.6 MPa</span>
                    <span>DEPTH: 10,935M</span>
                    <div class="mt-2 flex gap-1">
                        <div class="w-8 h-[1px] bg-cyan-500/20"></div>
                        <span>STATUS: READY</span>
                    </div>
                </div>
            </div>

            <!-- Interfaz Principal (HUD) -->
            <div class="relative z-10 flex flex-col items-center w-full max-w-4xl px-8">
                
                <!-- Contenedor del Título con Esquineros HUD -->
                <div class="relative p-12 mb-16 group">
                    <!-- Esquineros Geométricos -->
                    <div class="absolute top-0 left-0 w-8 h-8 border-t border-l border-cyan-500/40 animate-[hudPulse_4s_infinite]"></div>
                    <div class="absolute top-0 right-0 w-8 h-8 border-t border-r border-cyan-500/40 animate-[hudPulse_4s_infinite]"></div>
                    <div class="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-cyan-500/40 animate-[hudPulse_4s_infinite]"></div>
                    <div class="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-cyan-500/40 animate-[hudPulse_4s_infinite]"></div>

                    <!-- Decoración Superior HUD -->
                    <div class="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 whitespace-nowrap">
                        <div class="h-[1px] w-6 bg-cyan-500/30"></div>
                        <span class="text-cyan-400 text-[8px] uppercase tracking-[0.6em] font-bold">Deep Sea Exploration</span>
                        <div class="h-[1px] w-6 bg-cyan-500/30"></div>
                    </div>

                    <!-- Título Premium Nítido -->
                    <div class="relative">
                        <h1 class="text-white text-8xl md:text-9xl font-bold tracking-[0.4em] relative z-10 select-none" 
                            style="font-family: 'JetBrains Mono', monospace; text-shadow: 0 0 20px rgba(6, 182, 212, 0.4);">
                            ABYSSEA
                        </h1>
                        <!-- Línea de Escaneo Biométrico -->
                        <div class="absolute inset-x-0 h-[1px] bg-cyan-400/50 shadow-[0_0_10px_#06b6d4] z-20 animate-[bioScan_4s_linear_infinite] pointer-events-none"></div>
                        <!-- Pulso Holográfico Sutil -->
                        <h1 class="absolute inset-0 text-cyan-400 tracking-[0.4em] font-bold text-8xl md:text-9xl z-0 opacity-10 animate-[hologramPulse_3s_ease-in-out_infinite]" 
                            style="font-family: 'JetBrains Mono', monospace;">
                            ABYSSEA
                        </h1>
                    </div>
                </div>

                <!-- Panel de Inicio (Mission Control UI) -->
                <div class="bg-[#000a14]/60 backdrop-blur-2xl p-1 rounded-2xl border border-white/5 shadow-2xl group/panel transition-transform duration-700 hover:scale-[1.02]">
                    <div class="bg-gradient-to-b from-cyan-500/10 to-transparent p-3 rounded-2xl flex flex-col items-center gap-2 w-80">
                        <button id="start-mission-btn" class="animate-heartbeat group relative w-full py-4 bg-cyan-400/5 border border-cyan-400/30 rounded-xl transition-all duration-500 hover:bg-cyan-400/15 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] overflow-hidden">
                            <!-- Barra de Escaneo en Hover -->
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            
                            <div class="flex items-center justify-center gap-3">
                                <i data-lucide="power" class="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-500 mb-0.5"></i>
                                <span class="text-white font-bold uppercase tracking-[0.2em] -mr-[0.2em] text-sm leading-none">Iniciar Inmersión</span>
                                <span class="px-1.5 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/5 text-[7px] text-cyan-400/80 font-mono leading-none shadow-[0_0_10px_rgba(6,182,212,0.1)]">ENTER</span>
                            </div>
                        </button>
                        
                        <div class="text-center mt-1">
                            <span class="app-version-display text-[8px] text-cyan-400/50 uppercase tracking-[0.4em] font-mono">${this.version}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Marca de Agua / Versión Inferior -->
            <div class="absolute bottom-8 right-10 opacity-20 pointer-events-none">
                <span class="text-[7px] text-white uppercase tracking-widest">© 2026 Abyss Corp. // All Rights Reserved.</span>
            </div>
        `;

        document.body.appendChild(this.container);
        this.injectStyles();

        // Generar capas de partículas con diferentes densidades y velocidades
        this.createParticles('splash-particles-far', 60, 0.4, 1.5);
        this.createParticles('splash-particles-mid', 40, 1.0, 3);
        this.createParticles('splash-particles-near', 25, 2.2, 5);

        if (window.lucide) window.lucide.createIcons();

        const btn = document.getElementById('start-mission-btn');
        if (btn) btn.addEventListener('click', () => this.hide());

        const configBtn = document.getElementById('splash-config-btn');
        if (configBtn) configBtn.addEventListener('click', () => {
            if (typeof toggleMenu === 'function') {
                toggleMenu();
            }
        });

        // Manejador de teclado para Enter (Mission Start / Close Portal)
        this._handleKeyDown = (e) => {
            if (e.code === 'Enter') {
                // Si la modal de información está abierta, cerrarla y no iniciar el juego aún
                if (this._closeStartPortal()) return;

                // Solo si el menú no está abierto
                if (typeof isMenuOpen !== 'undefined' && !isMenuOpen) {
                    this.hide();
                }
            }
        };
        window.addEventListener('keydown', this._handleKeyDown);
    }

    injectStyles() {
        if (document.getElementById('splash-enhanced-styles')) return;

        const style = document.createElement('style');
        style.id = 'splash-enhanced-styles';
        style.innerHTML = `
            @keyframes bioScan {
                0% { top: 0%; opacity: 0; }
                5% { opacity: 1; }
                95% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
            @keyframes hologramPulse {
                0%, 100% { transform: scale(1); opacity: 0.1; }
                50% { transform: scale(1.05); opacity: 0.2; }
            }
            @keyframes hudPulse {
                0%, 100% { opacity: 0.4; border-color: rgba(6, 182, 212, 0.4); }
                50% { opacity: 1; border-color: rgba(6, 182, 212, 1); }
            }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes particleFloat {
                0% { transform: translateY(100vh) translateX(0); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(-100px) translateX(30px); opacity: 0; }
            }
            @keyframes caustics {
                0% { background-position: 0% 0%; }
                100% { background-position: 100% 100%; }
            }
            @keyframes heartbeat {
                0%, 100% { 
                    transform: scale(1); 
                    opacity: 0.6;
                    filter: drop-shadow(0 0 0px rgba(0, 242, 255, 0));
                }
                50% { 
                    transform: scale(1.04); 
                    opacity: 1;
                    filter: drop-shadow(0 0 8px rgba(0, 242, 255, 0.8)) drop-shadow(0 0 20px rgba(0, 242, 255, 0.4));
                }
            }
            .animate-heartbeat {
                animation: heartbeat 6s ease-in-out infinite;
                will-change: transform, opacity, filter;
            }
            #start-mission-btn i {
                transition: all 0.5s ease;
            }
            #start-mission-btn:hover i {
                filter: drop-shadow(0 0 10px rgba(0, 242, 255, 1)) drop-shadow(0 0 25px rgba(0, 242, 255, 0.6)) !important;
                transform: scale(1.15) !important;
            }
            #start-mission-btn:hover {
                animation-play-state: paused;
                transform: scale(1.02);
                background: rgba(6, 182, 212, 0.25);
                border-color: rgba(6, 182, 212, 1);
                box-shadow: 0 0 40px rgba(6, 182, 212, 0.5);
                opacity: 1 !important;
            }
            #caustics-overlay {
                background: repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0% 2%, transparent 2% 4%);
                background-size: 200% 200%;
                animation: caustics 40s linear infinite;
                mask-image: radial-gradient(circle at 50% 50%, black, transparent);
            }
        `;
        document.head.appendChild(style);
    }

    createParticles(containerId, count, baseSize, speedMult) {
        const container = document.getElementById(containerId);
        if (!container) return;

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            const size = baseSize * (0.5 + Math.random());
            const duration = (15 + Math.random() * 20) / speedMult;
            const delay = Math.random() * -duration;

            p.className = 'absolute bg-cyan-200/40 rounded-full blur-[1px]';
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${Math.random() * 100}%`;
            p.style.opacity = Math.random() * 0.5 + 0.2;
            p.style.animation = `particleFloat ${duration}s linear ${delay}s infinite`;

            container.appendChild(p);
        }
    }

    hide() {
        if (this._handleKeyDown) {
            window.removeEventListener('keydown', this._handleKeyDown);
        }

        // Remover el listener si el splash se cierra antes de interactuar (por ejemplo, vía consola)
        window.removeEventListener('click', this._unlockAudio);

        // --- FADE-OUT DE AUDIO ---
        if (this.splashMusic) {
            const fadeInterval = setInterval(() => {
                if (this.splashMusic && this.splashMusic.volume > 0.05) {
                    this.splashMusic.volume -= 0.05;
                } else {
                    clearInterval(fadeInterval);
                    if (this.splashMusic) {
                        this.splashMusic.pause();
                        this.splashMusic = null;
                    }
                }
            }, 50);
        }

        this.container.classList.add('opacity-0');
        if (this.onStart) this.onStart();

        setTimeout(() => {
            this.container.remove();
            const styles = document.getElementById('splash-enhanced-styles');
            if (styles) styles.remove();
        }, 1200);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.SplashScreen = SplashScreen;
}
