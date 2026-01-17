<?php

use Illuminate\Support\Facades\Broadcast;

//Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
//    return (int) $user->id === (int) $id;
//});

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
