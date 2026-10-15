import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import DestinationPicker from './DestinationPicker.vue'
const mocks=vi.hoisted(()=>({lookup:vi.fn(),gps:vi.fn(),events:{} as Record<string,Function>}))
vi.mock('@/services/places',()=>({lookupPlaces:mocks.lookup,locateOnce:mocks.gps,placeProvider:'Fixture'}))
vi.mock('maplibre-gl',()=>({default:{Map:class {addControl(){} on(name:string,fn:Function){mocks.events[name]=fn} jumpTo(){} remove(){}},NavigationControl:class {},Marker:class {setLngLat(){return this}addTo(){return this}on(){}remove(){}}}}))
let wrapper:VueWrapper<InstanceType<typeof DestinationPicker>>
beforeEach(()=>{
 vi.clearAllMocks(); mocks.events={}
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
 HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
 wrapper=mount(DestinationPicker,{attachTo:document.body,props:{destination:'Manila',location:{},onChange:(name:string,location:any)=>wrapper.setProps({destination:name,location})}})
})
afterEach(()=>{wrapper.unmount();document.body.innerHTML=''})
const click=async(text:string)=>{await wrapper.findAll('button').find(b=>b.text()===text)!.trigger('click');await flushPromises()}
const dialog=()=>document.querySelector('dialog')!
async function dialogClick(text:string){(Array.from(dialog().querySelectorAll('button')).find(b=>b.textContent===text) as HTMLButtonElement).click();await flushPromises()}
async function field(name:string,value:string){const input=Array.from(dialog().querySelectorAll('label')).find(l=>l.textContent===name)!.querySelector('input')!;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));await flushPromises()}
it('selects a result; manual edits clear its coordinates; remove keeps the name',async()=>{
 mocks.lookup.mockResolvedValue([{name:'Manila, Philippines',latitude:14.6,longitude:120.98}])
 await click('Search');await click('Manila, Philippines')
 expect(wrapper.props('location')).toMatchObject({destination_latitude:14.6,destination_source:'search'})
 await click('Remove pin');expect(wrapper.props('destination')).toBe('Manila, Philippines');expect(wrapper.props('location').destination_latitude).toBeNull()
 await click('Search');await click('Manila, Philippines');await wrapper.get('input').setValue('Tokyo')
 expect(wrapper.props('location').destination_longitude).toBeNull()
})
it('ignores stale search responses after an edit',async()=>{
 let resolve:any;mocks.lookup.mockImplementation(()=>new Promise(r=>{resolve=r}))
 await click('Search');await wrapper.get('input').setValue('Tokyo');resolve([{name:'Old Manila',latitude:1,longitude:2}]);await flushPromises()
 expect(wrapper.text()).not.toContain('Old Manila');expect(wrapper.props('destination')).toBe('Tokyo')
})
it('retains text after lookup failure and allows retry/no results',async()=>{
 mocks.lookup.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
 await click('Search');expect(wrapper.text()).toContain('unavailable');expect(wrapper.props('destination')).toBe('Manila')
 await click('Search');expect(wrapper.text()).toContain('No places found')
})
it('keeps map edits draft until confirmation and preserves the old pin on cancel',async()=>{
 await wrapper.setProps({location:{destination_latitude:14,destination_longitude:120,destination_source:'search'}})
 await click('Choose on map');await field('Latitude','35');await field('Longitude','139');await field('Place label','Tokyo');await dialogClick('Cancel')
 expect(wrapper.props('destination')).toBe('Manila');expect(wrapper.props('location').destination_latitude).toBe(14)
 await click('Choose on map');mocks.events.click({lngLat:{lat:35,lng:139}});await field('Place label','Tokyo');await dialogClick('Use this location')
 expect(wrapper.props('location')).toMatchObject({destination_latitude:35,destination_longitude:139,destination_source:'map'})
})
it('keeps GPS coordinates after reverse lookup failure and requires confirmation',async()=>{
 mocks.gps.mockResolvedValue({coords:{latitude:14.6,longitude:120.98,accuracy:45}});mocks.lookup.mockRejectedValue(new Error('offline'))
 await click('Use my current location');expect(dialog().textContent).toContain('coordinates are kept');expect(dialog().textContent).toContain('45 metres');expect(wrapper.props('location')).toEqual({})
 await field('Place label','A starting point');await dialogClick('Use this location');expect(wrapper.props('location').destination_source).toBe('gps')
})
it('ignores GPS callback after close',async()=>{
 let resolve:any;mocks.gps.mockImplementation(()=>new Promise(r=>{resolve=r}))
 await click('Use my current location');await dialogClick('Cancel');resolve({coords:{latitude:1,longitude:2,accuracy:10}});await flushPromises()
 expect(wrapper.props('location')).toEqual({});expect(mocks.lookup).not.toHaveBeenCalled()
})
