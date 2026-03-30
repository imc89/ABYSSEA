/**
 * LOADING SCREEN
 * [ES] Pantalla de carga atmosférica. Gestiona la transición técnica hacia el juego.
 * [EN] Atmospheric loading screen. Manages the technical transition to the game.
 */

class LoadingScreen {
    constructor() {
        this.container = null;
        this.progress = 0;
        this.audio = new Audio('audio/loading.mp3');
        this.audio.loop = true;
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.id = 'loading-screen';
        this.container.className = 'fixed inset-0 z-[600] flex flex-col items-center justify-center bg-[#00040a] transition-opacity duration-1000 overflow-hidden';
        
        this.container.innerHTML = `
            <!-- Fondo Abisal Profundo -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#0c2a35_0%,_#000_100%)] opacity-80"></div>
            
            <!-- Efectos de Consola CRT -->
            <div class="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-20">
                <div class="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_3px,2px_100%]"></div>
                <div class="absolute inset-0 animate-[scanline_8s_linear_infinite] bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-20 w-full opacity-30"></div>
            </div>

            <!-- Estructura de la Consola -->
            <div class="relative z-10 w-full max-w-2xl flex flex-col gap-8 px-10">
                
                <!-- Cabecera de la Consola -->
                <div class="flex justify-between items-end border-b border-cyan-500/30 pb-4">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <i data-lucide="terminal" class="w-4 h-4 text-cyan-400"></i>
                            <span class="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.4em]">Sub-Surface Command OS <span class="app-version-display ml-1">${window.ABYSS_VERSION || 'v1.0.0'}</span></span>
                        </div>
                        <span class="text-cyan-500/30 text-[7px] uppercase tracking-widest pl-6">Deep Water Exploration Protocol // Mariana Trench</span>
                    </div>
                    <div class="text-right">
                        <span id="loading-percent" class="text-white font-mono text-3xl font-black tracking-tighter transition-all duration-300">0%</span>
                        <div class="text-[6px] text-cyan-500/40 uppercase tracking-widest mt-1">Sync Integrity</div>
                    </div>
                </div>

                <!-- Cuerpo de la Consola (Checklist) -->
                <div class="bg-[#000d12]/60 backdrop-blur-md border border-white/5 rounded-xl p-8 shadow-2xl relative overflow-hidden group">
                    <!-- Brillo Interior de Pantalla -->
                    <div class="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-transparent pointer-events-none"></div>
                    
                    <!-- Lista de Tareas Tecnológicas -->
                    <div id="loading-tasks" class="space-y-4 font-mono">
                        <!-- Las tareas se inyectarán dinámicamente -->
                    </div>
                </div>

                <!-- Footer de la Consola (Barra de Progreso y Sonar Mini) -->
                <div class="flex items-center gap-8">
                    <!-- Sonar de Apoyo -->
                    <div class="relative w-16 h-16 opacity-40 shrink-0">
                        <div class="absolute inset-0 border border-cyan-500/20 rounded-full"></div>
                        <div class="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]" 
                             style="background: conic-gradient(from 0deg, #06b6d430 0%, transparent 40%);"></div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_10px_#06b6d4]"></div>
                        </div>
                    </div>

                    <!-- Barra de Progreso Maestra -->
                    <div class="flex-grow space-y-3">
                        <div class="flex justify-between text-[7px] text-cyan-500/50 uppercase tracking-widest">
                            <span>Main System Load</span>
                            <span id="loading-status">Inicializando...</span>
                        </div>
                        <div class="h-1.5 w-full bg-cyan-500/5 rounded-full border border-white/5 overflow-hidden">
                            <div id="loading-bar-fill" class="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Marca de Agua / Seguridad -->
            <div class="absolute bottom-10 flex flex-col items-center opacity-10 gap-2">
                <div class="w-40 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"></div>
                <span class="text-[6px] text-white uppercase tracking-[1em]">Restricted Access // Abyss Corp</span>
            </div>
        `;

        document.body.appendChild(this.container);
        this.injectStyles();
        
        if (window.lucide) window.lucide.createIcons();

        // Inicializar las tareas
        this.tasks = [
            { id: 'pressure', text: 'CALIBRANDO SENSORES DE PRESIÓN', weight: 15 },
            { id: 'oxygen', text: 'COMPROBANDO TANQUES DE OXÍGENO', weight: 15 },
            { id: 'lighting', text: 'COMPROBANDO SISTEMAS DE ILUMINACIÓN', weight: 15 },
            { id: 'sonar', text: 'PROBANDO SISTEMA SONAR', weight: 15 },
            { id: 'tracking', text: 'SINCRONIZANDO SISTEMA DE RASTREO', weight: 15 },
            { id: 'thrusters', text: 'ENCENDIENDO PROPULSORES', weight: 15 },
            { id: 'immersion', text: 'COMENZANDO INMERSIÓN', weight: 10 }
        ];

        this.renderTasks();

        // Reproducir audio de carga
        this.audio.volume = 0.5;
        this.audio.play().catch(e => console.warn("Audio playback blocked:", e));
    }

    injectStyles() {
        if (document.getElementById('loading-enhanced-styles')) return;
        const style = document.createElement('style');
        style.id = 'loading-enhanced-styles';
        style.innerHTML = `
            @keyframes scanline {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100vh); }
            }
            .task-loading .status-bar-fill {
                background: #06b6d4;
                box-shadow: 0 0 8px #06b6d4;
            }
            .task-done .status-bar-fill {
                background: #4ade80 !important;
                box-shadow: 0 0 10px #4ade80 !important;
                width: 100% !important;
            }
            .task-done .status-box {
                background: #4ade80;
                box-shadow: 0 0 10px #4ade80;
            }
            .status-box {
                width: 6px;
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 1px;
                transition: all 0.3s ease;
            }
            .status-bar-container {
                width: 60px;
                height: 3px;
                background: rgba(255,255,255,0.05);
                border-radius: 10px;
                overflow: hidden;
                border: 1px solid rgba(255,255,255,0.05);
            }
            .status-bar-fill {
                height: 100%;
                width: 0%;
                transition: width 0.2s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    renderTasks() {
        const container = document.getElementById('loading-tasks');
        if (!container) return;

        container.innerHTML = this.tasks.map(task => `
            <div id="task-${task.id}" class="flex items-center justify-between opacity-10 transition-all duration-700 translate-x-[-10px]">
                <div class="flex items-center gap-4">
                    <div class="status-box"></div>
                    <span class="text-[9px] text-cyan-100/80 tracking-widest">${task.text}</span>
                </div>
                <div class="flex items-center gap-4">
                    <div class="status-bar-container">
                        <div class="status-bar-fill"></div>
                    </div>
                    <span class="text-[8px] text-cyan-500/40 status-text w-16 text-right">[PENDIENTE]</span>
                </div>
            </div>
        `).join('');
    }

    updateStatus(taskId, status, taskProgress = 0) {
        const taskEl = document.getElementById(`task-${taskId}`);
        if (!taskEl) return;

        const statusTextEl = taskEl.querySelector('.status-text');
        const barFillEl = taskEl.querySelector('.status-bar-fill');
        
        if (status === 'active') {
            taskEl.classList.remove('opacity-10');
            taskEl.classList.add('opacity-100', 'translate-x-[0px]', 'task-loading');
            if (barFillEl) barFillEl.style.width = `${taskProgress}%`;
            if (statusTextEl) {
                statusTextEl.innerText = `[${Math.floor(taskProgress)}%]`;
                statusTextEl.className = 'text-[8px] text-cyan-400 status-text w-16 text-right';
            }
        } else if (status === 'done') {
            taskEl.classList.remove('task-loading', 'opacity-10');
            taskEl.classList.add('task-done', 'opacity-100', 'translate-x-[0px]');
            if (barFillEl) barFillEl.style.width = '100%';
            if (statusTextEl) {
                statusTextEl.innerText = '[OK]';
                statusTextEl.className = 'text-[8px] text-green-400 status-text w-16 text-right';
            }
        }
    }

    update(progress) {
        this.progress = Math.min(100, Math.max(0, progress));
        
        const bar = document.getElementById('loading-bar-fill');
        const percent = document.getElementById('loading-percent');
        const status = document.getElementById('loading-status');

        if (bar) bar.style.width = `${this.progress}%`;
        if (percent) percent.innerText = `${Math.floor(this.progress)}%`;
        
        let cumulativeWeight = 0;
        this.tasks.forEach(task => {
            const nextWeight = cumulativeWeight + task.weight;
            if (this.progress >= cumulativeWeight && this.progress < nextWeight) {
                // Calcular progreso individual de la tarea
                const taskRelativeProgress = ((this.progress - cumulativeWeight) / task.weight) * 100;
                this.updateStatus(task.id, 'active', taskRelativeProgress);
                if (status) status.innerText = task.text + '...';
            } else if (this.progress >= nextWeight) {
                this.updateStatus(task.id, 'done');
            }
            cumulativeWeight = nextWeight;
        });

        if (this.progress >= 100 && status) {
            status.innerText = "SISTEMAS LISTOS";
            status.style.color = "#4ade80";
        }
    }

    finish(onFinish) {
        this.update(100);
        
        // Fade out audio
        const fadeInterval = setInterval(() => {
            if (this.audio.volume > 0.05) {
                this.audio.volume -= 0.05;
            } else {
                this.audio.pause();
                this.audio.volume = 0;
                clearInterval(fadeInterval);
            }
        }, 100);

        setTimeout(() => {
            this.container.classList.add('opacity-0');
            setTimeout(() => {
                this.container.remove();
                const styles = document.getElementById('loading-enhanced-styles');
                if (styles) styles.remove();
                if (onFinish) onFinish();
            }, 1000);
        }, 1200);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.LoadingScreen = LoadingScreen;
}
