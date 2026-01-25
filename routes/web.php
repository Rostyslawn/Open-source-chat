<?php

use App\Http\Controllers\IndexController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerificationKey;
use App\Http\Middleware\BanCheck;
use App\Http\Controllers\VoiceController;

Route::middleware(['auth', VerificationKey::class, BanCheck::class])->group(function () {
    Route::get('/', [IndexController::class, 'index'])
        ->name('index');
    Route::post('/sendMessage', [IndexController::class, 'sendMessage'])
        ->name('sendMessage');
    Route::post('/deleteMessage', [IndexController::class, 'deleteMessage'])
        ->name('deleteMessage');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('dashboard');
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile/update', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/destroy', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('unban', [ProfileController::class, 'unban'])->name('profile.unban');
    Route::post('/profile/generatenewkey', [ProfileController::class, 'generatekey'])->name('profile.generatenewkey');

    Route::prefix('voice/')->name('voice.')->group(function () {
        Route::post('signal', [VoiceController::class, 'sendSignal'])
            ->name('signal');
        Route::post('joined', [VoiceController::class, 'joined'])
            ->name('joined');
        Route::post('left', [VoiceController::class, 'left'])
            ->name('left');
        Route::post('mute-status', [VoiceController::class, 'muteStatus'])
            ->name('mute-status');
        Route::get('active-users', [VoiceController::class, 'getActiveUsers'])
            ->name('active-users');
        Route::post('heartbeat', [VoiceController::class, 'heartbeat'])
            ->name('heartbeat');
    });
});

Route::get('/forbidden', function () {
    return view('forbidden');
})->name('forbidden');

require __DIR__ . '/auth.php';
