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
    public $mutedByAdmin;

    public function __construct($channelId, $userId, $isMuted, $mutedByAdmin)
    {
        $this->channelId = $channelId;
        $this->userId = $userId;
        $this->isMuted = $isMuted;
        $this->mutedByAdmin = $mutedByAdmin;
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
