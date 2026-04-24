class TemperatureManager {
    constructor() {
        this.internalTemp = 21.5;
        this.externalTemp = 4.2;
        this.humidity = 45.0;
        this.setpoint = 21.0;
        this.mode = 'AUTO'; // AUTO, COOLING, HEAT, OFF
        this.pumpActive = true;
        this.emergencyGuardOpen = false;
        this.emergencyActive = false;

        this.dom = null;
        this.lastUpdate = 0;
    }

    init() {
        this.dom = {
            internalVal: document.getElementById('temp-internal-val'),
            humidityVal: document.getElementById('temp-humidity-val'),
            humidityArc: document.getElementById('temp-humidity-arc'),
            humidityNeedle: document.getElementById('temp-humidity-needle'),
            externalVal: document.getElementById('temp-external-val'),
            setpointVal: document.getElementById('temp-setpoint-val'),
            setpointIndicator: document.getElementById('temp-setpoint-indicator'),
            setpointKnob: document.getElementById('temp-setpoint-knob'),
            gaugeNeedle: document.getElementById('temp-gauge-needle'),

            modes: {
                AUTO: document.getElementById('temp-btn-auto'),
                COOLING: document.getElementById('temp-btn-cooling'),
                HEAT: document.getElementById('temp-btn-heat'),
                OFF: document.getElementById('temp-btn-off')
            },

            pumpLed: document.getElementById('temp-pump-led'),
            pumpHandle: document.getElementById('temp-pump-handle'),

            emergLed: document.getElementById('temp-emerg-led'),
            emergGuard: document.getElementById('temp-emerg-guard'),
            emergHandle: document.getElementById('temp-emerg-handle'),

            setpointPlus: document.getElementById('temp-btn-plus'),
            setpointMinus: document.getElementById('temp-btn-minus'),
            historyGraph: document.getElementById('temp-history-bars'),
            statusText: document.getElementById('temp-status-text'),
            statusDot: document.getElementById('temp-status-dot')
        };

        // Interaction for Setpoint is handled via adjustSetpoint calls from the UI.

        this.updateUI();
    }

    setMode(modeInput) {
        if (!['AUTO', 'COOLING', 'HEAT', 'OFF'].includes(modeInput)) return;
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('toggle', 0.3);
        this.mode = modeInput;

        // Influence setpoint based on mode
        if (modeInput === 'HEAT') {
            this.setpoint = 30.0;
        } else if (modeInput === 'COOLING') {
            this.setpoint = 10.0;
        } else if (modeInput === 'AUTO') {
            if (this.setpoint > 25.0 || this.setpoint < 16.0) {
                this.setpoint = 21.0;
            }
        }

        this.updateUI();
    }

    adjustSetpoint(amount) {
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('toggle', 0.5);
        this.setpoint += amount;
        if (this.setpoint > 30.0) this.setpoint = 30.0;
        if (this.setpoint < 10.0) this.setpoint = 10.0;
        
        // If manually adjusted, ensure we are in AUTO mode so it takes effect
        if (this.mode !== 'AUTO' && this.mode !== 'OFF') {
            this.mode = 'AUTO';
        }
        
        this.updateUI();
    }

    togglePump() {
        this.pumpActive = !this.pumpActive;
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('toggle', 0.8);
        this.updateUI();
    }

    toggleEmergencyGuard(e) {
        if (e) e.stopPropagation();
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('toggle', 0.5);
        this.emergencyGuardOpen = !this.emergencyGuardOpen;
        if (!this.emergencyGuardOpen && this.emergencyActive) {
            this.emergencyActive = false;
        }
        this.updateUI();
    }

    toggleEmergency(e) {
        if (e) e.stopPropagation();
        if (!this.emergencyGuardOpen) return;
        if (typeof GlobalAudioPool !== 'undefined') GlobalAudioPool.play('toggle', 1.0);
        this.emergencyActive = !this.emergencyActive;
        this.updateUI();
    }

    update(dtSec, player) {
        // Temperature simulation logic
        let hasEnergy = typeof energyManager !== 'undefined' ? !energyManager.isBlackout : true;

        // Calculate external temperature based on Depth
        let depthMeters = 0;
        if (player && typeof window.WORLD !== 'undefined') {
            depthMeters = player.y / window.WORLD.depthScale;
        }

        let targetExternalTemp = 4.2;
        if (depthMeters <= 200) {
            // Epipelágica 0 - 200m (30°C to 15°C)
            let t = depthMeters / 200;
            targetExternalTemp = 30 - (t * 15);
        } else if (depthMeters <= 1000) {
            // Mesopelágica 200 - 1000m (15°C to 4°C - Termoclina)
            let t = (depthMeters - 200) / 800;
            targetExternalTemp = 15 - (t * 11);
        } else if (depthMeters <= 4000) {
            // Batipelágica 1000 - 4000m (4°C to 2°C)
            let t = (depthMeters - 1000) / 3000;
            targetExternalTemp = 4 - (t * 2);
        } else if (depthMeters <= 6000) {
            // Abisopelágica 4000 - 6000m (2°C to 1°C)
            let t = (depthMeters - 4000) / 2000;
            targetExternalTemp = 2 - (t * 1);
        } else {
            // Hadal > 6000m (1°C to 0°C)
            let clampedDepth = Math.min(depthMeters, 11000);
            let t = (clampedDepth - 6000) / 5000;
            targetExternalTemp = 1 - (t * 1);
        }

        // Add minimal noise
        this.externalTemp = targetExternalTemp + (Math.sin(Date.now() * 0.001) * 0.1);
        if (Math.random() < 0.1) {
            this.humidity += (Math.random() - 0.5) * 0.5;
            this.humidity = Math.max(0, Math.min(100, this.humidity));
        }

        // Only active if we have energy and not completely OFF or Emergency breaks it
        let activeHeating = false;
        let activeCooling = false;

        if (hasEnergy && !this.emergencyActive && this.mode !== 'OFF') {
            if (this.mode === 'HEAT') activeHeating = true;
            else if (this.mode === 'COOLING') activeCooling = true;
            else if (this.mode === 'AUTO') {
                if (this.internalTemp < this.setpoint - 0.5) activeHeating = true;
                else if (this.internalTemp > this.setpoint + 0.5) activeCooling = true;
            }
        }

        // Pump transfers heat to outside 
        if (this.pumpActive && !activeHeating) {
            // Environment pulls temperature down towards external
            let envPull = (this.externalTemp - this.internalTemp) * (0.05 * dtSec);
            this.internalTemp += envPull;
        } else if (!this.pumpActive && !hasEnergy) {
            // Very slow pull
            let envPull = (this.externalTemp - this.internalTemp) * (0.01 * dtSec);
            this.internalTemp += envPull;
        }

        if (activeHeating) this.internalTemp += 1.5 * dtSec;
        if (activeCooling) this.internalTemp -= 1.0 * dtSec;

        // Handle Temp History logic
        if (!this.tempHistory) {
            this.tempHistory = [21.5, 21.5, 21.5, 21.5, 21.5];
            this.historyTimer = 0;
        }
        this.historyTimer += dtSec;
        if (this.historyTimer >= 10.0) {
            this.historyTimer = 0;
            this.tempHistory.shift();
            this.tempHistory.push(this.internalTemp);
        } else {
            this.tempHistory[4] = this.internalTemp;
        }

        // Throttle UI updates slightly
        this.lastUpdate += dtSec;
        if (this.lastUpdate > 0.5) {
            this.updateUI();
            this.lastUpdate = 0;
        }
    }

    updateUI() {
        if (!this.dom) this.init();
        if (!this.dom.internalVal) return;

        // Display readings
        // temp-internal-val is an SVG <text> element → must use textContent, not innerText
        this.dom.internalVal.textContent = this.internalTemp.toFixed(1);
        if (this.dom.externalVal) this.dom.externalVal.textContent = this.externalTemp.toFixed(1);
        if (this.dom.humidityVal) this.dom.humidityVal.textContent = Math.round(this.humidity) + "%";
        if (this.dom.setpointVal) this.dom.setpointVal.textContent = this.setpoint.toFixed(1) + "°C";

        // Dynamic Status Text and Color based on internalTemp
        if (this.dom.statusText && this.dom.statusDot) {
            let temp = this.internalTemp;
            let status = "TEMPERATURA ESTABLE";
            let color = "#34d399"; // emerald-400 (Green)
            let shadowColor = "rgba(52,211,153,0.5)";

            if (temp < 14) {
                status = "FRÍO EXTREMO";
                color = "#3b82f6"; // blue-500
                shadowColor = "rgba(59,130,246,0.5)";
            } else if (temp < 18) {
                status = "FRÍO";
                color = "#60a5fa"; // blue-400
                shadowColor = "rgba(96,165,250,0.5)";
            } else if (temp > 28) {
                status = "CALOR EXTREMO";
                color = "#ef4444"; // red-500
                shadowColor = "rgba(239,68,68,0.5)";
            } else if (temp > 25) {
                status = "CALOR";
                color = "#fb923c"; // orange-400
                shadowColor = "rgba(251,146,60,0.5)";
            }

            this.dom.statusText.textContent = status;
            this.dom.statusText.style.color = color;
            this.dom.statusText.style.filter = `drop-shadow(0 0 8px ${shadowColor})`;
            this.dom.statusDot.style.backgroundColor = color;
            this.dom.statusDot.style.boxShadow = `0 0 12px ${color}`;
        }

        // Button states
        if (this.dom.setpointPlus) this.dom.setpointPlus.disabled = (this.setpoint >= 30.0);
        if (this.dom.setpointMinus) this.dom.setpointMinus.disabled = (this.setpoint <= 10.0);

        // Render Graph
        if (this.dom.historyGraph && this.tempHistory) {
            let html = '';
            const opacities = [0.2, 0.3, 0.4, 0.6, 1.0];
            for (let i = 0; i < 5; i++) {
                let temp = this.tempHistory[i];
                let percent = Math.max(10, Math.min(100, ((temp - 10) / 20) * 100)); // Map 10-30C to 10-100%
                
                let r=34, g=211, b=238; // cyan-400
                if (temp > 26) { r=248; g=113; b=113; } // red-400
                else if (temp < 16) { r=96; g=165; b=250; } // blue-400
                
                let opacity = opacities[i];
                let shadow = i === 4 ? `0 0 15px rgba(${r},${g},${b},0.8)` : 'none';
                
                html += `<div class="w-2.5 rounded-sm transition-all duration-500" style="background-color: rgba(${r},${g},${b},${opacity}); height: ${percent}%; box-shadow: ${shadow}"></div>`;
            }
            this.dom.historyGraph.innerHTML = html;
        }

        // ── Rotate gauge needle ──────────────────────────────────────────────
        // Arc maps 0°C → -90° rotation, 42°C → +90° rotation (180° sweep).
        // Midpoint 21°C = 0° (straight up). Pivot is SVG point 230,230.
        if (this.dom.gaugeNeedle) {
            const TEMP_MIN = 0;   // °C at left end of arc
            const TEMP_MAX = 42;  // °C at right end of arc
            const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, this.internalTemp));
            // Map [0,42] → [-90, +90]
            const rotateDeg = ((clamped - 21) / 21) * 90;
            this.dom.gaugeNeedle.style.transform = `rotate(${rotateDeg}deg)`;
        }

        // Update Humidity Arc
        // 0-100% -> dashoffset 264 to 0 (approx 145 is 45%)
        if (this.dom.humidityArc) {
            let offset = 264 - (this.humidity / 100) * 264;
            this.dom.humidityArc.style.strokeDashoffset = offset;
        }

        // Update Modes UI
        Object.keys(this.dom.modes).forEach(modeKey => {
            let btn = this.dom.modes[modeKey];
            if (!btn) return;

            let indicator = btn.querySelector('.indicator');
            let labels = btn.querySelectorAll('.label');

            if (this.mode === modeKey) {
                // Active Styling
                btn.style.opacity = '1';
                btn.style.borderColor = 'rgba(34,211,238,0.5)';
                btn.style.boxShadow = '0 0 15px rgba(34,211,238,0.2)';
                btn.style.background = 'linear-gradient(to bottom right, #0f172a, #020617)';

                if (indicator) {
                    indicator.style.backgroundColor = '#22d3ee';
                    indicator.style.boxShadow = '0 0 12px #22d3ee';
                }

                labels.forEach(l => {
                    l.style.color = '#22d3ee';
                    if (l.tagName.toLowerCase() === 'span') {
                        l.style.filter = 'drop-shadow(0 0 5px rgba(34,211,238,0.5))';
                    }
                });
            } else {
                // Inactive Styling
                btn.style.opacity = '0.7';
                btn.style.borderColor = 'rgba(255,255,255,0.1)';
                btn.style.boxShadow = 'none';
                btn.style.background = 'rgba(0,0,0,0.4)';

                if (indicator) {
                    indicator.style.backgroundColor = 'transparent';
                    indicator.style.boxShadow = 'none';
                }

                labels.forEach(l => {
                    l.style.color = 'rgba(255,255,255,0.5)';
                    if (l.tagName.toLowerCase() === 'span') {
                        l.style.filter = 'none';
                    }
                });
            }
        });

        // Update PUMP UI
        if (this.pumpActive) {
            this.dom.pumpLed.style.backgroundColor = '#10b981';
            this.dom.pumpLed.style.boxShadow = '0 0 8px #10b981';
            this.dom.pumpHandle.style.background = 'linear-gradient(to bottom, rgba(16,185,129,0.4), rgba(6,78,59,0.1))';
            this.dom.pumpHandle.style.borderBottom = '1px solid rgba(16,185,129,0.5)';
            this.dom.pumpHandle.style.borderTop = 'none';
            this.dom.pumpHandle.style.top = '0';
            this.dom.pumpHandle.style.bottom = 'auto';
        } else {
            this.dom.pumpLed.style.backgroundColor = 'rgba(255,255,255,0.1)';
            this.dom.pumpLed.style.boxShadow = 'none';
            this.dom.pumpHandle.style.background = 'linear-gradient(to top, rgba(255,255,255,0.05), transparent)';
            this.dom.pumpHandle.style.borderTop = '1px solid rgba(255,255,255,0.1)';
            this.dom.pumpHandle.style.borderBottom = 'none';
            this.dom.pumpHandle.style.bottom = '0';
            this.dom.pumpHandle.style.top = 'auto';
        }

        // Update EMERGENCY UI
        if (this.dom.emergLed) {
            if (this.emergencyActive) {
                this.dom.emergLed.style.backgroundColor = '#ef4444';
                this.dom.emergLed.style.boxShadow = '0 0 10px #ef4444, 0 0 20px #ef4444';

                if (this.dom.emergGuard) {
                    this.dom.emergGuard.style.transform = this.emergencyGuardOpen ? 'rotateX(110deg)' : 'rotateX(0deg)';
                }

                if (this.dom.emergHandle) {
                    // Switch is in ON (UP) position
                    this.dom.emergHandle.style.bottom = 'auto';
                    this.dom.emergHandle.style.top = '2px';
                    this.dom.emergHandle.style.background = 'linear-gradient(to bottom, #ef4444, #991b1b)';
                    this.dom.emergHandle.style.borderTop = 'none';
                    this.dom.emergHandle.style.borderBottom = '2px solid #fca5a5';
                }

                let txt = document.getElementById('emerg-text');
                if (txt) txt.className = 'text-[12px] text-red-500 uppercase tracking-[0.2em] font-black leading-tight animate-[pulse_1s_ease-in-out_infinite] drop-shadow-[0_0_10px_rgba(239,68,68,0.9)] transition-all duration-300';
            } else {
                this.dom.emergLed.style.backgroundColor = 'rgba(239,68,68,0.2)';
                this.dom.emergLed.style.boxShadow = 'none';

                if (this.dom.emergGuard) {
                    this.dom.emergGuard.style.transform = this.emergencyGuardOpen ? 'rotateX(110deg)' : 'rotateX(0deg)';
                }

                if (this.dom.emergHandle) {
                    // Switch is in OFF (DOWN) position
                    this.dom.emergHandle.style.top = 'auto';
                    this.dom.emergHandle.style.bottom = '2px';
                    this.dom.emergHandle.style.background = 'linear-gradient(to top, #333, #666)';
                    this.dom.emergHandle.style.borderBottom = 'none';
                    this.dom.emergHandle.style.borderTop = '2px solid #aaa';
                }

                let txt = document.getElementById('emerg-text');
                if (txt) txt.className = 'text-[12px] text-red-500/50 uppercase tracking-[0.2em] font-black leading-tight drop-shadow-[0_0_5px_rgba(239,68,68,0.2)] transition-all duration-300';
            }
        }
    }
}

// Global instance
window.temperatureManager = new TemperatureManager();
