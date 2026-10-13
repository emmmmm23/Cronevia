-- Seed built-in sticker assets
-- Run this after the sticker system migration
-- These reference SVG files in frontend/public/stickers-builtin/

INSERT INTO sticker_assets (user_id, storage_path, mime_type, width, height, category) VALUES
  (NULL, 'heart-01.svg', 'image/svg+xml', 100, 100, 'hearts'),
  (NULL, 'heart-02.svg', 'image/svg+xml', 100, 100, 'hearts'),
  (NULL, 'star-01.svg', 'image/svg+xml', 100, 100, 'stars'),
  (NULL, 'star-02.svg', 'image/svg+xml', 100, 100, 'stars'),
  (NULL, 'flower-01.svg', 'image/svg+xml', 100, 100, 'flowers'),
  (NULL, 'flower-02.svg', 'image/svg+xml', 100, 100, 'flowers'),
  (NULL, 'tape-01.svg', 'image/svg+xml', 100, 100, 'tape'),
  (NULL, 'tape-02.svg', 'image/svg+xml', 100, 100, 'tape'),
  (NULL, 'leaf-01.svg', 'image/svg+xml', 100, 100, 'leaves'),
  (NULL, 'stamp-travel-01.svg', 'image/svg+xml', 100, 100, 'travel'),
  (NULL, 'doodle-abstract-01.svg', 'image/svg+xml', 100, 100, 'doodles'),
  (NULL, 'doodle-abstract-02.svg', 'image/svg+xml', 100, 100, 'doodles')
ON CONFLICT (storage_path) DO NOTHING;
