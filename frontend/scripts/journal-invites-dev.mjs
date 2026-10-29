import handler from '../api/journal-invites.js'
/** Same handler in Vite and Vercel; server environment values never enter the client bundle. */
export default function journalInvitesDev(env){
 return {name:'journal-invitations-local-api',configureServer(server){
  for(const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY'])if(env[key]&&!process.env[key])process.env[key]=env[key]
  process.env.APP_ORIGIN='http://127.0.0.1:'+server.config.server.port
  server.middlewares.use('/api/journal-invites',async(req,res)=>{
   const response={setHeader:(name,value)=>res.setHeader(name,value),status(code){res.statusCode=code;return this},json(value){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return this}}
   await handler(req,response)
  })
 }}
}
