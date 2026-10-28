import {describe,it,expect} from 'vitest'
import {defaultAppearance,defaultFrame,framePresets,normalizeAppearance,cropGeometry,initials,avatarPath} from './avatar'
import {inspectAvatarImage} from '@/services/avatar-images'
describe('avatar appearance and raster boundaries',()=>{
 it('normalizes only local presets, colors and bounded geometry',()=>{
  expect(new Set(framePresets.map(p=>p.id)).size).toBe(13)
  for(const p of framePresets)expect(normalizeAppearance({version:1,frame:defaultFrame(p.id)}).frame.preset).toBe(p.id)
  const a=normalizeAppearance({version:1,frame:{preset:'<svg>',primary:'url(evil)',thickness:100,gap:-1},crop:{zoom:100,x:4,y:-4,rotation:45}})
  expect(a.frame).toEqual({...defaultFrame(),thickness:8,gap:0});expect(a.crop).toEqual({zoom:4,x:1,y:-1,rotation:0})
  expect(normalizeAppearance({version:2})).toEqual(defaultAppearance())
 })
 it('covers the crop while preserving normalized offsets through rotation and size changes',()=>{
  const c={zoom:2,x:1,y:-1,rotation:90 as const},g=cropGeometry(600,400,c,512),small=cropGeometry(600,400,c,128)
  expect(g.excessX).toBe(512);expect(g.excessY).toBe(1024);expect(g.offsetX).toBe(256);expect(g.offsetY).toBe(-512)
  expect(g.scale).toBe(small.scale*4);expect(g.offsetX).toBe(small.offsetX*4)
 })
 it('keeps Unicode initials and rejects URLs/traversal as stored object references',()=>{
  expect(initials('  José Miguel ')).toBe('JM');expect(initials('')).toBe('C')
  expect(avatarPath('11111111-1111-4111-8111-111111111111/avatars/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar.webp')).toBe(true)
  for(const p of ['https://example.test/image.png','../avatar.png','uid/source.svg'])expect(avatarPath(p)).toBe(false)
 })
 const png=(w:number,h:number)=>{const b=new Uint8Array(24);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);new DataView(b.buffer).setUint32(16,w);new DataView(b.buffer).setUint32(20,h);return b}
 it('rejects renamed formats, tiny images and decompression-sized headers before decoding',()=>{
  expect(inspectAvatarImage(png(100,100),'image/png').width).toBe(100)
  expect(()=>inspectAvatarImage(png(100,100),'image/jpeg')).toThrow('genuine')
  expect(()=>inspectAvatarImage(png(10,10),'image/png')).toThrow('64')
  expect(()=>inspectAvatarImage(png(8192,8192),'image/png')).toThrow('32 megapixels')
  expect(()=>inspectAvatarImage(new TextEncoder().encode('<svg/>'),'image/png')).toThrow('genuine')
 })
})
