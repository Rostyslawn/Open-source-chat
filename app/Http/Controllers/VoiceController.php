<?php

namespace App\Http\Controllers;

use App\Events\VoiceSignalEvent;
use App\Events\VoiceJoinedEvent;
use App\Events\VoiceLeftEvent;
use App\Events\VoiceMuteStatusEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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

        $cacheKey = "voice_channel_{$request->channel_id}_users";
        $users = Cache::get($cacheKey, []);

        $userData = [
            'id' => Auth::id(),
            'name' => Auth::user()->name,
            'avatar' => Auth::user()->avatar,
        ];

        $users[Auth::id()] = $userData;
        Cache::forever($cacheKey, $users);

        event(new VoiceJoinedEvent(
            $request->input('channel_id'),
            Auth::id(),
            Auth::user()->name,
            Auth::user()->avatar
        ));

        return response()->json(['status' => true, 'cached_users' => count($users)]);
    }

    public function left(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
        ]);
        $cacheKey = "voice_channel_{$request->channel_id}_users";
        $users = Cache::get($cacheKey, []);
        if (!is_array($users)) {
            $users = [];
        }
        unset($users[Auth::id()]);
        Cache::forever($cacheKey, $users);

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

    public function getActiveUsers(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
        ]);

        $cacheKey = "voice_channel_{$request->channel_id}_users";
        $activeUsers = Cache::get($cacheKey, []);

        return response()->json(['users' => $activeUsers]);
    }

    public function presenceLeft(Request $request)
    {
        $request->validate([
            'channel_id' => 'required|string',
            'user_id' => 'required|integer',
            'user_name' => 'required|string',
        ]);

        $cacheKey = "voice_channel_{$request->channel_id}_users";
        $users = Cache::get($cacheKey, []);

        if (!is_array($users)) {
            $users = [];
        }

        unset($users[$request->user_id]);
        Cache::forever($cacheKey, $users);

        event(new VoiceLeftEvent(
            $request->input('channel_id'),
            $request->input('user_id'),
            $request->input('user_name')
        ));

        return response()->json(['status' => true]);
    }
}
