/**
 * MAIN GAME
 * [ES] Orquestación principal del juego. Inicializa el ciclo de vida (loop), gestiona estados globales e integra todos los sistemas.
 * [EN] Main game orchestration. Initializes the lifecycle (loop), manages global states, and integrates all systems.
 */

// Estado del juego
let canvas, ctx;
let camera;
let player;
let uiManager;
let uiTelemetry;
let endGame;
let imageCache;
let splashScreen;

let fishes = [];
let marineSnow = [];
let bubbles = [];
let startingBase;
let keys = {};
let controlScheme = 'WASD';
let scannableTarget = null;
let bubblesAudio = null;
let bgMusic = null;
let lowBatteryAudio = null;
let alarmAudio = null;
let isMusicMuted = false;
let isMenuOpen = false;

// Telemetría / Culling
let telemetryData = {
    activeFishes: 0,
    renderedFishes: 0,
    particles: 0,
    bubbles: 0
};

// Puntos de interés (Mini-descubrimientos)
let discoveryPoints = [];
let nearPOI = null;

// Caché DOM global para optimización del Main Loop
let domCache = {};

/**
 * [ES] Inicialización del juego. Configura el lienzo, gestiona pantallas de inicio y carga el mundo.
 * [EN] Game initialization. Sets up the canvas, manages start screens and loads the world.
 */
async function init() {
    // 0. Inicializar Pool de Audio Crítico para la UI (disponible desde el Splash)
    if (typeof GlobalAudioPool !== 'undefined') {
        GlobalAudioPool.initPool('toggle', 'audio/toggle.mp3', 3);
    }

    // 1. Mostrar Pantalla Splash inmediatamente
    try {
        splashScreen = new SplashScreen(() => {
            // 2. Al interactuar con Splash, iniciar Loading inmediatamente
            const loading = new LoadingScreen();

            // 3. Inicializar el contexto de renderizado durante "Loading"
            // Esto evita cualquier flash de canvas antes de tiempo
            canvas = document.getElementById('gameCanvas');
            if (canvas) {
                ctx = canvas.getContext('2d', { alpha: false });
                resize();
            }

            // Simular o realizar carga real de assets (Ralentizado para disfrutar consola)
            let progress = 0;
            const loadInterval = setInterval(() => {
                progress += Math.random() * 2.5 + 0.5; // Incremento más pequeño
                loading.update(progress);

                if (progress >= 100) {
                    clearInterval(loadInterval);

                    // 4. Inicializar sistemas reales (Físicas, Audio, Entidades)
                    try {
                        setupGameCore();
                        loading.finish(() => {
                            // 5. Iniciar loop solo cuando Loading desaparece
                            console.log("OSIRIS ENGINE: Systems Online. Starting game loop.");
                            updateCursorVisibility(); // Ocultar cursor al empezar
                            requestAnimationFrame(loop);
                        });
                    } catch (e) {
                        console.error("Error during setupGameCore:", e);
                    }
                }
            }, 100);
        });
    } catch (e) {
        console.error("Error initializing SplashScreen:", e);
        // Fallback de emergencia
        canvas = document.getElementById('gameCanvas');
        if (canvas) {
            ctx = canvas.getContext('2d');
            resize();
        }
        setupGameCore();
        requestAnimationFrame(loop);
    }

    // Registrar manejadores de eventos nada más arrancar (para permitir ESC en splash)
    setupEventHandlers();
}

/**
 * [ES] Configuración del núcleo del juego una vez superadas las pantallas de carga.
 */
function setupGameCore() {
    // Inicializar sistemas
    camera = new Camera();
    player = new Player();
    startingBase = new Base();

    // Centrar jugador horizontalmente y bajo las pinzas de la base
    player.x = canvas.width / 2;
    player.y = PLAYER_CONFIG.startY;
    player.lockY = player.y;
    player.isLocked = true;

    // Limpiar capa nativa de DOM de peces
    const fishLayer = document.getElementById('fish-layer');
    if (fishLayer) fishLayer.innerHTML = '';

    uiManager = new UIManager();
    endGame = new EndGame();
    uiTelemetry = new UITelemetry();
    imageCache = new ImageCache();

    // Inicializar audio
    bubblesAudio = new Audio('audio/bubbles.mp3');
    bubblesAudio.loop = true;
    bubblesAudio.volume = 0.4;

    bgMusic = new Audio('audio/sound.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.4;
    bgMusic.muted = isMusicMuted;

    lowBatteryAudio = new Audio('audio/battery-off.mp3');
    lowBatteryAudio.loop = true;
    lowBatteryAudio.volume = 0.6;

    alarmAudio = new Audio('audio/alarm.mp3');
    alarmAudio.loop = true;
    alarmAudio.volume = 0.5;

    // Precargar Audios
    GlobalAudioPool.initPool('fish_escape', 'audio/fish_escape.mp3', 5);
    GlobalAudioPool.initPool('light', 'audio/light.mp3', 2);
    GlobalAudioPool.initPool('sonar', 'audio/sonar.mp3', 2);
    GlobalAudioPool.initPool('hook', 'audio/hook.mp3', 1);
    GlobalAudioPool.initPool('macro', 'audio/macro.mp3', 1);

    // Cargar imagen del jugador
    imageCache.load('player', PLAYER_CONFIG.image);
    // Cargar imagen del suelo abisal (límite 11000m)
    imageCache.load('floor', 'img/floor/floor.png');

    // Generar partículas de nieve marina (ahora en espacio de pantalla)
    for (let i = 0; i < WORLD.particleCount; i++) {
        marineSnow.push(new Particle());
    }

    // Generar peces
    FISH_CATALOG.forEach(specie => {
        for (let g = 0; g < specie.cantidadGrupos; g++) {
            const minGameUnits = specie.minProf * WORLD.depthScale;
            const maxGameUnits = specie.maxProf * WORLD.depthScale;
            const centerX = Math.random() * 1920;
            const centerY = minGameUnits + Math.random() * (maxGameUnits - minGameUnits);

            for (let i = 0; i < specie.pecesPorGrupo; i++) {
                const f = new Fish(specie, g);
                const offsetX = (Math.random() - 0.5) * 300;
                const offsetY = (Math.random() - 0.5) * 200;
                f.x = Math.max(0, Math.min(1920, centerX + offsetX));
                f.y = Math.max(minGameUnits, Math.min(maxGameUnits, centerY + offsetY));
                fishes.push(f);
            }
        }
    });

    // Puntos de Descubrimiento (POIs)
    Object.values(MACRO_CATALOG).forEach(specie => {
        if (specie.posiciones && specie.posiciones.length > 0) {
            specie.posiciones.forEach((pos, i) => {
                discoveryPoints.push({
                    id: `${specie.id}_fixed_${i}`,
                    specieId: specie.id,
                    x: pos.x,
                    y: pos.y,
                    radius: 40,
                    discovered: false,
                    pulse: 0
                });
            });
        } else {
            for (let i = 0; i < (specie.cantidadPoints || 0); i++) {
                const minGameUnits = specie.minProf * WORLD.depthScale;
                const maxGameUnits = specie.maxProf * WORLD.depthScale;
                discoveryPoints.push({
                    id: `${specie.id}_${i}`,
                    specieId: specie.id,
                    x: 100 + Math.random() * (1920 - 200),
                    y: minGameUnits + Math.random() * (maxGameUnits - minGameUnits),
                    radius: 40,
                    discovered: false,
                    pulse: 0
                });
            }
        }
    });

    // Event listeners
    // setupEventHandlers(); // Movido a init() para responder desde el splash

    // Caching global DOM elements para evitar consultar en cada loop (optimizacion rendimiento CPU 60fps)
    domCache.alarmOverlay = document.getElementById('general-alarm-overlay');
    domCache.alarmBanner = document.getElementById('alarm-hud-banner');
    domCache.fishLayer = document.getElementById('fish-layer');
}

/**
 * [ES] Configurar listeners de teclado y redimensionamiento. Conecta el input del jugador con los controles de UI y movimiento.
 * [EN] Configure keyboard and resize listeners. Connects player input with UI and movement controls.
 */
function setupEventHandlers() {
    window.addEventListener('keydown', e => {
        // El menú de settings tiene prioridad absoluta y bloquea el acceso a otros controles del juego
        if (typeof isMenuOpen !== 'undefined' && isMenuOpen) {
            // Permitir solo cerrar el menú con Escape o P
            if (e.code !== 'Escape' && e.code !== 'KeyP') return;
        }

        keys[e.code] = true;

        // Auto-detectar esquema de control según tecla usada
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
            setControls('WASD');
        } else if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
            setControls('ARROWS');
        }

        if (typeof uiManager !== 'undefined' && uiManager && uiManager.isDiscoveryModalOpen) {
            uiManager.macroManager.state.keys[e.code] = true;
            uiManager.macroManager.state.keys[e.key] = true;
        }

        if (e.code === 'Space') {
            if (typeof uiManager !== 'undefined' && uiManager && uiManager.isDiscoveryModalOpen) {
                uiManager.macroManager.toggleLight();
            } else if (typeof player !== 'undefined' && player) {
                player.toggleLight();
            }
        }

        if (e.key === '<') {
            if (typeof uiTelemetry !== 'undefined' && uiTelemetry) uiTelemetry.toggle();
        }

        if (e.code === 'KeyE') {
            if (typeof player !== 'undefined' && player && player.activateSonar()) {
                if (typeof uiManager !== 'undefined' && uiManager) uiManager.createSonarUIWaves();
                GlobalAudioPool.play('sonar', 1.0);
            }
        }

        if (e.code === 'KeyC') {
            if (typeof uiManager !== 'undefined' && uiManager) {
                uiManager.toggleSubManagement();
            }
        }

        if (e.code === 'KeyV') {
            if (typeof uiManager !== 'undefined' && uiManager) {
                uiManager.toggleScrubberHUD();
            }
        }

        if (e.code === 'Escape' || e.code === 'KeyP') {
            e.preventDefault(); // Priorizar siempre el manejo interno (menú) sobre el comportamiento del navegador
            if (typeof uiManager !== 'undefined' && uiManager && uiManager.isScanModalOpen) {
                uiManager.toggleScanModal();
            } else if (typeof uiManager !== 'undefined' && uiManager && uiManager.isSubManagementOpen) {
                uiManager.toggleSubManagement();
            } else {
                toggleMenu();
            }
        }

        if (e.code === 'Enter') {
            if (typeof uiManager !== 'undefined' && uiManager) {
                if (uiManager.isScanModalOpen) {
                    uiManager.toggleScanModal();
                } else if (uiManager.isDiscoveryModalOpen) {
                    uiManager.macroManager.onEnter();
                } else if (typeof nearPOI !== 'undefined' && nearPOI) {
                    uiManager.toggleDiscoveryModal(nearPOI.specieId);
                } else if (typeof scannableTarget !== 'undefined' && scannableTarget) {
                    uiManager.toggleScanModal(scannableTarget);
                }
            }
        }
    });

    window.addEventListener('keyup', e => {
        keys[e.code] = false;
        if (typeof uiManager !== 'undefined' && uiManager && uiManager.isDiscoveryModalOpen) {
            uiManager.macroManager.state.keys[e.code] = false;
            uiManager.macroManager.state.keys[e.key] = false;
        }
    });

    window.addEventListener('resize', resize);
}

/**
 * [ES] Ajusta el lienzo al tamaño de la ventana y reconfigura entidades dependientes de la resolución.
 * [EN] Adjusts the canvas to window size and reconfigures resolution-dependent entities.
 */
function resize() {
    // Definimos el ancho lógico inmutable para la coherencia espacial y jugabilidad
    const LOGICAL_WIDTH = 1920;

    // Calculamos la escala necesaria para encajar en la pantalla física
    window.scaleRatio = window.innerWidth / LOGICAL_WIDTH;
    const logicalHeight = window.innerHeight / window.scaleRatio;

    // El canvas opera en resolución lógica constante
    canvas.width = LOGICAL_WIDTH;
    canvas.height = logicalHeight;

    // Escalar únicamente el entorno de simulación (Canvas y Peces)
    // Dejamos el body intacto para que la UI (modales, menús, HUD) mantenga su tamaño real y responsive
    document.body.style.transform = '';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    canvas.style.transformOrigin = 'top left';
    canvas.style.transform = `scale(${window.scaleRatio})`;
    // NOTA: No seteamos canvas.style.width porque el transform ya lo redimensiona visualmente

    const fishLayer = document.getElementById('fish-layer');
    if (fishLayer) {
        fishLayer.style.transformOrigin = 'top left';
        fishLayer.style.transform = `scale(${window.scaleRatio})`;
        fishLayer.style.width = `${LOGICAL_WIDTH}px`;
        fishLayer.style.height = `${logicalHeight}px`;
    }

    // Regenerar partículas al cambiar tamaño (Espacio de pantalla)
    marineSnow = [];
    for (let i = 0; i < WORLD.particleCount; i++) {
        marineSnow.push(new Particle());
    }

    // Re-centrar jugador horizontalmente si está enganchado en la base
    if (typeof player !== 'undefined' && player && player.isLocked) {
        player.x = canvas.width / 2;
    }
}

/**
 * [ES] Cambiar esquema visual de controles en la UI (Flechas vs WASD).
 * [EN] Change visual control scheme in the UI (Arrows vs WASD).
 */
function setControls(mode) {
    controlScheme = mode;
    document.getElementById('ctrl-wasd').classList.toggle('control-active', mode === 'WASD');
    document.getElementById('ctrl-arrows').classList.toggle('control-active', mode === 'ARROWS');
    document.getElementById('hint-move').innerText = mode === 'WASD' ? 'WASD' : '←↑↓→';
}

/**
 * [ES] Bucle recursivo nativo manejado por requestAnimationFrame a 60FPS constantes.
 * [EN] Native recursive loop handled by requestAnimationFrame at a constant 60FPS.
 */
let lastTime = 0;
function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // Limit dt to prevent massive jumps (e.g., when switching tabs)
    if (dt > 100) dt = 16.666;
    const dtMult = dt / 16.666;

    update(dtMult);

    // El Soporte Vital, Energía y la UI siempre se actualizan, incluso si el juego está pausado por menús
    if (typeof player !== 'undefined' && player) {
        player.updateLifeSupport(dtMult);
    }
    if (typeof energyManager !== 'undefined' && energyManager) {
        // Le pasamos el deltatime en segundos reales
        energyManager.update(dt / 1000, typeof player !== 'undefined' ? player : null);
    }

    if (typeof uiManager !== 'undefined' && uiManager) {
        uiManager.update(player,
            typeof scannableTarget !== 'undefined' ? scannableTarget : null,
            typeof FISH_CATALOG !== 'undefined' ? FISH_CATALOG : null,
            typeof nearPOI !== 'undefined' ? nearPOI : null,
            typeof camera !== 'undefined' ? camera : null
        );
    }

    if (typeof oxygenManager !== 'undefined' && oxygenManager) {
        // Le pasamos dtMult modificado a segundos y player
        // dtMult * (16.666/1000) nos da segundos para que encaje con la configuración de filtros
        oxygenManager.update(dt / 1000, player);
    }

    if (typeof temperatureManager !== 'undefined' && temperatureManager) {
        temperatureManager.update(dt / 1000, player);
    }

    draw();
    requestAnimationFrame(loop);
}

/**
 * [ES] Lógica principal de actualización (sin pintar). Calcula físicas, colisiones, eventos musicales y de descubrimiento.
 * [EN] Main update logic (without drawing). Calculates physics, collisions, musical, and discovery events.
 */
function update(dtMult = 1.0) {
    if (isMenuOpen || uiManager.isScanModalOpen || uiManager.isDiscoveryModalOpen || uiManager.isSubManagementOpen) {
        // Pausar audio de motor/burbujas si entramos a un menú mientras nos movíamos
        if (typeof bubblesAudio !== 'undefined' && bubblesAudio && !bubblesAudio.paused) {
            bubblesAudio.pause();
        }
        return;
    }

    // Calcular altura del suelo para límites físicos dinámicos
    const floorImg = imageCache.get('floor');
    const floorHeight = floorImg ? (floorImg.naturalHeight * (canvas.width / floorImg.naturalWidth)) : 0;
    const moving = player.update(keys, controlScheme, WORLD, canvas, dtMult, floorHeight);

    // Lógica de desenganche de la base (S en WASD o ArrowDown)
    if (player.isLocked) {
        if (keys['KeyS'] || keys['ArrowDown']) {
            player.unlock();
            GlobalAudioPool.play('hook', 1.0);

            if (bgMusic && bgMusic.paused) {
                // Iniciar música en la primera interacción (política de navegadores)
                bgMusic.play().catch(err => console.warn("Audio playback blocked", err));
            }
            if (bubblesAudio && bubblesAudio.paused) {
                // Iniciar sonido de motor/burbujas
                bubblesAudio.play().catch(err => console.warn("Audio playback blocked", err));
            }
        }
    }

    // Actualizar cámara
    camera.update(player, canvas);

    // Generar burbujas y audio si el jugador se mueve
    if (moving) {
        if (Math.random() < window.WORLD.bubbleSpawnRate) {
            bubbles.push(new Bubble(player.x, player.y, -player.vx, -player.vy));
        }

        // Reproducir audio de burbujas (loop)
        if (bubblesAudio && bubblesAudio.paused) {
            bubblesAudio.play().catch(e => { });
        }
    } else {
        // Pausar audio de burbujas si no hay movimiento
        if (bubblesAudio && !bubblesAudio.paused) {
            bubblesAudio.pause();
        }
    }

    // [ES] Lógica de audio para batería baja de la RESERVA PRINCIPAL (< 10%)
    if (typeof energyManager !== 'undefined' && energyManager.battery < 10 && energyManager.battery > 0) {
        if (lowBatteryAudio && lowBatteryAudio.paused) {
            lowBatteryAudio.play().catch(e => { });
        }
    } else {
        if (lowBatteryAudio && !lowBatteryAudio.paused) {
            lowBatteryAudio.pause();
            lowBatteryAudio.currentTime = 0;
        }
    }

    // [ES] Lógica de ALARMA GENERAL para soporte vital (Oxígeno/CO2/Temperatura)
    const isAnoxiaAlarm = (typeof oxygenManager !== 'undefined' && oxygenManager.cabinOxygen < 15.0);
    const isCo2Alarm = (typeof player !== 'undefined' && player.co2 >= 10.0);

    // Alarmas de temperatura
    const tempMgr = typeof window.temperatureManager !== 'undefined' ? window.temperatureManager : null;
    const isHyperAlarm = tempMgr && tempMgr.hyperTimer > 0;
    const isHypoAlarm = tempMgr && tempMgr.hypoTimer > 0;
    // La alarma térmica se silencia si se activa la emergencia de purga (acción de salvación)
    const isTempFixing = tempMgr && tempMgr.emergencyActive;
    const isTempAlarm = (isHyperAlarm || isHypoAlarm) && !isTempFixing;

    // Nueva verificación: Si se están tomando acciones de mejora para apagar la alarma de inmediato
    const isO2Fixing = (isAnoxiaAlarm && typeof oxygenManager !== 'undefined' && oxygenManager.isO2Improving);
    const isCo2Fixing = (isCo2Alarm && typeof player !== 'undefined' && player.isCo2Improving);
    const isPlayerDead = (typeof player !== 'undefined' && player.isDead);

    const isAlarmActive = !isPlayerDead && (
        (isAnoxiaAlarm && !isO2Fixing) ||
        (isCo2Alarm && !isCo2Fixing) ||
        isTempAlarm
    );

    const alarmOverlay = domCache.alarmOverlay;
    const alarmBanner = domCache.alarmBanner;
    const alarmLabel = document.getElementById('alarm-hud-label');
    const alarmValue = document.getElementById('alarm-hud-value');

    if (isAlarmActive) {
        if (alarmAudio && alarmAudio.paused) {
            alarmAudio.play().catch(e => { });
        }

        // Pulso visual del borde de alarma
        if (alarmOverlay) {
            const pulse = (Math.sin(Date.now() * 0.005) * 0.5 + 0.5) * 0.4;
            alarmOverlay.style.opacity = pulse.toString();
        }

        // Banner superior: mostrar con texto específico según prioridad de alarma
        if (alarmBanner) {
            alarmBanner.classList.add('active');

            if (isHyperAlarm && !isTempFixing) {
                const secsLeft = Math.max(0, 10 - tempMgr.hyperTimer).toFixed(1);
                if (alarmLabel) alarmLabel.textContent = '⚠ ALARMA — HIPERTERMIA';
                if (alarmValue) alarmValue.textContent = `CABINA: ${tempMgr.internalTemp.toFixed(1)}°C · GAME OVER EN ${secsLeft}s`;
            } else if (isHypoAlarm && !isTempFixing) {
                const secsLeft = Math.max(0, 10 - tempMgr.hypoTimer).toFixed(1);
                if (alarmLabel) alarmLabel.textContent = '⚠ ALARMA — HIPOTERMIA';
                if (alarmValue) alarmValue.textContent = `CABINA: ${tempMgr.internalTemp.toFixed(1)}°C · GAME OVER EN ${secsLeft}s`;
            } else if (isAnoxiaAlarm && !isO2Fixing && isCo2Alarm && !isCo2Fixing) {
                if (alarmLabel) alarmLabel.textContent = 'O₂ CRÍTICO · CO₂ CRÍTICO';
                if (alarmValue) alarmValue.textContent = `O₂ ${(oxygenManager.cabinOxygen).toFixed(1)}%  ·  CO₂ ${(player.co2).toFixed(1)}%`;
            } else if (isAnoxiaAlarm && !isO2Fixing) {
                if (alarmLabel) alarmLabel.textContent = 'ALARMA — OXÍGENO BAJO';
                if (alarmValue) alarmValue.textContent = `CABINA: ${(oxygenManager.cabinOxygen).toFixed(1)}%`;
            } else {
                if (alarmLabel) alarmLabel.textContent = 'ALARMA — CO₂ ELEVADO';
                if (alarmValue) alarmValue.textContent = `CO₂: ${(player.co2).toFixed(1)}%`;
            }
        }
    } else {
        if (alarmAudio && !alarmAudio.paused) {
            alarmAudio.pause();
            alarmAudio.currentTime = 0;
        }

        if (alarmOverlay) {
            alarmOverlay.style.opacity = '0';
        }

        // Ocultar banner
        if (alarmBanner) {
            alarmBanner.classList.remove('active');
        }
    }

    // Actualizar burbujas y filtrar las muertas
    bubbles = bubbles.filter(b => b.life > 0);
    bubbles.forEach(b => b.update(dtMult));

    // Verificar proximidad e iluminación a Puntos de Descubrimiento (POIs)
    nearPOI = null;
    discoveryPoints.forEach(poi => {
        // [ES] Obligatorio resetear el estado de iluminación en cada frame para evitar falsos positivos
        poi.isLit = false;

        // Primero: Proximidad básica (para optimizar)
        const dist = Math.hypot(player.x - poi.x, player.y - poi.y);

        // Segundo: Verificación de cono de luz
        const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
        if (player.lightOn && mainBattery > 0 && dist < WORLD.lightSpotRange) {
            const angTo = Math.atan2(poi.y - (player.y + WORLD.lightOffsetY), poi.x - player.x);
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;

            const diff = clampAngleDelta(angTo, lookDir);

            if (diff < WORLD.lightAngle) {
                poi.isLit = true;
            }
        }

        if (poi.isLit) {
            nearPOI = poi;
            // Solo animar si está siendo iluminado
            poi.pulse = (poi.pulse + 0.05) % (Math.PI * 2);
        } else {
            // Reset suave del pulso o simplemente mantenerlo estático
            poi.pulse = 0;
        }
    });

    // Actualizar partículas (ahora son world-space y necesitan la cámara para culling)
    marineSnow.forEach(p => p.update(player, canvas, camera, dtMult));

    if (typeof hydrothermalManager !== 'undefined') {
        hydrothermalManager.update(dtMult, camera, canvas);
    }

    // Actualizar peces (pasar canvas para límites dinámicos) y CULLING DE IA
    telemetryData.activeFishes = 0;

    // Lista temporal prioritaria (para evitar calcular IA contra toda la DB de peces en el Boids flocking)
    const proximateFishes = [];

    // OPTIMIZACIÓN CRÍTICA (ALTA CALIDAD): Diccionario de grupos Boids para evitar O(N^2)
    // Al filtrar aquí, cada pez solo se compara matemáticamente contra sus pocos 
    // compañeros de banco exactos, no contra los 150 peces de pantalla.
    const boidsGroups = {};

    fishes.forEach(f => {
        // Culling vertical (+- 1500 unidades para dar margen de aparición visual y comportamiento realista fuera de camara)
        f.isSimulated = Math.abs(f.y - player.y) < 1500;

        if (f.isSimulated) {
            proximateFishes.push(f);

            // Agrupación Hash O(1)
            const groupId = `${f.config.id}_${f.groupIndex}`;
            if (!boidsGroups[groupId]) boidsGroups[groupId] = [];
            boidsGroups[groupId].push(f);

            telemetryData.activeFishes++;
        }
    });

    // Solo actualizar IA y Posiciones locales pasándole estrictamente su sub-grupo aislado
    proximateFishes.forEach(f => {
        const groupId = `${f.config.id}_${f.groupIndex}`;
        f.update(boidsGroups[groupId], player, canvas, dtMult);
    });

    // Encontrar objetivo escaneable (pez en el cono de luz)
    scannableTarget = findScannableTarget();

    // Actualizar UI
    uiManager.update(player, scannableTarget, FISH_CATALOG, nearPOI);
}

/**
 * [ES] Encontrar pez en el cono de luz para activar escáner. Determina la entidad más cercana enfocada.
 * [EN] Find fish inside the light cone to activate scanner. Determines the closest focused entity.
 */
function findScannableTarget() {
    const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
    if (!player.lightOn || mainBattery <= 0) return null;

    let minDistSq = WORLD.lightSpotRange * WORLD.lightSpotRange;
    let target = null;

    fishes.forEach(f => {
        if (!f.isSimulated) return; // Optimizando iteración solo a peces renderizados
        const dSq = distanceSq(f.x, f.y, player.x, player.y + WORLD.lightOffsetY);

        if (dSq < minDistSq) {
            const angTo = Math.atan2(f.y - (player.y + WORLD.lightOffsetY), f.x - player.x);
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;

            const diff = clampAngleDelta(angTo, lookDir);

            if (diff < WORLD.lightAngle) {
                minDistSq = dSq;
                target = f;
            }
        }
    });

    return target;
}

let bgCache = {
    color: [0, 0, 0],
    colorString: 'rgb(0,0,0)',
    lastDepth: -9999
};

/**
 * [ES] Renderiza el canvas completo en orden de Z-Index (Fondo -> Partículas -> POIs -> Entidades -> HUD).
 * [EN] Renders the entire canvas in Z-Index order (Background -> Particles -> POIs -> Entities -> HUD).
 */
function draw() {
    // --- CÁLCULO DE COLOR DE FONDO Y LUZ AMBIENTAL ---
    const depthMeters = player.y / WORLD.depthScale;

    if (Math.abs(bgCache.lastDepth - depthMeters) > 0.5) {
        let bg = [0, 0, 0];
        let zoneIndex = 0;
        for (let i = 0; i < WORLD.zones.length - 1; i++) {
            if (depthMeters >= WORLD.zones[i].depth) {
                zoneIndex = i;
            }
        }

        const currentZone = WORLD.zones[zoneIndex];
        const nextZone = WORLD.zones[zoneIndex + 1] || currentZone;

        if (currentZone === nextZone) {
            bg = currentZone.color;
        } else {
            const range = nextZone.depth - currentZone.depth;
            const progress = Math.min(1, (depthMeters - currentZone.depth) / range);
            // Asegurarse de que lerpColor existe o se usará fallback
            bg = lerpColor(currentZone.color, nextZone.color, progress);
        }

        bgCache.color = bg;
        bgCache.colorString = `rgb(${Math.round(bg[0])},${Math.round(bg[1])},${Math.round(bg[2])})`;
        bgCache.lastDepth = depthMeters;
    }

    ctx.fillStyle = bgCache.colorString;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Alpha ambiental basado en zonas científicas:
    // 0-200m (Eu fótica): 1.0 (Plena luz)
    // 200-1000m (Disfótica): Gradiente 1.0 -> 0.0 (Penumbra)
    // 1000m+ (Afótica): 0.0 (Oscuridad total, solo bioluminiscencia)
    let ambientAlpha = 1.0;
    if (depthMeters > 200 && depthMeters <= 1000) {
        ambientAlpha = 1 - (depthMeters - 200) / 800;
    } else if (depthMeters > 1000) {
        ambientAlpha = 0;
    }

    // Dibujar partículas de nieve marina y contar solo las que realmente se renderizaron (alpha > 0.01)
    telemetryData.particles = 0;
    marineSnow.forEach(p => {
        const drawn = p.draw(ctx, player, camera, ambientAlpha, canvas);
        if (drawn) telemetryData.particles++;
    });

    // Dibujar Puntos de Descubrimiento (POIs)
    discoveryPoints.forEach(poi => {
        const sx = poi.x - camera.x;
        const sy = poi.y - camera.y;

        // Solo si está en pantalla
        if (sx < -100 || sx > canvas.width + 100 || sy < -100 || sy > canvas.height + 100) return;

        ctx.save();

        // Círculo concéntrico brillante ajustable desde MacroManager
        MacroManager.drawPOI(ctx, sx, sy, poi.pulse, poi.isLit);
    });

    // Dibujar burbujas (visibilidad via luz del submarino o luz ambiental superficial)
    telemetryData.bubbles = 0;
    bubbles.forEach(b => {
        const rendered = b.draw(ctx, camera, ambientAlpha, player, canvas);
        if (rendered) telemetryData.bubbles++;
    });

    // Dibujar base de inicio (ahora le pasamos el player para las pinzas)
    startingBase.draw(ctx, camera, player);

    // Dibujar prompt de inicio si está bloqueado
    if (player.isLocked) {
        ctx.save();
        const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const prompt = 'PULSA [S] PARA COMENZAR EL DESCENSO';
        ctx.fillText(prompt, canvas.width / 2, canvas.height / 2 + 100);
        ctx.restore();
    }

    // Dibujar onda del sónar
    player.drawSonar(ctx, camera);

    // Dibujar peces (solo los simulados renderizaran al DOM para lazy loading)
    telemetryData.renderedFishes = 0;
    fishes.forEach(f => {
        // Aprovechamos este flag del update para saltarse el draw si están muy lejanos
        // Retornan true si dibujaron algo
        if (f.isSimulated) {
            const rendered = f.draw(ctx, camera, imageCache, player, canvas);
            if (rendered) telemetryData.renderedFishes++;
        } else {
            // Aseguramos esconder DOM si dejaron de simularse
            f.hideDOM();
        }
    });

    // Actualizar UI de telemetría (si está activa)
    uiTelemetry.update(
        telemetryData.activeFishes,
        telemetryData.renderedFishes,
        telemetryData.particles,
        telemetryData.bubbles
    );

    // Dibujar línea de tracking al pez objetivo
    const mainBattery = (typeof energyManager !== 'undefined') ? energyManager.battery : 100;
    if (scannableTarget && player.lightOn && mainBattery > 0) {
        const px = player.x - camera.x;
        const py = player.y - camera.y + WORLD.lightOffsetY;
        const tx = scannableTarget.x - camera.x;
        const ty = scannableTarget.y - camera.y;

        ctx.save();

        // Línea punteada animada desde submarino al pez
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -(Date.now() * 0.05) % 10;  // Animación de movimiento
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.6 * player.lightFlickerIntensity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cuadro pulsante alrededor del pez
        const boxSize = 35 + Math.sin(Date.now() * 0.003) * 4;
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.9 * player.lightFlickerIntensity})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(tx - boxSize / 2, ty - boxSize / 2, boxSize, boxSize);

        // Esquinas decorativas
        const cornerSize = 8;
        ctx.strokeStyle = `rgba(255, 255, 100, ${0.8 * player.lightFlickerIntensity})`;
        ctx.lineWidth = 2;

        // Esquina superior izquierda
        ctx.beginPath();
        ctx.moveTo(tx - boxSize / 2, ty - boxSize / 2 + cornerSize);
        ctx.lineTo(tx - boxSize / 2, ty - boxSize / 2);
        ctx.lineTo(tx - boxSize / 2 + cornerSize, ty - boxSize / 2);
        ctx.stroke();

        // Esquina superior derecha
        ctx.beginPath();
        ctx.moveTo(tx + boxSize / 2 - cornerSize, ty - boxSize / 2);
        ctx.lineTo(tx + boxSize / 2, ty - boxSize / 2);
        ctx.lineTo(tx + boxSize / 2, ty - boxSize / 2 + cornerSize);
        ctx.stroke();

        // Esquina inferior izquierda
        ctx.beginPath();
        ctx.moveTo(tx - boxSize / 2, ty + boxSize / 2 - cornerSize);
        ctx.lineTo(tx - boxSize / 2, ty + boxSize / 2);
        ctx.lineTo(tx - boxSize / 2 + cornerSize, ty + boxSize / 2);
        ctx.stroke();

        // Esquina inferior derecha
        ctx.beginPath();
        ctx.moveTo(tx + boxSize / 2 - cornerSize, ty + boxSize / 2);
        ctx.lineTo(tx + boxSize / 2, ty + boxSize / 2);
        ctx.lineTo(tx + boxSize / 2, ty + boxSize / 2 - cornerSize);
        ctx.stroke();

        ctx.restore();
    }


    // --- SUELO ABISAL (Interacción con luz y límite físico) ---
    // El suelo ahora se dibuja ANTES que el jugador y sus luces para que estas puedan actuar sobre él.
    // Se ancla en 110000 pero el límite físico (en Player.js) permitirá bajar hasta el fondo de la imagen.
    const floorImg = imageCache.get('floor');
    if (floorImg) {
        const FLOOR_WORLD_Y = 110000;
        const floorScreenY = FLOOR_WORLD_Y - camera.y;
        const fW = canvas.width; // Ancho dependiente del canvas (que ahora es 1920 fijo lógicamente)
        const fH = floorImg.naturalHeight * (fW / floorImg.naturalWidth);

        // Solo dibujar si está cerca de pantalla
        if (floorScreenY < canvas.height + 600 && floorScreenY > -fH - 200) {
            ctx.save();

            // LÓGICA DE ILUMINACIÓN DINÁMICA PARA EL SUELO
            // Si hay oscuridad total (ambientAlpha ≈ 0), el suelo solo se ve si el foco le da.
            if (ambientAlpha < 0.2) {
                const lx = player.x - camera.x;
                const ly = player.y - camera.y + WORLD.lightOffsetY;

                // Creamos un gradiente de visibilidad centrado en la luz del submarino
                // El rango de "revelación" del suelo es algo mayor que el foco visual para un efecto suave
                const revealRange = player.lightOn ? WORLD.lightSpotRange * 1.5 : 50;
                const maskGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, revealRange);

                // Si la luz está apagada, el suelo es casi invisible (0.05)
                const baseAlpha = player.lightOn ? 1.0 : 0.05;
                maskGrad.addColorStop(0, `rgba(0,0,0,${baseAlpha})`);
                maskGrad.addColorStop(1, 'rgba(0,0,0,0)');

                // Usamos destination-in para que el suelo solo exista donde el gradiente sea opaco
                // Pero primero dibujamos el suelo en un buffer temporal o simplemente usamos maskGrad como alpha global
                // Forma simple: drawImage con el gradiente como máscara de opacidad (no nativo fácil)
                // Forma efectiva: Pintar el suelo y luego aplicar el gradiente con 'destination-in'

                // Para no afectar a lo que ya se dibujó antes (peces, etc), limitamos el área de efecto
                ctx.beginPath();
                ctx.rect(-camera.x, floorScreenY, fW, fH);
                ctx.clip();

                ctx.drawImage(floorImg, -camera.x, floorScreenY, fW, fH);

                ctx.globalCompositeOperation = 'destination-in';
                ctx.fillStyle = maskGrad;
                ctx.fillRect(-camera.x, floorScreenY, fW, fH);
            } else {
                // En zonas con luz superficial, el suelo se ve normalmente según la profundidad
                ctx.globalAlpha = ambientAlpha;
                ctx.drawImage(floorImg, -camera.x, floorScreenY, fW, fH);
            }

            ctx.restore();
        }
    } else {
        // Fallback si la imagen aún no ha cargado
        const FLOOR_WORLD_Y = 110000;
        const floorScreenY = FLOOR_WORLD_Y - camera.y;
        if (floorScreenY < canvas.height + 100) {
            const grad = ctx.createLinearGradient(0, floorScreenY, 0, floorScreenY + 120);
            grad.addColorStop(0, 'rgba(30, 18, 8, 1)');
            grad.addColorStop(1, 'rgba(10, 5, 2, 1)');
            ctx.fillStyle = grad;
            ctx.fillRect(-camera.x, floorScreenY, fW, canvas.height); // Ajustado a fW y -camera.x
        }
    }

    // Dibujar fumarolas hidrotermales (humo y chorros)
    if (typeof hydrothermalManager !== 'undefined') {
        hydrothermalManager.draw(ctx, camera, player, ambientAlpha);
    }

    // Dibujar luz del jugador
    player.drawLight(ctx, camera);

    // Dibujar jugador
    const playerImage = imageCache.get('player');
    player.draw(ctx, camera, playerImage, ambientAlpha, canvas);

    // --- EFECTO SCHLIEREN (Distorsión por calor de fumarolas) ---
    // Renderizado al final para que afecte a la luz del foco, al submarino y al fondo profundo
    const hazeBottom = 115000;
    const hazeTop = 109000;
    const hazeScreenBottom = hazeBottom - camera.y;
    const hazeScreenTop = hazeTop - camera.y;

    if (hazeScreenBottom > 0 && hazeScreenTop < canvas.height) {
        ctx.save();
        const startY = Math.max(0, Math.floor(hazeScreenTop));
        const endY = Math.min(canvas.height, Math.ceil(hazeScreenBottom));
        const height = endY - startY;

        if (height > 0) {
            if (!window.hazeCanvas) {
                window.hazeCanvas = document.createElement('canvas');
                window.hazeCtx = window.hazeCanvas.getContext('2d');
            }
            window.hazeCanvas.width = canvas.width;
            window.hazeCanvas.height = height;
            // Capturar la imagen completa (incluyendo submarino)
            window.hazeCtx.drawImage(canvas, 0, startY, canvas.width, height, 0, 0, canvas.width, height);

            // Limpiar el fondo
            ctx.fillStyle = 'black';
            ctx.fillRect(0, startY, canvas.width, height);

            const time = Date.now() * 0.003; // Velocidad suave
            const sliceH = 4;
            for (let i = 0; i < height; i += sliceH) {
                const wave = Math.sin(time + i * 0.04) * 3.5 +
                    Math.sin(time * 0.6 + i * 0.1) * 1.5;

                const distToTop = i;
                const distToBottom = height - i;
                const edgeDist = Math.min(distToTop, distToBottom);
                const intensity = Math.min(1.0, edgeDist / 100);

                const finalOffset = wave * intensity;

                ctx.globalAlpha = 1.0;
                ctx.drawImage(window.hazeCanvas, 0, i, canvas.width, sliceH, finalOffset - 6, startY + i, canvas.width + 12, sliceH);
            }
        }
        ctx.restore();
    }
}

// Iniciar el juego cuando cargue la página
// Iniciar el juego cuando cargue la página
if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}

/**
 * [ES] Abre o cierra el menú de ajustes ingame (Pausa conceptual).
 * [EN] Opens or closes the in-game settings menu (Conceptual pause).
 */
function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    const menu = document.getElementById('esc-menu');
    if (menu) {
        menu.classList.toggle('hidden', !isMenuOpen);
        updateCursorVisibility();
        if (isMenuOpen) updateSettingsUI();
    }
}

/**
 * [ES] Alternar modo de pantalla completa nativo del navegador previniendo conflicto con la tecla ESC.
 * [EN] Toggle native browser fullscreen mode preventing conflict with the ESC key.
 */
function toggleFullscreen() {
    GlobalAudioPool.play('toggle', 0.8);
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .then(() => {
                // Intentar bloquear la tecla Escape para que no salga de pantalla completa
                if (navigator.keyboard && navigator.keyboard.lock) {
                    navigator.keyboard.lock(['Escape']).catch(err => {
                        console.warn("Keyboard Lock no disponible o denegado:", err);
                    });
                }
            })
            .catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        // Ya no cerramos el menú automáticamente por petición del usuario
    } else {
        if (document.exitFullscreen) {
            // Liberar el teclado al salir de pantalla completa
            if (navigator.keyboard && navigator.keyboard.unlock) {
                navigator.keyboard.unlock();
            }
            document.exitFullscreen();
        }
    }
    updateSettingsUI();
}

/**
 * [ES] Mutear/Desmutear la pista de audio de fondo y actualizar el botón en UI.
 * [EN] Mute/Unmute the background audio track and update the UI button.
 */
function toggleMusicMute() {
    GlobalAudioPool.play('toggle', 0.8);
    isMusicMuted = !isMusicMuted;
    if (bgMusic) bgMusic.muted = isMusicMuted;
    if (splashScreen && splashScreen.splashMusic) splashScreen.splashMusic.muted = isMusicMuted;

    updateSettingsUI();
}

/**
 * [ES] Refresca los estados visuales del menú interactivo de opciones según las variables globales.
 * [EN] Refreshes visual states of the interactive options menu based on global variables.
 */
function updateSettingsUI() {
    // Actualizar visual del Toggle de Fullscreen
    const fsBg = document.getElementById('fs-toggle-bg');
    const fsDot = document.getElementById('fs-toggle-dot');
    const isFS = !!document.fullscreenElement;

    if (fsBg) fsBg.classList.toggle('bg-cyan-500', isFS);
    if (fsBg) fsBg.classList.toggle('bg-white/10', !isFS);
    if (fsDot) fsDot.classList.toggle('left-7', isFS);
    if (fsDot) fsDot.classList.toggle('left-1', !isFS);
    if (fsDot) fsDot.classList.toggle('bg-white', isFS);
    if (fsDot) fsDot.classList.toggle('bg-white/40', !isFS);

    // Actualizar visual del Toggle de Música
    const mBg = document.getElementById('music-toggle-bg');
    const mDot = document.getElementById('music-toggle-dot');
    const active = !isMusicMuted;

    if (mBg) mBg.classList.toggle('bg-cyan-500', active);
    if (mBg) mBg.classList.toggle('bg-white/10', !active);
    if (mDot) mDot.classList.toggle('left-7', active);
    if (mDot) mDot.classList.toggle('left-1', !active);
    if (mDot) mDot.classList.toggle('bg-white', active);
    if (mDot) mDot.classList.toggle('bg-white/40', !active);

    // Actualizar visual de Calidad Gráfica
    const btnLow = document.getElementById('q-btn-low');
    const btnMed = document.getElementById('q-btn-med');
    const btnHigh = document.getElementById('q-btn-high');

    if (btnLow && btnMed && btnHigh) {
        // Reset all
        const inactiveClass = "flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/10 hover:text-white";
        btnLow.className = inactiveClass;
        btnMed.className = inactiveClass;
        btnHigh.className = inactiveClass;

        // Set active
        const activeClass = "flex-1 py-2 rounded-lg bg-cyan-500/80 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-400 transition-colors border border-cyan-400";
        if (window.GRAPHICS_QUALITY === 'LOW') btnLow.className = activeClass;
        if (window.GRAPHICS_QUALITY === 'MED') btnMed.className = activeClass;
        if (window.GRAPHICS_QUALITY === 'HIGH') btnHigh.className = activeClass;
    }
}

/**
 * [ES] Cambia la calidad gráfica del juego en tiempo real (Rendimiento). Modifica partículas, colisiones y cargas GPU.
 * [EN] Changes game graphics quality in real-time (Performance). Modifies particles, collisions, and GPU loads.
 */
function setQuality(level) {
    if (!window.QUALITY_PROFILES[level]) return;

    window.GRAPHICS_QUALITY = level;

    // Guardar selección en localhost de forma óptima (localStorage)
    try {
        window.localStorage.setItem('abyss_graphics_quality', level);
    } catch (e) {
        console.warn("No se pudo guardar la calidad en localStorage", e);
    }

    // Aplicar perfil al mundo
    const profile = window.QUALITY_PROFILES[level];
    window.WORLD.particleCount = profile.particleCount;
    window.WORLD.spotlightParticles = profile.spotlightParticles;
    window.WORLD.aiThrottleRate = profile.aiThrottleRate;
    window.WORLD.useGradients = profile.useGradients;
    window.WORLD.bubbleSpawnRate = profile.bubbleSpawnRate;
    window.WORLD.drawFishGlows = profile.drawFishGlows;

    // Ajustar partículas activas (marine snow)
    if (marineSnow.length > window.WORLD.particleCount) {
        marineSnow.length = window.WORLD.particleCount; // Truncar arrary
    } else {
        const toAdd = window.WORLD.particleCount - marineSnow.length;
        for (let i = 0; i < toAdd; i++) {
            marineSnow.push(new Particle());
        }
    }

    updateSettingsUI();
}

// Escuchar cambios de fullscreen nativos para actualizar la UI
document.addEventListener('fullscreenchange', updateSettingsUI);

// Exponer funciones para el HTML
if (typeof window !== 'undefined') {
    window.setControls = setControls;
    window.toggleFullscreen = toggleFullscreen;
    window.setQuality = setQuality;
    window.updateCursorVisibility = updateCursorVisibility;
}

/**
 * [ES] Actualiza la visibilidad del cursor según si hay menús activos.
 */
function updateCursorVisibility() {
    // Si no ha cargado el uiManager aún, no ocultamos (splash/loading)
    if (typeof uiManager === 'undefined' || !uiManager) return;

    const isScanOpen = uiManager.isScanModalOpen || false;
    const isDiscoveryOpen = uiManager.isDiscoveryModalOpen || false;
    const isSubManagementOpen = uiManager.isSubManagementOpen || false;
    const isGameOverOpen = (typeof endGame !== 'undefined' && endGame && endGame.isOpen);
    const isDead = (typeof player !== 'undefined' && player && player.isDead);

    // Si cualquiera de estas condiciones se cumple, el cursor DEBE verse
    const anyModalOpen = isMenuOpen || isScanOpen || isDiscoveryOpen || isSubManagementOpen || isGameOverOpen || isDead;
    const shouldHide = !anyModalOpen;

    document.body.classList.toggle('hide-cursor', shouldHide);
    if (!shouldHide) {
        document.body.style.cursor = 'default';
    }
}
