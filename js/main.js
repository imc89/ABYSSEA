/**
 * MAIN GAME - Orquestación principal del juego
 */

// Estado del juego
let canvas, ctx;
let camera;
let player;
let uiManager;
let imageCache;

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
let isMusicMuted = false;
let isMenuOpen = false;

// Puntos de interés (Mini-descubrimientos)
let discoveryPoints = [];
let nearPOI = null;

/**
 * Inicialización del juego
 */
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Configurar tamaño del canvas
    resize();

    // Inicializar sistemas
    camera = new Camera();
    player = new Player();
    startingBase = new Base();

    // Centrar jugador horizontalmente y bajo las pinzas de la base
    player.x = canvas.width / 2;
    player.y = PLAYER_CONFIG.startY;
    player.lockY = player.y;
    player.isLocked = true; // Forzar inicio bloqueado por seguridad

    // Limpiar capa nativa de DOM de peces
    const fishLayer = document.getElementById('fish-layer');
    if (fishLayer) {
        fishLayer.innerHTML = '';
    }

    uiManager = new UIManager();
    imageCache = new ImageCache();

    // Inicializar audio de burbujas (motor)
    bubblesAudio = new Audio('audio/bubbles.mp3');
    bubblesAudio.loop = true;
    bubblesAudio.volume = 0.4;

    // Inicializar música de fondo
    bgMusic = new Audio('audio/sound.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.4;

    // Inicializar audio de batería baja
    lowBatteryAudio = new Audio('audio/battery-off.mp3');
    lowBatteryAudio.loop = true;
    lowBatteryAudio.volume = 0.6;

    // Cargar imágenes de peces para caché (aunque ahora usen DOM, puede ser útil)
    FISH_CATALOG.forEach(fish => {
        imageCache.load(fish.id, fish.imagen);
    });

    // Cargar imagen del jugador
    imageCache.load('player', PLAYER_CONFIG.image);

    // Generar partículas de nieve marina
    for (let i = 0; i < WORLD.particleCount; i++) {
        marineSnow.push(new Particle());
    }

    // Generar peces según el catálogo
    FISH_CATALOG.forEach(specie => {
        for (let g = 0; g < specie.cantidadGrupos; g++) {
            // CONVERSIÓN AUTOMÁTICA: metros → game units (×10)
            const minGameUnits = specie.minProf * WORLD.depthScale;
            const maxGameUnits = specie.maxProf * WORLD.depthScale;

            const centerX = Math.random() * canvas.width;
            const centerY = minGameUnits + Math.random() * (maxGameUnits - minGameUnits);

            for (let i = 0; i < specie.pecesPorGrupo; i++) {
                const f = new Fish(specie, g);

                // Distribuir peces alrededor del centro del grupo
                // Mantener dentro del rango de profundidad configurado
                const offsetX = (Math.random() - 0.5) * 300;
                const offsetY = (Math.random() - 0.5) * 200; // Offset vertical más pequeño

                f.x = Math.max(0, Math.min(canvas.width, centerX + offsetX));
                // CRITICAL: Asegurar que el offset NO saque al pez de su rango de profundidad
                f.y = Math.max(minGameUnits, Math.min(maxGameUnits, centerY + offsetY));

                fishes.push(f);
            }
        }
    });

    // Inicializar Puntos de Descubrimiento (POIs) dinámicamente desde MACRO_CATALOG
    Object.values(MACRO_CATALOG).forEach(specie => {
        for (let i = 0; i < (specie.cantidadPoints || 0); i++) {
            const minGameUnits = specie.minProf * WORLD.depthScale;
            const maxGameUnits = specie.maxProf * WORLD.depthScale;

            discoveryPoints.push({
                id: `${specie.id}_${i}`,
                specieId: specie.id, // Guardar ID de la especie para el minijuego
                x: 100 + Math.random() * (canvas.width - 200),
                y: minGameUnits + Math.random() * (maxGameUnits - minGameUnits),
                radius: 40,
                discovered: false,
                pulse: 0
            });
        }
    });

    // Event listeners
    setupEventHandlers();

    // Iniciar loop del juego
    requestAnimationFrame(loop);
}

/**
 * Configurar event handlers
 */
function setupEventHandlers() {
    window.addEventListener('keydown', e => {
        keys[e.code] = true;

        // Auto-detectar esquema de control según tecla usada
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
            setControls('WASD');
        } else if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
            setControls('ARROWS');
        }

        if (uiManager.isDiscoveryModalOpen) {
            uiManager.macroManager.state.keys[e.code] = true;
            uiManager.macroManager.state.keys[e.key] = true;
        }

        if (e.code === 'Space') {
            if (uiManager.isDiscoveryModalOpen) {
                uiManager.macroManager.toggleLight();
            } else {
                player.toggleLight();
            }
        }

        if (e.code === 'KeyE') {
            if (player.activateSonar()) {
                uiManager.createSonarUIWaves();
                const sonarAudio = new Audio('audio/sonar.mp3');
                sonarAudio.play().catch(e => console.error("Could not play sonar audio", e));
            }
        }

        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (e.code === 'Escape') e.preventDefault(); // Evitar que el navegador salga de Fullscreen con Esc
            if (uiManager.isScanModalOpen) {
                uiManager.toggleScanModal();
            } else {
                toggleMenu();
            }
        }

        if (e.code === 'Enter') {
            if (uiManager.isScanModalOpen) {
                uiManager.toggleScanModal();
            } else if (uiManager.isDiscoveryModalOpen) {
                uiManager.macroManager.onEnter();
            } else if (nearPOI) {
                uiManager.toggleDiscoveryModal(nearPOI.specieId);
            } else if (scannableTarget) {
                uiManager.toggleScanModal(scannableTarget);
            }
        }
    });

    window.addEventListener('keyup', e => {
        keys[e.code] = false;
        if (uiManager.isDiscoveryModalOpen) {
            uiManager.macroManager.state.keys[e.code] = false;
            uiManager.macroManager.state.keys[e.key] = false;
        }
    });

    window.addEventListener('resize', resize);
}

/**
 * Ajustar tamaño del canvas
 */
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Regenerar partículas al cambiar tamaño
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
 * Cambiar esquema de controles
 */
function setControls(mode) {
    controlScheme = mode;
    document.getElementById('ctrl-wasd').classList.toggle('control-active', mode === 'WASD');
    document.getElementById('ctrl-arrows').classList.toggle('control-active', mode === 'ARROWS');
    document.getElementById('hint-move').innerText = mode === 'WASD' ? 'WASD' : '←↑↓→';
}

/**
 * Loop principal del juego
 */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

/**
 * Actualizar lógica del juego
 */
function update() {
    if (isMenuOpen || uiManager.isScanModalOpen || uiManager.isDiscoveryModalOpen) return;

    // Actualizar jugador (pasar canvas para límites dinámicos)
    const moving = player.update(keys, controlScheme, WORLD, canvas);

    // Lógica de desenganche de la base (S en WASD o ArrowDown)
    if (player.isLocked) {
        if (keys['KeyS'] || keys['ArrowDown']) {
            player.unlock();
            const hookAudio = new Audio('audio/hook.mp3');
            hookAudio.play().catch(e => console.error("Could not play hook audio", e));
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
        if (Math.random() < 0.4) {
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

    // Lógica de audio para batería baja (< 10%)
    if (player.lightOn && player.lightBattery < 10 && player.lightBattery > 0) {
        if (lowBatteryAudio && lowBatteryAudio.paused) {
            lowBatteryAudio.play().catch(e => { });
        }
    } else {
        if (lowBatteryAudio && !lowBatteryAudio.paused) {
            lowBatteryAudio.pause();
            lowBatteryAudio.currentTime = 0;
        }
    }

    // Actualizar burbujas y filtrar las muertas
    bubbles = bubbles.filter(b => b.life > 0);
    bubbles.forEach(b => b.update());

    // Verificar proximidad a Puntos de Descubrimiento (POIs)
    nearPOI = null;
    discoveryPoints.forEach(poi => {
        const dist = Math.hypot(player.x - poi.x, player.y - poi.y);
        if (dist < 100) {
            nearPOI = poi;
        }
        // Animación de pulso
        poi.pulse = (poi.pulse + 0.05) % (Math.PI * 2);
    });

    // Actualizar partículas
    marineSnow.forEach(p => p.update(player, canvas));

    // Actualizar peces (pasar canvas para límites dinámicos)
    fishes.forEach(f => f.update(fishes, player, canvas));

    // Encontrar objetivo escaneable (pez en el cono de luz)
    scannableTarget = findScannableTarget();

    // Actualizar UI
    uiManager.update(player, scannableTarget, FISH_CATALOG, nearPOI);
}

/**
 * Encontrar pez en el cono de luz para escanear
 */
function findScannableTarget() {
    if (!player.lightOn) return null;

    let minDist = WORLD.lightSpotRange;
    let target = null;

    fishes.forEach(f => {
        const d = distance(f.x, f.y, player.x, player.y + WORLD.lightOffsetY);

        if (d < minDist) {
            const angTo = Math.atan2(f.y - (player.y + WORLD.lightOffsetY), f.x - player.x);
            const lookDir = player.dir === 1 ? player.angle : Math.PI + player.angle;

            let diff = Math.abs(angTo - lookDir);
            while (diff > Math.PI) {
                diff = Math.PI * 2 - diff;
            }

            if (diff < WORLD.lightAngle) {
                minDist = d;
                target = f;
            }
        }
    });

    return target;
}

/**
 * Renderizar el juego
 */
function draw() {
    // --- CÁLCULO DE COLOR DE FONDO Y LUZ AMBIENTAL ---
    const depthMeters = player.y / WORLD.depthScale;
    let bg = [0, 0, 0];

    // Encontrar el segmento de zona actual para interpolar el color
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
        bg = lerpColor(currentZone.color, nextZone.color, progress);
    }

    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Alpha ambiental basado en profundidad real (0m = 1.0, 1000m = 0.0)
    const ambientAlpha = Math.max(0, 1 - depthMeters / 1000);

    // Dibujar partículas de nieve marina
    marineSnow.forEach(p => p.draw(ctx, player, camera, ambientAlpha));

    // Dibujar Puntos de Descubrimiento (POIs)
    discoveryPoints.forEach(poi => {
        const sx = poi.x - camera.x;
        const sy = poi.y - camera.y;

        // Solo si está en pantalla
        if (sx < -100 || sx > canvas.width + 100 || sy < -100 || sy > canvas.height + 100) return;

        ctx.save();

        // Círculo concéntrico brillante ajustable desde MacroManager
        MacroManager.drawPOI(ctx, sx, sy, poi.pulse);
    });

    // Dibujar burbujas (visibilidad via luz del submarino o luz ambiental superficial)
    bubbles.forEach(b => b.draw(ctx, camera, ambientAlpha, player, canvas));

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

    // Dibujar peces
    fishes.forEach(f => f.draw(ctx, camera, imageCache, player, canvas));

    // Dibujar línea de tracking al pez objetivo
    if (scannableTarget && player.lightOn && player.lightBattery > 0) {
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


    // Dibujar luz del jugador
    player.drawLight(ctx, camera);

    // Dibujar jugador
    const playerImage = imageCache.get('player');
    player.draw(ctx, camera, playerImage, ambientAlpha, canvas);
}

// Iniciar el juego cuando cargue la página
window.onload = init;

/**
 * Funciones del Menú de Escape
 */
function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    const menu = document.getElementById('esc-menu');
    if (menu) {
        menu.classList.toggle('hidden', !isMenuOpen);
        if (isMenuOpen) updateSettingsUI();
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    updateSettingsUI();
}

function toggleMusicMute() {
    isMusicMuted = !isMusicMuted;
    if (bgMusic) bgMusic.muted = isMusicMuted;

    updateSettingsUI();
}

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
}

// Escuchar cambios de fullscreen nativos para actualizar la UI
document.addEventListener('fullscreenchange', updateSettingsUI);

// Exponer funciones para el HTML
if (typeof window !== 'undefined') {
    window.setControls = setControls;
    window.toggleFullscreen = toggleFullscreen;
    window.toggleMusicMute = toggleMusicMute;
    window.toggleMenu = toggleMenu;
}
