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
        // Ajustes para que se comporte como un Popup Centrado (Desktop) y no Fullscreen si es posible
        modal.cssClass = 'etl-central-modal'; 

        const content = document.createElement('ion-content');
        
        // --- Header ---
        const header = document.createElement('ion-header');
        const toolbar = document.createElement('ion-toolbar');
        const title = document.createElement('ion-title');
        title.innerHTML = `<ion-icon name="cloud-upload-outline" class="ion-margin-end"></ion-icon> Carga Masiva - `;
        title.appendChild(document.createTextNode(window.formatEntityName ? window.formatEntityName(entityName) : entityName));
        
        const buttonsEnd = document.createElement('ion-buttons');
        buttonsEnd.setAttribute('slot', 'end');
        const btnClose = document.createElement('ion-button');
        btnClose.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
        btnClose.addEventListener('click', () => modal.dismiss());
        
        buttonsEnd.appendChild(btnClose);
        toolbar.appendChild(title);
        toolbar.appendChild(buttonsEnd);
        header.appendChild(toolbar);
        
        // --- Body Container ---
        const container = document.createElement('div');
        container.className = 'etl-body'; // Reemplazo de inline styles y ion-padding

        // --- Progress Tracker (Oculto inicialmente) ---
        const progressContainer = document.createElement('div');
        progressContainer.id = 'etl-progress-container';
        progressContainer.style.display = 'none'; // Estado base oculto en DOM
        
        const progressLabel = document.createElement('span');
        progressLabel.id = 'etl-progress-label';
        progressLabel.className = 'etl-progress-label';
        progressLabel.textContent = 'Procesando Lote...';

        const progressWrap = document.createElement('div');
        progressWrap.className = 'etl-progress-wrap';

        const progressBar = document.createElement('div');
        progressBar.id = 'etl-progress-bar';
        progressBar.className = 'etl-progress-bar';
        // Width se controlará en tiempo de ejecución
        
        progressWrap.appendChild(progressBar);
        progressContainer.appendChild(progressLabel);
        progressContainer.appendChild(progressWrap);

        // --- SECTION 1: Google Workspace Sync ---
        const cardDrive = document.createElement('ion-card');
        cardDrive.className = 'ion-no-margin';
        const cardDriveHeader = document.createElement('ion-card-header');
        // Remueve styles hardcoded y delega a tokens/clases utilitarias de Ionic (color="success")
        cardDriveHeader.innerHTML = `<ion-card-title>
            <ion-text color="success"><strong>G</strong></ion-text> 
            <ion-text color="success"><strong>Google Sheets</strong></ion-text> 
            <span class="ion-text-medium">(Recomendado)</span></ion-card-title>`;
        
        const cardDriveContent = document.createElement('ion-card-content');
        cardDriveContent.innerHTML = `<p class="ion-margin-bottom ion-text-medium">Sincroniza directamente desde tu Drive. Omite dependencias offline y evita bloqueos de límite de Google.</p>`;
        
        const btnGenTpl = document.createElement('ion-button');
        btnGenTpl.setAttribute('expand', 'block');
        btnGenTpl.setAttribute('fill', 'outline');
        btnGenTpl.setAttribute('shape', 'round');
        btnGenTpl.className = 'etl-btn-action';
        btnGenTpl.innerHTML = `<ion-icon name="document" slot="start"></ion-icon> 1. Auto-Generar Plantilla en Drive`;
        btnGenTpl.addEventListener('click', () => {
            if (options && typeof options.onGenerateTemplate === 'function') {
                options.onGenerateTemplate(entityName, modal);
            }
        });

        const inputItem = document.createElement('ion-item');
        inputItem.className = 'ion-margin-top';
        inputItem.setAttribute('fill', 'solid');
        inputItem.style.borderRadius = 'var(--rounded-sm, 8px)'; // Manteniendo scope acoplado a la API Ionic
        const urlInput = document.createElement('ion-input');
        urlInput.id = 'etl-drive-url';
        urlInput.setAttribute('label', '2. URL o ID de Google Sheet');
        urlInput.setAttribute('label-placement', 'floating');
        urlInput.setAttribute('clear-input', 'true');
        inputItem.appendChild(urlInput);

        const btnSync = document.createElement('ion-button');
        btnSync.setAttribute('expand', 'block');
        btnSync.setAttribute('shape', 'round');
        btnSync.className = 'etl-btn-action ion-margin-top';
        btnSync.innerHTML = `<ion-icon name="sync-circle-outline" slot="start"></ion-icon> 3. Ejecutar Extracción Híbrida`;
        btnSync.addEventListener('click', () => {
            const val = urlInput.value;
            if (!val || val.trim() === '') {
                return _showToast('Por favor provee un enlace o ID válido.', 'warning');
            }
            if (options && typeof options.onDriveSync === 'function') {
                options.onDriveSync(entityName, val.trim(), modal);
            }
        });

        cardDriveContent.appendChild(btnGenTpl);
        cardDriveContent.appendChild(inputItem);
        cardDriveContent.appendChild(btnSync);
        cardDrive.appendChild(cardDriveHeader);
        cardDrive.appendChild(cardDriveContent);

        // --- SECTION 2: Local CSV (Fallback) ---
        const cardLocal = document.createElement('ion-card');
        cardLocal.className = 'ion-no-margin';
        const cardLocalHeader = document.createElement('ion-card-header');
        cardLocalHeader.innerHTML = `<ion-card-title><ion-icon name="folder-open-outline"></ion-icon> Carga Plana (CSV)</ion-card-title>`;
        
        const cardLocalContent = document.createElement('ion-card-content');
        cardLocalContent.innerHTML = `<p class="ion-margin-bottom ion-text-medium">Procesa un archivo local sin pasar por los servidores de nube nativos.</p>`;
        
        const fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');
        fileInput.setAttribute('accept', '.csv');
        fileInput.style.display = 'none';
        
        const handleFile = (evtOrFile) => {
            if (options && typeof options.onLocalUpload === 'function') {
                options.onLocalUpload(entityName, evtOrFile, modal);
            }
        };

        fileInput.addEventListener('change', (e) => handleFile(e));

        const btnDownloadCsv = document.createElement('ion-button');
        btnDownloadCsv.setAttribute('fill', 'clear');
        btnDownloadCsv.setAttribute('shape', 'round');
        btnDownloadCsv.className = 'etl-btn-action';
        btnDownloadCsv.innerHTML = `<ion-icon name="download-outline" slot="start"></ion-icon> Bajar Template`;
        btnDownloadCsv.addEventListener('click', (e) => {
             e.stopPropagation();
             if (options && typeof options.onDownloadCSVTpl === 'function') {
                options.onDownloadCSVTpl(entityName);
             }
        });

        const btnUploadCsv = document.createElement('ion-button');
        btnUploadCsv.setAttribute('fill', 'outline');
        btnUploadCsv.setAttribute('color', 'secondary');
        btnUploadCsv.setAttribute('shape', 'round');
        btnUploadCsv.className = 'etl-btn-action';
        btnUploadCsv.innerHTML = `<ion-icon name="upload-outline" slot="start"></ion-icon> Adjuntar .CSV`;
        btnUploadCsv.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        const flexRow = document.createElement('div');
        flexRow.className = 'etl-btn-row';
        flexRow.appendChild(btnDownloadCsv);
        flexRow.appendChild(btnUploadCsv);
        
        // H6: Dropzone que complementa al botón CSV con affordance
        // Optimization (AR): Evitar instanciar listeners y nodos de Drag&Drop si la pantalla es estrictamente táctil
        const isTouchScreen = !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
        
        const dropzone = document.createElement('div');
        dropzone.className = 'etl-dropzone';
        
        if (!isTouchScreen) {
            // Desktop Drag events
            const addDragEvents = (el) => {
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    el.addEventListener(eventName, e => {
                        e.preventDefault();
                        e.stopPropagation();
                    });
                });
                
                el.addEventListener('dragover', () => dropzone.classList.add('dragover'));
                el.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
                el.addEventListener('drop', (e) => {
                    dropzone.classList.remove('dragover');
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile({ target: { files: [file] } });
                });
            };
            
            addDragEvents(dropzone);
            
            const dropMsg = document.createElement('div');
            dropMsg.className = 'etl-dropzone-msg';
            dropMsg.textContent = 'Arrastra tu archivo .csv aquí para procesarlo directamente.';
            dropzone.appendChild(dropMsg);
        }

        // Fallback for Touch: Los botones se pintan fuera para asegurar interacción incondicional
        const actionContainer = document.createElement('div');
        actionContainer.appendChild(fileInput);
        actionContainer.appendChild(flexRow);

        cardLocalContent.appendChild(actionContainer);
        if (!isTouchScreen) {
            cardLocalContent.appendChild(dropzone); // Solo se anexa al DOM si no es touch
        }

        cardLocal.appendChild(cardLocalHeader);
        cardLocal.appendChild(cardLocalContent);

        // --- TAB SEGMENTATION ---
        // Se cambió ion-segment style a solo className si queremos inyectar un estilo. 
        // Ionic resuelve el background nativo.
        const segment = document.createElement('ion-segment');
        segment.value = 'drive';
        segment.className = 'ion-margin-bottom';
        segment.innerHTML = `
            <ion-segment-button value="drive">
                <ion-label>Desde GoogleSheet</ion-label>
            </ion-segment-button>
            <ion-segment-button value="local">
                <ion-label>Desde tu Equipo</ion-label>
            </ion-segment-button>
        `;
        
        segment.addEventListener('ionChange', (e) => {
            if (e.detail.value === 'drive') {
                cardDrive.style.display = 'block';
                cardLocal.style.display = 'none';
            } else {
                cardDrive.style.display = 'none';
                cardLocal.style.display = 'block';
            }
        });

        // Estado inicial
        cardLocal.style.display = 'none';

        // Assembly
        container.appendChild(segment);
        container.appendChild(progressContainer);
        container.appendChild(cardDrive);
        container.appendChild(cardLocal);
        
        content.appendChild(header);
        content.appendChild(container);
        modal.appendChild(content);

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
