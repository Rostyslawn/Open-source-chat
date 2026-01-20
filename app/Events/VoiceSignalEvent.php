<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceSignalEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $channelId;
    public $userId;
    public $targetUserId;
    public $type;
    public $signal;

    public function __construct($channelId, $userId, $targetUserId, $type, $signal)
    {
        $this->channelId = $channelId;
        $this->userId = $userId;
        $this->targetUserId = $targetUserId;
        $this->type = $type;
        $this->signal = $signal;
    }

    public function broadcastOn()
    {
        return new PresenceChannel('voice-channel-' . $this->channelId);
    }

    public function broadcastAs()
    {
        return 'voice-signal';
    }
}
