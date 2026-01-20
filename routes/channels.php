<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('main-channel', function ($user) {
    if (!$user) return false;
    if (!$user->verified) return false;

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
    ];
});

Broadcast::channel('online', function ($user) {
    if (!$user) return false;
    if (!$user->verified) return false;

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
    ];
});

Broadcast::channel('voice-channel-1', function ($user) {
    if (!$user) return false;
    if (!$user->verified) return false;

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
    ];
});

Broadcast::channel('voice-channel-2', function ($user) {
    if (!$user) return false;
    if (!$user->verified) return false;

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
    ];
});

Broadcast::channel('voice-channel-3', function ($user) {
    if (!$user) return false;
    if (!$user->verified) return false;

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar,
    ];
});
