// setup.vitest.js
// Configuración End2End para Headless Chromium de Vistas.

import { beforeAll } from 'vitest';

beforeAll(() => {
    // 1. Mock de GAS/Backend de bajo nivel que la UI suele consultar.
    window.Logger = {
        log: console.log,
        console: console.log
    };
    
    // 2. Global DOM Utils - Las vistas en Taxonomia usan window.DOM extensamente
    window.DOM = {
        create: (tag, attrs, content) => {
            const el = document.createElement(tag);
            if (attrs) {
                for (let k in attrs) {
                    if (k === 'class') el.className = attrs[k];
                    else el.setAttribute(k, attrs[k]);
                }
            }
            if (Array.isArray(content)) content.forEach(c => {
                if (typeof c === 'string') el.appendChild(document.createTextNode(c));
                else if (c instanceof Node) el.appendChild(c);
            });
            else if (typeof content === 'string') el.textContent = content;
            else if (content instanceof Node) el.appendChild(content);
            return el;
        },
        clear: (node) => { node.innerHTML = ''; }
    };

    // 3. Constantes estructurales
    window.APP_SCHEMAS = { lookup: {} };
    window.ENTITY_META = {};
    window.__APP_CACHE__ = {};
    
    window.formatEntityName = (name) => name || '';
});
