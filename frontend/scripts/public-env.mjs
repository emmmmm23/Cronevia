/** Fail before bundling: browser-prefixed configuration is always public. */
export function validatePublicEnv(env){
 for(const [name,value]of Object.entries(env)){
  if(!name.startsWith('VITE_')||!value)continue
  let privateValue=/^sb_secret_|^sk\.|^sk_live_|-----BEGIN .*PRIVATE KEY-----/.test(value)
  try{privateValue ||= JSON.parse(Buffer.from(value.split('.')[1]||'','base64url')).role==='service_role'}catch{}
  if(privateValue||/SERVICE_ROLE|SECRET|PRIVATE_KEY|PASSWORD|GEOAPIFY_API_KEY/i.test(name))throw new Error(`Server-only configuration cannot use the public ${name} variable. No value has been printed.`)
 }
}
