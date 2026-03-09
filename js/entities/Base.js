/**
 * BASE CLASS - Estructura de la estación de inicio avanzada (Deep Blue Prime)
 */

class Base {
    constructor() {
        this.config = BASE_CONFIG;
        this.x = -1500;
        this.y = this.config.y;
        this.w = this.config.width + 3000;
        this.h = this.config.height; // Usar el original para no solapar

        // Colores premium y futuristas
        this.colors = {
            hullDark: '#0a0f18',
            hullMedium: '#15202b',
            hullLight: '#2c3e50',
            accent: '#06b6d4',
            warningColor: '#ffb703',
            hazardStripe1: '#ffb703',
            hazardStripe2: '#111111',
            armOrange: '#fd7e14',
            armOrangeDark: '#d9480f',
            jointDark: '#2b253b',
            jointCore: '#110d18'
        };

        this.clampProgress = 0; // 0 = cerrado, 1 = abierto
    }

    draw(ctx, camera, player) {
        const sx = this.x - camera.x;
        const sy = this.y - camera.y;
        const time = Date.now() * 0.001;

        if (player && !player.isLocked) {
            this.clampProgress = Math.min(1, this.clampProgress + 0.02); // Apertura suave de las pinzas
        }

        ctx.save();

        this.drawMainHull(ctx, sx, sy, time);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        this.drawDetails(ctx, sx, sy, time);
        this.drawSpotlightDust(ctx, camera, time);

        // Bahía de atraque y brazo robótico
        this.drawDockingArea(ctx, sx, sy, camera, time);

        if (player) {
            this.drawRoboticArm(ctx, camera, player, time);
        }

        ctx.restore();
    }

    drawMainHull(ctx, sx, sy, time) {
        // Fondo base sombra pesada
        ctx.shadowColor = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetY = 30;

        // --- Armadura Principal (Casco Pesado) ---
        const lingrad = ctx.createLinearGradient(sx, sy, sx, sy + this.h);
        lingrad.addColorStop(0, '#020408'); // Negro casi total arriba
        lingrad.addColorStop(0.7, '#080e1a'); // Azul abisal oscuro
        lingrad.addColorStop(1, '#111b2b'); // Borde metálico

        ctx.fillStyle = lingrad;

        // Estructura principal
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + this.w, sy);
        ctx.lineTo(sx + this.w, sy + this.h);

        // Forma dentada inferior (esclusas/mamparos)
        for (let i = this.w; i >= 0; i -= 300) {
            ctx.lineTo(sx + i, sy + this.h);
            ctx.lineTo(sx + i - 50, sy + this.h + 40); // Reborde reforzado
            ctx.lineTo(sx + i - 250, sy + this.h + 40);
            ctx.lineTo(sx + i - 300, sy + this.h);
        }
        ctx.lineTo(sx, sy + this.h);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // --- Placas de Blindaje Superpuestas ---
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        for (let i = 50; i < this.w; i += 400) {
            ctx.fillRect(sx + i, sy + 30, 200, this.h - 10);
            // Remaches en las placas
            ctx.fillStyle = '#050a12';
            ctx.beginPath();
            ctx.arc(sx + i + 20, sy + 50, 4, 0, Math.PI * 2);
            ctx.arc(sx + i + 180, sy + 50, 4, 0, Math.PI * 2);
            ctx.arc(sx + i + 20, sy + this.h - 10, 4, 0, Math.PI * 2);
            ctx.arc(sx + i + 180, sy + this.h - 10, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // restaurar
        }

        // Borde brillante estructural
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.stroke();

        // DECAL PRINCIPAL: DEEP BLUE PRIME
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.font = 'bold 90px "JetBrains Mono", monospace';
        ctx.fillText('ABYSSEA', sx + this.w / 2 - 960, sy + 110);

        // Línea de poder del reactor principal
        ctx.fillStyle = this.colors.accent;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.colors.accent;
        ctx.fillRect(sx, sy + 130, this.w, 3);
        ctx.shadowBlur = 0;
    }

    drawDetails(ctx, sx, sy, time) {
        const pipeY = sy + this.h + 40; // Alineado con los mamparos inferiores

        // 1. Surco Estructural Funcional (Reemplaza a las tuberías neón)
        ctx.beginPath();
        ctx.moveTo(sx, pipeY - 20);
        ctx.lineTo(sx + this.w, pipeY - 20);
        ctx.strokeStyle = '#050a12'; // Ranura oscura profunda
        ctx.lineWidth = 12;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx, pipeY - 20);
        ctx.lineTo(sx + this.w, pipeY - 20);
        ctx.strokeStyle = '#0a101d'; // Reflejo interior mínimo
        ctx.lineWidth = 2;
        ctx.stroke();

        // Centro real de despliegue donde está la bahía y el submarino
        const bayCenter = (ctx.canvas.width / 2) - camera.x;

        // 2. Focos de Caída Estática (Distribución Simétrica)
        // Posiciones relativas al centro: 400px, 800px y 1200px a cada lado
        const lightOffsets = [-1200, -800, -400, 400, 800, 1200];

        lightOffsets.forEach(offset => {
            const lx = bayCenter + offset;
            const ly = pipeY - 5;

            // Constreñir para que no se dibujen fuera del casco real de la base (opcional)
            if (lx > sx && lx < sx + this.w) {
                // Foco estático apuntando directamente hacia abajo
                const grad = ctx.createLinearGradient(lx, ly, lx, ly + 600);
                grad.addColorStop(0, `rgba(224, 242, 254, 0.15)`); // Haz muy tenue y elegante
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(lx + 150, ly + 600);
                ctx.lineTo(lx - 150, ly + 600);
                ctx.fill();

                // Lente del farol (Integrado en el casco)
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(lx - 20, ly - 5, 40, 10);
                ctx.fillStyle = '#e0f2fe';
                ctx.fillRect(lx - 15, ly - 2, 30, 4); // Emisor discreto

                // Brillo contenido
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#e0f2fe';
                ctx.fillRect(lx - 15, ly - 2, 30, 4);
                ctx.shadowBlur = 0;
            }
        });

        // 3. Marcas de Alta Presión (Mínimas y Simétricas)
        // Posicionaremos marcas de peligro en los huecos intermedios
        const markOffsets = [-1000, -600, -200, 200, 600, 1000];

        markOffsets.forEach(offset => {
            const hx = bayCenter + offset - 50; // Centrar el bloque de 100px
            const hy = pipeY + 2;

            if (hx > sx && hx < sx + this.w) {
                ctx.fillStyle = '#111';
                ctx.fillRect(hx, hy, 100, 8);

                // Línea de advertencia ámbar sólida y discreta, sin diagonales
                ctx.fillStyle = '#b45309';
                ctx.fillRect(hx + 2, hy + 2, 96, 4);
            }
        });
    }

    drawSpotlightDust(ctx, camera, time) {
        // Partículas de polvo ancladas al mundo bajo cada foco de la base.
        // Son completamente independientes del submarino y no tienen parallax.

        const PARTICLES_PER_SPOTLIGHT = 120;
        const SPOTLIGHT_RANGE = 600;   // Alcance vertical del haz
        const CONE_WIDTH_AT_BOTTOM = 130; // Anchura del cono en el extremo inferior
        const PARTICLE_SPEED = 20;     // Ciclo en segundos para subir todo el haz

        // La Y del foco en espacio de mundo
        const worldSpotY = this.y + this.h + 35;

        // Las X de los focos en mundo (desde el centro del mundo, que coincide con x=0 de la cámara en inicio)
        // La cámara.worldX del jugador arrancaría en 0, y canvas.width/2 es el centro de pantalla.
        const worldCenterX = camera.x + ctx.canvas.width / 2;
        const lightOffsets = [-1200, -800, -400, 400, 800, 1200];

        for (let s = 0; s < lightOffsets.length; s++) {
            const worldSpotX = worldCenterX + lightOffsets[s];

            for (let i = 0; i < PARTICLES_PER_SPOTLIGHT; i++) {
                // Posición determinista: cada partícula tiene un "seed" único por foco+índice
                const seed = s * 1000 + i;

                // Desplazamiento horizontal dentro del cono (en espacio de pantalla ya que el cono se dibuja así)
                // A profundidad d, el cono tiene anchura d/SPOTLIGHT_RANGE * CONE_WIDTH_AT_BOTTOM
                // Vida de la partícula: cicla de 0 a 1 (abajo → arriba)
                const phase = ((time / PARTICLE_SPEED) + (seed * 0.0371)) % 1;
                // La profundidad va de fondo del cono hacia arriba (phase=0 → abajo, phase=1 → foco)
                const depthFraction = 1 - phase; // 0 = justo en el foco, 1 = en el extremo inferior

                const particleWorldY = worldSpotY + depthFraction * SPOTLIGHT_RANGE;
                const particleWorldX = worldSpotX +
                    (Math.sin(seed * 2.399) * 2 - 1) *  // Posición X relativa normalizada [-1, 1]
                    (depthFraction * CONE_WIDTH_AT_BOTTOM);

                // Convertir de espacio mundo → espacio pantalla
                const px = particleWorldX - camera.x;
                const py = particleWorldY - camera.y;

                // Culling — solo dibujar si está en pantalla
                if (px < -10 || px > ctx.canvas.width + 10 ||
                    py < -10 || py > ctx.canvas.height + 10) continue;

                // Alpha: más brillante en el centro del haz, fade en los extremos de profundidad
                const centerFade = 1 - Math.abs((Math.sin(seed * 2.399) * 2 - 1)); // 0=bordes, 1=centro
                const depthFade = Math.sin(depthFraction * Math.PI); // seno → fade suave arriba y abajo
                const alpha = centerFade * depthFade * 0.9;

                if (alpha < 0.01) continue;

                const radius = 0.4 + Math.abs(Math.sin(seed * 1.618)) * 1.2;

                const dustGrad = ctx.createRadialGradient(px, py, 0, px, py, radius);
                dustGrad.addColorStop(0, `rgba(240, 248, 255, ${alpha})`);
                dustGrad.addColorStop(1, `rgba(180, 220, 255, 0)`);

                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fillStyle = dustGrad;
                ctx.fill();
            }
        }
    }

    drawDockingArea(ctx, sx, sy, camera, time) {
        // Bahía de atraque centrada basada en el ancho del canvas real
        const bayX = (ctx.canvas.width / 2) - camera.x - 300;
        const bayW = 600;
        const bayY = sy + this.h + 20;

        // Base de atraque negra/oscura
        ctx.fillStyle = '#05070a';
        ctx.fillRect(bayX, bayY - 20, bayW, 40);

        // Columnas
        ctx.fillStyle = '#111827';
        ctx.fillRect(bayX - 40, bayY - 60, 80, 80);
        ctx.fillRect(bayX + bayW - 40, bayY - 60, 80, 80);

        // Cinta de advertencia superior en la bahía
        ctx.fillStyle = 'rgba(255, 183, 3, 0.2)';
        ctx.fillRect(bayX, bayY - 20, bayW, 10);
    }

    drawRoboticArm(ctx, camera, player, time) {
        // Enganche alineado de manera precisa al centro de la pantalla
        const originX = (ctx.canvas.width / 2) - camera.x;
        // Al reducir la escala al 50%, la pinza "sube". La bajamos un poco para compensar
        const originY = this.y - camera.y + this.h - 10;

        ctx.save();
        ctx.translate(originX, originY);
        // REDUCCIÓN DEL TAMAÑO AL 50%
        ctx.scale(0.5, 0.5);

        // Pilar grúa central
        this.drawCranePillar(ctx);

        // Cajón con rayas de advertencia inferior
        this.drawHazardBox(ctx, -55, 140, 110, 30);

        ctx.fillStyle = this.colors.jointDark;
        ctx.fillRect(-65, 160, 130, 25);

        // Apertura rotacional para soltar la nave
        const openAngle = this.clampProgress * 1.0;

        // ====== BRAZO IZQUIERDO ======
        ctx.save();
        ctx.translate(-95, 175); // Hombros más separados para dejar más espacio al submarino
        this.drawJoint(ctx);
        // Girar a favor de las agujas del reloj: +ángulo
        ctx.rotate(openAngle);

        // Brazo superior izquierdo
        // Se aleja aún más X = -95 -> -110 relativo al hombro: avanza -15 en X, cae 140 en Y
        this.drawArmSegment(ctx, 0, 0, -15, 140, this.colors.armOrange, true);

        // Codo izquierdo (cae en X = -110 global)
        ctx.translate(-15, 140);
        this.drawJoint(ctx, 0.8);
        // El codo debe doblarse hacia afuera, desenrollándose (-ángulo)
        ctx.rotate(-openAngle * 0.5);

        // Brazo inferior izquierdo 
        // Va desde X=-110 hasta X = -55  (Avanza +55 en X local, y baja 80 en Y)
        this.drawArmSegment(ctx, 0, 0, 55, 80, this.colors.armOrangeDark, false);
        ctx.translate(55, 80);

        // Garra izquierda (La garra cubre los últimos 55px hasta llegar a X=0 global)
        this.drawPincerTip(ctx, 1);
        ctx.restore();

        // ====== BRAZO DERECHO ======
        ctx.save();
        ctx.translate(95, 175); // Hombros más separados para dejar más espacio al submarino
        this.drawJoint(ctx);
        // Girar contra las agujas del reloj: -ángulo
        ctx.rotate(-openAngle);

        // Brazo superior derecho con pistones
        // Relativo al hombro: avanza +15 en X, cae 140 en Y
        this.drawArmSegment(ctx, 0, 0, 15, 140, this.colors.armOrange, true);

        // Codo derecho (Cae en X = 110 global)
        ctx.translate(15, 140);
        this.drawJoint(ctx, 0.8);
        // El codo debe desenrollarse hacia afuera (+ángulo)
        ctx.rotate(openAngle * 0.5);

        // Brazo inferior derecho
        // Va desde X=110 hasta X = 55 (Avanza -55 en X local, baja 80 en Y)
        this.drawArmSegment(ctx, 0, 0, -55, 80, this.colors.armOrangeDark, false);
        ctx.translate(-55, 80);

        // Garra derecha (La garra cubre los últimos -55px hasta llegar a X=0)
        this.drawPincerTip(ctx, -1);
        ctx.restore();

        ctx.restore();
    }

    drawHazardBox(ctx, x, y, width, height) {
        ctx.save();
        ctx.fillStyle = this.colors.hazardStripe1;
        ctx.fillRect(x, y, width, height);

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();

        ctx.fillStyle = this.colors.hazardStripe2;
        for (let i = -width; i < width * 2; i += 25) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i + 12, y);
            ctx.lineTo(x + i - height + 12, y + height);
            ctx.lineTo(x + i - height, y + height);
            ctx.fill();
        }

        ctx.strokeStyle = '#4a4163';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }

    drawCranePillar(ctx) {
        // Base anclada
        this.drawHazardBox(ctx, -45, 0, 90, 25);
        ctx.fillStyle = '#2b253b';
        ctx.fillRect(-55, 25, 110, 25);

        // Barras laterales amarillas
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-30, 50, 12, 90);
        ctx.fillRect(18, 50, 12, 90);

        // Barras cruzadas metálicas grises
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-18, 58); ctx.lineTo(18, 83);
        ctx.moveTo(18, 58); ctx.lineTo(-18, 83);

        ctx.moveTo(-18, 88); ctx.lineTo(18, 113);
        ctx.moveTo(18, 88); ctx.lineTo(-18, 113);

        ctx.moveTo(-18, 118); ctx.lineTo(18, 140);
        ctx.moveTo(18, 118); ctx.lineTo(-18, 140);
        ctx.stroke();

        // Cable naranja curvo cayendo lado izquierdo
        ctx.beginPath();
        ctx.strokeStyle = '#fd7e14';
        ctx.lineWidth = 4;
        ctx.moveTo(-55, 30);
        ctx.quadraticCurveTo(-110, 100, -65, 160);
        ctx.stroke();
    }

    drawJoint(ctx, scale = 1) {
        ctx.save();
        ctx.scale(scale, scale);

        ctx.fillStyle = this.colors.jointDark;
        ctx.beginPath();
        ctx.arc(0, 0, 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#4a4163';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = this.colors.jointCore;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(5, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawArmSegment(ctx, x1, y1, x2, y2, color, hasPiston = false) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Estructura principal base
        ctx.strokeStyle = '#1a1625';
        ctx.lineWidth = 44;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Placas principales del brazo
        ctx.strokeStyle = color;
        ctx.lineWidth = 34;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const lx = x2 - x1;
        const ly = y2 - y1;
        const angle = Math.atan2(ly, lx);
        const dist = Math.sqrt(lx * lx + ly * ly);

        ctx.translate(x1, y1);
        ctx.rotate(angle);

        // Conducto hueco de engranajes
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.roundRect(20, -10, dist - 40, 20, 5);
        ctx.fill();

        // Detalles mecánicos: pistones o raíles guía
        if (hasPiston) {
            ctx.fillStyle = '#4a4163';
            ctx.fillRect(20, -4, dist / 2, 8);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(20 + dist / 2, -2, dist / 2 - 20, 4);
        } else {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(20, -4);
            ctx.lineTo(dist - 20, -4);
            ctx.moveTo(20, 4);
            ctx.lineTo(dist - 20, 4);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawPincerTip(ctx, dir) {
        ctx.save();

        // Estructura principal pesada de la pinza (ahora más ancha, cubre 55px en lugar de 65px para no sobrepasar el origen)
        ctx.fillStyle = '#1e1b29'; // Metal muy oscuro
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(dir * 20, 0);       // Baja y sale un poco rodeando la nave
        ctx.lineTo(dir * 55, 60);      // Baja hasta la profundidad máxima, se acerca al centro exacto
        ctx.lineTo(dir * 55, 80);      // Borde recto y vertical interior donde impactan sin superponerse
        ctx.lineTo(dir * 25, 80);      // Borde plano inferior
        ctx.lineTo(-dir * 20, 20);     // Sube por el otro lado envolviendo
        ctx.lineTo(-dir * 25, -10);
        ctx.closePath();
        ctx.fill();

        // Placa protectora amarilla y negra
        ctx.fillStyle = this.colors.hazardStripe1;
        ctx.beginPath();
        ctx.moveTo(dir * 5, 20);
        ctx.lineTo(dir * 50, 65);
        ctx.lineTo(dir * 50, 75);
        ctx.lineTo(dir * 20, 75);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#111'; // Franjas negras
        ctx.beginPath();
        ctx.moveTo(dir * 15, 30);
        ctx.lineTo(dir * 45, 65);
        ctx.lineTo(dir * 38, 75);
        ctx.lineTo(dir * 5, 40);
        ctx.fill();

        // Junta mecánica luminosa en la base de la muñeca
        ctx.fillStyle = this.colors.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Foco de montaje (ilumina desde la parte inferior)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        ctx.arc(dir * 50, 70, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(dir * 50, 70, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    window.Base = Base;
}
