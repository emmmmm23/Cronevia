/** Preserve HTTP/database codes without sending request bodies to diagnostics. */
export function requestError(message:string,status=400,code?:string){
 return Object.assign(new Error(message),{status,code,response:{status,data:{message,code}}})
}
export function isSignInRequired(error:unknown){
 const e=error as {status?:number;code?:string;response?:{status?:number}}
 return (e?.response?.status??e?.status)===401||['PGRST301','PGRST303'].includes(e?.code||'')
}
