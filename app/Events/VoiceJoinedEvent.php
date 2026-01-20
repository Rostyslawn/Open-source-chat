<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VoiceJoinedEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $channelId;
    public $userId;
    public $userName;
    public $userAvatar;

    public function __construct($channelId, $userId, $userName, $userAvatar)
    {
        $this->channelId = $channelId;
        $this->userId = $userId;
        $this->userName = $userName;
        $this->userAvatar = $userAvatar;
    }

    public function broadcastOn()
    {
        return new PresenceChannel('voice-channel-' . $this->channelId);
    }

    public function broadcastAs()
    {
        return 'voice-user-joined';
    }
}
