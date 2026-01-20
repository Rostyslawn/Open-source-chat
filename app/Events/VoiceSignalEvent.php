<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceSignalEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user_id;
    public $target_user_id;
    public $type;
    public $signal;

    public function __construct($user_id, $target_user_id, $type, $signal)
    {
        $this->user_id = $user_id;
        $this->target_user_id = $target_user_id;
        $this->type = $type;
        $this->signal = $signal;
    }

    public function broadcastOn()
    {
        return new PresenceChannel('voice-channel');
    }

    public function broadcastAs()
    {
        return 'voice-signal';
    }
}
