class ManagementTutorialManager {
    constructor() {
        this.steps = [];
        this.currentStep = 0;
        this.isActive = false;
        this.savedEnergy = null;
        this.domCache = {};
        this.timeouts = [];
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    handleKeydown(e) {
        if (e.key === 'Enter') {
            const endModal = document.getElementById('tutorial-end-modal');
            if (endModal && !endModal.classList.contains('hidden')) {
                this.closeEndModal();
            }
        }
    }

    schedule(fn, delay) {
        const t = setTimeout(fn, delay);
        this.timeouts.push(t);
    }

    clearTimeouts() {
        this.timeouts.forEach(t => clearTimeout(t));
        this.timeouts = [];
    }

    init() {
        if (localStorage.getItem('abyss_management_tutorial_done') === 'true') return;
        
        // Ensure overlay elements exist
        this.createOverlay();

        this.steps = [
            // ENERGÍA
            {
                tab: 'energia',
                targetSelector: '#energy-pct-text',
                titleKey: 'tut_step1_title',
                textKey: 'tut_step1_text',
                action: () => {
                    const el = document.getElementById('energy-pct-text');
                    if(el && el.parentElement) el.parentElement.classList.add('animate-pulse');
                },
                cleanup: () => {
                    const el = document.getElementById('energy-pct-text');
                    if(el && el.parentElement) el.parentElement.classList.remove('animate-pulse');
                }
            },
            {
                tab: 'energia',
                targetSelector: '#energy-switches-container',
                titleKey: 'tut_step2_title',
                textKey: 'tut_step2_text',
            },
            {
                tab: 'energia',
                targetSelector: '#energy-switches-container > div:nth-child(1)',
                titleKey: 'tut_step3_title',
                textKey: 'tut_step3_text',
                action: () => {
                    this.schedule(() => {
                        const guard = document.querySelector("#energy-switches-container > div:nth-child(1) > div.flex.items-center.shrink-0.ml-2 > div > input.guard");
                        if (guard) guard.click();
                    }, 1500);
                }
            },
            {
                tab: 'energia',
                targetSelector: '#energy-switches-container > div:nth-child(1)',
                titleKey: 'tut_step4_title',
                textKey: 'tut_step4_text',
                action: () => {
                    this.schedule(() => {
                        const faroSwitch = document.getElementById('sw-faro');
                        if (faroSwitch && window.energyManager) faroSwitch.click();
                    }, 500);
                }
            },
            {
                tab: 'energia',
                targetSelector: '#energy-switches-container > div:nth-child(1)',
                titleKey: 'tut_step5_title',
                textKey: 'tut_step5_text',
                action: () => {
                    this.schedule(() => {
                        const faroSwitch = document.getElementById('sw-faro');
                        if (faroSwitch && window.energyManager && !faroSwitch.checked) faroSwitch.click();
                    }, 500);
                    this.schedule(() => {
                        const guard = document.querySelector("#energy-switches-container > div:nth-child(1) > div.flex.items-center.shrink-0.ml-2 > div > input.guard");
                        if (guard && guard.checked) guard.click();
                    }, 1500);
                }
            },
            {
                tab: 'energia',
                targetSelector: '#energy-pct-text',
                titleKey: 'tut_step6_title',
                textKey: 'tut_step6_text',
                action: () => {
                    this.schedule(() => {
                        if (window.energyManager) {
                            this.savedEnergy = window.energyManager.battery;
                            window.energyManager.battery = 0;
                            window.energyManager.isBlackout = true;
                            window.energyManager.forceUIDraw();
                        }
                    }, 1000);
                }
            },
            {
                tab: 'energia',
                targetSelector: '#energy-cells-container',
                titleKey: 'tut_step7_title',
                textKey: 'tut_step7_text',
                action: () => {
                    this.schedule(() => {
                        if (window.energyManager && window.energyManager.cells[0].state === 'full') {
                            window.energyManager.startBatterySwap(0);
                        }
                    }, 1000);
                },
                cleanup: () => {
                    if (window.energyManager && this.savedEnergy !== null) {
                        window.energyManager.isSwapping = false;
                        window.energyManager.isBlackout = false;
                        window.energyManager.battery = this.savedEnergy;
                        if (window.energyManager.cells[0]) window.energyManager.cells[0].state = 'full';
                        window.energyManager.forceUIDraw();
                    }
                }
            },
            // TEMPERATURA
            {
                tab: 'temperatura',
                targetSelector: '#panel-temperatura > div > div:nth-child(3)',
                titleKey: 'tut_step8_title',
                textKey: 'tut_step8_text',
                action: () => {
                    const el = document.querySelector('#panel-temperatura > div > div:nth-child(3)');
                    if (el) el.classList.add('ring-2', 'ring-cyan-500', 'ring-offset-2', 'ring-offset-black', 'rounded-3xl');
                },
                cleanup: () => {
                    const el = document.querySelector('#panel-temperatura > div > div:nth-child(3)');
                    if (el) el.classList.remove('ring-2', 'ring-cyan-500', 'ring-offset-2', 'ring-offset-black', 'rounded-3xl');
                }
            },
            {
                tab: 'temperatura',
                targetSelector: '#panel-temperatura > div > div:nth-child(4) > div:nth-child(1)',
                titleKey: 'tut_step9_title',
                textKey: 'tut_step9_text',
                action: () => {
                    const btnPlus = document.getElementById('temp-btn-plus');
                    if (btnPlus) {
                        this.schedule(() => { btnPlus.click(); btnPlus.classList.add('bg-cyan-900/50'); }, 1500);
                        this.schedule(() => btnPlus.classList.remove('bg-cyan-900/50'), 1800);
                        this.schedule(() => { btnPlus.click(); btnPlus.classList.add('bg-cyan-900/50'); }, 4500);
                        this.schedule(() => btnPlus.classList.remove('bg-cyan-900/50'), 4800);
                    }
                }
            },
            {
                tab: 'temperatura',
                targetSelector: '#panel-temperatura > div > div:nth-child(4) > div:nth-child(2)',
                titleKey: 'tut_step10_title',
                textKey: 'tut_step10_text',
                action: () => {
                    const btnHeat = document.getElementById('temp-btn-heat');
                    if (btnHeat) {
                        this.schedule(() => btnHeat.click(), 1500);
                        this.schedule(() => {
                            const btnAuto = document.getElementById('temp-btn-auto');
                            if (btnAuto) btnAuto.click();
                        }, 4500);
                    }
                }
            },
            {
                tab: 'temperatura',
                targetSelector: '#temp-pump-btn',
                titleKey: 'tut_step11_title',
                textKey: 'tut_step11_text',
                action: () => {
                    this.savedPump = window.temperatureManager ? window.temperatureManager.pumpActive : true;
                    this.schedule(() => {
                        if (window.temperatureManager) window.temperatureManager.togglePump();
                    }, 1500);
                    this.schedule(() => {
                        if (window.temperatureManager) window.temperatureManager.togglePump();
                    }, 4500);
                },
                cleanup: () => {
                    if (window.temperatureManager && this.savedPump !== undefined) {
                        if (window.temperatureManager.pumpActive !== this.savedPump) {
                            window.temperatureManager.togglePump();
                        }
                    }
                }
            },
            {
                tab: 'temperatura',
                targetSelector: '#temp-emerg-container',
                titleKey: 'tut_step12_title',
                textKey: 'tut_step12_text',
                action: () => {
                    this.schedule(() => {
                        if (window.temperatureManager) window.temperatureManager.toggleEmergencyGuard();
                    }, 1500);
                    this.schedule(() => {
                        if (window.temperatureManager) {
                            window.temperatureManager.toggleEmergencyGuard(); // Cerrar
                        }
                    }, 4500);
                },
                cleanup: () => {
                    if (window.temperatureManager && window.temperatureManager.emergencyGuardOpen) {
                        window.temperatureManager.toggleEmergencyGuard();
                    }
                }
            },
            // CAUDAL / OXIGENO
            {
                tab: 'caudal',
                targetSelector: '#oxygen-canvas-0',
                titleKey: 'tut_step13_title',
                textKey: 'tut_step13_text',
            },
            {
                tab: 'caudal',
                targetSelector: '#btn-purge-atmosphere',
                titleKey: 'tut_step14_title',
                textKey: 'tut_step14_text',
                action: () => {
                    const btnPurge = document.getElementById('btn-purge-atmosphere');
                    if (btnPurge) {
                        this.schedule(() => {
                            btnPurge.classList.add('scale-95', 'brightness-150');
                            if (window.oxygenManager) window.oxygenManager.purgeAtmosphere();
                        }, 1500);
                        this.schedule(() => btnPurge.classList.remove('scale-95', 'brightness-150'), 1800);
                    }
                }
            },
            {
                tab: 'caudal',
                targetSelector: '#btn-manual-oxygen',
                titleKey: 'tut_step15_title',
                textKey: 'tut_step15_text',
            },
            // SCRUBBERS
            {
                tab: 'scrubbers',
                targetSelector: '#scrubber-canvas-0',
                titleKey: 'tut_step16_title',
                textKey: 'tut_step16_text',
            },
            {
                tab: 'scrubbers',
                targetSelector: '#knob-tactical-unit',
                titleKey: 'tut_step17_title',
                textKey: 'tut_step17_text',
                action: () => {
                    const knob = document.getElementById('filter-knob');
                    if (knob && window.player) {
                        this.schedule(() => knob.click(), 1500);
                        this.schedule(() => knob.click(), 4500);
                    }
                }
            },
            {
                tab: 'scrubbers',
                targetSelector: '#scrubber-replace-0',
                titleKey: 'tut_step18_title',
                textKey: 'tut_step18_text',
                action: () => {
                    const btn = document.getElementById('scrubber-replace-0');
                    if (btn) btn.classList.remove('hidden');
                },
                cleanup: () => {
                    const btn = document.getElementById('scrubber-replace-0');
                    if (btn) btn.classList.add('hidden');
                }
            },
            // MUESTRAS
            {
                tab: 'muestras',
                targetSelector: '#muestras-grid-container',
                titleKey: 'tut_step19_title',
                textKey: 'tut_step19_text',
            },
            {
                tab: 'muestras',
                targetSelector: 'button[onclick="window.injectBiomass()"]',
                titleKey: 'tut_step20_title',
                textKey: 'tut_step20_text',
            }
        ];

        this.start();
    }

    createOverlay() {
        if (document.getElementById('tutorial-overlay')) return;

        const overlayHtml = `
            <div id="tutorial-overlay" class="fixed inset-0 z-[9999] pointer-events-none hidden">
              <div id="tutorial-backdrop" class="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-300"></div>
              <button onclick="window.managementTutorial.end()" class="absolute top-6 right-6 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-400 text-[10px] uppercase tracking-widest font-bold rounded hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all pointer-events-auto z-[10003]" data-i18n="tut_skip">
                SALTAR TUTORIAL
              </button>
              <div id="tutorial-highlight" class="absolute border-4 border-cyan-400 shadow-[0_0_20px_#22d3ee,_inset_0_0_20px_#22d3ee] rounded-xl transition-all duration-500 pointer-events-none z-[10001]"></div>
              <div id="tutorial-box" class="absolute bg-[#050a10] border-2 border-cyan-500/80 p-6 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8),_0_0_20px_rgba(34,211,238,0.2)] pointer-events-auto w-[320px] transition-all duration-500 transform text-white z-[10002]">
                 <div class="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
                 <div class="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>
                 <h3 id="tutorial-title" class="text-cyan-400 font-bold uppercase tracking-[0.2em] text-sm mb-3 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"></h3>
                 <p id="tutorial-text" class="text-white/80 text-xs mb-5 leading-relaxed font-mono"></p>
                 <button id="tutorial-next-btn" class="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 text-cyan-400 text-[10px] uppercase tracking-widest font-bold rounded hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all" onclick="window.managementTutorial.nextStep()" data-i18n="tut_continue">CONTINUAR TUTORIAL</button>
              </div>
            </div>

            <div id="tutorial-end-modal" class="fixed inset-0 z-[10000] bg-black/90 hidden items-center justify-center pointer-events-auto backdrop-blur-sm">
              <div class="bg-[#050a10] border-2 border-emerald-500/50 p-10 rounded-2xl flex flex-col items-center max-w-md transform transition-transform scale-90 shadow-[0_0_50px_rgba(16,185,129,0.2)] relative">
                 <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
                 <div class="w-24 h-24 rounded-full border-4 border-emerald-500 flex items-center justify-center mb-8 relative bg-emerald-500/10">
                     <svg class="w-12 h-12 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                     <div class="absolute inset-0 rounded-full border-4 border-emerald-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
                 </div>
                 <h2 class="text-3xl font-black text-white tracking-[0.2em] uppercase mb-3 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" data-i18n="tut_completed">TUTORIAL<br>COMPLETADO</h2>
                 <p class="text-emerald-400/80 text-xs text-center mb-8 font-mono leading-relaxed" data-i18n="tut_finished_desc">Todos los sistemas de gestión han sido explicados. Estás listo para comandar la expedición.</p>
                 <button onclick="window.managementTutorial.closeEndModal()" class="w-full px-8 py-4 bg-emerald-500/20 hover:bg-emerald-500/40 border-2 border-emerald-500 text-emerald-400 font-bold tracking-[0.3em] uppercase rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all" data-i18n="tut_finalize">FINALIZAR</button>
              </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
        if (window.i18n) window.i18n.updateDOM();
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;
        
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.remove('hidden');
        
        document.addEventListener('keydown', this.handleKeydown);
        
        this.showStep();
    }

    showStep() {
        if (this.currentStep >= this.steps.length) {
            this.end();
            return;
        }

        const step = this.steps[this.currentStep];
        
        if (window.subTabManager) {
            window.subTabManager.selectTab(step.tab);
        }

        if (step.action) {
            step.action();
        }

        // Add a slight delay to allow CSS transitions and layouts to settle
        setTimeout(() => this.positionHighlight(step), 250);
    }

    positionHighlight(step) {
        let target = document.querySelector(step.targetSelector);
        
        if (!target) {
            console.warn('Tutorial target not found:', step.targetSelector);
            const activePanel = document.querySelector('#panel-' + step.tab);
            if (activePanel) {
                target = activePanel.querySelector('.bg-\\[\\#0b141a\\]') || activePanel.children[0];
            }
            if (!target) return;
        }

        const highlight = document.getElementById('tutorial-highlight');
        const box = document.getElementById('tutorial-box');
        const title = document.getElementById('tutorial-title');
        const text = document.getElementById('tutorial-text');

        if (!highlight || !box) return;

        const rect = target.getBoundingClientRect();
        const pad = 12;
        highlight.style.top = (rect.top - pad) + 'px';
        highlight.style.left = (rect.left - pad) + 'px';
        highlight.style.width = (rect.width + pad * 2) + 'px';
        highlight.style.height = (rect.height + pad * 2) + 'px';

        title.innerText = window.i18n ? window.i18n.t(step.titleKey) : step.titleKey;
        text.innerText = window.i18n ? window.i18n.t(step.textKey) : step.textKey;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const boxWidth = 320;
        const boxHeight = box.offsetHeight || 250; 

        let boxLeft = rect.right + pad + 20;
        let boxTop = rect.top;

        if (boxLeft + boxWidth > windowWidth - 20) {
            boxLeft = rect.left - boxWidth - pad - 20;
        }
        
        if (boxLeft < 20) {
            boxLeft = Math.max(20, (windowWidth - boxWidth) / 2);
            boxTop = rect.bottom + pad + 20;
        }

        if (boxTop + boxHeight > windowHeight - 40) {
            boxTop = Math.max(20, windowHeight - boxHeight - 40);
        }

        box.style.left = boxLeft + 'px';
        box.style.top = boxTop + 'px';
    }

    nextStep() {
        this.clearTimeouts();
        const step = this.steps[this.currentStep];
        if (step.cleanup) step.cleanup();
        this.currentStep++;
        this.showStep();
    }

    end() {
        this.clearTimeouts();
        if (this.steps[this.currentStep] && this.steps[this.currentStep].cleanup) {
            this.steps[this.currentStep].cleanup();
        }
        const energyPct = document.getElementById('energy-pct-text');
        if (energyPct && energyPct.parentElement) {
            energyPct.parentElement.classList.remove('animate-pulse');
        }
        this.isActive = false;
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.add('hidden');
        if (window.subTabManager) window.subTabManager.selectTab('energia');
        const endModal = document.getElementById('tutorial-end-modal');
        if (endModal) {
            endModal.classList.remove('hidden');
            endModal.classList.add('flex');
            if (window.i18n) window.i18n.updateDOM();
            setTimeout(() => {
                const modalContent = endModal.querySelector('div');
                if (modalContent) modalContent.classList.remove('scale-90');
            }, 50);
        }
        localStorage.setItem('abyss_management_tutorial_done', 'true');
    }

    closeEndModal() {
        const endModal = document.getElementById('tutorial-end-modal');
        if (endModal) {
            endModal.classList.remove('flex');
            endModal.classList.add('hidden');
        }
        document.removeEventListener('keydown', this.handleKeydown);
    }
}

if (typeof window !== 'undefined') {
    window.ManagementTutorialManager = ManagementTutorialManager;
    window.managementTutorial = new ManagementTutorialManager();
}
