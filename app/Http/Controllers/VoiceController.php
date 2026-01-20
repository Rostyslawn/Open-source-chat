<?php

namespace App\Http\Controllers;

use App\Events\VoiceSignalEvent;
use App\Events\VoiceJoinedEvent;
use App\Events\VoiceLeftEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VoiceController extends Controller
{
    public function sendSignal(Request $request)
    {
        $request->validate([
            'target_user_id' => 'required|integer',
            'type' => 'required|string|in:offer,answer,ice-candidate',
            'signal' => 'required',
        ]);

        event(new VoiceSignalEvent(
            Auth::id(),
            $request->input('target_user_id'),
            $request->input('type'),
            $request->input('signal')
        ));

        return response()->json(['status' => true]);
    }

    public function joined(Request $request)
    {
        event(new VoiceJoinedEvent(
            Auth::id(),
            Auth::user()->name
        ));

        return response()->json(['status' => true]);
    }

    public function left(Request $request)
    {
        event(new VoiceLeftEvent(
            Auth::id(),
            Auth::user()->name
        ));

        return response()->json(['status' => true]);
    }
}
