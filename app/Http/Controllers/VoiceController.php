<?php

namespace App\Http\Controllers;

use App\Events\VoiceSignalEvent;
use App\Events\VoiceJoinedEvent;
use App\Events\VoiceLeftEvent;
use App\Events\VoiceMuteStatusEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class VoiceController extends Controller
{
    private const CACHE_TTL_HOURS = 1;
    private const USER_INACTIVE_MINUTES = 2;

    private function getCacheKey($channelId)
    {
        return "voice_channel_{$channelId}_users";
    }

    private function cleanExpiredUsers($users)
    {
        $now = now()->timestamp;
        $maxAge = self::USER_INACTIVE_MINUTES * 60;

        return array_filter($users, function($user) use ($now, $maxAge) {
            return isset($user['last_seen']) && ($now - $user['last_seen']) < $maxAge;
        });
    }

    public function sendSignal(Request $request)
    {
        $request->validate([
            'channel_id' => 'required',
            'target_user_id' => 'required',
            'type' => 'required|in:offer,answer,ice-candidate',
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
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getCacheKey($request->channel_id);
        $users = Cache::get($cacheKey, []);

        $users = $this->cleanExpiredUsers($users);

        $userData = [
            'id' => Auth::id(),
            'name' => Auth::user()->name,
            'avatar' => Auth::user()->avatar,
            'joined_at' => now()->timestamp,
            'last_seen' => now()->timestamp,
        ];

        $users[Auth::id()] = $userData;

        Cache::put($cacheKey, $users, now()->addHours(self::CACHE_TTL_HOURS));

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
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getCacheKey($request->channel_id);
        $users = Cache::get($cacheKey, []);

        if (!is_array($users)) {
            $users = [];
        }

        unset($users[Auth::id()]);
        Cache::put($cacheKey, $users, now()->addHours(self::CACHE_TTL_HOURS));

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
            'channel_id' => 'required',
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
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getCacheKey($request->channel_id);
        $activeUsers = Cache::get($cacheKey, []);

        $activeUsers = $this->cleanExpiredUsers($activeUsers);
        Cache::put($cacheKey, $activeUsers, now()->addHours(self::CACHE_TTL_HOURS));

        return response()->json(['users' => $activeUsers]);
    }

    public function heartbeat(Request $request)
    {
        $request->validate([
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getCacheKey($request->channel_id);
        $users = Cache::get($cacheKey, []);

        if (!is_array($users)) {
            $users = [];
        }

        if (isset($users[Auth::id()])) {
            $users[Auth::id()]['last_seen'] = now()->timestamp;
            Cache::put($cacheKey, $users, now()->addHours(self::CACHE_TTL_HOURS));

            return response()->json(['status' => true]);
        }

        return response()->json(['status' => false, 'message' => 'User not in channel'], 404);
    }
}
