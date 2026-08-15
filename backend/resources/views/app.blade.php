<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Cronevia — Your personal travel journal, memory archive and itinerary planner." />
    <meta name="theme-color" content="#8f1d2c" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>Cronevia</title>

    {{-- Fonts: Playfair Display (editorial serif) + Inter (clean sans) + Caveat (handwriting) --}}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700&family=Caveat:wght@400;500;600&display=swap" rel="stylesheet" />

    {{-- Vite-compiled assets (CSS + Vue SPA) --}}
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
</head>
<body class="h-full">
    <div id="app" class="h-full"></div>
</body>
</html>
