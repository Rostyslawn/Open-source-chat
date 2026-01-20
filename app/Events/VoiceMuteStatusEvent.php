<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceMuteStatusEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $channelId;
    public $userId;
    public $isMuted;

    public function __construct($channelId, $userId, $isMuted)
    {
        $this->channelId = $channelId;
        $this->userId = $userId;
        $this->isMuted = $isMuted;
    }

    public function broadcastOn()
    {
        return new PresenceChannel('voice-channel-' . $this->channelId);
    }

    public function broadcastAs()
    {
        return 'voice-mute-status';
    }
}
