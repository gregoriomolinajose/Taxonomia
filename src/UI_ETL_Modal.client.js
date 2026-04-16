/* ============================================================
   UI_ETL_Modal.client.js — Hub Visual de Ingesta Híbrida (V4)
   ============================================================ */

window.UI_ETL_Modal = (function() {

    function present(entityName, options) {
        // [QA Fix] Evitar DOM Node Leakage eliminando rastros previos
        const prevModal = document.getElementById('dv-etl-modal');
        if (prevModal) prevModal.remove();

        const modal = document.createElement('ion-modal');
        modal.id = 'dv-etl-modal';
        modal.cssClass = 'etl-central-modal'; 

        const content = document.createElement('ion-content');
        
        // --- Header Custom ---
        const headerContainer = document.createElement('div');
        headerContainer.className = 'etl-header ion-padding';
        
        const closeBtn = document.createElement('ion-icon');
        closeBtn.name = 'close-outline';
        closeBtn.style.cssText = 'position: absolute; right: 16px; top: 16px; font-size: 24px; cursor: pointer; color: white; z-index: 10;';
        closeBtn.addEventListener('click', () => modal.dismiss());
        headerContainer.appendChild(closeBtn);

        const headerBox = document.createElement('div');
        headerBox.className = 'etl-header-box';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'etl-header-icon';
        iconDiv.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon>';
        
        const textDiv = document.createElement('div');
        textDiv.innerHTML = `
            <div style="font-weight: 600; font-size: 18px;">Carga masiva</div>
            <div style="font-size: 12px; opacity: 0.9;">Importar ${window.formatEntityName ? window.formatEntityName(entityName) : entityName}</div>
        `;
        
        headerBox.appendChild(iconDiv);
        headerBox.appendChild(textDiv);
        headerContainer.appendChild(headerBox);
        
        // --- Body Container ---
        const container = document.createElement('div');
        container.className = 'etl-body';

        // --- Progress Tracker ---
        const progressContainer = document.createElement('div');
        progressContainer.id = 'etl-progress-container';
        progressContainer.style.display = 'none';
        
        const progressLabel = document.createElement('span');
        progressLabel.id = 'etl-progress-label';
        progressLabel.className = 'etl-progress-label';
        progressLabel.textContent = 'Procesando Lote...';

        const progressWrap = document.createElement('div');
        progressWrap.className = 'etl-progress-wrap';

        const progressBar = document.createElement('div');
        progressBar.id = 'etl-progress-bar';
        progressBar.className = 'etl-progress-bar';
        
        progressWrap.appendChild(progressBar);
        progressContainer.appendChild(progressLabel);
        progressContainer.appendChild(progressWrap);

        container.appendChild(progressContainer);

        // --- SECTION 0: Fuente de Datos (Radio Cards) ---
        const sectionTitle1 = document.createElement('div');
        sectionTitle1.className = 'etl-section-title';
        sectionTitle1.textContent = 'SELECCIONA LA FUENTE DE DATOS';
        container.appendChild(sectionTitle1);

        const radioGrid = document.createElement('div');
        radioGrid.className = 'etl-radio-grid';

        // Sheets Card
        const radioSheets = document.createElement('div');
        radioSheets.className = 'etl-radio-card active'; // Default
        radioSheets.innerHTML = `
            <ion-icon class="etl-radio-card-check" name="checkmark-circle"></ion-icon>
            <div class="etl-radio-icon"><ion-icon name="document-text-outline"></ion-icon></div>
            <div class="etl-radio-title">Google Sheets</div>
            <div class="etl-radio-desc">Sincroniza desde Drive en tiempo real</div>
            <div class="etl-badge-recommended">Recomendado</div>
        `;

        // CSV Card
        const radioCSV = document.createElement('div');
        radioCSV.className = 'etl-radio-card csv';
        radioCSV.innerHTML = `
            <ion-icon class="etl-radio-card-check" name="checkmark-circle"></ion-icon>
            <div class="etl-radio-icon"><ion-icon name="document-outline"></ion-icon></div>
            <div class="etl-radio-title">Archivo CSV</div>
            <div class="etl-radio-desc">Carga desde tu computadora</div>
        `;

        radioGrid.appendChild(radioSheets);
        radioGrid.appendChild(radioCSV);
        container.appendChild(radioGrid);

        // --- DIVIDER: Pasos para importar ---
        const sectionTitle2 = document.createElement('div');
        sectionTitle2.className = 'etl-section-title';
        sectionTitle2.innerHTML = `PASOS PARA IMPORTAR <hr>`;
        container.appendChild(sectionTitle2);

        // --- SECTION 1: Google Sheets View ---
        const viewSheets = document.createElement('div');
        viewSheets.className = 'etl-stepper';
        
        // Step 1: Descarga Tpl
        const sStep1 = document.createElement('div');
        sStep1.className = 'etl-step';
        sStep1.innerHTML = `
            <div class="etl-step-badge active">1</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Generar plantilla en Drive</div>
                <div class="etl-step-desc">Crea automáticamente una hoja con el formato correcto en tu Google Drive.</div>
                
                <div class="etl-download-card" id="btn-gen-tpl">
                    <ion-icon class="etl-download-icon" name="document-text"></ion-icon>
                    <div>
                        <div class="etl-download-title">Descarga</div>
                        <div class="etl-download-hint">Generar Template Sheets</div>
                    </div>
                    <ion-icon class="etl-download-action" name="arrow-down-circle-outline"></ion-icon>
                </div>
            </div>
        `;

        // Step 2: URL / Search
        const sStep2 = document.createElement('div');
        sStep2.className = 'etl-step';
        sStep2.innerHTML = `
            <div class="etl-step-badge current">2</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Pegar URL, ID de la hoja</div>
                <div class="etl-step-desc">Copia el enlace desde la barra de tu navegador o inspecciona directamente desde google drive.</div>
                
                <ion-item class="etl-input-item" lines="none">
                    <ion-input id="etl-drive-url" placeholder="https://docs..."></ion-input>
                    <ion-button fill="clear" slot="end" color="medium" id="btn-inspect-drive" style="margin:0;">
                        <ion-icon name="search-outline"></ion-icon>
                    </ion-button>
                </ion-item>
                <p class="etl-hint-text">Hemos agregado la liga de tu plantilla descargada automáticamente</p>
            </div>
        `;

        // Step 3: Action
        const sStep3 = document.createElement('div');
        sStep3.className = 'etl-step';
        sStep3.innerHTML = `
            <div class="etl-step-badge pending">3</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Ejecuta la importación</div>
                <div class="etl-step-desc">Ejecuta la importación para realizar la carga de los registros.</div>
                
                <div class="etl-bottom-exec">
                    <ion-button class="etl-btn-execute" fill="outline" id="btn-sync-drive">Cargar Registros</ion-button>
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

        // CSV Step 1
        const cStep1 = document.createElement('div');
        cStep1.className = 'etl-step';
        cStep1.innerHTML = `
            <div class="etl-step-badge active">1</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Descarga el template</div>
                <div class="etl-step-desc">Usa el formato correcto para evitar errores en la importación.</div>
                
                <div class="etl-download-card" id="btn-dl-csv">
                    <ion-icon class="etl-download-icon" name="document-text" color="success"></ion-icon>
                    <div>
                        <div class="etl-download-title">Descarga</div>
                        <div class="etl-download-hint">Descargar Template CSV</div>
                    </div>
                    <ion-icon class="etl-download-action" name="arrow-down-circle-outline"></ion-icon>
                </div>
            </div>
        `;

        // CSV Step 2
        const cStep2 = document.createElement('div');
        cStep2.className = 'etl-step';
        cStep2.innerHTML = `
            <div class="etl-step-badge current">2</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Adjunta tu archivo</div>
                <div class="etl-step-desc">Asegúrate que el archivo sea menor a 15MB.</div>
                
                <input type="file" id="etl-csv-input" accept=".csv" style="display:none;" />
                
                <!-- Fallback Button para Movil -->
                <ion-button fill="outline" color="medium" id="btn-upload-mobile" style="margin-bottom: 12px; --border-radius: 8px;">
                    <ion-icon name="folder-open-outline" slot="start"></ion-icon> Explorar Archivos
                </ion-button>

                <div class="etl-dropzone" id="etl-dropzone">
                    <ion-icon name="cloud-upload-outline" style="font-size: 32px; color: var(--ion-color-primary)"></ion-icon>
                    <div class="etl-dropzone-msg">Arrastra tu archivo .csv aquí o haz clic para subirlo.</div>
                </div>
            </div>
        `;

        // CSV Step 3
        const cStep3 = document.createElement('div');
        cStep3.className = 'etl-step';
        cStep3.innerHTML = `
            <div class="etl-step-badge pending">3</div>
            <div class="etl-step-content">
                <div class="etl-step-title">Ejecuta la importación</div>
                <div class="etl-step-desc">Ejecuta la importación para realizar la carga de los registros.</div>
                
                <div class="etl-bottom-exec">
                    <ion-button class="etl-btn-execute" fill="outline" color="success" id="btn-sync-csv" disabled="true">Cargar Registros</ion-button>
                </div>
            </div>
        `;

        viewCSV.appendChild(cStep1);
        viewCSV.appendChild(cStep2);
        viewCSV.appendChild(cStep3);

        container.appendChild(viewSheets);
        container.appendChild(viewCSV);

        content.appendChild(headerContainer);
        content.appendChild(container);
        modal.appendChild(content);

        // --- Event Listeners and Logic ---
        
        // Radio Toggles
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
        // Gen Template
        modal.querySelector('#btn-gen-tpl').addEventListener('click', () => {
            if (options && typeof options.onGenerateTemplate === 'function') {
                options.onGenerateTemplate(entityName, modal);
            }
        });
        
        // Inspect Dummy
        modal.querySelector('#btn-inspect-drive').addEventListener('click', () => {
            _showToast('Inpección nativa de Drive programada para E39. Por favor pega la URL manualmente.', 'tertiary');
        });

        // Execute Sheets
        modal.querySelector('#btn-sync-drive').addEventListener('click', () => {
            const val = modal.querySelector('#etl-drive-url').value;
            if (!val || val.trim() === '') {
                return _showToast('Por favor provee un enlace o ID válido.', 'warning');
            }
            if (options && typeof options.onDriveSync === 'function') {
                options.onDriveSync(entityName, val.trim(), modal);
            }
        });

        // ------------------ CSV LOGIC ------------------ //
        // DL Template
        modal.querySelector('#btn-dl-csv').addEventListener('click', (e) => {
            e.stopPropagation();
            if (options && typeof options.onDownloadCSVTpl === 'function') {
                options.onDownloadCSVTpl(entityName);
            }
        });

        // File Handler
        let cachedFile = null;
        const fileInput = modal.querySelector('#etl-csv-input');
        const btnUploadMobile = modal.querySelector('#btn-upload-mobile');
        const dropzone = modal.querySelector('#etl-dropzone');
        const btnSyncCsv = modal.querySelector('#btn-sync-csv');

        const processFileSelect = (file) => {
            if (!file) return;
            cachedFile = file;
            btnSyncCsv.disabled = false;
            
            // Visual Update
            const msgs = modal.querySelectorAll('.etl-dropzone-msg');
            msgs.forEach(msg => msg.textContent = `Archivo adjuntado: ${file.name}`);
            btnUploadMobile.innerHTML = `<ion-icon name="document-outline" slot="start"></ion-icon> ${file.name}`;
            
            _showToast('Archivo preparado para importación.', 'success');
        };

        fileInput.addEventListener('change', (e) => processFileSelect(e.target.files[0]));
        btnUploadMobile.addEventListener('click', () => fileInput.click());

        // Dropzone Logic
        const isTouchScreen = !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
        if (isTouchScreen) {
            dropzone.style.display = 'none'; // Only mobile button
        } else {
            btnUploadMobile.style.display = 'none'; // Only dropzone on desktop
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

        // Execute CSV
        btnSyncCsv.addEventListener('click', () => {
            if (!cachedFile) return _showToast('Adjunta un archivo primero.', 'warning');
            if (options && typeof options.onLocalUpload === 'function') {
                options.onLocalUpload(entityName, { target: { files: [cachedFile] } }, modal);
            }
        });

        // [QA Fix] Self-destruct listener RAM clear
        modal.addEventListener('ionModalDidDismiss', () => { modal.remove(); });

        document.body.appendChild(modal);
        return typeof window.PresentSafe === 'function' ? window.PresentSafe(modal) : modal.present();
    }

    function _showToast(message, color) {
        const toast = document.createElement('ion-toast');
        toast.message = message;
        toast.duration = 2500;
        toast.color = color || 'success';
        document.body.appendChild(toast);
        return typeof window.PresentSafe === 'function' ? window.PresentSafe(toast) : toast.present();
    }

    return {
        present: present,
        updateUrlField: function(urlStr) {
            const input = document.getElementById('etl-drive-url');
            if (input) input.value = urlStr;
        },
        updateProgress: function(chunkIndex, totalChunks) {
            const progressContainer = document.getElementById('etl-progress-container');
            const progressBar = document.getElementById('etl-progress-bar');
            const progressLabel = document.getElementById('etl-progress-label');
            
            if (progressContainer && progressBar && progressLabel) {
                progressContainer.style.display = 'block';
                const pc = (chunkIndex / totalChunks) * 100;
                progressBar.style.width = `${pc}%`;
                progressLabel.textContent = `Procesando Lote ${chunkIndex} de ${totalChunks} (${Math.round(pc)}%)`;
                
                if (chunkIndex >= totalChunks) {
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        progressBar.style.width = '0%';
                    }, 2000);
                }
            }
        }
    };
})();
