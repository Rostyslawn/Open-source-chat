// DOM Elements with strict typing
const fileUploadBtn = document.getElementById('fileUploadBtn') as HTMLButtonElement | null;
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
const filePreviewModal = document.getElementById('filePreviewModal') as HTMLDivElement | null;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement | null;
const closePreviewBtn = document.getElementById('closePreviewBtn') as HTMLButtonElement | null;
const cancelUploadBtn = document.getElementById('cancelUploadBtn') as HTMLButtonElement | null;
const sendFileBtn = document.getElementById('sendFileBtn') as HTMLButtonElement | null;

// Interfaces
interface UploadResponse {
    status: boolean;
    error?: string;
}

// Utility Functions
const getFileIcon = (fileName: string): string => {
    const ext = fileName.toLowerCase();

    if (ext.endsWith('.mp3') || ext.endsWith('.wav')) return '🎵';
    if (ext.endsWith('.mp4') || ext.endsWith('.avi')) return '🎬';
    if (ext.endsWith('.pdf')) return '📄';
    if (ext.endsWith('.zip') || ext.endsWith('.rar')) return '📦';
    if (ext.endsWith('.doc') || ext.endsWith('.docx')) return '📝';
    if (ext.endsWith('.xls') || ext.endsWith('.xlsx')) return '📊';
    if (ext.match(/\.(jpg|jpeg|png|gif|webp)$/)) return '🖼️';

    return '📎';
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getCsrfToken = (): string => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.getAttribute('content');
    return token || '';
};

const showPreview = (file: File): void => {
    if (!previewContainer || !filePreviewModal) return;

    let mediaPreview = '';

    if (file.type.startsWith('image/')) {
        mediaPreview = `<img src="${URL.createObjectURL(file)}" alt="Preview" class="image-preview">`;
    } else if (file.type.startsWith('video/')) {
        mediaPreview = `<video controls class="file-video-preview" style="max-width: 100%; border-radius: 6px;">
            <source src="${URL.createObjectURL(file)}" type="${file.type}">
        </video>`;
    }

    const previewHTML = `
        <div class="file-preview">
            <div class="file-info">
                <div class="file-icon">${getFileIcon(file.name)}</div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
            </div>
            ${mediaPreview}
            <div class="upload-progress-container" style="display: none; margin-top: 12px;">
                <div class="progress-bar-wrapper" style="background: #374151; border-radius: 8px; overflow: hidden; height: 6px; margin-bottom: 8px;">
                    <div class="progress-bar-fill" style="height: 100%; background: linear-gradient(90deg, #6366f1 0%, #4f46e5 100%); width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div class="progress-text" style="color: #9ca3af; font-size: 0.75rem; text-align: center;">0%</div>
            </div>
        </div>
    `;

    previewContainer.innerHTML = previewHTML;
    filePreviewModal.classList.add('active');
};

export const closeModal = (): void => {
    if (!filePreviewModal || !fileInput) return;

    filePreviewModal.classList.remove('active');
    window.selectedFile = null;
    fileInput.value = '';
};

export const showUploadNotification = (): void => {
    console.log('Uploading file...');
    // TODO: Implement actual notification UI
};

export const hideUploadNotification = (): void => {
    console.log('Upload complete');
    // TODO: Implement actual notification UI
};

const uploadFile = (file: File): void => {
    const progressContainer = document.querySelector<HTMLDivElement>('.upload-progress-container');
    const progressBar = document.querySelector<HTMLDivElement>('.progress-bar-fill');
    const progressText = document.querySelector<HTMLDivElement>('.progress-text');

    if (!progressContainer || !progressBar || !progressText) {
        console.error('Progress elements not found');
        return;
    }

    progressContainer.style.display = 'block';

    if (sendFileBtn) sendFileBtn.disabled = true;
    if (cancelUploadBtn) cancelUploadBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('_token', getCsrfToken());

    const xhr = new XMLHttpRequest();

    // Progress handler
    xhr.upload.addEventListener('progress', (e: ProgressEvent<EventTarget>) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = percentComplete + '%';
        }
    });

    // Load handler
    xhr.addEventListener('load', () => {
        if (sendFileBtn) sendFileBtn.disabled = false;
        if (cancelUploadBtn) cancelUploadBtn.disabled = false;

        if (xhr.status === 200) {
            try {
                const data: UploadResponse = JSON.parse(xhr.responseText);
                if (data.status) {
                    closeModal();
                    window.selectedFile = null;
                    if (fileInput) fileInput.value = '';
                } else {
                    alert('Error: ' + (data.error || 'Failed to send file'));
                }
            } catch (e) {
                console.error('Error parsing response:', e);
                alert('Error parsing response');
            }
        } else {
            try {
                const data: UploadResponse = JSON.parse(xhr.responseText);
                alert('Error: ' + (data.error || 'Upload failed'));
            } catch (e) {
                alert('Upload failed with status: ' + xhr.status);
            }
        }
    });

    // Error handler
    xhr.addEventListener('error', () => {
        if (sendFileBtn) sendFileBtn.disabled = false;
        if (cancelUploadBtn) cancelUploadBtn.disabled = false;
        alert('Network error. Please check your connection.');
    });

    xhr.open('POST', '/sendMessage', true);
    xhr.setRequestHeader('X-CSRF-TOKEN', getCsrfToken());
    xhr.send(formData);
};

// Event Listeners
if (fileUploadBtn && fileInput) {
    fileUploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            window.selectedFile = target.files[0];
            showPreview(window.selectedFile);
        }
    });
}

if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', closeModal);
}

if (cancelUploadBtn) {
    cancelUploadBtn.addEventListener('click', closeModal);
}

if (filePreviewModal) {
    filePreviewModal.addEventListener('click', (e: MouseEvent) => {
        if (e.target === filePreviewModal) {
            closeModal();
        }
    });
}

if (sendFileBtn) {
    sendFileBtn.addEventListener('click', () => {
        if (!window.selectedFile) return;
        uploadFile(window.selectedFile);
    });
}
