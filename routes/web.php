<?php

use App\Http\Controllers\IndexController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerificationKey;
use App\Http\Middleware\BanCheck;

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
    Route::delete('/profile/destroy', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/generatenewkey', [ProfileController::class, 'generatekey'])->name('profile.generatenewkey');
});

require __DIR__ . '/auth.php';
