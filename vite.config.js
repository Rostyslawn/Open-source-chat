import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/ts/index.ts',
                'resources/ts/voice.ts',
                'resources/ts/upload.ts',
            ],
            refresh: true,
        }),
    ],
});
