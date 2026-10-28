/** Preserve HTTP/database codes without sending request bodies to diagnostics. */
export function safeServiceMessage(message:string,fallback='That request could not be completed. Please try again.'){
 return /permission denied|SQLSTATE|schema cache|relation .*does not exist|column .*does not exist|invalid input syntax|violates .*constraint|stack trace|postgres(?:ql)?:\/\/|(?:access_token|refresh_token|api_key|password)=/i.test(message)||message.length>350?fallback:message
}
export function requestError(message:string,status=400,code?:string){
 message=safeServiceMessage(message)
 return Object.assign(new Error(message),{status,code,response:{status,data:{message,code}}})
}
export function isSignInRequired(error:unknown){
 const e=error as {status?:number;code?:string;response?:{status?:number}}
 return (e?.response?.status??e?.status)===401||['PGRST301','PGRST303'].includes(e?.code||'')
}
