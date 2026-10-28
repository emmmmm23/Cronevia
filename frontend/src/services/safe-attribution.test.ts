import {describe,it,expect} from 'vitest'
import {safeAttribution} from './safe-attribution'
describe('map attribution boundary',()=>{
 it('removes adjacent event attributes and active content while retaining provider credits',()=>{
  const html=safeAttribution('<details open onload="alert(1)" ontoggle="alert(2)">Credit <a href="https://example.com/credits" onclick="alert(3)">Provider</a><img src=x onerror=alert(4)><svg onload=alert(5)></svg></details>')
  expect(html).not.toMatch(/onload|ontoggle|onclick|onerror|<details|<img|<svg/)
  expect(html).toContain('Credit ');expect(html).toContain('https://example.com/credits');expect(html).toContain('Provider')
 })
 it('turns javascript, data and credential-bearing links into plain text',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hi','https://name:password@example.com/'])expect(safeAttribution('<a href="'+url+'">Credit</a>')).toBe('Credit')
 })
})
