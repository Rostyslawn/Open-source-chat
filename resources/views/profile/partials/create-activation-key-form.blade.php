<section class="space-y-6">
    <header>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ __('Generate new activation key') }}
        </h2>
    </header>

    <div id="activationKeyContainer">
        @if (is_array(session('status')) && session('status')['type'] === 'new-activation-key')
            <script>
                {{ session('status')['key'] }}
            </script>
        @endif
    </div>

    <form method="post" action="{{ route('profile.generatenewkey') }}" class="mt-4">
        @csrf
        @method('post')

        <div class="flex justify-start">
            <x-danger-button type="submit">
                {{ __('Generate activation key') }}
            </x-danger-button>
        </div>
    </form>
</section>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        const container = document.getElementById('activationKeyContainer');

        @if (is_array(session('status')) && session('status')['type'] === 'new-activation-key')
            const sessionKey = '{{ session('status')['key'] }}';
            const sessionTime = new Date().toISOString();

            if (sessionKey) {
                showKeyMessage(sessionKey, sessionTime, container);
            }
        @endif

        function showKeyMessage(key, time, containerElement) {
            const formattedTime = time ? new Date(time).toLocaleString() : '';

            containerElement.innerHTML = `
                        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <div class="ml-3">
                                        <p class="text-sm font-medium text-green-800 dark:text-green-200">
                                            {{ __('Activation key generated') }}
                        ${formattedTime ? `<span class="text-xs text-green-600 dark:text-green-400 ml-2">(${formattedTime})</span>` : ''}
                                        </p>
                                        <div class="mt-2">
                                            <p class="text-sm text-green-700 dark:text-green-300 mb-2">
                                                {{ __('Your activation key:') }}
                        </p>
                        <div class="flex items-center space-x-2">
                            <code class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-sm font-mono text-gray-800 dark:text-gray-200 flex-grow border border-gray-300 dark:border-gray-700">
            ${key}
                                                </code>
                                                <button
                                                    type="button"
                                                    class="copy-key-btn inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 transition"
                                                    data-key="${key}"
                                                >
                                                    <svg class="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    {{ __('Copy') }}
                        </button>
                    </div>
                </div>
            </div>
            </div>
            <button
            type="button"
            class="close-key-btn text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
            </div>
            </div>
            `;

            const copyBtn = containerElement.querySelector('.copy-key-btn');
            const closeBtn = containerElement.querySelector('.close-key-btn');

            copyBtn.addEventListener('click', function () {
                const key = this.getAttribute('data-key');
                copyToClipboard(key, this);
            });

            closeBtn.addEventListener('click', function () {
                containerElement.innerHTML = '';
            });
        }
    });

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(function () {
            const originalHtml = buttonElement.innerHTML;
            const originalClasses = buttonElement.className;

            buttonElement.innerHTML = `
            <svg class="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ __('Copied!') }}
            `;

            buttonElement.className = originalClasses.replace('bg-white', 'bg-green-600')
                .replace('dark:bg-gray-800', '')
                .replace('text-gray-700', 'text-white')
                .replace('dark:text-gray-300', '')
                .replace('border-gray-300', 'border-green-600')
                .replace('dark:border-gray-600', '');

            buttonElement.classList.add('bg-green-600', 'border-green-600', 'text-white');
            buttonElement.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300', 'border-gray-300', 'dark:border-gray-600');

            setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                buttonElement.className = originalClasses;
            }, 2000);
        }).catch(function (err) {
            console.error('Failed to copy: ', err);
        });
    }
</script>
