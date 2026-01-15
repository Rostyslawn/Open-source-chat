<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\Activationkey;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\View\View;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): View
    {
        $users = null;
        if (Auth::user()->admin) {
            $users = User::orderBy('name')->get();
        }

        return view('profile.edit', [
            'user' => $request->user(),
            'users' => $users,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'max:16'],
        ]);
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit')->with('status', 'profile-updated');
    }

    /**
     * Ban the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        if (!Auth::user()->admin) {
            abort(403);
        }

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $user = User::findOrFail($request->user_id);

        if ($user->banned) {
            return Redirect::route('profile.edit')->with('error', "User already banned.");
        }

        if ($user->id == Auth::id()) {
            return Redirect::route('profile.edit')->with('error', "You can't ban your own account.");
        }

        if ($user->admin) {
            return Redirect::route('profile.edit')->with('error', "You can't ban admin account.");
        }

        $user->update([
            'banned' => true,
        ]);

        return Redirect::route('profile.edit')->with('status', 'user-banned');
    }

    /**
     * Unban the user's account.
     */
    public function unban(Request $request): RedirectResponse
    {
        if (!Auth::user()->admin) {
            abort(403);
        }

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $user = User::findOrFail($request->user_id);

        if (!$user->banned) {
            return Redirect::route('profile.edit')->with('error', "User is not banned.");
        }

        if ($user->id == Auth::id()) {
            return Redirect::route('profile.edit')->with('error', "You can't unban your own account.");
        }

        $user->update([
            'banned' => false,
        ]);

        return Redirect::route('profile.edit')->with('status', 'user-unbanned');
    }

    public function generatekey(): RedirectResponse
    {
        if (!Auth::user()->admin) abort(403);

        $new_key = (string)Str::uuid();

        Activationkey::create([
            'key' => Hash::make($new_key),
        ]);

        return Redirect::route('profile.edit')->with('status', [
            'type' => 'new-activation-key',
            'key' => $new_key,
        ]);
    }
}
