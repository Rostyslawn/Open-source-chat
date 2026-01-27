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

    private function getUsersInVoice($channelId)
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
            'muted' => 'required|boolean',
        ]);

        $cacheKey = $this->getUsersInVoice($request->channel_id);
        $users = Cache::get($cacheKey, []);

        $users = $this->cleanExpiredUsers($users);

        $userData = [
            'id' => Auth::id(),
            'name' => Auth::user()->name,
            'avatar' => Auth::user()->avatar,
            'muted' => $request->muted,
            'muted_by_admin' => false,
            'joined_at' => now()->timestamp,
            'last_seen' => now()->timestamp,
        ];

        $users[Auth::id()] = $userData;

        Cache::forever($cacheKey, $users);

        event(new VoiceJoinedEvent(
            $request->input('channel_id'),
            Auth::id(),
            Auth::user()->name,
            Auth::user()->avatar,
            $request->muted,
            false
        ));

        return response()->json(['status' => true, 'cached_users' => count($users)]);
    }

    public function left(Request $request)
    {
        $request->validate([
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getUsersInVoice($request->channel_id);
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
            'channel_id' => 'required',
            'is_muted' => 'required|boolean',
            'user_id' => 'nullable|integer|exists:users,id',
            'muted_by_admin' => 'nullable|boolean',
        ]);

        $targetUserId = $request->input('user_id');
        $isMuted = $request->input('is_muted');
        $isMutedByAdmin = $request->input('muted_by_admin');
        $cacheKey = $this->getUsersInVoice($request->channel_id);
        $users = Cache::get($cacheKey, []);

        if ($targetUserId && $targetUserId != Auth::id()) {
            if (!Auth::user()->admin) {
                return response()->json(['status' => false], 403);
            }

            if (!isset($users[$targetUserId])) {
                return response()->json(['status' => false], 404);
            }

            if (!$isMuted && !($users[$targetUserId]['muted_by_admin'] ?? false)) {
                return response()->json(['status' => false], 400);
            }

            $users[$targetUserId]['muted'] = $isMuted;
            $users[$targetUserId]['muted_by_admin'] = $isMutedByAdmin;
            Cache::forever($cacheKey, $users);

            broadcast(new VoiceMuteStatusEvent(
                $request->input('channel_id'),
                $targetUserId,
                $isMuted,
                $isMutedByAdmin
            ))->toOthers();

            return response()->json(['status' => true]);
        }

        if (!isset($users[Auth::id()])) {
            return response()->json(['status' => false], 404);
        }

        if ($users[Auth::id()]['muted_by_admin'] ?? false) {
            return response()->json(['status' => false], 403);
        }

        $users[Auth::id()]['muted'] = $isMuted;
        $users[Auth::id()]['muted_by_admin'] = false;
        Cache::forever($cacheKey, $users);

        broadcast(new VoiceMuteStatusEvent(
            $request->input('channel_id'),
            Auth::id(),
            $isMuted,
            false
        ))->toOthers();

        return response()->json(['status' => true]);
    }

    public function getActiveUsers(Request $request)
    {
        $request->validate([
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getUsersInVoice($request->channel_id);
        $activeUsers = Cache::get($cacheKey, []);

        $activeUsers = $this->cleanExpiredUsers($activeUsers);
        Cache::forever($cacheKey, $activeUsers);

        return response()->json(['users' => $activeUsers]);
    }

    public function heartbeat(Request $request)
    {
        $request->validate([
            'channel_id' => 'required',
        ]);

        $cacheKey = $this->getUsersInVoice($request->channel_id);
        $users = Cache::get($cacheKey, []);

        if (!is_array($users)) {
            $users = [];
        }

        if (isset($users[Auth::id()])) {
            $users[Auth::id()]['last_seen'] = now()->timestamp;
            Cache::forever($cacheKey, $users);

            return response()->json(['status' => true]);
        }

        return response()->json(['status' => false], 404);
    }
}
