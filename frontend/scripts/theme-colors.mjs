// Adapt shared UI colors while retaining the original light and dark palettes.
// User-designed journal/tracker paper opts into its own light color-scheme.
const brands=new Set(['#7b0323','#79283e','#74283c','#754253','#7c4256','#785264','#8d475f','#8e4e65','#6e2440','#71263b','#71273d','#6c263b'])
const strongBrands=new Set(['#5a0019','#612033','#622036','#6c2034','#612234'])
const ornaments=new Set(['#8c5d70','#966173','#9e6b76','#8a5c70','#8a4156','#8b5b70'])
const softBrands=new Set(['#fdf2f3','#f5e8ec','#f1e5e8','#eee2e6'])
const pages=new Set(['#f5ebdd','#f5f0e4','#f5f0e8','#faf7f0','#f6f1e7'])
const cards=new Set(['#fdfaf5','#fcfaf5','#fdfaf1','#fcf9ef','#faf6ed','#fffefa','#fffdf6','#fffdf5','#fffdf3','#fbf8f0','#faf7ed','#fbf7ef'])
const lines=new Set(['#d7c7b3','#e5d4bb','#ded3be','#e6dccd','#e4d6c1','#ddd1c0','#dcd0bf','#d8d0c0'])
const mutedBrowns=new Set(['#8f826c','#a18a66','#a28a67','#a38b66','#a58e69','#aa9270','#a28d6b','#a18b66','#a38b68','#958064','#81694c','#806447','#8a6947'])
function vintageToken(hex,role){
 const key=hex.toLowerCase()
 if(brands.has(key))return '--vintage-brand'
 if(strongBrands.has(key))return '--vintage-brand-strong'
 if(ornaments.has(key))return '--vintage-ornament'
 if(role==='surface'&&softBrands.has(key))return '--vintage-soft'
 if(role==='surface'&&pages.has(key))return '--vintage-page'
 if(role==='surface'&&cards.has(key))return '--vintage-card'
 if(role==='border'&&lines.has(key))return '--vintage-line'
 if(role==='text'&&mutedBrowns.has(key))return '--vintage-muted'
 return ''
}
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
  const changed=darkLight!==light||darkSaturation!==saturation
  const dark=changed?`hsl(${hue.toFixed(1)} ${(darkSaturation*100).toFixed(1)}% ${(darkLight*100).toFixed(1)}% / ${alpha.toFixed(3)})`:hex
  const day=role==='surface'&&light>.7?`var(--theme-light-surface,${hex})`:hex
  const token=vintageToken(hex,role)
  if(!changed&&!token)return hex
  return `light-dark(${token?`var(${token},${day})`:day},${dark})`
}
export default function themeColors(){
 return {postcssPlugin:'cronevia-theme-colors',Declaration(decl){
  if(decl.raws.croneviaTheme||decl.value.includes('light-dark('))return
  const prop=decl.prop.toLowerCase()
  if(prop==='--theme-light-surface'||prop.startsWith('--vintage-'))return
  let role=/^(background|background-color)$/.test(prop)?'surface':/^(color|fill|stroke|text-decoration-color|caret-color)$/.test(prop)?'text':/border|outline/.test(prop)?'border':''
  if(prop.startsWith('--'))role=/ink|text|muted|soft|wine|burgundy|sepia$/.test(prop)?'text':/paper|cream|surface|background/.test(prop)?'surface':/border|line/.test(prop)?'border':''
  if(!role)return
  const original=decl.value.replace(/^(white|black)$/i,c=>c.toLowerCase()==='white'?'#ffffff':'#000000')
  let next=original.replace(/#[a-f\d]{3,8}\b/gi,hex=>[4,5,7,9].includes(hex.length)?adapt(hex,role):hex)
  if(role==='surface'&&next==='var(--wine)')next='light-dark(var(--wine),#74283c)'
  if(next!==original){const fallback=decl.cloneBefore({value:decl.value});fallback.raws.croneviaTheme=true;decl.value=next;decl.raws.croneviaTheme=true}
 }}
}
