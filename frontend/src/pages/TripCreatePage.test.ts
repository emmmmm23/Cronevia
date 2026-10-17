// @vitest-environment jsdom
import {mount,flushPromises} from '@vue/test-utils'
import {beforeEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({post:vi.fn(),put:vi.fn(),get:vi.fn(),replace:vi.fn()}))
vi.mock('@/services/api.service',()=>({default:{post:mocks.post,put:mocks.put,get:mocks.get}}))
vi.mock('vue-router',()=>({useRoute:()=>({params:{}}),useRouter:()=>({replace:mocks.replace}),onBeforeRouteLeave:vi.fn(),RouterLink:{template:'<a><slot /></a>'}}))
vi.mock('@/composables/useEditingViewport',()=>({useEditingViewport:vi.fn()}))
vi.mock('@/stores/auth',()=>({useAuthStore:()=>({login:vi.fn()})}))
import TripCreatePage from './TripCreatePage.vue'
beforeEach(()=>{vi.resetAllMocks();mocks.post.mockResolvedValue({data:{data:{id:'confirmed-id',title:'A first trip'}}});mocks.replace.mockResolvedValue(undefined)})
const mountPage=()=>mount(TripCreatePage,{global:{stubs:{AppSheet:{template:'<div><slot /></div>'},TripBasicsForm:true,SignInAgain:true}}})
it('retries navigation with the confirmed ID without another create',async()=>{
 const wrapper=mountPage();mocks.replace.mockRejectedValueOnce(new Error('Chunk unavailable'))
 await wrapper.get('input').setValue('  A first trip  ');await wrapper.get('form').trigger('submit');await flushPromises()
 expect(wrapper.get('[role="alert"]').text()).toContain('Your trip is saved')
 expect(wrapper.get('input').element.value).toBe('  A first trip  ')
 await wrapper.get('form').trigger('submit');await flushPromises()
 expect(mocks.post).toHaveBeenCalledOnce();expect(mocks.post.mock.calls[0][1].title).toBe('A first trip');expect(mocks.replace).toHaveBeenNthCalledWith(2,'/trips/confirmed-id');wrapper.unmount()
})
it('keeps one draft ID for uncertain saves and blocks simultaneous submits',async()=>{
 let reject!:(e:Error)=>void;mocks.post.mockReturnValueOnce(new Promise((_resolve,r)=>{reject=r}))
 const wrapper=mountPage();await wrapper.get('input').setValue('A first trip');await wrapper.get('form').trigger('submit');await wrapper.get('form').trigger('submit')
 expect(mocks.post).toHaveBeenCalledOnce();const key=mocks.post.mock.calls[0][1].draft_key
 reject(new Error('Lost response'));await flushPromises();expect(wrapper.get('[role="alert"]').text()).toContain('Your details are still here')
 await wrapper.get('form').trigger('submit');await flushPromises();expect(mocks.post.mock.calls[1][1].draft_key).toBe(key);wrapper.unmount()
})
it('does not create on a blank trimmed name',async()=>{
 const wrapper=mountPage();await wrapper.get('input').setValue('   ');await wrapper.get('form').trigger('submit');await flushPromises();expect(mocks.post).not.toHaveBeenCalled();wrapper.unmount()
})
