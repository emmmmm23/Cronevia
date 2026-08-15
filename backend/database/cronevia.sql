-- Cronevia MySQL schema snapshot
-- Source of truth remains Laravel migrations.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_path VARCHAR(255) NULL,
  bio TEXT NULL,
  timezone VARCHAR(64) NULL,
  locale VARCHAR(16) NULL,
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS trips (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  destination VARCHAR(255) NULL,
  description TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  budget DECIMAL(12,2) NULL,
  currency CHAR(3) NULL,
  status ENUM('planning','active','completed','archived') NOT NULL DEFAULT 'planning',
  visibility ENUM('private','public','friends') NOT NULL DEFAULT 'private',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY trips_slug_unique (slug),
  KEY trips_user_id_index (user_id),
  KEY trips_start_date_index (start_date),
  KEY trips_status_index (status),
  CONSTRAINT trips_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Additional tables are managed in Laravel migrations and can be dumped with:
-- php artisan schema:dump