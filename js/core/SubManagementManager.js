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
        // Aumento masivo para relleno total y compactación absoluta
        const count = 3200;
        for (let i = 0; i < count; i++) {
            const r = 2.0 + Math.random() * 1.8;
            const halfLen = r * (0.8 + Math.random() * 0.9);
            const base = 215 + Math.random() * 35;

            this.particles[index].push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                r,
                halfLen,
                angle: Math.random() * Math.PI,
                base,
                reactivity: 0.4 + Math.random() * 1.2,
                // Semilla para micro-gotas de condensación
                sweatSeed: Math.random()
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

            // Invalidar cachés para forzar redibujado con dimensiones reales
            // (NO resizear canvas aquí: clientWidth=0 porque el modal no ha pintado aún)
            this._lastScrubPerc = [];
            this.particleCache = [];
        }
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('macro', 0.4);
        if (typeof window.updateCursorVisibility === 'function') window.updateCursorVisibility();

        // Despertar el manager si la pestaña activa es energía
        if (typeof energyManager !== 'undefined' && typeof subTabManager !== 'undefined') {
            energyManager.isOpen = (subTabManager.currentTab === 'energia');
            if (energyManager.isOpen) energyManager.forceUIDraw();
        }
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

        if (typeof energyManager !== 'undefined') energyManager.isOpen = false;
    }

    update(player) {
        if (!this.isOpen) return;

        // 1. CACHE DE REFERENCIAS DOM (Si no existen)
        if (!this.dom) {
            this.dom = {
                backdrop: document.getElementById('sub-management-backdrop'),
                atmoLed: document.getElementById('simple-atmo-led'),
                atmoText: document.getElementById('simple-atmo-text'),
                knob: document.getElementById('filter-knob'),
                o2Bar: document.getElementById('mgmt-o2-bar'),
                o2Val: document.getElementById('mgmt-o2-value'),
                co2Display: document.getElementById('mgmt-co2-display'),
                co2Leds: document.getElementById('mgmt-co2-leds'),
                co2Status: document.getElementById('mgmt-co2-led-status')
            };
        }

        // 2. OPTIMIZACIÓN DE FONDO (Evitar layouts costosos si el estado es el mismo)
        if (this.dom.backdrop) {
            let bgImg;
            const hasPower = typeof energyManager !== 'undefined' ? !energyManager.isBlackout : true;

            if (player.poisonTimer > 0) {
                bgImg = 'img/controls/alarm.jpg';
            } else {
                bgImg = (player.lightOn && hasPower) ? 'img/controls/light.jpg' : 'img/controls/dark.jpg';
            }

            if (this._lastBgImg !== bgImg) {
                this.dom.backdrop.style.backgroundImage = `url(${bgImg})`;
                this._lastBgImg = bgImg;
            }
        }

        // 3. OPTIMIZACIÓN DE INDICADOR DE ATMÓSFERA
        const isEmergency = player.poisonTimer > 0;
        if (this.dom.atmoLed && this.dom.atmoText && this._lastAtmoState !== isEmergency) {
            if (isEmergency) {
                this.dom.atmoLed.className = "w-2 h-2 rounded-full animate-pulse transition-colors duration-300 bg-red-500 shadow-[0_0_12px_#ef4444]";
                this.dom.atmoText.innerText = "ATMÓSFERA CRÍTICA";
                this.dom.atmoText.className = "text-red-500 text-[9px] uppercase tracking-widest font-black transition-colors duration-300 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]";
            } else {
                this.dom.atmoLed.className = "w-2 h-2 rounded-full animate-pulse transition-colors duration-300 bg-emerald-500 shadow-[0_0_8px_#10b981]";
                this.dom.atmoText.innerText = "ATMÓSFERA ESTABLE";
                this.dom.atmoText.className = "text-white/40 text-[9px] uppercase tracking-widest font-bold transition-colors duration-300";
            }
            this._lastAtmoState = isEmergency;
        }

        this.updateLifeSupportUI(player);
        this.updateScrubbersUI(player);

        if (this.dom.knob) {
            const rotation = player.activeScrubberIndex === 0 ? 'rotate(-45deg)' : 'rotate(45deg)';
            if (this._lastKnobRot !== rotation) {
                this.dom.knob.style.transform = rotation;
                this._lastKnobRot = rotation;
            }
        }
    }
    updateLifeSupportUI(player) {
        // Barras y valores redondeados para evitar ruido en el DOM
        const rO2 = Math.round(player.oxygen * 10) / 10;
        if (this.dom.o2Bar && this._lastO2 !== rO2) {
            this.dom.o2Bar.style.width = `${rO2}%`;
            this._lastO2 = rO2;
        }
        if (this.dom.o2Val && this._lastO2Text !== rO2) {
            this.dom.o2Val.innerText = `${rO2.toFixed(1)}%`;
            this._lastO2Text = rO2;
        }

        if (this.dom.co2Display) {
            const conc = 0.025 + (player.co2 / 1000);
            const rConc = conc.toFixed(3);

            if (this._lastCo2Val !== rConc) {
                this.dom.co2Display.innerText = rConc;
                this._lastCo2Val = rConc;

                if (this.dom.co2Leds && this.dom.co2Status) {
                    const leds = this.dom.co2Leds.children;
                    const co2Level = player.co2 < 40 ? 0 : (player.co2 < 80 ? 1 : 2);

                    if (this._lastCo2Level !== co2Level) {
                        if (co2Level === 0) {
                            leds[0].className = "w-1 h-3 bg-emerald-500 rounded-sm shadow-[0_0_5px_#10b981]";
                            leds[1].className = "w-1 h-3 bg-emerald-500/10 rounded-sm";
                            leds[2].className = "w-1 h-3 bg-emerald-500/10 rounded-sm";
                            this.dom.co2Status.innerText = "Nominal";
                            this.dom.co2Status.className = "text-[7px] text-emerald-500/40 font-bold uppercase text-center";
                            this.dom.co2Display.classList.replace('text-red-500', 'text-cyan-400');
                        } else if (co2Level === 1) {
                            leds[0].className = "w-1 h-3 bg-amber-500 rounded-sm";
                            leds[1].className = "w-1 h-3 bg-amber-500 rounded-sm shadow-[0_0_5px_#f59e0b]";
                            leds[2].className = "w-1 h-3 bg-amber-500/10 rounded-sm";
                            this.dom.co2Status.innerText = "Warning";
                            this.dom.co2Status.className = "text-[7px] text-amber-500 font-bold uppercase text-center";
                            this.dom.co2Display.classList.replace('text-red-500', 'text-cyan-400');
                        } else {
                            leds[0].className = "w-1 h-3 bg-red-500 rounded-sm";
                            leds[1].className = "w-1 h-3 bg-red-500 rounded-sm";
                            leds[2].className = "w-1 h-3 bg-red-500 rounded-sm shadow-[0_0_8px_#ef4444] animate-pulse";
                            this.dom.co2Status.innerText = "Critical";
                            this.dom.co2Status.className = "text-[7px] text-red-500 font-bold uppercase text-center";
                            this.dom.co2Display.classList.replace('text-cyan-400', 'text-red-500');
                        }
                        this._lastCo2Level = co2Level;
                    }
                }
            }
        }
    }
    updateScrubbersUI(player) {
        if (!this._scrubDOM) this._scrubDOM = [{}, {}];

        player.scrubbers.forEach((s, i) => {
            const dom = this._scrubDOM[i];

            // Cachear elementos si no existen
            if (!dom.canvas) {
                const prefix = i === 0 ? 'a' : 'b';
                dom.canvas = document.getElementById(`scrubber-canvas-${i}`);
                dom.btnReplace = document.getElementById(`scrubber-replace-${i}`);
                dom.statusText = document.getElementById(`scrubber-status-${i}`);
                dom.timerBox = document.getElementById(`timer-box-${i}`);
                dom.needle = document.getElementById(`gauge-needle-${i}`);
                dom.gaugePath = document.getElementById(`gauge-path-${i}`);
                dom.lightOk = document.getElementById(`light-${prefix}-ok`);
                dom.lightFail = document.getElementById(`light-${prefix}-fail`);
            }

            // Dibujar canvas del filtro
            if (dom.canvas) {
                const cw = dom.canvas.clientWidth;
                const ch = dom.canvas.clientHeight;

                if (cw > 0 && ch > 0) {
                    const needsRedraw = this._lastScrubPerc?.[i] !== s.percentage || this._lastWidth?.[i] !== cw;
                    if (needsRedraw) {
                        if (this._lastWidth && this._lastWidth[i] !== cw && this.particleCache) {
                            this.particleCache[i] = null; // Invalidar caché si cambió el tamaño
                        }
                        this.drawScrubber(dom.canvas, s.percentage, i);

                        if (!this._lastScrubPerc) this._lastScrubPerc = [];
                        if (!this._lastWidth) this._lastWidth = [];

                        this._lastScrubPerc[i] = s.percentage;
                        this._lastWidth[i] = cw;
                    }
                }
            }

            // Aguja y Path (Redondeado para evitar jitter)
            const rPerc = Math.round(s.percentage * 10) / 10;
            if (dom.needle && dom._lastPerc !== rPerc) {
                const angle = -120 + (rPerc / 100) * 240;
                dom.needle.style.transform = `rotate(${angle}deg)`;
            }

            if (dom.gaugePath && dom._lastPerc !== rPerc) {
                const fullLength = dom.gaugePath.getTotalLength() || 184;
                const offset = fullLength - (rPerc / 100) * fullLength;

                if (this.firstUpdate) {
                    dom.gaugePath.style.transition = 'none';
                    if (dom.needle) dom.needle.style.transition = 'none';
                } else if (dom._lastPerc === undefined) {
                    dom.gaugePath.style.transition = 'stroke-dashoffset 0.5s ease-out';
                    if (dom.needle) dom.needle.style.transition = 'all 0.5s ease-out';
                }

                dom.gaugePath.style.strokeDasharray = `${fullLength}`;
                dom.gaugePath.style.strokeDashoffset = `${offset}`;
            }
            dom._lastPerc = rPerc;

            // Luces de estado (Exclusivas)
            // Luz Verde: Solo si tiene carga Y es el seleccionado
            const isOkActive = s.percentage > 0 && player.activeScrubberIndex === i;
            // Luz Roja: Solo si está totalmente agotado (0%)
            const isFailActive = s.percentage <= 0;

            if (dom.lightOk && dom._lastOk !== isOkActive) {
                dom.lightOk.classList.toggle('light-active', isOkActive);
                dom._lastOk = isOkActive;
            }
            if (dom.lightFail && dom._lastFail !== isFailActive) {
                dom.lightFail.classList.toggle('light-alert', isFailActive);
                dom._lastFail = isFailActive;
            }

            // Texto de estado
            const stateKey = `${player.activeScrubberIndex === i}_${s.percentage <= 0}_${s.needsReplacement && s.replacementTimer > 0}`;
            if (dom.statusText && dom._lastStateKey !== stateKey) {
                if (player.activeScrubberIndex === i) {
                    dom.statusText.innerText = "ACTIVO [OK]";
                    dom.statusText.className = "text-emerald-500 text-[10px] font-bold uppercase mb-2";
                } else if (s.percentage <= 0) {
                    dom.statusText.innerText = "AGOTADO [FAIL]";
                    dom.statusText.className = "text-red-500 text-[10px] font-bold uppercase mb-2";
                } else if (s.needsReplacement && s.replacementTimer > 0) {
                    dom.statusText.innerText = "MANTENIMIENTO";
                    dom.statusText.className = "text-amber-500/60 text-[10px] font-bold uppercase mb-2";
                } else {
                    dom.statusText.innerText = "INACTIVO";
                    dom.statusText.className = "text-white/30 text-[10px] font-bold uppercase mb-2";
                }
                dom._lastStateKey = stateKey;
            }

            // GESTIÓN DE CONTADORES
            if (dom.timerBox) {
                let timerText = "";
                let isHidden = false;

                if (player.activeScrubberIndex === i) {
                    const timeLeft = (s.percentage / 100) * FILTER_CONFIG.scrubberDuration * 60;
                    const mins = Math.floor(timeLeft / 60);
                    const secs = Math.floor(timeLeft % 60);
                    timerText = `CARGA: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else if (s.percentage < 100 && s.needsReplacement && s.replacementTimer > 0) {
                    const mins = Math.floor(s.replacementTimer / 60);
                    const secs = Math.floor(s.replacementTimer % 60);
                    timerText = `READY IN: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                    isHidden = true;
                }

                if (dom._lastTimerText !== timerText || dom._lastHidden !== isHidden) {
                    dom.timerBox.innerText = timerText;
                    dom.timerBox.classList.toggle('opacity-0', isHidden);
                    dom._lastTimerText = timerText;
                    dom._lastHidden = isHidden;
                }
            }

            // Botón de recambio
            const showReplace = s.needsReplacement && s.replacementTimer <= 0;
            if (dom.btnReplace && dom._lastShowReplace !== showReplace) {
                dom.btnReplace.classList.toggle('hidden', !showReplace);
                dom._lastShowReplace = showReplace;
            }
        });

        // Una vez actualizado todo por primera vez, habilitamos transiciones para el futuro
        this.firstUpdate = false;
    }

    getOverlayCache(w, h) {
        if (!this.overlayCache || this.overlayCache.width !== w || this.overlayCache.height !== h) {
            const oc = document.createElement('canvas');
            oc.width = w; oc.height = h;
            const ctx = oc.getContext('2d');

            // Reflejo principal
            const glassGrad1 = ctx.createLinearGradient(0, 0, w, 0);
            glassGrad1.addColorStop(0, 'rgba(255,255,255,0)');
            glassGrad1.addColorStop(0.1, 'rgba(255,255,255,0.02)');
            glassGrad1.addColorStop(0.18, 'rgba(255,255,255,0.45)');
            glassGrad1.addColorStop(0.25, 'rgba(255,255,255,0.1)');
            glassGrad1.addColorStop(0.35, 'rgba(255,255,255,0)');
            ctx.fillStyle = glassGrad1; ctx.fillRect(0, 0, w, h);

            // Reflejo secundario
            const glassGrad2 = ctx.createLinearGradient(0, 0, w, 0);
            glassGrad2.addColorStop(0.7, 'rgba(255,255,255,0)');
            glassGrad2.addColorStop(0.82, 'rgba(255,255,255,0.15)');
            glassGrad2.addColorStop(0.92, 'rgba(255,255,255,0)');
            ctx.fillStyle = glassGrad2; ctx.fillRect(0, 0, w, h);

            // Reflejos cyan
            const innerShadow = ctx.createLinearGradient(0, 0, w, 0);
            innerShadow.addColorStop(0, 'rgba(6,182,212,0.15)');
            innerShadow.addColorStop(0.08, 'transparent');
            innerShadow.addColorStop(0.92, 'transparent');
            innerShadow.addColorStop(1, 'rgba(6,182,212,0.1)');
            ctx.fillStyle = innerShadow; ctx.fillRect(0, 0, w, h);

            // Sombra casquillos
            const capShadow = ctx.createLinearGradient(0, 0, 0, h);
            capShadow.addColorStop(0, 'rgba(0,0,0,0.9)');
            capShadow.addColorStop(0.12, 'transparent');
            capShadow.addColorStop(0.88, 'transparent');
            capShadow.addColorStop(1, 'rgba(0,0,0,0.9)');
            ctx.fillStyle = capShadow; ctx.fillRect(0, 0, w, h);

            this.overlayCache = oc;
        }
        return this.overlayCache;
    }

    getParticleCache(index, w, h) {
        if (!this.particleCache) this.particleCache = [];
        if (!this.particleCache[index] || this.particleCache[index].width !== w || this.particleCache[index].height !== h) {
            const oc = document.createElement('canvas');
            oc.width = w; oc.height = h;
            const ctx = oc.getContext('2d');

            // DIBUJAR CÁPSULAS CILÍNDRICAS (forma pastilla real de cal sodada)
            this.particles[index].forEach(p => {
                const px = (p.x / 100) * w;
                const py = (p.y / 100) * h;

                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(p.angle);

                // Forma cápsula: rect con semicírculos en los extremos
                ctx.beginPath();
                ctx.moveTo(-p.halfLen, -p.r);
                ctx.lineTo(p.halfLen, -p.r);
                ctx.arc(p.halfLen, 0, p.r, -Math.PI / 2, Math.PI / 2);
                ctx.lineTo(-p.halfLen, p.r);
                ctx.arc(-p.halfLen, 0, p.r, Math.PI / 2, 3 * Math.PI / 2);
                ctx.closePath();

                // Gradiente cilíndrico: claro arriba → oscuro abajo (iluminación cenital)
                const v = p.base;
                const grad = ctx.createLinearGradient(0, -p.r, 0, p.r);
                grad.addColorStop(0, `rgb(${Math.min(255, v + 30)},${Math.min(255, v + 30)},${Math.min(255, v + 27)})`);
                grad.addColorStop(0.25, `rgb(${Math.min(255, v + 18)},${Math.min(255, v + 18)},${Math.min(255, v + 15)})`);
                grad.addColorStop(0.55, `rgb(${v},${v},${Math.max(0, v - 3)})`);
                grad.addColorStop(1, `rgb(${Math.max(0, v - 35)},${Math.max(0, v - 35)},${Math.max(0, v - 38)})`);
                ctx.fillStyle = grad;
                ctx.fill();

                // Micro-highlight especular en el tope de la cápsula
                ctx.beginPath();
                ctx.moveTo(-p.halfLen * 0.6, -p.r * 0.8);
                ctx.lineTo(p.halfLen * 0.6, -p.r * 0.8);
                ctx.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.1})`;
                ctx.lineWidth = p.r * 0.25;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Borde oscuro para separación entre cápsulas
                ctx.beginPath();
                ctx.moveTo(-p.halfLen, -p.r);
                ctx.lineTo(p.halfLen, -p.r);
                ctx.arc(p.halfLen, 0, p.r, -Math.PI / 2, Math.PI / 2);
                ctx.lineTo(-p.halfLen, p.r);
                ctx.arc(-p.halfLen, 0, p.r, Math.PI / 2, 3 * Math.PI / 2);
                ctx.closePath();
                ctx.strokeStyle = 'rgba(0,0,0,0.28)';
                ctx.lineWidth = 0.5;
                ctx.lineCap = 'butt';
                ctx.stroke();

                ctx.restore();
            });

            // Curva de profundidad cilíndrica del recipiente (oscurece bordes laterales)
            ctx.globalCompositeOperation = 'multiply';
            const depthGrad = ctx.createLinearGradient(0, 0, w, 0);
            depthGrad.addColorStop(0, 'rgba(0,0,0,0.88)');
            depthGrad.addColorStop(0.12, 'rgba(200,200,200,1)');
            depthGrad.addColorStop(0.45, 'rgba(255,255,255,1)');
            depthGrad.addColorStop(0.78, 'rgba(185,185,185,1)');
            depthGrad.addColorStop(1, 'rgba(0,0,0,0.88)');
            ctx.fillStyle = depthGrad;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';

            this.particleCache[index] = oc;
        }
        return this.particleCache[index];
    }

    drawScrubber(canvas, percentage, index) {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;

        if (cw === 0 || ch === 0) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
        }
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
        // -------------------------------------------

        const saturation = 1 - (percentage / 100);

        // 1. FONDO (Gris mineral oscuro)
        ctx.fillStyle = '#1c1e24';
        ctx.fillRect(0, 0, cw, ch);

        // 2. PRE-RENDER DE PELLET MAESTRO (Relieve Mineral y Volumen)
        if (!this._pelletMaster || this._pelletMaster.dpr !== dpr) {
            const createMaster = (color, shadowColor, isSat) => {
                const pc = document.createElement('canvas');
                pc.width = 40 * dpr; pc.height = 40 * dpr;
                const pctx = pc.getContext('2d');
                pctx.scale(dpr * 2, dpr * 2);

                const x = 2, y = 2, w = 11, h = 7, r = 1.8;
                pctx.fillStyle = 'rgba(0,0,0,0.45)';
                pctx.beginPath(); pctx.roundRect(x + 0.5, y + 1.5, w, h, r); pctx.fill();

                // Cuerpo Mineral
                const grad = pctx.createLinearGradient(x, y, x, y + h);
                if (!isSat) {
                    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, color); grad.addColorStop(1, '#b0aca2');
                } else {
                    // PÉRDIDA DE POROSIDAD (Pétreo y liso)
                    grad.addColorStop(0, '#a78bfa'); grad.addColorStop(0.3, color); grad.addColorStop(1, '#4c1d95');
                }
                pctx.fillStyle = grad;
                pctx.beginPath(); pctx.roundRect(x, y, w, h, r); pctx.fill();

                pctx.strokeStyle = `rgba(0,0,0,${isSat ? 0.4 : 0.2})`;
                pctx.lineWidth = 0.4; pctx.stroke();

                // Brillo Especular (Mate vs Pétreo)
                pctx.fillStyle = isSat ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
                pctx.fillRect(x + 1, y + 1, isSat ? 2 : 6, 1);

                // SUDOR QUÍMICO INTEGRADO (Micro-gotas en el gránulo)
                if (isSat) {
                    pctx.fillStyle = 'rgba(255,255,255,0.7)';
                    pctx.beginPath(); pctx.arc(x + 8, y + 2, 0.6, 0, Math.PI * 2); pctx.fill();
                    pctx.beginPath(); pctx.arc(x + 3, y + 5, 0.4, 0, Math.PI * 2); pctx.fill();
                }

                return pc;
            };
            this._pelletMaster = createMaster('#eae7df', 'rgba(0,0,0,0.4)', false);
            this._pelletViolet = createMaster('#8022d9', 'rgba(0,0,0,0.6)', true);
            this._pelletMaster.dpr = dpr;
        }

        // 3. DIBUJAR PELLETS (Imagen estática nítida)
        this.particles[index].forEach(p => {
            const px = Math.floor((p.x / 100) * cw);
            const pyPerc = (p.y / 100);
            const py = Math.floor(pyPerc * ch);

            const edgeEffect = Math.max(0, 1 - Math.abs(pyPerc - 0.5) * 2.2);
            const pSat = Math.max(0, Math.min(1, (saturation * 2.2 * p.reactivity) - (edgeEffect * 0.5)));

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(p.angle);

            const size = p.r * 4.5;
            ctx.globalAlpha = 1.0;
            ctx.drawImage(this._pelletMaster, -size / 2, -size / 2, size, size);

            if (pSat > 0.05) {
                ctx.globalAlpha = pSat;
                ctx.drawImage(this._pelletViolet, -size / 2, -size / 2, size, size);
            }
            ctx.restore();
        });

        // 4. CONDENSACIÓN, VAPOR Y POLVO RESIDUAL
        if (saturation > 0.1) {
            ctx.save();
            const fogAlpha = Math.min(0.28, saturation * 0.45);
            const fogGrad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, ch * 0.8);
            fogGrad.addColorStop(0, `rgba(255,255,255,${fogAlpha * 0.3})`);
            fogGrad.addColorStop(1, `rgba(255,255,255,${fogAlpha})`);
            ctx.fillStyle = fogGrad;
            ctx.fillRect(0, 0, cw, ch);

            // POLVO DE CAL RESIDUAL (Fragilidad post-uso)
            if (saturation > 0.85) {
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                for (let j = 0; j < 15; j++) {
                    const dx = Math.floor(((Math.sin(j * 22.1) + 1) / 2) * cw);
                    const dy = Math.floor(((Math.cos(j * 33.4) + 1) / 2) * ch);
                    ctx.fillRect(dx, dy, 1, 1);
                }
            }

            const dropCount = Math.floor(saturation * 35);
            for (let i = 0; i < dropCount; i++) {
                const dx = Math.floor(((Math.sin(i * 15.4) + 1) / 2) * cw);
                const dy = Math.floor(((Math.cos(i * 37.8) + 1) / 2) * ch);
                const dr = (0.5 + (Math.sin(i * 7.1) + 1) * 0.6) * Math.min(1, (saturation * 2));
                ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; ctx.fill();
                ctx.beginPath(); ctx.arc(dx - dr * 0.3, dy - dr * 0.3, dr * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'white'; ctx.fill();
                ctx.beginPath(); ctx.arc(dx + dr * 0.2, dy + dr * 0.2, dr, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; ctx.lineWidth = 0.3; ctx.stroke();
            }
            ctx.restore();
        }

        // 5. OVERLAY
        ctx.drawImage(this.getOverlayCache(cw, ch), 0, 0, cw, ch);
    }
}

// Exportar
if (typeof window !== 'undefined') {
    window.SubManagementManager = SubManagementManager;
}
