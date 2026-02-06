<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;

class ResetPasswordController extends Controller
{
    public function resetPassword(Request $request): RedirectResponse
    {
        if (!Auth::user()->admin) abort(403);

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $new_password = (string) Str::uuid();

        $user_id = $request->user_id;

        try {
            User::find($user_id)->update(['password' => Hash::make($new_password)]);
            DB::table('sessions')->where('user_id', $user_id)->delete();
            return Redirect::route('profile.edit')->with('status', [
                'type' => 'password-reset',
                'key' => $new_password,
            ]);
        } catch (\Exception $e) {
            return Redirect::route('profile.edit')->with('error', 'Error while reset password: ' . $e->getMessage());
        }
    }
}
