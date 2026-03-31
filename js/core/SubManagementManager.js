/**
 * SUBMARINE MANAGEMENT MANAGER
 * [ES] Gestiona la interfaz interna del submarino (Soporte Vital, Oxígeno, Scrubbers).
 * [EN] Manages the submarine's internal interface (Life Support, Oxygen, Scrubbers).
 */

class SubManagementManager {
    constructor() {
        this.isOpen = false;
        this.particles = [[], []]; // Partículas para cada filtro
        this.initialized = false;
    }

    generateParticles(index) {
        this.particles[index] = [];
        const count = 3000; // Máxima densidad para aspecto de "piedras"
        for (let i = 0; i < count; i++) {
            const gray = 100 + Math.random() * 80;
            this.particles[index].push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: 0.6 + Math.random() * 2.8,
                angle: Math.random() * Math.PI * 2,
                sides: 3 + Math.floor(Math.random() * 5), // Polígonos variados
                color: `rgba(${gray}, ${gray + 2}, ${gray + 8}, 0.95)`,
                rotSpeed: (Math.random() - 0.5) * 0.015
            });
        }
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        for (let i = 0; i < 2; i++) {
            this.generateParticles(i);
        }
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        this.firstUpdate = true; // Forzar actualización instantánea de agujas
        this.init();
        const modal = document.getElementById('sub-management-modal');
        const backdrop = document.getElementById('sub-management-backdrop');

        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';

            if (backdrop) {
                backdrop.classList.remove('hidden');
                setTimeout(() => backdrop.style.opacity = '1', 50);
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            for (let i = 0; i < 2; i++) {
                const canvas = document.getElementById(`scrubber-canvas-${i}`);
                if (canvas) {
                    canvas.width = canvas.clientWidth;
                    canvas.height = canvas.clientHeight;
                }
            }
        }
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('macro', 0.4);
        if (typeof window.updateCursorVisibility === 'function') window.updateCursorVisibility();
    }

    close() {
        this.isOpen = false;
        const modal = document.getElementById('sub-management-modal');
        const backdrop = document.getElementById('sub-management-backdrop');

        if (modal) {
            modal.classList.remove('active');
            if (backdrop) {
                backdrop.style.opacity = '0';
                setTimeout(() => backdrop.classList.add('hidden'), 700);
            }
            setTimeout(() => {
                if (!this.isOpen) modal.style.display = 'none';
            }, 500);
        }
        if (typeof window.updateCursorVisibility === 'function') window.updateCursorVisibility();
    }

    update(player) {
        if (!this.isOpen) return;

        // Actualizar fondo de la ESCENA tras la modal
        const backdrop = document.getElementById('sub-management-backdrop');
        if (backdrop) {
            const isOn = player.lightOn;
            const bgImg = isOn ? 'img/controls/light.jpg' : 'img/controls/dark.jpg';
            backdrop.style.backgroundImage = `url(${bgImg})`;

            // Ajuste dinámico de brillo para mayor claridad
            backdrop.style.filter = isOn ? 'brightness(0.9) contrast(1.1)' : 'brightness(0.9) contrast(1.1)';
        }

        this.updateLifeSupportUI(player);
        this.updateScrubbersUI(player);

        const knob = document.getElementById('filter-knob');
        if (knob) {
            knob.style.transform = player.activeScrubberIndex === 0 ? 'rotate(-45deg)' : 'rotate(45deg)';
        }
    }
    updateLifeSupportUI(player) {
        const o2Bar = document.getElementById('mgmt-o2-bar');
        const o2Val = document.getElementById('mgmt-o2-value');
        if (o2Bar) o2Bar.style.width = `${player.oxygen}%`;
        if (o2Val) o2Val.innerText = `${player.oxygen.toFixed(1)}%`;

        const co2Display = document.getElementById('mgmt-co2-display');
        const co2Leds = document.getElementById('mgmt-co2-leds');
        const co2Status = document.getElementById('mgmt-co2-led-status');

        if (co2Display) {
            const conc = 0.025 + (player.co2 / 1000);
            co2Display.innerText = `${conc.toFixed(3)}`;

            if (co2Leds && co2Status) {
                const leds = co2Leds.children;
                if (player.co2 < 40) {
                    // NOMINAL (1 LED ESMERALDA)
                    leds[0].className = "w-1 h-3 bg-emerald-500 rounded-sm shadow-[0_0_5px_#10b981]";
                    leds[1].className = "w-1 h-3 bg-emerald-500/10 rounded-sm";
                    leds[2].className = "w-1 h-3 bg-emerald-500/10 rounded-sm";
                    co2Status.innerText = "Nominal";
                    co2Status.className = "text-[7px] text-emerald-500/40 font-bold uppercase text-center";
                    co2Display.classList.replace('text-red-500', 'text-cyan-400');
                } else if (player.co2 < 80) {
                    // WARNING (2 LEDS AMARILLO)
                    leds[0].className = "w-1 h-3 bg-amber-500 rounded-sm";
                    leds[1].className = "w-1 h-3 bg-amber-500 rounded-sm shadow-[0_0_5px_#f59e0b]";
                    leds[2].className = "w-1 h-3 bg-amber-500/10 rounded-sm";
                    co2Status.innerText = "Warning";
                    co2Status.className = "text-[7px] text-amber-500 font-bold uppercase text-center";
                    co2Display.classList.replace('text-red-500', 'text-cyan-400');
                } else {
                    // CRITICAL (3 LEDS ROJO)
                    leds[0].className = "w-1 h-3 bg-red-500 rounded-sm";
                    leds[1].className = "w-1 h-3 bg-red-500 rounded-sm";
                    leds[2].className = "w-1 h-3 bg-red-500 rounded-sm shadow-[0_0_8px_#ef4444] animate-pulse";
                    co2Status.innerText = "Critical";
                    co2Status.className = "text-[7px] text-red-500 font-bold uppercase text-center";
                    co2Display.classList.replace('text-cyan-400', 'text-red-500');
                }
            }
        }
    }
    updateScrubbersUI(player) {
        player.scrubbers.forEach((s, i) => {
            const canvas = document.getElementById(`scrubber-canvas-${i}`);
            const btnReplace = document.getElementById(`scrubber-replace-${i}`);
            const statusText = document.getElementById(`scrubber-status-${i}`);
            const timerBox = document.getElementById(`timer-box-${i}`);
            const needle = document.getElementById(`gauge-needle-${i}`);
            const gaugePath = document.getElementById(`gauge-path-${i}`);

            const prefix = i === 0 ? 'a' : 'b';
            const lightOk = document.getElementById(`light-${prefix}-ok`);
            const lightFail = document.getElementById(`light-${prefix}-fail`);

            if (canvas) {
                this.drawScrubber(canvas, s.percentage, i);
            }

            // Aguja del manómetro (de -120deg a 120deg)
            if (needle) {
                const angle = -120 + (s.percentage / 100) * 240;
                needle.style.transform = `rotate(${angle}deg)`;
            }

            if (gaugePath) {
                const fullLength = gaugePath.getTotalLength() || 184;
                const offset = fullLength - (s.percentage / 100) * fullLength;

                if (this.firstUpdate) {
                    gaugePath.style.transition = 'none';
                    if (needle) needle.style.transition = 'none';
                } else {
                    gaugePath.style.transition = 'stroke-dashoffset 0.5s ease-out';
                    if (needle) needle.style.transition = 'all 0.5s ease-out';
                }

                gaugePath.style.strokeDasharray = `${fullLength}`;
                gaugePath.style.strokeDashoffset = `${offset}`;
            }

            // Luces de estado
            if (lightOk && lightFail) {
                if (player.activeScrubberIndex === i) {
                    lightOk.classList.add('light-active');
                    lightFail.classList.remove('light-alert');
                } else if (s.percentage <= 0) {
                    lightOk.classList.remove('light-active');
                    lightFail.classList.add('light-alert');
                } else {
                    lightOk.classList.remove('light-active');
                    lightFail.classList.remove('light-alert');
                }
            }

            // Texto de estado
            if (statusText) {
                if (player.activeScrubberIndex === i) {
                    statusText.innerText = "ACTIVO [OK]";
                    statusText.className = "text-emerald-500 text-[10px] font-bold uppercase mb-2";
                } else if (s.percentage <= 0) {
                    statusText.innerText = "AGOTADO [FAIL]";
                    statusText.className = "text-red-500 text-[10px] font-bold uppercase mb-2";
                } else {
                    statusText.innerText = "INACTIVO";
                    statusText.className = "text-white/30 text-[10px] font-bold uppercase mb-2";
                }
            }

            // GESTIÓN DE CONTADORES (Uso o Mantenimiento)
            if (timerBox) {
                if (player.activeScrubberIndex === i) {
                    // MODO USO: Tiempo de vida restante
                    timerBox.classList.remove('opacity-0');
                    const timeLeft = (s.percentage / 100) * FILTER_CONFIG.scrubberDuration * 60;
                    const mins = Math.floor(timeLeft / 60);
                    const secs = Math.floor(timeLeft % 60);
                    timerBox.innerText = `CARGA: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else if (s.percentage < 100 && s.needsReplacement && s.replacementTimer > 0) {
                    // MODO MANTENIMIENTO: Cuenta atrás para recambio
                    timerBox.classList.remove('opacity-0');
                    const mins = Math.floor(s.replacementTimer / 60);
                    const secs = Math.floor(s.replacementTimer % 60);
                    timerBox.innerText = `READY IN: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                    if (statusText) {
                        statusText.innerText = "MANTENIMIENTO";
                        statusText.className = "text-amber-500/60 text-[10px] font-bold uppercase mb-2";
                    }
                } else {
                    timerBox.classList.add('opacity-0');
                }
            }

            // Botón de recambio
            if (btnReplace) {
                if (s.needsReplacement && s.replacementTimer <= 0) {
                    btnReplace.classList.remove('hidden');
                } else {
                    btnReplace.classList.add('hidden');
                }
            }
        });

        // Una vez actualizado todo por primera vez, habilitamos transiciones para el futuro
        this.firstUpdate = false;
    }

    drawScrubber(canvas, percentage, index) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        const pList = this.particles[index];
        const fillY = h * (1 - (percentage / 100));

        ctx.save();
        pList.forEach(p => {
            const px = (p.x / 100) * w;
            const py = (p.y / 100) * h;

            if (py >= fillY) {
                ctx.save();
                ctx.translate(px, py);
                p.angle += p.rotSpeed;
                ctx.rotate(p.angle);

                ctx.beginPath();
                for (let s = 0; s < p.sides; s++) {
                    const angle = (s / p.sides) * Math.PI * 2;
                    const rx = Math.cos(angle) * p.size;
                    const ry = Math.sin(angle) * p.size;
                    if (s === 0) ctx.moveTo(rx, ry);
                    else ctx.lineTo(rx, ry);
                }
                ctx.closePath();
                ctx.fillStyle = p.color;
                ctx.fill();
                ctx.restore();
            }
        });

        const grad = ctx.createLinearGradient(0, fillY, 0, fillY + 15);
        grad.addColorStop(0, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, fillY, w, 15);

        ctx.restore();
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.SubManagementManager = SubManagementManager;
}
