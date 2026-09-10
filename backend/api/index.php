<?php

/**
 * Vercel Serverless Bootstrap for Laravel
 * 
 * This file adapts Laravel to run in Vercel's serverless environment.
 */

// Load Composer autoloader
require __DIR__ . '/../vendor/autoload.php';

// Bootstrap the Laravel application
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Handle the incoming request through Laravel's HTTP kernel
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Send the response to the user
$response->send();

// Terminate the application
$kernel->terminate($request, $response);
