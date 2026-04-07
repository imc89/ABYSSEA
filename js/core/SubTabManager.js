/**
 * SUB TAB MANAGER
 * [ES] Gestiona la navegación entre paneles del modal de gestión interna.
 *      Soporta navegación por click, teclas W/S y flechas arriba/abajo.
 * [EN] Manages panel navigation within the internal management modal.
 *      Supports click, W/S keys and up/down arrow navigation.
 */

class SubTabManager {
    constructor() {
        this.tabs = ['energia', 'temperatura', 'caudal', 'scrubbers', 'muestras'];

        this.panelTitles = {
            energia:     'Sistema de Energía',
            temperatura: 'Monitor Térmico',
            caudal:      'Caudalímetro de Flujo',
            scrubbers:   'Scrubbers CO₂',
            muestras:    'Laboratorio de Muestras'
        };

        this.currentIndex = 0; // Energía activo por defecto
        this._keyHandler = this._onKey.bind(this);
        this._keyHandlerAttached = false;
    }

    /** Devuelve el ID de la pestaña actualmente activa */
    get currentTab() {
        return this.tabs[this.currentIndex];
    }

    /**
     * Selecciona una pestaña por ID.
     * @param {string} tabId - ID de la pestaña (ej. 'energia')
     */
    selectTab(tabId) {
        const idx = this.tabs.indexOf(tabId);
        if (idx === -1) return;
        this.currentIndex = idx;
        this._applySelection();
    }

    /**
     * Mueve la selección hacia arriba (índice menor).
     */
    moveUp() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this._applySelection();
        }
    }

    /**
     * Mueve la selección hacia abajo (índice mayor).
     */
    moveDown() {
        if (this.currentIndex < this.tabs.length - 1) {
            this.currentIndex++;
            this._applySelection();
        }
    }

    /**
     * Aplica el estado visual activo a la pestaña y panel correctos.
     * @private
     */
    _applySelection() {
        const tabId = this.tabs[this.currentIndex];

        // 1. Actualizar items del menú lateral
        document.querySelectorAll('.side-nav-item[data-tab]').forEach(el => {
            const isActive = el.dataset.tab === tabId;
            el.classList.toggle('side-nav-item-active', isActive);
        });

        // 2. Mostrar/ocultar paneles del modal
        this.tabs.forEach(id => {
            const panel = document.getElementById(`panel-${id}`);
            if (panel) panel.classList.toggle('active', id === tabId);
        });

        // 3. Actualizar título del header del modal
        const titleEl = document.getElementById('mgmt-panel-title');
        if (titleEl) {
            titleEl.style.opacity = '0';
            titleEl.style.transform = 'translateY(-4px)';
            titleEl.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
            setTimeout(() => {
                titleEl.textContent = this.panelTitles[tabId] || tabId;
                titleEl.style.opacity = '1';
                titleEl.style.transform = 'translateY(0)';
            }, 120);
        }

        // 4. Notificar a los managers específicos si su pestaña está activa
        if (typeof energyManager !== 'undefined') {
            energyManager.isOpen = (tabId === 'energia');
            if (energyManager.isOpen) energyManager.forceUIDraw();
        }
    }

    /**
     * Handler de teclado — sólo activo mientras el modal está abierto.
     * @private
     */
    _onKey(e) {
        // Solo actuar si el modal de gestión está visible
        const modal = document.getElementById('sub-management-modal');
        if (!modal || !modal.classList.contains('active')) return;

        // Allow navigation keys (W/S/Arrows) even if focus is on a checkbox/switch.
        // We only block if the user is typing in a text-like input.
        const isTextInput = ['TEXTAREA', 'SELECT'].includes(e.target.tagName) || 
                           (e.target.tagName === 'INPUT' && !['checkbox', 'radio'].includes(e.target.type));
        if (isTextInput) return;

        switch (e.key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                e.preventDefault();
                this.moveUp();
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                e.preventDefault();
                this.moveDown();
                break;
        }
    }

    /**
     * Activa el listener de teclado (llamar cuando se abre el modal).
     */
    attachKeyboard() {
        if (!this._keyHandlerAttached) {
            window.addEventListener('keydown', this._keyHandler);
            this._keyHandlerAttached = true;
        }
    }

    /**
     * Desactiva el listener de teclado (llamar cuando se cierra el modal).
     */
    detachKeyboard() {
        if (this._keyHandlerAttached) {
            window.removeEventListener('keydown', this._keyHandler);
            this._keyHandlerAttached = false;
        }
    }
}

// Instancia global
if (typeof window !== 'undefined') {
    window.SubTabManager = SubTabManager;
    window.subTabManager = new SubTabManager();
}
