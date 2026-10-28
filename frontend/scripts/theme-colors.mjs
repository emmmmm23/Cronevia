// Adapt the existing palette without replacing layouts or changing vintage colors.
// User-designed journal/tracker paper opts into its own light color-scheme.
function adapt(hex, role) {
  let value=hex.slice(1)
  if(value.length===3||value.length===4)value=[...value].map(c=>c+c).join('')
  const [r,g,b]=[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)/255)
  const max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2,delta=max-min
  const saturation=delta===0?0:delta/(1-Math.abs(2*light-1))
  const hue=delta===0?35:max===r?60*(((g-b)/delta+6)%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4)
  const alpha=value.length===8?parseInt(value.slice(6),16)/255:1
  let darkLight=light,darkSaturation=saturation
  if(role==='surface'&&light>.55){darkLight=.09+(1-light)*.3;darkSaturation=Math.min(.22,saturation*.45)}
  else if(role==='text'&&light<.78){darkLight=.9-light*.25;darkSaturation=Math.min(.5,saturation*.55)}
  else if(role==='border'&&light>.45){darkLight=.25;darkSaturation=Math.min(.2,saturation*.4)}
  else return hex
  const dark=`hsl(${hue.toFixed(1)} ${(darkSaturation*100).toFixed(1)}% ${(darkLight*100).toFixed(1)}% / ${alpha.toFixed(3)})`
  const day=role==='surface'&&light>.7?`var(--theme-light-surface,${hex})`:hex
  return `light-dark(${day},${dark})`
}
export default function themeColors(){
 return {postcssPlugin:'cronevia-theme-colors',Declaration(decl){
  if(decl.raws.croneviaTheme||decl.value.includes('light-dark('))return
  const prop=decl.prop.toLowerCase()
  if(prop==='--theme-light-surface')return
  let role=/^(background|background-color)$/.test(prop)?'surface':/^(color|fill|stroke|text-decoration-color|caret-color)$/.test(prop)?'text':/border|outline/.test(prop)?'border':''
  if(prop.startsWith('--'))role=/ink|text|muted|soft|wine|burgundy|sepia$/.test(prop)?'text':/paper|cream|surface|background/.test(prop)?'surface':/border|line/.test(prop)?'border':''
  if(!role)return
  const original=decl.value.replace(/^(white|black)$/i,c=>c.toLowerCase()==='white'?'#ffffff':'#000000')
  let next=original.replace(/#[a-f\d]{3,8}\b/gi,hex=>[4,5,7,9].includes(hex.length)?adapt(hex,role):hex)
  if(role==='surface'&&next==='var(--wine)')next='light-dark(var(--wine),#74283c)'
  if(next!==original){const fallback=decl.cloneBefore({value:decl.value});fallback.raws.croneviaTheme=true;decl.value=next;decl.raws.croneviaTheme=true}
 }}
}
