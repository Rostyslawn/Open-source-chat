<?php

namespace App\Http\Controllers;

use App\Events\deleteMessageEvent;
use App\Events\sendMessageEvent;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

class IndexController extends Controller
{
    public function index()
    {
        $messages_data = Message::all();
        return view('index', compact('messages_data'));
    }

    public function sendMessage(Request $request)
    {
        $executed = RateLimiter::attempt(
            'send-message:' . Auth::id(),
            10,
            function () {
            },
            30
        );

        if (!$executed) {
            return response()->json(['error' => 'Too many messages. Try again later.'], 429);
        }

        $hasFile = $request->hasFile('file');
        $hasMessage = $request->has('message') && !empty($request->input('message'));

        if (!$hasFile && !$hasMessage) {
            return response()->json(['status' => false, 'error' => 'Either message or file is required.'], 422);
        }

        $validationRules = [];

        if ($hasFile) {
            $validationRules['file'] = 'required|file|max:512000';
        }

        if ($hasMessage) {
            $validationRules['message'] = 'required|string|max:2000';
        }

        $request->validate($validationRules);

        $sender = Auth::user();

        $messageText = $hasMessage ? strip_tags($request->input('message')) : '';

        $messageData = [
            'sender_id' => $sender->id,
        ];

        if ($hasMessage) {
            $messageData['message'] = Crypt::encryptString($messageText);
        }

        if ($hasFile) {
            try {
                $file = $request->file('file');

                if (!$file->isValid()) {
                    return response()->json(['status' => false, 'error' => 'Uploaded file is not valid.'], 422);
                }

                $storedFilePath = 0;

                $fileName = $file->getClientOriginalName();
                $filePath = 'uploads/files/' . $fileName;

                if (Storage::disk('public')->exists($filePath)) {
                    $storedFilePath = Storage::url($filePath);
                } else {
                    $path = $file->storeAs('uploads/files', $fileName, 'public');
                    $storedFilePath = Storage::url($path);
                }

                $messageData['file_path'] = $storedFilePath;
                $messageData['file_name'] = $file->getClientOriginalName();
                $messageData['file_type'] = $file->getMimeType();
                $messageData['file_size'] = $file->getSize();

            } catch (\Exception $e) {
                Log::error('File upload exception: ' . $e->getMessage());
                return response()->json(['status' => false, 'error' => 'File upload failed. Please try again.'], 500);
            }
        }

        $message_create = Message::create($messageData);
        $messageTime = $message_create->created_at->toIso8601String();

        event(new sendMessageEvent(
            $message_create->id,
            $sender->name,
            $sender->avatar,
            $messageText,
            $messageTime,
            $message_create->file_path ?? null,
            $message_create->file_name ?? null,
            $message_create->file_type ?? null,
            $message_create->file_size ?? null
        ));

        return response()->json(['status' => true]);
    }

    public function deleteMessage(Request $request)
    {
        $request->validate([
            'message_id' => ['required', 'integer'],
        ]);

        $message_id = $request->input('message_id');
        $message_data = Message::find($message_id);

        if ($message_data) {
            if ($message_data->sender_id == Auth::user()->id) {
                if ($message_data->file_path) {
                    $otherMessagesWithFile = Message::where('file_path', $message_data->file_path)
                        ->where('id', '!=', $message_id)
                        ->exists();

                    if (!$otherMessagesWithFile) {
                        try {
                            $relativePath = str_replace('/storage/', '', $message_data->file_path);
                            if (Storage::disk('public')->exists($relativePath)) {
                                Storage::disk('public')->delete($relativePath);
                            }
                        } catch (\Exception $e) {
                            Log::error('File deletion failed: ' . $e->getMessage());
                        }
                    }
                }

                $message_data->delete();
                event(new deleteMessageEvent($message_id));

                return response()->json(['status' => true]);
            }
        }

        return response()->json(['status' => false, 'error' => 'Message not found or unauthorized.'], 404);
    }
}
