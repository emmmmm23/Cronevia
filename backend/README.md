# Cronevia Backend

Laravel 11 API for the Cronevia travel journal platform.

## Database

Primary database target is MySQL 8+.

Environment variables in .env.example:

- DB_CONNECTION=mysql
- DB_HOST=127.0.0.1
- DB_PORT=3306
- DB_DATABASE=cronevia
- DB_USERNAME=
- DB_PASSWORD=
- DB_CHARSET=utf8mb4
- DB_COLLATION=utf8mb4_0900_ai_ci

Test placeholders:

- DB_TEST_DATABASE=cronevia_test
- DB_TEST_USERNAME=
- DB_TEST_PASSWORD=

## Local Setup

1. Install dependencies
   composer install

2. Copy environment file
   copy .env.example .env

3. Generate app key
   php artisan key:generate

4. Create MySQL databases
   CREATE DATABASE cronevia CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE DATABASE cronevia_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

5. Run migrations
   php artisan migrate

6. Seed demo data
   php artisan db:seed

7. Start API
   php artisan serve --host=0.0.0.0 --port=8000

## Testing

Default automated tests run with in-memory SQLite for speed:

php artisan test --compact

## Architecture Rule

Frontend must never connect directly to MySQL.

Correct flow:

Vue -> Laravel API -> Eloquent -> MySQL
