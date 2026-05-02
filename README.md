# 🌊 ABYSSEA

<p align="center">
  <a href="#español">Español</a> | <a href="#english">English</a>
</p>

---

<a name="español"></a>
## 🇪🇸 Castellano

**Abyssea** es una experiencia de exploración submarina atmosférica donde controlas un avanzado sumergible en las profundidades inexploradas del océano. Gestiona tus recursos, evita peligros y descubre la vida marina que habita en las diferentes zonas de presión.

### 🎮 Controles

| Acción | Tecla(s) |
| :--- | :--- |
| **Movimiento** | `W`, `A`, `S`, `D` o `Flechas` |
| **Soltarse de la Base** | Pulsar `S` o `Flecha Abajo` al inicio |
| **Activar Faro/Luz** | `Espacio` |
| **Activar Sonar** | `E` |
| **Menú / Pausa** | `ESC` o `P` |

### 🕹️ Mecánicas Principales

#### 🔋 Gestión de Energía y Batería
El submarino cuenta con un sistema de energía integral gestionado por un tablero táctico.
- **Drenaje**: Subsistemas como faro, sonar y motores consumen energía.
- **Apagón**: Si la batería se agota, sufrirás un apagón total (Blackout).
- **Alarma**: Avisos visuales y sonoros cuando la reserva baja del 10%.

#### 🫧 Soporte Vital (O₂, CO₂ y Temperatura)
El entorno hostil requiere gestionar los sistemas internos de la cabina.
- **Scrubbers**: Filtros de cal sodada para limpiar el CO₂. Deben rotarse y reemplazarse cuando se agotan para evitar la intoxicación.
- **Oxígeno**: Controla la mezcla de aire respirable en la cabina.
- **Temperatura**: Vigila posibles alarmas de hipotermia o hipertermia.

#### 📡 Sistema de Sonar y Escáner
- Utiliza el **Sonar** (`E`) para revelar tu entorno más allá de tu visión.
- Usa el **Escáner** apuntando el faro hacia bancos de peces para analizar y registrar especies.

#### 🔬 Investigación Macro (POIs)
Encuentra Puntos de Interés luminiscentes en el fondo oceánico y pulsa `Enter` para desplegar un **minijuego de exploración a micro-escala**. Usa tu linterna para revelar diminutas criaturas abisales y añadirlas a la base de datos del laboratorio.

#### 🐠 Ecosistemas y Profundidad
El juego simula diferentes zonas oceánicas con especies específicas (usando IA *Flocking/Boids*):
1. **Zona Epipelágica (0-200m)**: Aguas superficiales.
2. **Zona Mesopelágica (200-1000m)**: Penumbra.
3. **Zona Batipelágica (1000-4000m)**: Oscuridad total.
4. **Zona Abisopelágica (4000-6000m)**.
5. **Zona Hadalpelágica (6000m+)**: Fumarolas hidrotermales y criaturas extremófilas.

### 🛠️ Detalles Técnicos

- **Motor**: HTML5 Canvas con JavaScript Vanilla (ES6+). Físicas e IA optimizadas con spatial culling.
- **Aesthetics**: Diseño HUD futurista (Glassmorphism), menús tácticos desplegables.
- **Audio**: Audio 3D dinámico, pisadas, alarmas integradas y sonidos ambientales.
- **Física**: Inercia submarina, termodinámica de fluidos en partículas (efecto Schlieren en fumarolas).

### 🚀 Cómo Jugar

1. Abre `index.html` en cualquier navegador moderno.
2. Comienzas enganchado a la **Estación de Investigación**. Pulsa `S` o `Flecha Abajo` para soltarte.
3. Abre el menú táctico (`C`) para monitorizar tu soporte vital.
4. ¡Explora las profundidades, recoge muestras Macro y sobrevive!

---

<a name="english"></a>
## 🇺🇸 English

**Abyssea** is an atmospheric underwater exploration experience where you control an advanced submersible in the unexplored depths of the ocean. Manage your resources, avoid dangers, and discover the marine life inhabiting different pressure zones.

### 🎮 Controls

| Action | Key(s) |
| :--- | :--- |
| **Movement** | `W`, `A`, `S`, `D` or `Arrows` |
| **Release from Base** | Press `S` or `Down Arrow` at the start |
| **Toggle Light** | `Space` |
| **Activate Sonar** | `E` |
| **Tactical Sub-Menu** | `C` |
| **Scrubber HUD Overlay** | `V` |
| **Menu / Pause** | `ESC` or `P` |
| **Interact / Scan** | `Enter` |

### 🕹️ Main Mechanics

#### 🔋 Power and Battery Management
The submarine features a comprehensive power system managed via a tactical board.
- **Drain**: Subsystems like lights, sonar, and engines drain energy.
- **Blackout**: Running out of battery causes a total system failure.
- **Alarm**: Visual and audio warnings trigger below 10% reserve.

#### 🫧 Life Support (O₂, CO₂, and Temperature)
The hostile environment demands managing cabin internals.
- **Scrubbers**: Soda lime filters clean CO₂. Must be rotated and replaced to prevent poisoning.
- **Oxygen**: Monitors the breathable air mix.
- **Temperature**: Watch for hypothermia and hyperthermia alerts.

#### 📡 Sonar and Scanner System
- Use the **Sonar** (`E`) to reveal your surroundings far beyond vision.
- Use the **Scanner** by shining the light on fish schools to analyze and log species.

#### 🔬 Macro Investigation (POIs)
Find glowing Points of Interest on the seabed and press `Enter` to open a **micro-scale exploration minigame**. Use your flashlight to reveal tiny abyssal creatures and log them into the lab database.

#### 🐠 Ecosystems and Depth
Simulates oceanic zones with specific species (using *Flocking/Boids* AI):
1. **Epipelagic Zone (0-200m)**: Sunlit surface.
2. **Mesopelegic Zone (200-1000m)**: Twilight.
3. **Bathypelagic Zone (1000-4000m)**: Midnight.
4. **Abyssopelagic Zone (4000-6000m)**.
5. **Hadalpelagic Zone (6000m+)**: Hydrothermal vents and extremophiles.

### 🛠️ Technical Details

- **Engine**: HTML5 Canvas with Vanilla JavaScript (ES6+). Optimized AI with spatial culling.
- **Aesthetics**: Futuristic HUD (Glassmorphism), pop-up tactical menus.
- **Audio**: Dynamic 3D audio, integrated alarms, ambient soundscapes.
- **Physics**: Underwater inertia, fluid thermodynamics (Schlieren effect on vents).

### 🚀 How to Play

1. Open `index.html` in any modern web browser.
2. You start docked at the **Research Station**. Press `S` or `Down Arrow` to release.
3. Open the tactical menu (`C`) to monitor your life support.
4. Explore the depths, gather Macro samples, and survive!

---
*Developed as an experiment in procedural exploration and marine atmosphere.*
