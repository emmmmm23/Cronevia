import { readdir, readFile, writeFile } from 'node:fs/promises'
const migrations=new URL('../../supabase/migrations/',import.meta.url)
const files=(await readdir(migrations)).filter(file=>file.startsWith('20261011')&&file.endsWith('.sql')).sort()
const sections=[]
for(const file of files) sections.push(`-- ${file}\n${await readFile(new URL(file,migrations),'utf8')}`)
const destination=new URL('../../supabase/apply-existing-project.sql',import.meta.url)
await writeFile(destination,`-- Apply once to the existing Cronevia project after review.\nBEGIN;\n${sections.join('\n')}\nCOMMIT;\n`)
console.log(`Wrote supabase/apply-existing-project.sql with ${files.length} migrations. Nothing was deployed.`)
