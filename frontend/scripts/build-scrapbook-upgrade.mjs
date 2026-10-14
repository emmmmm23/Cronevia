import { readFile,writeFile } from 'node:fs/promises'
const base=new URL('../../supabase/',import.meta.url)
// Reconcile the previously omitted sticker migration without dropping existing data.
const legacy=(await readFile(new URL('migrations/20261012000001_add_sticker_system.sql',base),'utf8'))
 .replace(/CREATE POLICY (\w+) ON (\w+)/g,'DROP POLICY IF EXISTS $1 ON $2;\nCREATE POLICY $1 ON $2')
 .replace(/CREATE POLICY ("[^"]+")\nON storage.objects/g,'DROP POLICY IF EXISTS $1 ON storage.objects;\nCREATE POLICY $1\nON storage.objects')
 .replace('CREATE TRIGGER validate_sticker_placement','DROP TRIGGER IF EXISTS validate_sticker_placement ON journal_sticker_placements;\nCREATE TRIGGER validate_sticker_placement')
 .replace(/-- Trigger to update journal_entries updated_at when placements change[\s\S]*?-- Notify PostgREST/,'-- The legacy table has no updated_at column.\nDROP TRIGGER IF EXISTS update_sticker_placements_updated_at ON journal_sticker_placements;\n\n-- Notify PostgREST')
const transactions=await readFile(new URL('migrations/20261014000002_sticker_transactions.sql',base),'utf8')
const layout=await readFile(new URL('migrations/20261014000001_scrapbook_layout.sql',base),'utf8')
await writeFile(new URL('apply-scrapbook-upgrade.sql',base),`-- Idempotent upgrade for projects with the October 11 base schema.\nBEGIN;\n${legacy}\n${layout}\n${transactions}\nNOTIFY pgrst, 'reload schema';\nCOMMIT;\n`)
console.log('Prepared supabase/apply-scrapbook-upgrade.sql. Nothing deployed.')
