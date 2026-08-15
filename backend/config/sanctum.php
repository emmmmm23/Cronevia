<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Requests from the domains listed below will receive stateful API
    | authentication cookies. Typically, these should include your local
    | and production domains which access your API via a web browser.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        '127.0.0.1:8000,localhost:8000,localhost,127.0.0.1',
        env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | This array contains the authentication guards that will be checked when
    | Sanctum is authenticating a request. If none of the guards are able
    | to authenticate the request, Sanctum will use the "web" guard.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Sanctum Expiration
    |--------------------------------------------------------------------------
    |
    | Here you may specify the number of minutes until an issued token will
    | be considered expired. This will override the values in the token
    | expiration options, but you may always change them later.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Sanctum Token Prefix
    |--------------------------------------------------------------------------
    |
    | Sanctum can prefix new tokens in order to take advantage of the
    | Laravel ability to validate tokens on a per token basis. This
    | prefix will be added to the front of the token identifier.
    |
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    |
    | You may customize the middleware that is dispatched to authenticate
    | Sanctum tokens. Typically, this is the default Sanctum middleware
    | list; however, you are free to change these middleware as needed.
    |
    */

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
