import { describe, expect, it } from 'vitest'
import { constrainElement, emptyLayout, validateScrapbook, type ScrapbookElement } from './scrapbook'
const element = (): ScrapbookElement => ({ id:'placement',type:'photo',assetId:'33333333-3333-4333-8333-333333333333',x:.5,y:.5,width:.3,aspectRatio:1.5,rotation:-8,zIndex:0,frame:'polaroid' })
describe('shared notebook geometry and validation', () => {
  it('round trips photo and sticker metadata on separate pages', () => {
    const layout=emptyLayout();layout.pages[0].elements.push(element());layout.pages[1].elements.push({...element(),id:'sticker',type:'sticker',assetId:'builtin-heart-01.svg',frame:'plain'})
    expect(validateScrapbook(JSON.parse(JSON.stringify(layout)))).toEqual(layout)
  })
  it.each([{x:NaN},{y:Infinity},{width:0},{rotation:181},{aspectRatio:0},{zIndex:1.2},{assetId:'blob:preview'},{assetId:'https://signed-url.test/image'},{assetId:'pending:upload'},{frame:'unknown'}])('rejects invalid or unresolved values %j', invalid => {
    const layout=emptyLayout();layout.pages[0].elements.push({...element(),...invalid} as ScrapbookElement)
    expect(()=>validateScrapbook(layout)).toThrow()
  })
  it('keeps rotated corners inside the sheet, including portrait photos',()=>{
    for(const rotation of [-180,-130,-90,-45,0,30,90,179]) for(const aspectRatio of [.1,.6,1,1.5,10]) {
      const e=constrainElement({...element(),rotation,aspectRatio,x:-1,y:2,width:.8})
      const w=e.width*600,h=w/e.aspectRatio,a=rotation*Math.PI/180
      const rx=(Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*h)/2
      const ry=(Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*h)/2
      expect(e.x*600-rx).toBeGreaterThanOrEqual(-1e-9);expect(e.x*600+rx).toBeLessThanOrEqual(600+1e-9)
      expect(e.y*800-ry).toBeGreaterThanOrEqual(-1e-9);expect(e.y*800+ry).toBeLessThanOrEqual(800+1e-9)
    }
  })
})
