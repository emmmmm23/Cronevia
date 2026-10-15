import {readFile,writeFile} from 'node:fs/promises'
const base=new URL('../../supabase/',import.meta.url)
const migration=(await Promise.all(['20261015000001_trip_planner.sql','20261016000001_itinerary_timeline.sql'].map(name=>readFile(new URL('migrations/'+name,base),'utf8')))).join('\n')
await writeFile(new URL('apply-trip-planner-upgrade.sql',base),'-- Idempotent planner upgrade for the October 14 Cronevia schema.\n-- Review TRIPS_MEMORIES_REDESIGN.md before applying to the hosted project.\nBEGIN;\n'+migration+'\nCOMMIT;\n')
console.log('Prepared supabase/apply-trip-planner-upgrade.sql. Nothing deployed.')
