const users_online = document.querySelector('.online-users');
const textarea = document.querySelector('.message-input');
let messages_container = document.querySelector(".messages");
let messageToDelete = null;

const formatLocalTime = (isoString) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const sendMessage = (messageText, file) => {
    if (!messageText && !file) return;

    let headers = {
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    };
    let body;

    if (file) {
        const maxSize = 500 * 1024 * 1024; // 500MB

        if (file.size > maxSize) {
            alert('File too large! Maximum size is 500MB');
            closeModal();
            hideUploadNotification();
            return;
        }

        showUploadNotification();
        let formData = new FormData();
        formData.append('_token', document.querySelector('meta[name="csrf-token"]').getAttribute('content'));

        if (messageText && messageText.trim() !== '') {
            formData.append('message', messageText);
        }

        formData.append('file', file);
        body = formData;

        headers['X-Requested-With'] = 'XMLHttpRequest';
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
            message: messageText
        });
    }

    fetch('/sendMessage', {
        method: 'POST',
        headers: headers,
        body: body,
    })
        .then(res => {
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.error || "Response wasn't ok.");
                });
            }
            return res.json();
        })
        .then(data => {
            if (data.status) {
                if (file) {
                    window.selectedFile = null;
                    if (fileInput) fileInput.value = '';
                    closeModal();
                    hideUploadNotification();
                }
                textarea.value = '';
                textarea.style.height = 'auto';
            } else {
                console.error('Server error:', data.error);
                if (file) {
                    hideUploadNotification();
                    alert('Error: ' + (data.error || 'Failed to send file'));
                }
            }
        })
        .catch(err => {
            console.error('Error:', err);
            if (file) {
                hideUploadNotification();
                alert('Error: ' + (err.message || 'Failed to send file. Check file size and try again.'));
            }
        });
};

const showDeleteConfirmation = (message_id) => {
    messageToDelete = message_id;
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.add('active');
};

const hideDeleteConfirmation = () => {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('active');
    messageToDelete = null;
};

const deleteMessage = (message_id) => {
    if (!message_id) return;
    fetch('/deleteMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({"message_id": message_id})
    })
        .then(res => {
            if (!res.ok) throw new Error("Response wasn't ok.");
            return res.json();
        })
        .then(() => {
            hideDeleteConfirmation();
        })
        .catch(err => {
            console.error('Error:', err);
            hideDeleteConfirmation();
        });
};

document.addEventListener('DOMContentLoaded', () => {
    const messages = document.querySelectorAll('.message');
    messages.forEach((message) => {
        const time = message.dataset.time;
        message.querySelector('.message-time').textContent = formatLocalTime(time);
    });

    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteModal = document.getElementById('deleteConfirmModal');

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (messageToDelete) {
                deleteMessage(messageToDelete);
            }
        });
    }

    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target == deleteModal) {
                hideDeleteConfirmation();
            }
        });
    }

    document.querySelectorAll('.delete-message').forEach(btn => {
        const messageElement = btn.closest('.message');
        if (messageElement) {
            const messageId = messageElement.className.match(/message-id-(\d+)/)?.[1];
            if (messageId) {
                btn.onclick = () => showDeleteConfirmation(parseInt(messageId));
            }
        }
    });

    window.Echo.join('online')
        .here(users => {
            users.forEach(user => {
                let div = document.createElement('div');
                div.classList.add('user');
                div.setAttribute('data-user-id', user.id);
                let user_avatar = document.createElement('div');
                user_avatar.classList.add('user-avatar');
                let user_avatar_img = document.createElement("img");
                user_avatar_img.src = user.avatar;
                user_avatar.appendChild(user_avatar_img);
                let user_name = document.createElement('span');
                user_name.classList.add('user-name');
                user_name.textContent = user.name;
                div.appendChild(user_avatar);
                div.appendChild(user_name);
                users_online.appendChild(div);
            });
        })
        .joining(user => {
            let div = document.createElement('div');
            div.classList.add('user');
            div.setAttribute('data-user-id', user.id);
            let user_avatar = document.createElement('div');
            user_avatar.classList.add('user-avatar');
            let user_avatar_img = document.createElement("img");
            user_avatar_img.src = user.avatar;
            user_avatar.appendChild(user_avatar_img);
            let user_name = document.createElement('span');
            user_name.classList.add('user-name');
            user_name.textContent = user.name;
            div.appendChild(user_avatar);
            div.appendChild(user_name);
            users_online.appendChild(div);
        })
        .leaving(user => {
            const userDiv = users_online.querySelector(`[data-user-id="${user.id}"]`);
            if (userDiv) {
                userDiv.remove();
            }
        });
    setTimeout(() => {
        window.Echo.join('main-channel')
            .here((users) => {
                // console.log('Users in chat:', users);
            })
            .joining((user) => {
                // console.log('User joined:', user.name);
            })
            .leaving((user) => {
                // console.log('User left:', user.name);
            })
            .listen('sendMessageEvent', (message) => {
                let message_div = document.createElement("div");
                message_div.classList.add("message");
                message_div.classList.add(`message-id-${message.id}`);

                let avatar_div = document.createElement("div");
                avatar_div.classList.add("message-avatar");
                let avatar_img = document.createElement("img");
                avatar_img.src = message.sender_avatar;
                avatar_div.appendChild(avatar_img);

                let content_div = document.createElement("div");
                content_div.classList.add("message-content");

                let header_div = document.createElement("div");
                header_div.classList.add("message-header");

                let sender_span = document.createElement("span");
                sender_span.classList.add("message-sender");
                sender_span.textContent = message.sender;

                let time_span = document.createElement("span");
                time_span.classList.add("message-time");
                time_span.textContent = formatLocalTime(message.message_time);

                let delete_message_div = document.createElement("div");

                if (current_user_name == message.sender) {
                    message_div.classList.add("current-user");
                    sender_span.textContent = "You";
                    delete_message_div.classList.add("delete-message");
                    delete_message_div.textContent = "delete";
                    delete_message_div.onclick = () => {
                        showDeleteConfirmation(message.id);
                    };
                }

                header_div.appendChild(sender_span);
                header_div.appendChild(time_span);

                let text_div = document.createElement("div");
                text_div.classList.add("message-text");
                text_div.textContent = message.message;

                content_div.appendChild(header_div);
                content_div.appendChild(text_div);

                if (message.file_path) {
                    let file_div = document.createElement("div");
                    file_div.classList.add("message-file");

                    if (message.file_type && message.file_type.startsWith('image/')) {
                        let a_link = document.createElement("a");
                        a_link.target = "_blank";
                        a_link.href = message.file_path;
                        let img = document.createElement("img");
                        img.src = message.file_path;
                        img.alt = message.file_name;
                        img.classList.add("file-preview-image");
                        a_link.appendChild(img);
                        file_div.appendChild(a_link);
                    } else if (message.file_type && message.file_type.startsWith('video/')) {
                        let video = document.createElement("video");
                        video.controls = true;
                        video.classList.add("file-video-preview");
                        let source = document.createElement("source");
                        source.src = message.file_path;
                        source.type = message.file_type;
                        video.appendChild(source);
                        file_div.appendChild(video);
                    } else {
                        let link = document.createElement("a");
                        link.href = message.file_path;
                        link.target = "_blank";
                        link.classList.add("file-download-link");

                        let fileIcon = "📎";

                        const fileName = message.file_name.toLowerCase();
                        if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg')) {
                            fileIcon = "🎵";
                        } else if (fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z')) {
                            fileIcon = "📦";
                        } else if (fileName.endsWith('.pdf')) {
                            fileIcon = "📄";
                        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                            fileIcon = "📝";
                        } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                            fileIcon = "📊";
                        }

                        let fileSize = "";
                        if (message.file_size < 1024) {
                            fileSize = `${message.file_size} B`;
                        } else if (message.file_size < 1024 * 1024) {
                            fileSize = `${(message.file_size / 1024).toFixed(1)} KB`;
                        } else {
                            fileSize = `${(message.file_size / (1024 * 1024)).toFixed(1)} MB`;
                        }

                        link.textContent = `${fileIcon} ${message.file_name} (${fileSize})`;
                        link.download = message.file_name;
                        file_div.appendChild(link);
                    }

                    content_div.appendChild(file_div);
                }

                content_div.appendChild(delete_message_div);
                message_div.appendChild(avatar_div);
                message_div.appendChild(content_div);
                messages_container.appendChild(message_div);
            })
            .listen('deleteMessageEvent', (data) => {
                const msgElement = document.querySelector(`.message.message-id-${data.message_id}`);
                if (msgElement) {
                    msgElement.remove();
                }
            });
    }, 150);
});

textarea.addEventListener('input', (e) => {
    if (e.target.value.length > 2000) {
        e.target.value = e.target.value.substring(0, 2000);
    }
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
});

textarea.addEventListener('keydown', (e) => {
    if (e.key == 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const messageText = textarea.value.trim();
        if (messageText) {
            sendMessage(messageText, null);
        }
    }
});

document.querySelector('.send-button').addEventListener('click', () => {
    const messageText = textarea.value.trim();
    if (messageText) {
        sendMessage(messageText, null);
    }
});

window.addEventListener('load', () => {
    messages_container.scrollTop = messages_container.scrollHeight;
});
