import {MessageInterface, MessageToDeleteInterface, UserInterface} from "./modules/interfaces";

// DOM Elements
const users_online = document.querySelector<HTMLDivElement>('.online-users');
const textarea = document.querySelector<HTMLTextAreaElement>('.message-input');
const messages_container = document.querySelector<HTMLDivElement>(".messages");
const send_button = document.querySelector<HTMLButtonElement>('.send-button');

let messageToDelete: number | null = null;

const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');

// Utility Functions
const formatLocalTime = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getCsrfToken = (): string => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.getAttribute('content');
    return token || '';
};

const showUploadNotification = (): void => {
    // Implementation needed
    console.log('Showing upload notification...');
};

const hideUploadNotification = (): void => {
    // Implementation needed
    console.log('Hiding upload notification...');
};

const closeModal = (): void => {
    // Implementation needed
    console.log('Closing modal...');
};

// Message Functions
const sendMessage = async (messageText: string): Promise<void> => {
    if (!messageText) return;
    
    try {
        const res = await fetch('/sendMessage', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': getCsrfToken(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: messageText,
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Response wasn't ok.");
        }

        const data = await res.json();

        if (data.status) {
            if (textarea) {
                textarea.value = '';
                textarea.style.height = 'auto';
            }
        } else {
            console.error('Server error:', data.error);
        }
    } catch (err) {
        console.error('Error:', err);
    }
};

const showDeleteConfirmation = (message_id: number): void => {
    messageToDelete = message_id;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.add('active');
    }
};

const hideDeleteConfirmation = (): void => {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('active');
    }
    messageToDelete = null;
};

const deleteMessage = async (message_id: number): Promise<void> => {
    if (!message_id) return;

    try {
        const res = await fetch('/deleteMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            },
            body: JSON.stringify({"message_id": message_id})
        });

        if (!res.ok) throw new Error("Response wasn't ok.");

        await res.json();
        hideDeleteConfirmation();
    } catch (err) {
        console.error('Error:', err);
        hideDeleteConfirmation();
    }
};

// UI Helper Functions
const createUserElement = (user: UserInterface): HTMLDivElement => {
    const div = document.createElement('div');
    div.classList.add('user');
    div.setAttribute('data-user-id', user.id.toString());

    const user_avatar = document.createElement('div');
    user_avatar.classList.add('user-avatar');

    const user_avatar_img = document.createElement("img");
    user_avatar_img.src = user.avatar;
    user_avatar.appendChild(user_avatar_img);

    const user_name = document.createElement('span');
    user_name.classList.add('user-name');
    user_name.textContent = user.name;

    div.appendChild(user_avatar);
    div.appendChild(user_name);

    return div;
};

const createMessageElement = (message: MessageInterface): HTMLDivElement => {
    const message_div = document.createElement("div");
    message_div.classList.add("message");
    message_div.classList.add(`message-id-${message.id}`);

    const avatar_div = document.createElement("div");
    avatar_div.classList.add("message-avatar");
    const avatar_img = document.createElement("img");
    avatar_img.src = message.sender_avatar;
    avatar_div.appendChild(avatar_img);

    const content_div = document.createElement("div");
    content_div.classList.add("message-content");

    const header_div = document.createElement("div");
    header_div.classList.add("message-header");

    const sender_span = document.createElement("span");
    sender_span.classList.add("message-sender");
    sender_span.textContent = message.sender;

    const time_span = document.createElement("span");
    time_span.classList.add("message-time");
    time_span.textContent = formatLocalTime(message.message_time);

    const delete_message_div = document.createElement("div");

    if (current_user_name == message.sender || is_admin) {
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

    const text_div = document.createElement("div");
    text_div.classList.add("message-text");
    text_div.textContent = message.message;

    content_div.appendChild(header_div);
    content_div.appendChild(text_div);

    if (message.file_path) {
        const file_div = createFileElement(message);
        content_div.appendChild(file_div);
    }

    content_div.appendChild(delete_message_div);
    message_div.appendChild(avatar_div);
    message_div.appendChild(content_div);

    return message_div;
};

const createFileElement = (message: MessageInterface): HTMLDivElement => {
    const file_div = document.createElement("div");
    file_div.classList.add("message-file");

    if (message.file_type?.startsWith('image/') && message.file_path && message.file_name) {
        const a_link = document.createElement("a");
        a_link.target = "_blank";
        a_link.href = message.file_path;

        const img = document.createElement("img");
        img.src = message.file_path;
        img.alt = message.file_name;
        img.classList.add("file-preview-image");

        a_link.appendChild(img);
        file_div.appendChild(a_link);
    } else if (message.file_type?.startsWith('video/') && message.file_path) {
        const video = document.createElement("video");
        video.controls = true;
        video.classList.add("file-video-preview");

        const source = document.createElement("source");
        source.src = message.file_path;
        source.type = message.file_type;

        video.appendChild(source);
        file_div.appendChild(video);
    } else if (message.file_name && message.file_size && message.file_path) {
        const link = createFileDownloadLink(message);
        file_div.appendChild(link);
    }

    return file_div;
};

const createFileDownloadLink = (message: MessageInterface): HTMLAnchorElement => {
    const link = document.createElement("a");
    link.href = message.file_path!;
    link.target = "_blank";
    link.classList.add("file-download-link");

    let fileIcon = "📎";
    const fileName = message.file_name!.toLowerCase();

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

    const fileSize = formatFileSize(message.file_size!);
    link.textContent = `${fileIcon} ${message.file_name} (${fileSize})`;
    link.download = message.file_name!;

    return link;
};

const formatFileSize = (size: number): string => {
    if (size < 1024) {
        return `${size} B`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    } else {
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', (): void => {
    // Format existing message timestamps
    const messages = document.querySelectorAll<HTMLDivElement>('.message');
    messages.forEach((message) => {
        const time = message.dataset.time;
        if (time) {
            const timeElement = message.querySelector<HTMLSpanElement>('.message-time');
            if (timeElement) {
                timeElement.textContent = formatLocalTime(time);
            }
        }
    });

    // Delete confirmation modal
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
        deleteModal.addEventListener('click', (e: MouseEvent) => {
            if (e.target == deleteModal) {
                hideDeleteConfirmation();
            }
        });
    }

    // Setup delete buttons for existing messages
    document.querySelectorAll<HTMLElement>('.delete-message').forEach(btn => {
        const messageElement = btn.closest<HTMLDivElement>('.message');
        if (messageElement) {
            const messageId = messageElement.className.match(/message-id-(\d+)/)?.[1];
            if (messageId) {
                btn.onclick = () => showDeleteConfirmation(parseInt(messageId));
            }
        }
    });

    // Echo/WebSocket setup
    initializeEcho();
});

const initializeEcho = (): void => {
    window.Echo.join('online')
        .here((users: UserInterface[]) => {
            users.forEach((user: UserInterface) => {
                const userElement = createUserElement(user);
                users_online?.appendChild(userElement);
            });
        })
        .joining((user: UserInterface) => {
            const userElement = createUserElement(user);
            users_online?.appendChild(userElement);
        })
        .leaving((user: UserInterface) => {
            if (!users_online) return;
            const userDiv = users_online.querySelector(`[data-user-id="${user.id}"]`);
            if (userDiv) {
                userDiv.remove();
            }
        });

    setTimeout(() => {
        window.Echo.join('main-channel')
            .here((users: UserInterface[]) => {
                // console.log('Users in chat:', users);
            })
            .joining((user: UserInterface) => {
                // console.log('User joined:', user.name);
            })
            .leaving((user: UserInterface) => {
                // console.log('User left:', user.name);
            })
            .listen('sendMessageEvent', (message: MessageInterface) => {
                const messageElement = createMessageElement(message);
                messages_container?.appendChild(messageElement);
            })
            .listen('deleteMessageEvent', (data: MessageToDeleteInterface) => {
                const msgElement = document.querySelector(`.message.message-id-${data.message_id}`);
                if (msgElement) {
                    msgElement.remove();
                }
            });
    }, 150);
};

// Textarea event listeners
if (textarea) {
    textarea.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        if (target.value.length > 2000) {
            target.value = target.value.substring(0, 2000);
        }
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });

    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key == 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const messageText = textarea.value.trim();
            if (messageText) {
                sendMessage(messageText);
            }
        }
    });
}

// Send button
send_button?.addEventListener('click', () => {
    const messageText = textarea?.value.trim();
    if (messageText) {
        sendMessage(messageText);
    }
});

// Auto-scroll on load
window.addEventListener('load', () => {
    if (!messages_container) return;
    messages_container.scrollTop = messages_container.scrollHeight;
});
