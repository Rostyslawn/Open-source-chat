<?php

namespace App\Http\Controllers;

use App\Events\VoiceSignalEvent;
use App\Events\VoiceJoinedEvent;
use App\Events\VoiceLeftEvent;
use App\Events\VoiceMuteStatusEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VoiceController extends Controller
{
    public function sendSignal(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
            'target_user_id' => 'required|integer',
            'type' => 'required|string|in:offer,answer,ice-candidate',
            'signal' => 'required',
        ]);

        event(new VoiceSignalEvent(
            $request->input('channel_id'),
            Auth::id(),
            $request->input('target_user_id'),
            $request->input('type'),
            $request->input('signal')
        ));

        return response()->json(['status' => true]);
    }

    public function joined(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
        ]);

        event(new VoiceJoinedEvent(
            $request->input('channel_id'),
            Auth::id(),
            Auth::user()->name,
            Auth::user()->avatar
        ));

        return response()->json(['status' => true]);
    }

    public function left(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
        ]);

        event(new VoiceLeftEvent(
            $request->input('channel_id'),
            Auth::id(),
            Auth::user()->name
        ));

        return response()->json(['status' => true]);
    }

    public function muteStatus(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
            'is_muted' => 'required|boolean',
        ]);

        event(new VoiceMuteStatusEvent(
            $request->input('channel_id'),
            Auth::id(),
            $request->input('is_muted')
        ));

        return response()->json(['status' => true]);
    }
}
