class I18nManager {
    constructor() {
        // Unificar claves de localStorage: migrar 'abyssea_lang' a 'abyss_lang' si existe
        const oldLang = localStorage.getItem('abyssea_lang');
        if (oldLang) {
            localStorage.setItem('abyss_lang', oldLang);
            localStorage.removeItem('abyssea_lang');
        }

        this.currentLang = localStorage.getItem('abyss_lang') || 'es';
        this.translations = window.TRANSLATIONS || { es: {}, en: {} };
    }

    setLanguage(lang) {
        if (!this.translations[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('abyss_lang', lang);
        this.updateDOM();
        
        // Refresh specific components if needed
        if (typeof window.subManagementManager !== 'undefined' && window.subManagementManager.updateUI) {
            window.subManagementManager.updateUI();
        }
        
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    }

    t(key) {
        if (!this.translations[this.currentLang]) return key;
        const result = this.translations[this.currentLang][key];
        if (result !== undefined) return result;
        
        // Fallback
        return this.translations['es'][key] || key;
    }

    updateDOM() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Reemplaza solo el contenido de texto para preservar iconos, etc.
            // Si el elemento tiene un data-i18n-target específico (e.g. placeholder, title)
            const target = el.getAttribute('data-i18n-target');
            if (target) {
                el.setAttribute(target, translation);
            } else {
                el.innerHTML = translation;
            }
        });

        const label = document.getElementById('selected-lang-text');
        if (label) {
            label.innerText = this.currentLang === 'es' ? 'ESPAÑOL' : 'ENGLISH';
        }
    }
}

window.i18n = new I18nManager();

document.addEventListener('DOMContentLoaded', () => {
    window.i18n.updateDOM();
});
