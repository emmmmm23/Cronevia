<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Cronevia is a Vue 3 SPA served through Laravel.
| All non-API requests are handled here by returning the app shell Blade view.
| Vue Router takes over client-side routing once the SPA is mounted.
|
*/

// Login route name required by Sanctum's unauthenticated redirect
Route::get('/login', function () {
    return view('app');
})->name('login');

// Catch-all: serve the Vue SPA shell for every web route.
// Vue Router handles all client-side navigation.
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
