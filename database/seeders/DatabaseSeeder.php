<?php

namespace Database\Seeders;

use App\Models\Activationkey;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
//        Activationkey::factory()->create([
//            'key' => Hash::make(123456),
//            'aviable' => true,
//        ]);

        // Create admin account
        User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@admin',
            'email_verified_at' => now(),
            'password' => Hash::make("Strongpassword228"),
            'verified' => true,
            'admin' => true,
        ]);
    }
}
