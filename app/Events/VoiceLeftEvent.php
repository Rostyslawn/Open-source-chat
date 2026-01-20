<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceLeftEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user_id;
    public $user_name;

    public function __construct($user_id, $user_name)
    {
        $this->user_id = $user_id;
        $this->user_name = $user_id;
    }

    public function broadcastOn()
    {
        return new PresenceChannel('voice-channel');
    }

    public function broadcastAs()
    {
        return 'voice-left';
    }
}
