class TXFileUpload extends HTMLElement {
    constructor() {
        super();
        this._field = null;
        this.selectedData = null;
    }

    set field(f) {
        this._field = f;
        this.render();
    }

    get field() {
        return this._field;
    }

    getValidatedValue() {
        if (!this.segment || !this.driveInput) return null;
        if (this.segment.value === 'drive') {
            return this.driveInput.value ? { type: 'drive', url: this.driveInput.value } : null;
        }
        return this.selectedData;
    }

    connectedCallback() {
        // Upgrade properties if they were set before the element was defined
        if (this.hasOwnProperty('field')) {
            let value = this.field;
            delete this.field;
            this.field = value;
        } else if (this._field && !this.segment) {
            this.render();
        }

        // Framework hydration event (FormRenderer_UI)
        this.addEventListener('FormHydrated', (e) => {
            this.hydrateValue(e.detail);
        });
    }

    set value(v) {
        this.hydrateValue(v);
    }
    
    get value() {
        return this.getValidatedValue();
    }

    hydrateValue(val) {
        if (val && typeof val === 'string' && val.startsWith('http')) {
            this.selectedData = { type: 'drive', url: val };
            if (this.segment) this.segment.style.display = 'none';
            if (this.inputContainer) this.inputContainer.style.display = 'none';
            if (this.existingFileContainer) this.existingFileContainer.style.display = 'block';
            this._currentUrl = val;
        }
    }

    async _showToast(msg) {
        const toast = document.createElement('ion-toast');
        toast.message = msg;
        toast.duration = 3000;
        toast.color = 'warning';
        toast.position = 'bottom';
        document.body.appendChild(toast);
        if (typeof toast.present === 'function') await toast.present();
    }

    render() {
        this.innerHTML = ''; // Clear previous
        if (!this._field) return;

        this.innerHTML = `
            <div style="display: block; width: 100%;">
                <ion-label style="display: block; margin-bottom: var(--spacing-2); font-weight: 500; color: var(--ion-color-dark);">
                    ${this._field.label}${this._field.required ? ' *' : ''}
                </ion-label>
                
                <ion-card class="existing-file-container" style="display: none; margin: 0 0 var(--spacing-3) 0; width: 100%; box-shadow: none; border: 1px solid var(--ion-color-light);">
                    <ion-item lines="none" style="width: 100%; --background: transparent;">
                        <ion-icon name="document-text" slot="start" color="primary"></ion-icon>
                        <ion-label class="file-open-label" style="cursor: pointer;">
                            <h2>Documento Registrado</h2>
                            <p>Haz clic para abrir el archivo</p>
                        </ion-label>
                        <ion-button fill="clear" color="danger" slot="end" title="Eliminar documento" class="delete-btn">
                            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                        </ion-button>
                    </ion-item>
                </ion-card>

                <ion-segment class="upload-segment" value="local" style="margin-bottom: var(--spacing-3); width: 100%;">
                    <ion-segment-button value="local"><ion-label>Subir Archivo</ion-label></ion-segment-button>
                    <ion-segment-button value="drive"><ion-label>Enlace Drive</ion-label></ion-segment-button>
                </ion-segment>

                <div class="input-container">
                    <input type="file" name="${this._field.name}_local" 
                           ${this._field.allowedTypes ? `accept="${this._field.allowedTypes.join(',')}"` : ''} 
                           style="display: block; padding: 10px; border: 1px dashed var(--ion-color-medium); border-radius: var(--rounded-sm); width: 100%;">
                    <ion-input type="url" placeholder="https://drive.google.com/..." name="${this._field.name}_drive" style="display: none;"></ion-input>
                </div>
            </div>
        `;

        // References to elements
        this.existingFileContainer = this.querySelector('.existing-file-container');
        this.segment = this.querySelector('.upload-segment');
        this.inputContainer = this.querySelector('.input-container');
        const fileInput = this.querySelector('input[type="file"]');
        this.driveInput = this.querySelector('ion-input[type="url"]');
        const cardLabel = this.querySelector('.file-open-label');
        const deleteBtn = this.querySelector('.delete-btn');

        // Event Listeners
        cardLabel.addEventListener('click', () => {
            if (this._currentUrl) window.open(this._currentUrl, '_blank');
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectedData = null; // Backend lo interpretará como nulo/eliminado si no se sube nada nuevo
            this._currentUrl = null;
            this.existingFileContainer.style.display = 'none';
            this.segment.style.display = 'flex';
            this.inputContainer.style.display = 'block';
        });

        this.segment.addEventListener('ionChange', (e) => {
            if (e.detail.value === 'local') {
                fileInput.style.display = 'block';
                this.driveInput.style.display = 'none';
                this.selectedData = fileInput.files && fileInput.files.length > 0 ? this.selectedData : null;
            } else {
                fileInput.style.display = 'none';
                this.driveInput.style.display = 'block';
                this.selectedData = this.driveInput.value ? { type: 'drive', url: this.driveInput.value } : null;
            }
        });

        // Local file logic
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                this.selectedData = null;
                return;
            }
            
            // Validate type
            if (this._field.allowedTypes && this._field.allowedTypes.length > 0) {
                const ext = '.' + file.name.split('.').pop().toLowerCase();
                const isValidType = this._field.allowedTypes.includes(file.type) || this._field.allowedTypes.includes(ext);
                if (!isValidType) {
                    this._showToast('Tipo de archivo no permitido. Tipos válidos: ' + this._field.allowedTypes.join(', '));
                    fileInput.value = '';
                    this.selectedData = null;
                    return;
                }
            }
            
            // Validate size
            const maxSizeMB = this._field.maxSizeMB || 5;
            if (file.size > maxSizeMB * 1024 * 1024) {
                this._showToast(`El archivo es demasiado grande (Máximo ${maxSizeMB}MB).`);
                fileInput.value = '';
                this.selectedData = null;
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                const dataUrl = evt.target.result;
                const base64 = dataUrl.split(',')[1];
                this.selectedData = {
                    type: 'local',
                    filename: file.name,
                    mimeType: file.type,
                    data: base64,
                    allowedTypes: this._field.allowedTypes
                };
            };
            reader.readAsDataURL(file);
        });

        this.driveInput.addEventListener('ionInput', (e) => {
            if (this.segment.value === 'drive' && e.target.value) {
                this.selectedData = { type: 'drive', url: e.target.value };
            } else {
                this.selectedData = null;
            }
        });

        this.appendChild(label);
        this.appendChild(this.segment);
        this.appendChild(this.inputContainer);
        this.appendChild(this.existingFileContainer);
    }
}

if (!window.customElements.get('tx-file-upload')) {
    window.customElements.define('tx-file-upload', TXFileUpload);
}
