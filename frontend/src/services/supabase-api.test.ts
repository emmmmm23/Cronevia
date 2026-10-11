// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: mocks.getUser }, from: mocks.from } }))
import api, { preparePayload } from './supabase-api'
beforeEach(() => vi.clearAllMocks())
describe('Supabase data boundary', () => {
  it('rejects unauthenticated writes before any database call', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(api.post('/journal', { title: 'Private', content: 'Entry' })).rejects.toMatchObject({ response: { status: 401 } })
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('does not accept caller ownership or server timestamps', () => {
    expect(preparePayload('journal_entries', { id: 'forged', user_id: 'another-user', created_at: '1999-01-01', deleted_at: '2000-01-01', title: 'My entry', mood_label: 'Happy', tags: ['travel'] })).toEqual({ title: 'My entry', mood_name: 'Happy', tags: ['travel'] })
  })
  it('turns network failures into visible service errors', async () => {
    mocks.getUser.mockRejectedValue(new Error('Connection unavailable'))
    await expect(api.get('/trips')).rejects.toMatchObject({ response: { status: 503, data: { message: 'Connection unavailable' } } })
  })
})
