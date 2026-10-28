import { readFile, writeFile } from 'node:fs/promises'
const names=['20261028000001_creative_trackers.sql','20261028000002_journal_tracker_links.sql','20261028000003_tracker_validation.sql']
const sections=[]
for(const name of names)sections.push('-- '+name+'\n'+(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8')).replace(/^\s*(BEGIN|COMMIT);\s*$/gm,''))
await writeFile(new URL('../../supabase/apply-creative-trackers.sql',import.meta.url),'-- Cronevia creative trackers: additive upgrade; review before running. Existing journal and trip data are retained.\nBEGIN;\n'+sections.join('\n')+'\nCOMMIT;\n')
console.log('Prepared supabase/apply-creative-trackers.sql. No database changes were deployed.')
