import {invitationPath,invitationDestination,isJournalId} from './journal-routes'
// Imported before createWebHistory. The raw invitation never reaches the router or persistent storage.
let exchange:Promise<void>|undefined
let retryExchange:(()=>Promise<void>)|undefined
if(window.location.pathname===invitationPath&&window.location.hash.startsWith('#invite=')){
 const token=window.location.hash.slice(8)
 const expected=new URLSearchParams(window.location.search).get('invitation')
 window.history.replaceState(window.history.state,'',invitationDestination(expected))
 retryExchange=()=>fetch('/api/journal-invites',{method:'POST',credentials:'same-origin',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'exchange',token,...(isJournalId(expected)?{expected_invitation:expected}:{})})})
 .then(async response=>{if(!response.ok)throw new Error((await response.json()).error||'This invitation could not be opened. Reopen the original link to try again.');retryExchange=undefined})
 exchange=retryExchange()
 // Keep a handled promise until the invitation screen is mounted; never log token-bearing errors.
 exchange.catch(()=>{})
}
export async function finishInvitationExchange(){const pending=exchange||retryExchange?.();try{await pending}finally{exchange=undefined}}
