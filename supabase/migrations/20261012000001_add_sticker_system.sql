-- Sticker system: assets, placements, and storage buckets
-- Built-in stickers are public; custom uploads are private and user-scoped

-- Sticker assets table: reusable sticker images (built-in or user-uploaded)
CREATE TABLE IF NOT EXISTS sticker_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Storage reference
  storage_path TEXT NOT NULL,
  
  -- File metadata
  mime_type VARCHAR(100) NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  
  -- Category for organizing stickers
  category VARCHAR(50) DEFAULT 'other',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure storage_path is unique
  UNIQUE(storage_path)
);

-- Journal sticker placements: individual instances of stickers on journal pages
CREATE TABLE IF NOT EXISTS journal_sticker_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  sticker_asset_id UUID NOT NULL REFERENCES sticker_assets(id) ON DELETE CASCADE,
  
  -- Normalized coordinates (0-1 range, relative to page surface)
  x DECIMAL(10, 8) NOT NULL CHECK (x >= 0 AND x <= 1),
  y DECIMAL(10, 8) NOT NULL CHECK (y >= 0 AND y <= 1),
  
  -- Normalized width (0-1 range, relative to page width)
  width DECIMAL(10, 8) NOT NULL CHECK (width > 0 AND width <= 1),
  
  -- Rotation in degrees
  rotation DECIMAL(6, 2) NOT NULL DEFAULT 0 CHECK (rotation >= -360 AND rotation <= 360),
  
  -- Stacking order
  z_index INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add JSONB column for complete sticker layout data on journal entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sticker_layout JSONB DEFAULT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sticker_assets_user_id ON sticker_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_sticker_assets_category ON sticker_assets(category);
CREATE INDEX IF NOT EXISTS idx_journal_sticker_placements_journal_entry_id ON journal_sticker_placements(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_sticker_placements_sticker_asset_id ON journal_sticker_placements(sticker_asset_id);

-- Enable RLS
ALTER TABLE sticker_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_sticker_placements ENABLE ROW LEVEL SECURITY;

-- Revoke default grants
REVOKE ALL ON sticker_assets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON journal_sticker_placements FROM PUBLIC, anon, authenticated;

-- Grant necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON sticker_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_sticker_placements TO authenticated;

-- RLS Policies for sticker_assets
-- Built-in stickers (user_id IS NULL) are readable by all authenticated users
-- Custom stickers (user_id IS NOT NULL) follow owner_access pattern
CREATE POLICY sticker_assets_read ON sticker_assets
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR (user_id = auth.uid() AND public.is_account_active()));

CREATE POLICY sticker_assets_insert ON sticker_assets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_account_active());

CREATE POLICY sticker_assets_update ON sticker_assets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_account_active())
  WITH CHECK (user_id = auth.uid() AND public.is_account_active());

CREATE POLICY sticker_assets_delete ON sticker_assets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_account_active());

-- RLS Policies for journal_sticker_placements
-- Users can only manage placements on journal entries they own
CREATE POLICY journal_sticker_placements_owner ON journal_sticker_placements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_sticker_placements.journal_entry_id
        AND journal_entries.user_id = auth.uid()
        AND journal_entries.deleted_at IS NULL
    )
    AND public.is_account_active()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries
      WHERE journal_entries.id = journal_sticker_placements.journal_entry_id
        AND journal_entries.user_id = auth.uid()
        AND journal_entries.deleted_at IS NULL
    )
    AND public.is_account_active()
  );

-- Storage buckets for stickers
-- Built-in stickers bucket (public read for authenticated users)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stickers-builtin',
  'stickers-builtin',
  false,  -- Not publicly accessible without auth
  1048576,  -- 1MB limit for built-in stickers
  ARRAY['image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Custom stickers bucket (private, user-scoped)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stickers-custom',
  'stickers-custom',
  false,
  5242880,  -- 5MB limit for custom uploads
  ARRAY['image/png', 'image/webp']  -- No SVG for user uploads initially
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for built-in stickers (read-only for authenticated users)
CREATE POLICY "Authenticated users can read builtin stickers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stickers-builtin');

-- Storage policies for custom stickers (user folders: {user_id}/filename.ext)
CREATE POLICY "Users can manage own custom stickers"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'stickers-custom'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_account_active()
)
WITH CHECK (
  bucket_id = 'stickers-custom'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_account_active()
);

-- Trigger to validate sticker placement references
CREATE OR REPLACE FUNCTION public.validate_sticker_placement() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  asset_owner uuid;
  entry_owner uuid;
BEGIN
  -- Get the owner of the sticker asset
  SELECT user_id INTO asset_owner
  FROM sticker_assets
  WHERE id = NEW.sticker_asset_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sticker asset not found';
  END IF;
  
  -- Get the owner of the journal entry
  SELECT user_id INTO entry_owner
  FROM journal_entries
  WHERE id = NEW.journal_entry_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found or deleted';
  END IF;
  
  -- If asset has an owner (not a built-in sticker), verify it matches entry owner
  IF asset_owner IS NOT NULL AND asset_owner IS DISTINCT FROM entry_owner THEN
    RAISE EXCEPTION 'Cannot place another user''s private sticker';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_sticker_placement
BEFORE INSERT OR UPDATE ON journal_sticker_placements
FOR EACH ROW EXECUTE FUNCTION public.validate_sticker_placement();

-- Trigger to update journal_entries updated_at when placements change
CREATE TRIGGER update_sticker_placements_updated_at
BEFORE UPDATE ON journal_sticker_placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
