/** Emit only text and HTTPS links; never rely on a map library's HTML sanitizer. */
export function safeAttribution(value: string) {
 const source=document.createElement('template'),output=document.createElement('div')
 source.innerHTML=value.slice(0,4000)
 function append(node:Node,parent:HTMLElement){
  if(node.nodeType===Node.TEXT_NODE){parent.append(document.createTextNode(node.textContent||''));return}
  if(!(node instanceof Element))return
  if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','IMG'].includes(node.tagName))return
  if(node.tagName==='A'){
   try{
    const url=new URL(node.getAttribute('href')||'')
    if(url.protocol==='https:'&&!url.username&&!url.password){
     const link=document.createElement('a');link.href=url.href;link.rel='noopener noreferrer';link.target='_blank'
     link.textContent=node.textContent||url.hostname;parent.append(link);return
    }
   }catch{/* Unsafe links are rendered as plain text. */}
  }
  for(const child of node.childNodes)append(child,parent)
 }
 for(const child of source.content.childNodes)append(child,output)
 return output.innerHTML
}
