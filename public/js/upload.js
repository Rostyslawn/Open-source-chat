const fileUploadBtn = document.getElementById('fileUploadBtn');
const fileInput = document.getElementById('fileInput');
const filePreviewModal = document.getElementById('filePreviewModal');
const previewContainer = document.getElementById('previewContainer');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');
const sendFileBtn = document.getElementById('sendFileBtn');

window.selectedFile = null;

const getFileIcon = (fileName) => {
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

const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const showPreview = (file) => {
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

const closeModal = () => {
    filePreviewModal.classList.remove('active');
    window.selectedFile = null;
    fileInput.value = '';
};

const showUploadNotification = () => {
    console.log('Uploading file...');
};

const hideUploadNotification = () => {
    console.log('Upload complete');
};

fileUploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        window.selectedFile = e.target.files[0];
        showPreview(window.selectedFile);
    }
});

closePreviewBtn.addEventListener('click', closeModal);
cancelUploadBtn.addEventListener('click', closeModal);

filePreviewModal.addEventListener('click', (e) => {
    if (e.target === filePreviewModal) {
        closeModal();
    }
});

sendFileBtn.addEventListener('click', () => {
    if (!window.selectedFile) return;

    const progressContainer = document.querySelector('.upload-progress-container');
    const progressBar = document.querySelector('.progress-bar-fill');
    const progressText = document.querySelector('.progress-text');

    progressContainer.style.display = 'block';
    sendFileBtn.disabled = true;
    cancelUploadBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', window.selectedFile);
    formData.append('_token', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = percentComplete + '%';
        }
    };

    xhr.onload = () => {
        sendFileBtn.disabled = false;
        cancelUploadBtn.disabled = false;

        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.status) {
                    closeModal();
                    window.selectedFile = null;
                    fileInput.value = '';
                } else {
                    alert('Error: ' + (data.error || 'Failed to send file'));
                }
            } catch (e) {
                alert('Error parsing response');
            }
        } else {
            try {
                const data = JSON.parse(xhr.responseText);
                alert('Error: ' + (data.error || 'Upload failed'));
            } catch (e) {
                alert('Upload failed with status: ' + xhr.status);
            }
        }
    };

    xhr.onerror = () => {
        sendFileBtn.disabled = false;
        cancelUploadBtn.disabled = false;
        alert('Network error. Please check your connection.');
    };

    xhr.open('POST', '/sendMessage', true);
    xhr.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));
    xhr.send(formData);
});
