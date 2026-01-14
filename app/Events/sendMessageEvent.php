<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class sendMessageEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $id;
    public $sender;
    public $sender_avatar;
    public $message;
    public $message_time;
    public $file_path;
    public $file_name;
    public $file_type;
    public $file_size;

    public function __construct($id, $sender, $sender_avatar, $message, $message_time, $file_path = null, $file_name = null, $file_type = null, $file_size = null)
    {
        $this->id = $id;
        $this->sender = $sender;
        $this->sender_avatar = $sender_avatar;
        $this->message = $message;
        $this->message_time = $message_time;
        $this->file_path = $file_path;
        $this->file_name = $file_name;
        $this->file_type = $file_type;
        $this->file_size = $file_size;
    }

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('main-channel'),
        ];
    }
}
