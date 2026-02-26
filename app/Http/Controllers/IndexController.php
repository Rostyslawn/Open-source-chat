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

        if ($hasMessage) {
            $validationRules['message'] = 'required|string|max:2000';
        } else if ($hasFile) {
            $validationRules['file'] = 'required|file|max:512000';
        }

        $request->validate($validationRules);

        $sender = Auth::user();

        $messageText = $hasMessage ? strip_tags($request->input('message')) : null;

        $messageData = [
            'sender_id' => $sender->id,
        ];

        if ($hasMessage) {
            $messageData['message'] = Crypt::encryptString($messageText);
        } else if ($hasFile) {
            try {
                $file = $request->file('file');

                if (!$file->isValid()) {
                    return response()->json(['status' => false, 'error' => 'Uploaded file is not valid.'], 422);
                }

                $fileHash = hash_file('sha256', $file->getRealPath());

                $existingMessage = Message::where('file_hash', $fileHash)->first();

                $storedFilePath = null;

                if ($existingMessage && $existingMessage->file_path) {
                    $storedFilePath = $existingMessage->file_path;

                    Log::info('File already exists, reusing', [
                        'hash' => $fileHash,
                        'path' => $storedFilePath,
                    ]);
                } else {
                    $originalName = $file->getClientOriginalName();
                    $extension = $file->getClientOriginalExtension();

                    $cleanName = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));

                    $safeFileName = Str::random(12) . '_' . $cleanName . '.' . $extension;

                    $counter = 1;
                    while (Storage::disk('public')->exists('uploads/files/' . $safeFileName)) {
                        $safeFileName = Str::random(12) . '_' . $cleanName . '_' . $counter . '.' . $extension;
                        $counter++;
                    }

                    $path = $file->storeAs('uploads/files', $safeFileName, 'public');
                    $storedFilePath = '/storage/' . $path;

                    Log::info('New file uploaded', [
                        'hash' => $fileHash,
                        'original' => $originalName,
                        'saved_as' => $safeFileName,
                        'path' => $storedFilePath,
                    ]);
                }

                $messageData['file_path'] = $storedFilePath;
                $messageData['file_name'] = $file->getClientOriginalName();
                $messageData['file_type'] = $file->getMimeType();
                $messageData['file_size'] = $file->getSize();
                $messageData['file_hash'] = $fileHash;

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

        if (!$message_data) {
            return response()->json(['status' => false, 'error' => 'Message not found.'], 404);
        }

        if ($message_data->sender_id != Auth::id() && !Auth::user()->admin) {
            Log::warning('Unauthorized delete attempt', [
                'user_id' => Auth::id(),
                'message_id' => $message_id,
                'owner_id' => $message_data->sender_id,
            ]);
            return response()->json(['status' => false, 'error' => 'Unauthorized.'], 403);
        }

        if ($message_data->file_path && $message_data->file_hash) {
            $otherMessagesWithFile = Message::where('file_hash', $message_data->file_hash)
                ->where('id', '!=', $message_id)
                ->exists();

            if (!$otherMessagesWithFile) {
                try {
                    $relativePath = str_replace('/storage/', '', $message_data->file_path);

                    if (strpos($relativePath, '..') != false) {
                        Log::error('Path traversal attempt in file deletion', [
                            'path' => $relativePath,
                            'user_id' => Auth::id(),
                        ]);
                    } elseif (Storage::disk('public')->exists($relativePath)) {
                        Storage::disk('public')->delete($relativePath);
                        Log::info('File deleted', [
                            'path' => $relativePath,
                            'hash' => $message_data->file_hash,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('File deletion failed: ' . $e->getMessage());
                }
            } else {
                Log::info('File not deleted - used by other messages', [
                    'path' => $message_data->file_path,
                    'hash' => $message_data->file_hash,
                ]);
            }
        }

        $message_data->delete();
        event(new deleteMessageEvent($message_id));

        return response()->json(['status' => true]);
    }
}
