<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>{{ $title ?? "Open source messenger" }}</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @vite('resources/scss/index.scss')
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <script src="https://cdn.tailwindcss.com"></script>
    @php
        use Illuminate\Support\Facades\Crypt;
        use Illuminate\Support\Facades\Auth;
        use App\Models\User;
    @endphp
</head>
<body class="dark" x-data="{ open: false, sidebarOpen: false }">
<!-- Mobile Overlay -->
<div x-show="sidebarOpen"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="opacity-0"
     x-transition:enter-end="opacity-100"
     x-transition:leave="transition ease-in duration-200"
     x-transition:leave-start="opacity-100"
     x-transition:leave-end="opacity-0"
     @click="sidebarOpen = false"
     class="mobile-overlay"
     style="display: none;">
</div>

<div class="chat-container">
    <!-- Sidebar -->
    <div class="server-info" :class="{ 'mobile-open': sidebarOpen }">
        <div class="server-header">
            <div class="server-header-content">
                <p>Welcome to the chat!</p>
                <button @click="sidebarOpen = false" class="close-sidebar-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
        <span class="users-online-header">Users online:</span>
        <div class="online-users"></div>
    </div>

    <div class="chat-area">
        <div class="chat-header">
            <div class="chat-header-left">
                <button @click="sidebarOpen = !sidebarOpen" class="mobile-menu-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
                <div class="chat-header-info">
                    <h3>Main chat</h3>
                    <p>Start messaging now</p>
                </div>
            </div>
            <div class="chat-right">
                <div class="hidden sm:flex sm:items-center sm:ms-6">
                    <x-dropdown align="right" width="48">
                        <x-slot name="trigger">
                            <button
                                class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150">
                                <div>{{ Auth::user()->name }}</div>
                                <div class="ms-1">
                                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                         viewBox="0 0 20 20">
                                        <path fill-rule="evenodd"
                                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                              clip-rule="evenodd"/>
                                    </svg>
                                </div>
                            </button>
                        </x-slot>
                        <x-slot name="content">
                            <x-dropdown-link :href="route('profile.edit')">
                                {{ __('Profile') }}
                            </x-dropdown-link>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <x-dropdown-link :href="route('logout')"
                                                 onclick="event.preventDefault();
                                                this.closest('form').submit();">
                                    {{ __('Log Out') }}
                                </x-dropdown-link>
                            </form>
                        </x-slot>
                    </x-dropdown>
                </div>
                <div class="-me-2 flex items-center sm:hidden">
                    <button @click="open = ! open"
                            class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-900 focus:text-gray-500 dark:focus:text-gray-400 transition duration-150 ease-in-out">
                        <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                            <path :class="{'hidden': open, 'inline-flex': ! open }" class="inline-flex"
                                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M4 6h16M4 12h16M4 18h16"/>
                            <path :class="{'hidden': ! open, 'inline-flex': open }" class="hidden"
                                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Dropdown Menu -->
        <div x-show="open"
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 transform scale-95"
             x-transition:enter-end="opacity-100 transform scale-100"
             x-transition:leave="transition ease-in duration-150"
             x-transition:leave-start="opacity-100 transform scale-100"
             x-transition:leave-end="opacity-0 transform scale-95"
             class="sm:hidden mobile-dropdown"
             style="display: none;">
            <div class="mobile-dropdown-content">
                <a href="{{ route('profile.edit') }}" class="mobile-dropdown-link">
                    {{ __('Profile') }}
                </a>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button type="submit" class="mobile-dropdown-link">
                        {{ __('Log Out') }}
                    </button>
                </form>
            </div>
        </div>

        <div class="messages">
            @foreach($messages_data as $message)
                @if($message->sender_id == Auth::id())
                    <div class="message current-user message-id-{{ $message->id }}"
                         data-time="{{ $message->created_at->toIso8601String() }}">
                        <div class="message-avatar"><img src="{{ asset(Auth::user()->avatar) }}"></div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-sender">You</span>
                                <span class="message-time"></span>
                            </div>
                            @if ($message->message)
                                <div class="message-text">{{ Crypt::decryptString($message->message) }}</div>
                            @endif
                            @if($message->file_path)
                                <div class="message-file">
                                    @if(str_contains($message->file_type, 'image'))
                                        <a target="_blank" href="{{ $message->file_path }}"><img
                                                src="{{ asset($message->file_path) }}" alt="{{ $message->file_name }}"
                                                class="file-preview-image"></a>
                                    @elseif(str_contains($message->file_type, 'video'))
                                        <video controls class="file-video-preview">
                                            <source src="{{ asset($message->file_path) }}"
                                                    type="{{ $message->file_type }}">
                                        </video>
                                    @else
                                        <a href="{{ asset($message->file_path) }}" target="_blank"
                                           class="file-download-link">
                                            📎 {{ $message->file_name }}
                                            ({{ number_format($message->file_size / 1024, 2) }} KB)
                                        </a>
                                    @endif
                                </div>
                            @endif
                            <div onclick="deleteMessage({{ $message->id }})" class="delete-message">
                                delete
                            </div>
                        </div>
                    </div>
                @else
                    <div class="message message-id-{{ $message->id }}"
                         data-time="{{ $message->created_at->toIso8601String() }}">
                        <div class="message-avatar"><img src="{{ asset(User::find($message->sender_id)->avatar) }}">
                        </div>
                        <div class="message-content">
                            <div class="message-header">
                                <span class="message-sender">{{ User::find($message->sender_id)->name }}</span>
                                <span class="message-time"></span>
                            </div>
                            <div class="message-text">
                                @if($message->message)
                                    {{ Crypt::decryptString($message->message) }}
                                @endif
                                @if($message->file_path)
                                    <div class="message-file">
                                        @if(str_contains($message->file_type, 'image'))
                                            <a target="_blank" href="{{ $message->file_path }}"><img
                                                    src="{{ asset($message->file_path) }}"
                                                    alt="{{ $message->file_name }}"
                                                    class="file-preview-image"></a>
                                        @elseif(str_contains($message->file_type, 'video'))
                                            <video controls class="file-video-preview">
                                                <source src="{{ asset($message->file_path) }}"
                                                        type="{{ $message->file_type }}">
                                            </video>
                                        @else
                                            <a href="{{ asset($message->file_path) }}" target="_blank"
                                               class="file-download-link">
                                                📎 {{ $message->file_name }}
                                                ({{ number_format($message->file_size / 1024, 2) }} KB)
                                            </a>
                                        @endif
                                    </div>
                                @endif
                            </div>
                        </div>
                    </div>
                @endif
            @endforeach
        </div>
        <div class="input-area">
            <div class="file-upload-button" id="fileUploadBtn" title="Upload file">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                          stroke-linejoin="round"/>
                </svg>
                <input type="file" id="fileInput" name="file" style="display: none;">
            </div>
            <div class="message-input-wrapper">
                <textarea maxlength="2000" class="message-input" placeholder="Message #general" rows="1"></textarea>
            </div>
            <button class="send-button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                          stroke-linejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                          stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
        <div class="file-preview-modal" id="filePreviewModal">
            <div class="preview-content">
                <div class="preview-header">
                    <h3>File Preview</h3>
                    <button class="close-preview" id="closePreviewBtn">&times;</button>
                </div>
                <div class="preview-body" id="previewContainer"></div>
                <div class="preview-footer">
                    <button class="cancel-upload" id="cancelUploadBtn">Cancel</button>
                    <button class="send-file" id="sendFileBtn">Send File</button>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div class="delete-confirmation-modal" id="deleteConfirmModal">
            <div class="delete-modal-content">
                <div class="delete-modal-header">
                    <h3>Delete Message</h3>
                </div>
                <div class="delete-modal-body">
                    <p>Are you sure you want to delete this message?</p>
                    <p class="delete-warning">This action cannot be undone.</p>
                </div>
                <div class="delete-modal-footer">
                    <button class="cancel-delete-btn" id="cancelDeleteBtn">Cancel</button>
                    <button class="confirm-delete-btn" id="confirmDeleteBtn">Delete</button>
                </div>
            </div>
        </div>
    </div>
</div>
<script>
    const current_user_name = "{{ Auth::user()->name }}";
    const current_user_id = {{ Auth::user()->id }};
</script>
<script src="{{ asset('js/upload.js') }}"></script>
<script src="{{ asset('js/index.js') }}"></script>
</body>
</html>
