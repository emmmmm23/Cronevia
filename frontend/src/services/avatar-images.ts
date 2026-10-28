import {cropGeometry,type AvatarCrop} from '@/types/avatar'
const maxBytes=5*1024*1024,maxPixels=32000000
/** Inspect the declared raster format and dimensions before asking a decoder to allocate. */
export function inspectAvatarImage(bytes:Uint8Array,mime:string){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end))
 let width=0,height=0,kind=''
 if(bytes.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&text(12,16)==='IHDR'){
  kind='image/png';width=view.getUint32(16);height=view.getUint32(20)
 }else if(bytes.length>=12&&bytes[0]===255&&bytes[1]===216){
  kind='image/jpeg';let offset=2
  while(offset+4<bytes.length){
   if(bytes[offset]!==255)throw new Error('This JPEG is damaged. Choose a different photo.')
   while(bytes[offset]===255)offset++
   const marker=bytes[offset++]
   if(marker===217||marker===218)break
   if(marker===1||(marker>=208&&marker<=215))continue
   if(offset+2>bytes.length)break
   const length=view.getUint16(offset)
   if(length<2||offset+length>bytes.length)break
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=8){height=view.getUint16(offset+3);width=view.getUint16(offset+5);break}
   offset+=length
  }
 }else if(bytes.length>=30&&text(0,4)==='RIFF'&&text(8,12)==='WEBP'){
  kind='image/webp';const type=text(12,16)
  if(type==='VP8X'){width=1+bytes[24]+bytes[25]*256+bytes[26]*65536;height=1+bytes[27]+bytes[28]*256+bytes[29]*65536}
  else if(type==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42){width=view.getUint16(26,true)&16383;height=view.getUint16(28,true)&16383}
  else if(type==='VP8L'&&bytes[20]===47){const bits=view.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1}
 }
 if(!kind||kind!==mime)throw new Error('Choose a genuine JPEG, PNG, or WebP image. Renaming a file does not change its format.')
 if(width<64||height<64)throw new Error('Choose an image at least 64 × 64 pixels.')
 if(width>8192||height>8192||width*height>maxPixels)throw new Error('This image is too large to edit safely. Use up to 8192 pixels per side and 32 megapixels.')
 return {width,height,kind}
}
export function canvasBlob(canvas:HTMLCanvasElement,quality=.88):Promise<Blob>{
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('This photo could not be prepared. Please retry.')),'image/webp',quality))
}
export async function decodeAvatar(blob:Blob):Promise<ImageBitmap|HTMLImageElement>{
 if(typeof createImageBitmap==='function')return createImageBitmap(blob,{imageOrientation:'from-image'})
 const url=URL.createObjectURL(blob),image=new Image()
 try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('This image could not be decoded. Choose a different photo.'));image.src=url});return image}
 finally{URL.revokeObjectURL(url)}
}
export async function prepareAvatarSource(file:Blob){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPEG, PNG, or WebP. GIF, SVG, and HEIC are not supported; export them as PNG or JPEG first.')
 if(file.size>maxBytes)throw new Error('Choose a photo under 5 MB.')
 inspectAvatarImage(new Uint8Array(await file.arrayBuffer()),file.type)
 const image=await decodeAvatar(file)
 try{
  const width=image.width,height=image.height
  if(!width||!height||width*height>maxPixels)throw new Error('This image could not be decoded safely.')
  const canvas=document.createElement('canvas'),scale=Math.min(1,2048/Math.max(width,height))
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale)
  canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height)
  let blob=await canvasBlob(canvas)
  // Browsers without WebP export fall back to PNG; reduce oversized PNG sources.
  while(blob.size>2*1024*1024&&Math.max(canvas.width,canvas.height)>256){
   const next=document.createElement('canvas');next.width=Math.round(canvas.width*.8);next.height=Math.round(canvas.height*.8)
   next.getContext('2d')!.drawImage(canvas,0,0,next.width,next.height);canvas.width=next.width;canvas.height=next.height;canvas.getContext('2d')!.drawImage(next,0,0);blob=await canvasBlob(canvas)
  }
  if(blob.size>2*1024*1024)throw new Error('The optimized image is still too large. Choose a smaller photo.')
  return {canvas,blob}
 }finally{if('close'in image)image.close()}
}
export function renderAvatar(source:CanvasImageSource&{width:number;height:number},crop:AvatarCrop,size=512){
 const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size
 const ctx=canvas.getContext('2d')!,g=cropGeometry(source.width,source.height,crop,size)
 ctx.translate(size/2+g.offsetX,size/2+g.offsetY);ctx.rotate(crop.rotation*Math.PI/180)
 ctx.imageSmoothingQuality='high';ctx.drawImage(source,-source.width*g.scale/2,-source.height*g.scale/2,source.width*g.scale,source.height*g.scale)
 return canvas
}
