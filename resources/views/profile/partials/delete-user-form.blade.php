<section>
    <header>
        <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {{ __('User Management') }}
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ __('Search and ban users from the system.') }}
        </p>
    </header>

    <div class="mt-6">
        <input
            type="text"
            id="userSearch"
            placeholder="Search by username..."
            class="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm w-full"
        >
    </div>

    <div class="mt-6 space-y-3" id="usersList">
        @if($users && $users->count() > 0)
            @foreach($users as $userItem)
                <div
                    class="user-item flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                    data-username="{{ strtolower($userItem->name) }}">
                    <div class="flex items-center space-x-4 flex-1">
                        <div class="flex-shrink-0">
                            <div
                                class="w-10 h-10 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-semibold">
                                {{ strtoupper(substr($userItem->name, 0, 1)) }}
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {{ $userItem->name }}
                                @if($userItem->admin)
                                    <span
                                        class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                        Admin
                                    </span>
                                @endif
                                @if($userItem->id == Auth::id())
                                    <span
                                        class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        You
                                    </span>
                                @endif
                                @if($userItem->banned)
                                    <span
                                        class="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                        Banned
                                    </span>
                                @endif
                            </p>
                            <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {{ $userItem->email }}
                            </p>
                        </div>
                    </div>

                    @if($userItem->id != Auth::id())
                        @if($userItem->banned)
                            <button
                                onclick="confirmAction({{ $userItem->id }}, '{{ $userItem->name }}', 'unban')"
                                type="button"
                                class="ml-4 inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 active:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150"
                            >
                                Unban
                            </button>
                        @else
                            <button
                                onclick="confirmAction({{ $userItem->id }}, '{{ $userItem->name }}', 'ban')"
                                type="button"
                                class="ml-4 inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150"
                            >
                                Ban
                            </button>
                        @endif
                    @endif
                </div>
            @endforeach
        @else
            <div class="text-center py-8 text-gray-600 dark:text-gray-400">
                No users found
            </div>
        @endif
    </div>

    {{-- Ban Modal --}}
    <div id="actionModal"
         class="hidden fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50 px-4">
        <div
            class="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-lg rounded-lg bg-white dark:bg-gray-800">

            {{-- Ban Form --}}
            <form id="banForm" method="POST" action="{{ route('profile.destroy') }}" style="display: none;">
                @csrf
                @method('POST')
                <input type="hidden" name="user_id" id="banUserId">

                <div class="mt-3">
                    <div
                        class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                        <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor"
                             viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4 text-center">
                        Are you sure you want to ban this user?
                    </h3>
                    <div class="mt-2 px-7 py-3">
                        <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
                            You are about to ban user <span id="banUsername"
                                                            class="font-semibold text-gray-900 dark:text-gray-100"></span>.
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                            This action can be reversed later.
                        </p>
                    </div>
                    <div class="flex gap-3 px-4 py-3 mt-4">
                        <button
                            type="button"
                            onclick="closeActionModal()"
                            class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-25 transition ease-in-out duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150"
                        >
                            Ban Account
                        </button>
                    </div>
                </div>
            </form>

            {{-- Unban Form --}}
            <form id="unbanForm" method="POST" action="{{ route('profile.unban') }}" style="display: none;">
                @csrf
                <input type="hidden" name="user_id" id="unbanUserId">

                <div class="mt-3">
                    <div
                        class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900">
                        <svg class="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor"
                             viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4 text-center">
                        Unban this user?
                    </h3>
                    <div class="mt-2 px-7 py-3">
                        <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
                            You are about to unban user <span id="unbanUsername"
                                                              class="font-semibold text-gray-900 dark:text-gray-100"></span>.
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                            They will regain access to the system.
                        </p>
                    </div>
                    <div class="flex gap-3 px-4 py-3 mt-4">
                        <button
                            type="button"
                            onclick="closeActionModal()"
                            class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-widest shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-25 transition ease-in-out duration-150"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            class="flex-1 inline-flex justify-center items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-500 active:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150"
                        >
                            Unban Account
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    {{-- Success Messages --}}
    @if(session('status') == 'user-banned')
        <div
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg">
            User successfully banned
        </div>
    @endif

    @if(session('status') == 'user-unbanned')
        <div
            class="mt-4 p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg">
            User successfully unbanned
        </div>
    @endif

    {{-- Error Messages --}}
    @if(session('error'))
        <div
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg">
            {{ session('error') }}
        </div>
    @endif
</section>

<script>
    document.getElementById('userSearch').addEventListener('input', (e) => {
        const searchValue = e.target.value.toLowerCase().trim();
        const userItems = document.querySelectorAll('.user-item');

        userItems.forEach((item) => {
            const username = item.getAttribute('data-username');
            item.style.display = username.includes(searchValue) ? 'flex' : 'none';
        });
    });

    const confirmAction = (userId, username, action) => {
        if (action == 'ban') {
            document.getElementById('banUsername').textContent = username;
            document.getElementById('banUserId').value = userId;
            document.getElementById('banForm').style.display = 'block';
            document.getElementById('unbanForm').style.display = 'none';
        } else if (action == 'unban') {
            document.getElementById('unbanUsername').textContent = username;
            document.getElementById('unbanUserId').value = userId;
            document.getElementById('banForm').style.display = 'none';
            document.getElementById('unbanForm').style.display = 'block';
        }

        document.getElementById('actionModal').classList.remove('hidden');
    };

    const closeActionModal = () => {
        document.getElementById('actionModal').classList.add('hidden');
    };

    document.getElementById('actionModal').addEventListener('click', (e) => {
        if (e.target == e.currentTarget) {
            closeActionModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key == 'Escape') {
            closeActionModal();
        }
    });
</script>
