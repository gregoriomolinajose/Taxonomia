/* ============================================================
   UI_Component_BulkImporter.client.js — Reusable Bulk Importer
   ============================================================ */

window.UI_BulkImporter = class UI_BulkImporter {
    constructor(config = {}) {
        this.entityName = config.entityName;
        this.options = config.options || {};
        this.contextId = config.contextId;
        this.edgeType = config.edgeType;
        this.parentEntity = config.parentEntity;
        this.containerNode = null;
        this.urlCache = (window.UI_ETL_Modal && window.UI_ETL_Modal.urlCache) ? window.UI_ETL_Modal.urlCache : {};
    }

    _showToast(message, color) {
        if (typeof window._showToast === 'function') {
            window._showToast(message, color);
            return;
        }
        const toast = document.createElement('ion-toast');
        toast.message = message;
        toast.duration = 2500;
        toast.color = color || 'success';
        document.body.appendChild(toast);
        if (typeof window.PresentSafe === 'function') {
            window.PresentSafe(toast);
        } else {
            toast.present();
        }
    }

    render() {
        const entityName = this.entityName;
        const options = this.options;
        const container = document.createElement('div');
        container.className = 'etl-body';
        container.style.width = '100%';

        // --- SECTION -1: Workspace Pre-flight Check ---
        const preflightContainer = document.createElement('div');
        preflightContainer.id = 'etl-workspace-preflight';
        preflightContainer.style.display = 'none';
        preflightContainer.style.marginBottom = '16px';
        preflightContainer.innerHTML = `
            <div style="background: var(--ion-color-danger-tint, #ffdddd); border-left: 4px solid var(--ion-color-danger); padding: 12px; border-radius: 4px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <ion-icon name="warning-outline" color="danger" style="font-size: 20px;"></ion-icon>
                    <span style="font-weight: 600; color: var(--ion-color-danger);">Integración Workspace Deshabilitada</span>
                </div>
                <div style="font-size: 13px; color: var(--ion-color-step-800);">
                    La conexión con Google Workspace no está autorizada o está deshabilitada. No se aplicarán reglas de pre-llenado (cargos, líder directo). La carga está <b>bloqueada</b>.
                </div>
                <div style="display: flex; justify-content: flex-end;">
                    <ion-button fill="outline" color="danger" size="small" id="btn-test-workspace">Probar Conexión</ion-button>
                </div>
            </div>
        `;
        container.appendChild(preflightContainer);

        // --- SECTION 0: Fuente de Datos (Radio Cards) ---
        const sectionTitle1 = document.createElement('div');
        sectionTitle1.className = 'etl-section-title';
        sectionTitle1.textContent = 'SELECCIONA LA FUENTE DE DATOS';
        container.appendChild(sectionTitle1);


        const radioGrid = document.createElement('div');
        radioGrid.className = 'etl-radio-grid';

        // Sheets Card
        const radioSheets = document.createElement('div');
        radioSheets.className = 'etl-radio-card active';
        radioSheets.innerHTML = `
            <div class="etl-radio-content-row">
                <div class="etl-radio-icon"><ion-icon name="document-text-outline"></ion-icon></div>
                <div class="etl-radio-text-col">
                    <div class="etl-radio-title">Google Sheets</div>
                    <div class="etl-radio-desc">Sincroniza desde Drive en tiempo real</div>
                </div>
            </div>
            <ion-icon class="etl-radio-card-check" name="checkmark-circle"></ion-icon>
        `;

        // CSV Card
        const radioCSV = document.createElement('div');
        radioCSV.className = 'etl-radio-card csv';
        radioCSV.innerHTML = `
            <div class="etl-radio-content-row">
                <div class="etl-radio-icon"><ion-icon name="document-outline"></ion-icon></div>
                <div class="etl-radio-text-col">
                    <div class="etl-radio-title">Archivo CSV</div>
                    <div class="etl-radio-desc">Carga desde tu computadora</div>
                </div>
            </div>
            <ion-icon class="etl-radio-card-check" name="checkmark-circle"></ion-icon>
        `;

        radioGrid.appendChild(radioSheets);
        radioGrid.appendChild(radioCSV);
        container.appendChild(radioGrid);

        // --- DIVIDER: Pasos para importar ---
        if (window.UI_Factory && window.UI_Factory.buildDivider) {
            container.appendChild(window.UI_Factory.buildDivider({ label: 'PASOS PARA IMPORTAR' }));
        }

        // --- SECTION 1: Google Sheets View ---
        const viewSheets = document.createElement('div');
        viewSheets.className = 'etl-stepper';
        
        const sStep1 = document.createElement('div');
        sStep1.className = 'etl-step';
        sStep1.innerHTML = `
            <div class="etl-step-badge active">1</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Generar plantilla en Drive</div>
                <div class="etl-step-desc">Crea automáticamente una hoja con el formato correcto en tu Google Drive.</div>
                <div class="etl-download-card" id="btn-gen-tpl">
                    <ion-icon class="etl-download-icon" name="document-text" color="success"></ion-icon>
                    <div>
                        <div class="etl-download-title">Descarga</div>
                        <div class="etl-download-hint">Generar Template Sheets</div>
                    </div>
                    <ion-icon class="etl-download-action" name="arrow-down-circle-outline"></ion-icon>
                </div>
            </div>
        `;

        const sStep2 = document.createElement('div');
        sStep2.className = 'etl-step';
        sStep2.innerHTML = `
            <div class="etl-step-badge current">2</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Pegar URL, ID de la hoja</div>
                <div class="etl-step-desc">Copia el enlace desde la barra de tu navegador.</div>
                <div style="position: relative; margin-bottom: 8px;">
                    <ion-input id="etl-drive-url" fill="outline" label="Enlace del archivo Google Sheets" label-placement="floating" error-text="La URL proporcionada no es válida" placeholder="https://docs.google.com/spreadsheets/..."></ion-input>
                    <div style="position: absolute; right: 0; top: 0; height: 56px; display: flex; align-items: center; padding-right: 4px; z-index: 10;">
                        <ion-button fill="clear" color="primary" id="btn-open-drive-link" style="display:none; margin:0;" title="Abrir archivo">
                            <ion-icon name="open-outline"></ion-icon>
                        </ion-button>
                    </div>
                </div>
            </div>
        `;

        const sStep3 = document.createElement('div');
        sStep3.className = 'etl-step';
        sStep3.innerHTML = `
            <div class="etl-step-badge pending">3</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Ejecuta la importación</div>
                <div class="etl-step-desc">Ejecuta la importación para realizar la carga de los registros.</div>
                <div class="etl-bottom-exec">
                    <ion-button class="etl-btn-execute" fill="solid" color="primary" id="btn-sync-drive">Cargar Registros</ion-button>
                </div>
            </div>
        `;
        
        viewSheets.appendChild(sStep1);
        viewSheets.appendChild(sStep2);
        viewSheets.appendChild(sStep3);

        // --- SECTION 2: CSV View ---
        const viewCSV = document.createElement('div');
        viewCSV.className = 'etl-stepper';
        viewCSV.style.display = 'none';

        const cStep1 = document.createElement('div');
        cStep1.className = 'etl-step';
        cStep1.innerHTML = `
            <div class="etl-step-badge active">1</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Descarga el template</div>
                <div class="etl-step-desc">Usa el formato correcto para evitar errores en la importación.</div>
                <div class="etl-download-card" id="btn-dl-csv">
                    <ion-icon class="etl-download-icon" name="document-text" color="primary"></ion-icon>
                    <div>
                        <div class="etl-download-title">Descarga</div>
                        <div class="etl-download-hint">Descargar Template CSV</div>
                    </div>
                    <ion-icon class="etl-download-action" name="arrow-down-circle-outline"></ion-icon>
                </div>
            </div>
        `;

        const cStep2 = document.createElement('div');
        cStep2.className = 'etl-step';
        cStep2.innerHTML = `
            <div class="etl-step-badge current">2</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Adjunta tu archivo</div>
                <div class="etl-step-desc">Asegúrate que el archivo sea menor a 15MB.</div>
                <input type="file" id="etl-csv-input" accept=".csv,.xlsx" style="display:none;" />
                <ion-button fill="outline" color="medium" id="btn-upload-mobile" style="margin-bottom: 12px; --border-radius: 8px;">
                    <ion-icon name="folder-open-outline" slot="start"></ion-icon> Explorar Archivos
                </ion-button>
                <div class="etl-dropzone" id="etl-dropzone">
                    <ion-icon name="cloud-upload-outline" style="font-size: 32px; color: var(--ion-color-primary)"></ion-icon>
                    <div class="etl-dropzone-msg">Arrastra tu archivo .csv aquí o haz clic para subirlo.</div>
                </div>
            </div>
        `;

        const cStep3 = document.createElement('div');
        cStep3.className = 'etl-step';
        cStep3.innerHTML = `
            <div class="etl-step-badge pending">3</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Ejecuta la importación</div>
                <div class="etl-step-desc">Ejecuta la importación para realizar la carga de los registros.</div>
                <div class="etl-bottom-exec">
                    <ion-button class="etl-btn-execute" fill="solid" color="primary" id="btn-sync-csv" disabled="true">Cargar Registros</ion-button>
                </div>
            </div>
        `;

        viewCSV.appendChild(cStep1);
        viewCSV.appendChild(cStep2);
        viewCSV.appendChild(cStep3);

        container.appendChild(viewSheets);
        container.appendChild(viewCSV);

        // --- Workspace Pre-flight Check Logic ---
        if (entityName === 'Persona') {
            const isWorkspaceEnabled = (window.AppEnv && window.AppEnv.WORKSPACE_ENABLED) || false;
            if (!isWorkspaceEnabled) {
                preflightContainer.style.display = 'block';
                // Hard Block
                const btnSyncDrive = container.querySelector('#btn-sync-drive');
                const btnSyncCsv = container.querySelector('#btn-sync-csv');
                if (btnSyncDrive) btnSyncDrive.disabled = true;
                if (btnSyncCsv) btnSyncCsv.disabled = true;
            }
            
            const btnTest = preflightContainer.querySelector('#btn-test-workspace');
            if (btnTest) {
                btnTest.addEventListener('click', async () => {
                    const originalText = btnTest.innerText;
                    btnTest.innerText = 'Probando...';
                    btnTest.disabled = true;
                    try {
                        const res = await window.DataAPI.call('testWorkspaceConnection');
                        if (res && res.status === 'success') {
                            this._showToast(res.message, 'success');
                            preflightContainer.style.display = 'none'; // Se puede ocultar si la prueba fue un éxito y asume que ya sirve, o podríamos recargar
                            // Quitamos el Hard Block
                            const btnSyncDrive = container.querySelector('#btn-sync-drive');
                            const btnSyncCsv = container.querySelector('#btn-sync-csv');
                            if (btnSyncDrive) btnSyncDrive.disabled = false;
                            // csv no lo reactivamos hasta que suban archivo, pero podemos quitar un atributo lock
                            if (btnSyncCsv) btnSyncCsv.removeAttribute('data-hard-blocked');
                        } else {
                            this._showToast((res && res.message) || 'Error al conectar', 'danger');
                        }
                    } catch (e) {
                        this._showToast(e.message, 'danger');
                    } finally {
                        btnTest.innerText = originalText;
                        btnTest.disabled = false;
                    }
                });
            }
        }
        // Marcar csv btn si está bloqueado
        if (entityName === 'Persona' && !(window.AppEnv && window.AppEnv.WORKSPACE_ENABLED)) {
            const btnSyncCsv = container.querySelector('#btn-sync-csv');
            if (btnSyncCsv) btnSyncCsv.setAttribute('data-hard-blocked', 'true');
        }

        // --- Event Listeners and Logic ---
        
        radioSheets.addEventListener('click', () => {
            radioSheets.classList.add('active');
            radioCSV.classList.remove('active');
            viewSheets.style.display = 'flex';
            viewCSV.style.display = 'none';
        });

        radioCSV.addEventListener('click', () => {
            radioCSV.classList.add('active');
            radioSheets.classList.remove('active');
            viewCSV.style.display = 'flex';
            viewSheets.style.display = 'none';
        });

        // ------------------ SHEETS LOGIC ------------------ //
        container.querySelector('#btn-gen-tpl').addEventListener('click', () => {
            const currentUrl = container.querySelector('#etl-drive-url').value;
            if (currentUrl && currentUrl.trim().startsWith('http')) {
                window.open(currentUrl.trim(), '_blank');
                return;
            }
            if (options && typeof options.onGenerateTemplate === 'function') {
                options.onGenerateTemplate(entityName, container);
            } else {
                this._defaultGenerateTemplate(entityName);
            }
        });
        
        const btnSyncDrive = container.querySelector('#btn-sync-drive');
        const urlInput = container.querySelector('#etl-drive-url');
        btnSyncDrive.disabled = true;

        urlInput.addEventListener('ionInput', (e) => {
            const val = (e.currentTarget.value || '').trim();
            const isFormatValid = val.length > 0 && /^https?:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/.test(val);
            
            btnSyncDrive.disabled = !isFormatValid;
            
            if (val.length > 0 && !isFormatValid) {
                urlInput.classList.add('ion-invalid', 'ion-touched');
                urlInput.setAttribute('error-text', 'El formato de la URL no es válido.');
            } else {
                urlInput.classList.remove('ion-invalid', 'ion-touched');
            }
            
            if (val.length === 0) {
                urlInput.removeAttribute('helper-text');
                urlInput.removeAttribute('error-text');
            }
            
            const btnOpenLink = container.querySelector('#btn-open-drive-link');
            if (btnOpenLink) {
                btnOpenLink.style.display = val.startsWith('http') ? 'block' : 'none';
            }
        });

        const btnOpenLink = container.querySelector('#btn-open-drive-link');
        if (btnOpenLink) {
            btnOpenLink.addEventListener('click', () => {
                const val = urlInput.value.trim();
                if (val.startsWith('http')) window.open(val, '_blank');
            });
        }

        btnSyncDrive.addEventListener('click', () => {
            const val = urlInput.value;
            if (!val || val.trim() === '') {
                return this._showToast('Por favor provee un enlace o ID válido.', 'warning');
            }
            if (options && typeof options.onDriveSync === 'function') {
                options.onDriveSync(entityName, val.trim(), container);
            } else {
                this._defaultDriveSync(entityName, val.trim());
            }
        });

        // ------------------ CSV LOGIC ------------------ //
        container.querySelector('#btn-dl-csv').addEventListener('click', (e) => {
            e.stopPropagation();
            if (options && typeof options.onDownloadCSVTpl === 'function') {
                options.onDownloadCSVTpl(entityName);
            }
        });

        let cachedFile = null;
        const fileInput = container.querySelector('#etl-csv-input');
        const btnUploadMobile = container.querySelector('#btn-upload-mobile');
        const dropzone = container.querySelector('#etl-dropzone');
        const btnSyncCsv = container.querySelector('#btn-sync-csv');

        const processFileSelect = (file) => {
            if (!file) return;
            cachedFile = file;
            btnSyncCsv.disabled = false;
            
            btnUploadMobile.innerHTML = `<ion-icon name="document-outline" slot="start"></ion-icon> ${file.name}`;
            
            dropzone.classList.add('filled');
            dropzone.innerHTML = `
                <ion-icon name="document-text" style="font-size: 32px; color: var(--ion-color-success)"></ion-icon>
                <div class="etl-dropzone-msg" style="color: var(--ion-color-dark); font-weight: 600; margin-top: 8px;">${file.name}</div>
                <div style="font-size: 11px; color: var(--ion-color-medium); margin-top: 4px;">Listo para importarse</div>
            `;
            
            this._showToast('Archivo preparado para importación.', 'success');
        };

        fileInput.addEventListener('change', (e) => processFileSelect(e.target.files[0]));
        btnUploadMobile.addEventListener('click', () => fileInput.click());

        const isTouchScreen = !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
        if (isTouchScreen) {
            dropzone.style.display = 'none';
        } else {
            btnUploadMobile.style.display = 'none';
            dropzone.addEventListener('click', () => fileInput.click());

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, e => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            dropzone.addEventListener('dragover', () => dropzone.classList.add('dragover'));
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => {
                dropzone.classList.remove('dragover');
                processFileSelect(e.dataTransfer.files[0]);
            });
        }

        btnSyncCsv.addEventListener('click', () => {
            if (!cachedFile) return this._showToast('Adjunta un archivo primero.', 'warning');
            
            let customEngine = window[`DataEngine_ETL_${entityName}`];
            if (customEngine && customEngine.processFile) {
                customEngine.processFile(entityName, cachedFile, {
                    progressCallback: (chunkIndex, totalChunks, isDone, metrics, customText) => {
                        this.updateProgress(chunkIndex, totalChunks, isDone, metrics, customText);
                    },
                    completionCallback: (metrics) => {
                        this.showResults(metrics);
                    }
                }).then(data => {
                    console.log(`Custom ETL Success para ${entityName}. Data:`, data);
                }).catch(err => {
                    console.error(`Error en Custom ETL para ${entityName}:`, err);
                    this._showToast(err.message, 'danger');
                });
                return;
            }

            if (options && typeof options.onLocalUpload === 'function') {
                options.onLocalUpload(entityName, { target: { files: [cachedFile] } }, container);
            }
        });

        this.containerNode = container;
        return container;
    }

    updateUrlField(urlStr) {
        if (!this.containerNode) return;
        const input = this.containerNode.querySelector('#etl-drive-url');
        if (input) {
            input.value = urlStr;
            input.setAttribute('helper-text', 'Hemos agregado la liga de tu plantilla descargada automáticamente');
            input.dispatchEvent(new CustomEvent('ionInput', { detail: { value: urlStr } }));
        }
    }

    updateProgress(chunkIndex, totalChunks, isDone, metrics, customText, step) {
        if (!this.containerNode) return;
        
        let progressContainer = this.containerNode.querySelector('#etl-progress-container');
        let currentStep = step || 2;
        
        if (!progressContainer) {
            this.containerNode.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100%; padding: 40px 20px; background: #fafafa; min-height: 500px;">
                    
                    <style>
                        .etl-pulse-container {
                            width: 120px;
                            height: 120px;
                            border-radius: 50%;
                            background: rgba(var(--ion-color-primary-rgb, 56,128,255), 0.1);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 30px;
                            position: relative;
                        }
                        .etl-pulse-ring {
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            border-radius: 50%;
                            border: 2px solid var(--ion-color-primary);
                            animation: etl-pulse-anim 2s infinite ease-out;
                        }
                        .etl-pulse-icon {
                            font-size: 50px;
                            color: var(--ion-color-primary);
                            z-index: 2;
                            transition: all 0.3s ease;
                        }
                        
                        .etl-step-list {
                            width: 100%;
                            max-width: 450px;
                            background: white;
                            border-radius: 12px;
                            padding: 20px;
                            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
                            margin-bottom: 30px;
                        }
                        .etl-step-item {
                            display: flex;
                            align-items: flex-start;
                            margin-bottom: 16px;
                            position: relative;
                            opacity: 0.5;
                            transition: opacity 0.3s ease;
                        }
                        .etl-step-item.active {
                            opacity: 1;
                        }
                        .etl-step-item.completed {
                            opacity: 0.8;
                        }
                        .etl-step-item:last-child {
                            margin-bottom: 0;
                        }
                        .etl-step-item:not(:last-child)::after {
                            content: '';
                            position: absolute;
                            left: 11px;
                            top: 28px;
                            bottom: -12px;
                            width: 2px;
                            background: #e0e0e0;
                            z-index: 1;
                        }
                        .etl-step-item.completed:not(:last-child)::after {
                            background: var(--ion-color-success, #2dd36f);
                        }
                        .etl-step-indicator {
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            background: #e0e0e0;
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            font-weight: bold;
                            margin-right: 16px;
                            z-index: 2;
                            position: relative;
                        }
                        .etl-step-item.active .etl-step-indicator {
                            background: var(--ion-color-primary);
                            box-shadow: 0 0 0 4px rgba(var(--ion-color-primary-rgb, 56,128,255), 0.2);
                        }
                        .etl-step-item.completed .etl-step-indicator {
                            background: var(--ion-color-success, #2dd36f);
                        }
                        .etl-step-text h4 {
                            margin: 0 0 4px 0;
                            font-size: 15px;
                            font-weight: 600;
                            color: var(--ion-color-dark);
                        }
                        .etl-step-text p {
                            margin: 0;
                            font-size: 13px;
                            color: var(--ion-color-medium);
                            line-height: 1.4;
                        }
                        
                        @keyframes etl-pulse-anim {
                            0% { transform: scale(0.8); opacity: 1; }
                            100% { transform: scale(1.5); opacity: 0; }
                        }
                        @keyframes etl-spin-anim {
                            100% { transform: rotate(360deg); }
                        }
                        .etl-icon-spin {
                            animation: etl-spin-anim 2s linear infinite;
                        }
                        .etl-icon-bounce {
                            animation: bounce 1s infinite alternate;
                        }
                        @keyframes bounce {
                            0% { transform: translateY(0); }
                            100% { transform: translateY(-10px); }
                        }
                    </style>

                    <div class="etl-pulse-container" id="etl-anim-container">
                        <div class="etl-pulse-ring"></div>
                        <ion-icon name="cloud-upload-outline" class="etl-pulse-icon etl-icon-bounce" id="etl-icon-step-1"></ion-icon>
                        <ion-icon name="server-outline" class="etl-pulse-icon" id="etl-icon-step-2" style="display:none;"></ion-icon>
                        <ion-icon name="sync-outline" class="etl-pulse-icon etl-icon-spin" id="etl-icon-step-3" style="display:none;"></ion-icon>
                        <ion-icon name="checkmark-circle" color="success" class="etl-pulse-icon etl-icon-bounce" id="etl-icon-step-4" style="display:none;"></ion-icon>
                    </div>
                    
                    <h2 style="font-weight: 600; color: var(--ion-color-dark); margin-bottom: 24px; font-size: 20px;">Importando Registros</h2>
                    
                    <div class="etl-step-list">
                        <div class="etl-step-item" id="etl-sitem-1">
                            <div class="etl-step-indicator">1</div>
                            <div class="etl-step-text">
                                <h4>Extracción y Descarga</h4>
                                <p>Descargando datos desde Google Sheets.</p>
                            </div>
                        </div>
                        <div class="etl-step-item" id="etl-sitem-2">
                            <div class="etl-step-indicator">2</div>
                            <div class="etl-step-text">
                                <h4>Encolando Tareas</h4>
                                <p>Preparando lote de datos para su procesamiento.</p>
                            </div>
                        </div>
                        <div class="etl-step-item" id="etl-sitem-3">
                            <div class="etl-step-indicator">3</div>
                            <div class="etl-step-text">
                                <h4>Validación e Inserción</h4>
                                <p>Deduplicando y aplicando reglas de negocio.</p>
                            </div>
                        </div>
                        <div class="etl-step-item" id="etl-sitem-4">
                            <div class="etl-step-indicator">4</div>
                            <div class="etl-step-text">
                                <h4>Consolidación Final</h4>
                                <p>Finalizando y generando reporte de resultados.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div id="etl-progress-container" style="width: 100%; max-width: 450px; text-align: center;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--ion-color-dark);">
                            <span id="etl-progress-label">Iniciando...</span>
                            <span id="etl-progress-percent">0%</span>
                        </div>
                        <div style="width: 100%; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden; position: relative;">
                            <div id="etl-progress-bar" style="height: 100%; width: 0%; background: var(--ion-color-primary); transition: width 0.4s ease; border-radius: 5px;"></div>
                        </div>
                    </div>
                </div>
            `;
            progressContainer = this.containerNode.querySelector('#etl-progress-container');
        }
        
        const progressBar = this.containerNode.querySelector('#etl-progress-bar');
        const progressLabel = this.containerNode.querySelector('#etl-progress-label');
        const progressPercent = this.containerNode.querySelector('#etl-progress-percent');
        
        // Update Stepper Classes
        for (let i = 1; i <= 4; i++) {
            const item = this.containerNode.querySelector(`#etl-sitem-${i}`);
            if (item) {
                if (i < currentStep) {
                    item.className = 'etl-step-item completed';
                    item.querySelector('.etl-step-indicator').innerHTML = '<ion-icon name="checkmark"></ion-icon>';
                } else if (i === currentStep) {
                    item.className = 'etl-step-item active';
                    item.querySelector('.etl-step-indicator').innerHTML = i;
                } else {
                    item.className = 'etl-step-item';
                    item.querySelector('.etl-step-indicator').innerHTML = i;
                }
            }
        }

        // Update Animation Icon based on step
        for (let i = 1; i <= 4; i++) {
            const icon = this.containerNode.querySelector(`#etl-icon-step-${i}`);
            if (icon) {
                if ((currentStep >= 4 && i === 4) || (currentStep === i && currentStep < 4)) {
                    icon.style.display = 'block';
                } else {
                    icon.style.display = 'none';
                }
            }
        }
        
        if (currentStep >= 4) {
            this.containerNode.querySelector('.etl-pulse-ring').style.borderColor = "var(--ion-color-success, #2dd36f)";
            this.containerNode.querySelector('.etl-pulse-container').style.background = "rgba(45,211,111, 0.1)";
        }
        
        if (progressContainer && progressBar && progressLabel) {
            const pc = totalChunks > 0 ? (chunkIndex / totalChunks) * 100 : (isDone ? 100 : 0);
            progressBar.style.width = `${pc}%`;
            
            if (progressPercent) progressPercent.textContent = `${Math.round(pc)}%`;
            
            if (customText) {
                progressLabel.textContent = customText;
            } else {
                progressLabel.textContent = `Procesando Lote ${chunkIndex} de ${totalChunks}`;
            }
        }
    }

    showResults(metrics, feedback) {
        if (!this.containerNode) return;
        
        const localFeedback = feedback || [];
        const hasIssues = (metrics.duplicate > 0 || metrics.error > 0) && localFeedback.length > 0;
        
        this.containerNode.innerHTML = `
            <div style="text-align: center; padding: 20px 10px;">
                <ion-icon name="checkmark-circle" color="success" style="font-size: 64px;"></ion-icon>
                <h2 style="font-weight: 600; color: var(--ion-color-dark); margin-top: 16px;">Ingesta Finalizada</h2>
                
                <div style="background: var(--ion-color-light); border-radius: 12px; padding: 20px; margin-top: 24px; text-align: left; display: inline-block; width: 100%; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <ion-icon name="checkmark-circle" color="success" style="font-size: 24px; margin-right: 12px;"></ion-icon>
                        <div style="flex: 1; font-size: 14px; color: var(--ion-color-dark);"><b>${metrics.success || 0}</b> registros satisfactorios</div>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <ion-icon name="warning" color="warning" style="font-size: 24px; margin-right: 12px;"></ion-icon>
                        <div style="flex: 1; font-size: 14px; color: var(--ion-color-dark);"><b>${metrics.duplicate || 0}</b> registros ya existentes</div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <ion-icon name="close-circle" color="danger" style="font-size: 24px; margin-right: 12px;"></ion-icon>
                        <div style="flex: 1; font-size: 14px; color: var(--ion-color-dark);"><b>${metrics.error || 0}</b> registros no realizados</div>
                    </div>
                </div>
                
                ${hasIssues ? `
                <div style="margin-top: 20px; color: var(--ion-color-medium); font-size: 13px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.4;">
                    <ion-icon name="information-circle-outline" style="vertical-align: middle;"></ion-icon> 
                    Por tu seguridad, la plataforma no puede alterar tu archivo original. Puedes descargar el reporte de los registros ignorados:
                    <div style="margin-top: 12px; text-align: center;">
                        <ion-button id="btn-etl-download-csv" fill="outline" color="warning" size="small" style="--border-radius: 6px;">
                            <ion-icon slot="start" name="download-outline"></ion-icon>
                            Descargar Reporte CSV
                        </ion-button>
                    </div>
                </div>
                ` : ''}
                
                <div style="margin-top: 30px; text-align: center;">
                    <ion-button fill="solid" color="primary" onclick="if(document.querySelector('ion-modal')) document.querySelector('ion-modal').dismiss(); else if(window.UI_ETL_Modal) window.UI_ETL_Modal.close();">Finalizar y Cerrar</ion-button>
                </div>
            </div>
        `;
        
        if (hasIssues) {
            const btnDownload = this.containerNode.querySelector('#btn-etl-download-csv');
            if (btnDownload) {
                btnDownload.addEventListener('click', () => {
                    let csvContent = "data:text/csv;charset=utf-8,Fila,Estado,Identificador,Motivo\n";
                    localFeedback.forEach(f => {
                        const fila = f._rowIndex || '-';
                        const estado = f.status || '-';
                        const id = (f.val || f.lexical_id || '-').toString().replace(/,/g, ' ');
                        const motivo = (f.reason || f.message || '-').toString().replace(/,/g, ' ');
                        csvContent += `${fila},${estado},${id},${motivo}\n`;
                    });
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "reporte_errores_ingesta.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            }
        }
    }

    async _defaultGenerateTemplate(entity) {
        document.querySelectorAll('ion-loading.loader-etl').forEach(el => el.remove());
        
        const loading = document.createElement('ion-loading');
        loading.className = 'loader-etl';
        loading.message = 'Creando plantilla en Google Sheet...';
        document.body.appendChild(loading);
        if (typeof window.PresentSafe === 'function') await window.PresentSafe(loading);
        else await loading.present();

        try {
            const res = await window.DataAPI.call('API_Universal_Router', 'etl_generate_template', entity, {});
            loading.dismiss();
            if (res && res.data) {
                this.urlCache[entity] = res.data;
                this.updateUrlField(res.data);
                
                const newWin = window.open(res.data, '_blank');
                if (newWin) {
                    this._showToast('¡Plantilla Creada en tu Drive! Pega tus datos en ella.', 'success');
                } else {
                    this._showToast('Plantilla creada, pero tu navegador bloqueó la pestaña. Usa la opción "Abrir archivo" para acceder a ella.', 'warning');
                }
            }
        } catch(err) {
            loading.dismiss();
            this._showToast(`Fallo crítico al forjar plantilla: ${err.message}`, 'danger');
        }
    }

    async _defaultDriveSync(entity, url) {
        // Mostrar UI de Progreso Inmediatamente para evitar el 'vacío' visual
        this.updateProgress(0, 100, false, null, "Esto puede demorar unos segundos...", 1);


        let etlEngine = null;
        let reqOptions = {};
        let isCustom = false;

        if (window[`DataEngine_ETL_${entity}`]) {
            etlEngine = window[`DataEngine_ETL_${entity}`];
            reqOptions = { rawMatrix: true };
            isCustom = true;
        } else if (window.DataEngine_ETL) {
            etlEngine = window.DataEngine_ETL;
        }

        if (!etlEngine) {
            return this._showToast(`No hay motor ETL cargado para procesar los registros.`, 'warning');
        }

        try {
            const res = await window.DataAPI.call('API_Universal_Router', 'etl_extract_sheet_data', entity, { url: url, options: reqOptions });
            if (res && res.data) {
                // S56.4: Inyección de Contexto Borrador si es llamado desde el Wizard
                if (this.contextId && Array.isArray(res.data)) {
                    res.data.forEach(row => {
                        row._contexto_arista = this.contextId;
                        if (this.edgeType) row._tipo_arista = this.edgeType;
                        if (this.parentEntity) row._entidad_padre = this.parentEntity;
                        if (!row.estado || String(row.estado).trim() === '') {
                            row.estado = 'Borrador'; // Si está en el Wizard, todo entra como borrador por defecto.
                        }
                    });
                }

                const progressCb = (chunkIndex, totalChunks, isDone, metrics, customText, step) => {
                    this.updateProgress(chunkIndex, totalChunks, isDone, metrics, customText, step);
                };

                let etlPromise;
                if (isCustom && etlEngine.processMatrix) {
                    etlPromise = new Promise((resolve, reject) => {
                        etlEngine.processMatrix(entity, res.data, {
                            progressCallback: progressCb,
                            completionCallback: resolve,
                            contextId: this.contextId // Provide Wizard context for ETL
                        }).catch(reject);
                    });
                } else if (etlEngine.processPayload) {
                    // S61.4: Enterprise ETL Architecture - Async Jobs
                    etlPromise = new Promise((resolve, reject) => {
                        window.DataAPI.call('API_Universal_Router', 'job_enqueue', entity, { data: res.data })
                        .then(enqueueRes => {
                            console.log("=== ENQUEUE RESPONSE ===", enqueueRes);
                            if (!enqueueRes || enqueueRes.status !== 'success') {
                                const srvMsg = (enqueueRes && enqueueRes.message) ? enqueueRes.message : 'Unknown Server Error';
                                return reject(new Error("Error encolando job: " + srvMsg));
                            }
                            if (enqueueRes.debugWorker) {
                                console.log("JobWorker Debug:", enqueueRes.debugWorker);
                                if (enqueueRes.debugWorker.error) {
                                    alert("CRITICAL BACKEND ERROR: " + enqueueRes.debugWorker.error);
                                }
                                if (enqueueRes.debugWorker.debug === "lock_failed") {
                                    alert("El trabajador está bloqueado (lock_failed). Google tardará unos minutos en liberarlo.");
                                }
                            }
                            const jobId = enqueueRes.data;
                            progressCb(0, 100, false, null, "Trabajo encolado en el servidor...");
                            
                            const pollServer = () => {
                                window.DataAPI.call('API_Universal_Router', 'job_status', entity, { jobId: jobId })
                                .then(statusRes => {
                                    console.log("=== STATUS RESPONSE ===", statusRes);
                                    if(statusRes && statusRes.status === 'success' && statusRes.data) {
                                        const job = statusRes.data;
                                        const chunks = job.total > 0 ? job.total : 100;
                                        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
                                            progressCb(job.total, job.total, true, null, job.message || "Completado.", 4);
                                            resolve({ success: job.processed - job.errors, duplicate: 0, error: job.errors });
                                        } else {
                                            progressCb(job.processed, chunks, false, null, job.message || `Procesando en servidor... ${job.processed}/${job.total}`, job.step || 2);
                                            setTimeout(pollServer, 3000);
                                        }
                                    } else {
                                        setTimeout(pollServer, 3000);
                                    }
                                }).catch(err => {
                                    reject(err);
                                });
                            };
                            
                            setTimeout(pollServer, 3000);
                        }).catch(reject);
                    });
                } else {
                    return this._showToast(`El motor ETL no tiene un método de procesamiento compatible.`, 'warning');
                }

                etlPromise.then(async (metrics) => {
                    if (window.DataAPI && window.DataStore) {
                        try {
                            const payloads = await Promise.all([
                                window.DataAPI.call('getInitialPayload', entity),
                                window.DataAPI.call('getInitialPayload', 'Sys_Graph_Edges')
                            ]);
                            [entity, 'Sys_Graph_Edges'].forEach((ent, idx) => {
                                const raw = payloads[idx];
                                const res = typeof raw === 'string' ? JSON.parse(raw) : raw;
                                if (res && res.status === 'success') {
                                    const rows = window.Schema_Utils.inflateTuples(res.data);
                                    window.DataStore.set(ent, rows);
                                }
                            });
                            if (window.AppEventBus) window.AppEventBus.publish('CACHE::GRAPH_HYDRATED', { source: 'ETL' });
                        } catch(e) {
                            console.error('[BulkImporter] Error re-hidratando cache', e);
                        }
                    }

                    const m = metrics || { success: res.data.length, duplicate: 0, error: 0 };
                    const feedbackArray = m._feedback || [];
                    this.showResults(m, feedbackArray);
                    
                    // Notificar finalización global
                    if (window.AppEventBus) {
                        window.AppEventBus.publish('ETL::FINISHED', { entity: entity, contextId: this.contextId });
                    }
                }).catch(err => {
                    console.error('[Chunker Error]', err);
                    const urlInput = this.containerNode.querySelector('#etl-drive-url');
                    if (urlInput && err.message && (err.message.includes('vací') || err.message.includes('data útil') || err.message.includes('vacio') || err.message.includes('columna correo') || err.message.includes('filas'))) {
                        urlInput.setAttribute('error-text', err.message);
                        urlInput.classList.add('ion-invalid', 'ion-touched');
                    } else {
                        alert(`Error general de procesamiento:\n${err.message}`);
                    }
                });
            } else if (res && res.status === 'error') {
                throw new Error(res.message || "Error desconocido devuelto por el servidor.");
            }
        } catch(err) {
            console.error('[ETL Fatal Error]', err);
            const urlInput = this.containerNode.querySelector('#etl-drive-url');
            if (urlInput && err.message && (err.message.includes('vací') || err.message.includes('data útil') || err.message.includes('vacio') || err.message.includes('columna correo') || err.message.includes('acceder al documento') || err.message.includes('inaccesible') || err.message.includes('MimeType'))) {
                let displayMsg = 'El archivo proporcionado se encuentra vacío o sin data útil.';
                if (err.message.includes('columna correo')) displayMsg = err.message;
                if (err.message.includes('acceder al documento') || err.message.includes('inaccesible') || err.message.includes('MimeType')) {
                    displayMsg = 'El enlace es incorrecto, no tienes permisos, o el archivo es un Excel (.xlsx) antiguo. Asegúrate de usar el enlace del nuevo Google Sheet convertido.';
                }
                urlInput.setAttribute('error-text', displayMsg);
                urlInput.classList.add('ion-invalid', 'ion-touched');
            } else {
                this._showToast(`Fallo al extraer registros: ${err.message}`, 'danger');
            }
        }
    }
};
