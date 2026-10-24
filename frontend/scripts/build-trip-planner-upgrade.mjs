import {readFile,writeFile} from 'node:fs/promises'
const base=new URL('../../supabase/',import.meta.url)
const migration=(await Promise.all(['20261015000001_trip_planner.sql','20261016000001_itinerary_timeline.sql','20261017000001_trip_destination.sql','20261018000001_folder_planner.sql','20261019000001_philippines_discovery.sql'].map(async name=>
 '-- '+name+'\n'+(await readFile(new URL('migrations/'+name,base),'utf8')).replace(/^\s*(BEGIN|COMMIT);\s*$/gm,'')
))).join('\n')
await writeFile(new URL('apply-trip-planner-upgrade.sql',base),'-- Idempotent planner upgrade for the October 14 Cronevia schema.\n-- Review FOLDER_PLANNER.md before applying to the hosted project.\nBEGIN;\n'+migration+'\nCOMMIT;\n')
console.log('Prepared supabase/apply-trip-planner-upgrade.sql. Nothing deployed.')
