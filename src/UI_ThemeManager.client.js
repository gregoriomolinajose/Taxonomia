/* ═══════════════════════════════════════════════════════
     THEME MANAGER $O(1)$ — ES6 CLASS SYSTEM (Regla UI §14)
   ═══════════════════════════════════════════════════════ */

class UI_ThemeManager {
    constructor() {
        this.tokens = {
            color: {
                interactive: {
                    primary: "#1C42E8",
                    "primary-hover": "#081754",
                    "primary-press": "#05297A",
                    secondary: "#F3F3F3",
                    "secondary-hover": "#C9C9C9",
                    "secondary-press": "#DEDEDE",
                    error: "#FF594D",
                    "error-hover": "#A26267",
                    "error-press": "#C8180D"
                },
                text: {
                    default: "#081754",
                    soft: "#A4A4A4",
                    inactive: "#8C8C8C",
                    invert: "#FFFFFF",
                    error: "#C8180D",
                    warning: "#CF4600",
                    success: "#2E8A41",
                    info: "#0062A5"
                },
                bg: {
                    "0": "#F3F3F3",
                    body: "#FFFFFF",
                    dark: "#4A4A4A",
                    error: "#FF594D",
                    success: "#0ABF4F",
                    warning: "#FFAE43",
                    info: "#1CA8F7",
                    inactive: "#DEDEDE"
                },
                icon: {
                    default: "#081754",
                    soft: "#4A4A4A",
                    inactive: "#8C8C8C",
                    invert: "#FFFFFF",
                    error: "#FF594D",
                    success: "#0ABF4F",
                    warning: "#FFAE43",
                    info: "#1CA8F7"
                },
                border: {
                    default: "#C9C9C9",
                    error: "#FF594D",
                    success: "#0ABF4F",
                    warning: "#FFAE43",
                    info: "#1CA8F7"
                },
                brand: {
                    coppel: "#F0D224",
                    bancoppel: "#05297A",
                    sales: "#C8180D"
                }
            }
        };

        this.themeIcons = {
            'light': 'moon-outline',
            'dark': 'sunny-outline',
            'ocean': 'water-outline',
            'high-contrast': 'contrast-outline'
        };

        this.currentTheme = 'light';
    }

    get availableThemes() {
        return Object.keys(this.themeIcons);
    }

    /**
     * Inicializa el entorno asíncrono y restablece el último tema persistido
     */
    initThemeManager() {
        // En un entorno DOM (vitest / navegador) validamos disponibilidad de Window
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
        
        const savedTheme = localStorage.getItem('app_theme') || 'light';
        this.setTheme(savedTheme);
        this.hydrateTokens();
    }

    /**
     * Transforma el JSON estructurado en Variables Kebab-case de CSS
     * e inyecta asíncronamente en document.documentElement.style.
     */
    _hydrate(tokens) {
        if (!tokens || typeof document === 'undefined') return;

        const flattenObject = (obj, prefix = '') => {
            if (typeof obj !== 'object' || obj === null) return;
            
            // Resiliencia Top-Down: si el sub-arbol tiene un default, bindear directo a la raíz (Prefijo)
            if (prefix && obj.default !== undefined) {
                document.documentElement.style.setProperty(prefix, obj.default);
            }
            
            Object.keys(obj).forEach(key => {
                if (key === 'default') return; // [S11.2] Aplanamiento ciego sin duplicacion dura O(1)
                
                let propName = prefix ? `${prefix}-${key}` : `--${key}`;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    flattenObject(obj[key], propName);
                } else {
                    document.documentElement.style.setProperty(propName, obj[key]);
                }
            });
        };
        flattenObject(tokens);
    }

    hydrateTokens() {
        this._hydrate(this.tokens);
    }

    /**
     * Aplica las clases de estilo al DOM y notifica a gráficos responsivos.
     */
    setTheme(themeName) {
        if (!this.availableThemes.includes(themeName) || typeof document === 'undefined') return;

        this.availableThemes.forEach(t => {
            if (t !== 'light') document.body.classList.remove(t);
        });

        if (themeName !== 'light') {
            document.body.classList.add(themeName);
        }

        this.currentTheme = themeName;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('app_theme', themeName);
        }
        
        this.updateIcon();

        // Actualizacion dinamica de ApexCharts (Golden Pattern Direct-Instance & ForeColor)
        const isDark = themeName === 'dark';
        const chartOptionsUpdate = { 
            theme: { mode: isDark ? 'dark' : 'light' },
            chart: { 
                foreColor: isDark ? 'var(--ion-color-light)' : 'var(--ion-color-light)',
                background: 'transparent'
            }
        };
        
        if (typeof window !== 'undefined') {
            if (typeof window.chartTopology !== 'undefined' && window.chartTopology) {
                window.chartTopology.updateOptions(chartOptionsUpdate);
            }
            if (typeof window.chartCapacity !== 'undefined' && window.chartCapacity) {
                window.chartCapacity.updateOptions(chartOptionsUpdate);
            }

            // Golden Pattern 6: Reflow mandatory after CSS token switch
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 350);
        }
    }

    /**
     * Avanza al siguiente tema en el ciclo y lo aplica.
     */
    cycleTheme() {
        const activeThemes = ['light', 'dark']; // Active scaling limit
        const currentIndex = activeThemes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % activeThemes.length;
        this.setTheme(activeThemes[nextIndex]);
    }

    /**
     * Actualiza la iconografía superior de la barra de navegación.
     */
    updateIcon() {
        if (typeof document === 'undefined') return;
        const icon = document.getElementById('theme-toggle-icon');
        if (!icon) return;
        icon.name = this.themeIcons[this.currentTheme] || 'moon-outline';
    }
}

// Inyección O(1) de ES6 Class al Entorno Global (Browser Compatibility)
if (typeof window !== 'undefined') {
    window.UI_ThemeManager = UI_ThemeManager;
    window.ThemeManager = new UI_ThemeManager();
}

// Module export for Node.js / Vitest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI_ThemeManager;
}