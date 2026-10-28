import {type Page} from '@playwright/test'
import {fixture} from './planner-fixture'
export async function trackersFixture(page:Page){
 const core=await fixture(page)
 await page.route('**/rest/v1/profiles?**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({id:core.user.id,user_id:core.user.id,full_name:'Local fixture reviewer',role:'user',account_status:'active',timezone:'UTC'})}))
 const trackers:any[]=[],logs:any[]=[]
 let board:any=null,failLog=false
 const json=(route:any,value:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)})
 await page.route('**/rest/v1/creative_trackers?**',route=>json(route,trackers))
 await page.route('**/rest/v1/tracker_logs?**',route=>json(route,logs))
 await page.route('**/rest/v1/tracker_boards?**',route=>json(route,board))
 await page.route('**/rest/v1/rpc/save_creative_tracker',route=>{
  const p=route.request().postDataJSON(),old=trackers.find(t=>t.id===p.target_id)
  const row={...p.details,id:p.target_id,user_id:'11111111-1111-4111-8111-111111111111',created_at:old?.created_at||new Date().toISOString()}
  if(old)Object.assign(old,row);else trackers.push(row)
  return json(route,row)
 })
 await page.route('**/rest/v1/rpc/save_tracker_log',route=>{
  if(failLog){failLog=false;return json(route,{message:'The connection paused. Please retry.'},500)}
  const p=route.request().postDataJSON(),t=trackers.find(t=>t.id===p.target_tracker)
  const existing=logs.find(l=>l.tracker_id===t.id&&(t.kind==='sleep'||t.config.multiple?l.id===p.entry_id:l.log_date===p.entry_date))
  const row={id:existing?.id||p.entry_id,tracker_id:t.id,user_id:t.user_id,log_date:p.entry_date,values:p.entry_values,started_at:p.session_start,ended_at:p.session_end,timezone:p.entry_timezone,config_snapshot:t.config,unit_snapshot:t.unit,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}
  if(existing)Object.assign(existing,row);else logs.push(row)
  return json(route,row)
 })
 await page.route('**/rest/v1/rpc/save_tracker_grid_day',route=>{
  if(failLog){failLog=false;return json(route,{message:'The connection paused. Please retry.'},500)}
  const p=route.request().postDataJSON(),t=trackers.find(t=>t.id===p.target_tracker),old=logs.filter(l=>l.tracker_id===t.id&&l.log_date===p.entry_date)
  if(old.length!==p.expected_rows.length||old.some(l=>!p.expected_rows.some((r:any)=>r.id===l.id&&r.updated_at===l.updated_at)))return json(route,{code:'40001',message:'Stale day'},409)
  const rows=p.new_entries.map((e:any)=>({...e,tracker_id:t.id,user_id:t.user_id,log_date:p.entry_date,config_snapshot:old.find(l=>l.id===e.id)?.config_snapshot||t.config,unit_snapshot:t.unit,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}))
  for(let i=logs.length-1;i>=0;i--)if(logs[i].tracker_id===t.id&&logs[i].log_date===p.entry_date)logs.splice(i,1)
  logs.push(...rows);return json(route,rows)
 })
 await page.route('**/rest/v1/rpc/save_tracker_board',route=>{board={...route.request().postDataJSON().details,user_id:'11111111-1111-4111-8111-111111111111'};return json(route,board)})
 return {trackers,logs,image:core.image,failNextLog(){failLog=true},setBoard(value:any){board=value}}
}
