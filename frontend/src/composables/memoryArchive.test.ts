import {describe,it,expect} from 'vitest'
import {filterMemories,archiveState,type ArchiveState} from './memoryArchive'
import type {Memory} from '@/types'
const rows=[{id:'a',title:'By the sea',description:'A blue morning',memory_date:'2026-05-01',location_name:'Cebu',media:[{type:'image'}]},{id:'b',title:'Small things',description:'A letter',memory_date:'2026-06-01',media:[]}] as Memory[]
const state:ArchiveState={search:'',filter:'all',sort:'newest',archived:false,scroll:0}
describe('Memory archive',()=>{
 it('filters real media and place data without changing the stored order',()=>{expect(filterMemories(rows,{...state,filter:'photos'}).map(m=>m.id)).toEqual(['a']);expect(filterMemories(rows,{...state,filter:'words'}).map(m=>m.id)).toEqual(['b']);expect(filterMemories(rows,{...state,filter:'places'}).map(m=>m.id)).toEqual(['a']);expect(rows.map(m=>m.id)).toEqual(['a','b'])})
 it('searches title, description and place and provides honest empty results',()=>{expect(filterMemories(rows,{...state,search:'CEBU'})).toHaveLength(1);expect(filterMemories(rows,{...state,search:'letter'})).toHaveLength(1);expect(filterMemories(rows,{...state,search:'unknown'})).toHaveLength(0)})
 it('sorts chronologically or alphabetically',()=>{expect(filterMemories(rows,state)[0].id).toBe('b');expect(filterMemories(rows,{...state,sort:'oldest'})[0].id).toBe('a');expect(filterMemories(rows,{...state,sort:'title'})[0].id).toBe('a')})
 it('retains filters and scroll within an owner session without sharing between users',()=>{archiveState('alice').search='sea';archiveState('alice').scroll=300;expect(archiveState('alice').scroll).toBe(300);expect(archiveState('bob').search).toBe('')})
})
