/**
     * FormEngine_Resolvers.html
     *
     * Abstracción de orquestación de datos de catálogo (Lookups).
     * Aisla la lógica de inicialización en paralelo para selects desplegables.
     */
    (function(global) {
        
        const EngineResolvers = {
            _cache: {},

            /**
             * Escanea el schema en busca de campos con `lookupSource`.
             * Llama en paralelo a cada función backend y rellena field.options de mutación directa.
             * Utiliza un sistema agresivo de Caché para evitar tormentas de peticiones API.
             */
            hydrateLookupSources: async function(fields) {
                const fieldsWithLookup = [];
                fields.forEach(f => {
                    if (f.lookupSource || (f.type === 'relation' && f.targetEntity)) {
                        fieldsWithLookup.push(f);
                    }
                    if (f.type === 'dynamic_list' && f.subFields) {
                        f.subFields.forEach(sub => {
                            if (sub.lookupSource) fieldsWithLookup.push(sub);
                        });
                    }
                });
                
                if (fieldsWithLookup.length === 0) return;

                const dispatchHydration = (field, optionsArray) => {
                    field.options = optionsArray;
                    const domNodes = document.querySelectorAll(`[name="${field.name}"]`);
                    domNodes.forEach(node => {
                        node.dispatchEvent(new CustomEvent('LookupHydrated', { detail: field.options }));
                    });
                };

                try {
                    const promises = fieldsWithLookup.map(field => new Promise((resolve) => {
                        // Intercepción Local (Zero-Latency)
                        const localResolver = window[field.lookupSource] || global[field.lookupSource];
                        if (field.lookupSource && typeof localResolver === 'function') {
                            const result = localResolver();
                            if (result instanceof Promise) {
                                result.then(opts => { 
                                    dispatchHydration(field, opts || []);
                                    resolve(); 
                                })
                                .catch(() => { dispatchHydration(field, []); resolve(); });
                            } else {
                                dispatchHydration(field, result || []);
                                resolve();
                            }
                            return;
                        }

                        // Intersección Backend (Apps Script vía DataAPI)
                        let apiMethod = field.lookupSource;
                        let apiArgs = [];
                        
                        if (!apiMethod && field.type === 'relation' && field.targetEntity) {
                            apiMethod = 'getInitialPayload';
                            apiArgs = [field.targetEntity];
                        }

                        if (apiMethod) {
                            const cacheKey = apiMethod + '::' + JSON.stringify(apiArgs);
                            
                            // 1. Cache Hit: Data is already resolved
                            const cached = EngineResolvers._cache[cacheKey];
                            if (cached && !(cached instanceof Promise)) {
                                dispatchHydration(field, cached);
                                return resolve();
                            }
                            
                            // 2. Cache Hit: Data is currently being fetched (In-Flight Promise)
                            if (cached instanceof Promise) {
                                cached.then(cachedOpts => {
                                    dispatchHydration(field, cachedOpts);
                                    resolve();
                                }).catch(() => resolve());
                                return;
                            }

                            // 3. Cache Miss: Execute and store the Promise
                            const fetchPromise = window.DataAPI.call(apiMethod, ...apiArgs)
                                .then(opts => {
                                    // Mantener la estructura original (Soporte mixto para Arrays puros o Tuplas de Subgrid)
                                    const finalData = opts; 
                                    EngineResolvers._cache[cacheKey] = finalData; // Upgrade Promise to raw Data in Cache
                                    dispatchHydration(field, finalData);
                                    resolve();
                                    return finalData;
                                })
                                .catch(err => {
                                    console.error(`[FormEngine_Resolvers] DataAPI falló para ${apiMethod}:`, err);
                                    if (window.showToast) {
                                        window.showToast(`Error de red parcial cargando catálogo de datos.`, 'warning');
                                    }
                                    EngineResolvers._cache[cacheKey] = null; // Clear bad cache
                                    resolve(); 
                                    return null;
                                });
                                
                            EngineResolvers._cache[cacheKey] = fetchPromise;
                        } else {
                            // Dev fallback
                            dispatchHydration(field, [{ value: 'MOCK-1', label: `Mock: ${field.targetEntity}` }]);
                            resolve();
                        }
                    }));
                    await Promise.all(promises);
                } catch(e) {
                    console.warn('[FormEngine_Resolvers] Non-fatal exception during hydration', e);
                }
            }
        };

        global.FormEngine_Resolvers = EngineResolvers;

    })(typeof window !== 'undefined' ? window : this);