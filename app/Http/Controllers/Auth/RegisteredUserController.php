<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Activationkey;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): View
    {
        return view('auth.register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:16', 'unique:users'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'activation_key' => ['required'],
        ]);

        $keys = Activationkey::all();

        foreach ($keys as $key) {
            if (Hash::check($request->activation_key, $key->key)) {
                $user = User::create([
                    'name' => $request->name,
                    'password' => Hash::make($request->password),
                    'verified' => true,
                ]);

                if ($request->hasFile('avatar')) {
                    $path = $request->file('avatar')->store('avatars', 'public');
                    $user->avatar = "/storage/" . $path;
                    $user->save();
                }

                $key->delete();

                event(new Registered($user));

                Auth::login($user);

                return redirect(route('index', absolute: false));
            }
        }

        abort(403);
    }
}
