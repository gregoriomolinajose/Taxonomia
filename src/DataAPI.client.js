/**
 * DataAPI.client.js
 * 
 * Abstracción de Orquestación de Red para Google Apps Script.
 * Encapsula la asincronía de google.script.run en Promises estándar.
 */
(function(global) {
    const DataAPI = {
        /**
         * Registro de respuestas simuladas para desarrollo local (Extensible)
         */
        MockEngine: {
            routes: {
                'getInitialPayload': () => [],
                'getAppBootstrapPayload': () => ({ status: 'success', data: {} }),
                'getUserIdentity': () => ({ authorized: true, email: 'local-dev@taxonomia.app' }),
                'API_Universal_Router': (action, entity, payload) => ({ status: 'success', pkValue: `MOCK-${Date.now()}`, data: payload }),
                'bulkInsert': (entity, payload) => ({ status: 'success', insertedCount: payload.length })
            },
            
            /**
             * Registra o sobreescribe un mock para un método específico en runtime
             */
            register: function(methodName, resolverFn) {
                this.routes[methodName] = resolverFn;
            },

            /**
             * Resuelve un mock dinámicamente basado en la firma registrada o el fallback
             */
            resolve: function(methodName, args) {
                if (typeof this.routes[methodName] === 'function') {
                    return this.routes[methodName](...args);
                }
                // Fallback dinámico universal genérico para no romper la app
                console.warn(`[DataAPI.MockEngine] Missing handler for '${methodName}', falling back to default object.`);
                return { status: 'success', statusLine: 'Universal Mock Response', _mockMethod: methodName };
            }
        },

        /**
         * Invoca una función estática de Apps Script de forma asíncrona.
         * @param {string} methodName El nombre de la función exportada en el archivo .gs.
         * @param {...any} args Argumentos ordenados a pasar a la función.
         * @returns {Promise<any>}
         */
        call: function(methodName, ...args) {
            return new Promise((resolve, reject) => {
                // Modificador MOCK de Web IDE Local (No GAS Context)
                if (typeof google === 'undefined' || !google.script || !google.script.run) {
                    let fallbackEnabled = false;
                    try {
                        let envConf = window.ENV_CONFIG;
                        if (typeof envConf === 'string') envConf = JSON.parse(envConf);
                        if (envConf && envConf.AuthMode === 'LOCAL') fallbackEnabled = true;
                    } catch(e) {}

                    if (fallbackEnabled) {
                        console.warn(`[DataAPI] ALERTA DE SISTEMA: Operando en Fallback Local Mode (Desconectado de Bases de Datos Corporativas). Ruta simluada: '${methodName}'.`);
                        setTimeout(() => {
                            try {
                                const mockResponse = DataAPI.MockEngine.resolve(methodName, args);
                                resolve(mockResponse);
                            } catch (e) {
                                reject(new Error(`Mock Engine Error (${methodName}): ${e.message}`));
                            }
                        }, 300); // Simulamos red realista
                    } else {
                        // Enforcing Zero-Trust
                        reject(new Error(`Entorno de seguridad estricto activado (Zero-Trust): Inviable simular respuestas mockeadas fuera de Google Workspace.`));
                    }
                    return;
                }

                // Invocación Real a GAS Client-Side API
                const runner = google.script.run
                    .withSuccessHandler((response) => {
                        resolve(response);
                    })
                    .withFailureHandler((error) => {
                        console.error(`[DataAPI.Error] Metodo ${methodName} falló:`, error);
                        reject(error);
                    });

                if (typeof runner[methodName] === 'function') {
                    runner[methodName](...args);
                } else {
                    reject(new Error(`[DataAPI.Fatal] El método remoto '${methodName}' no existe o no está registrado en el Global Scope de GAS.`));
                }
            });
        }
    };

    global.DataAPI = DataAPI;
})(typeof window !== 'undefined' ? window : this);
