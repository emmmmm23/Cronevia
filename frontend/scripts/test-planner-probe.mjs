import {test} from 'node:test'
import assert from 'node:assert/strict'
import {plannerProbeResult} from './planner-probe-result.mjs'

test('protected tables and functions do not require anonymous grants', () => {
  for (const message of ['permission denied for table trips', 'permission denied for table itinerary_items', 'permission denied for function create_trip_draft']) {
    assert.equal(plannerProbeResult(401, {code:'42501', message}), 'protected')
  }
  assert.equal(plannerProbeResult(403, {code:'42501'}), 'protected')
  assert.equal(plannerProbeResult(401, {code:'28000'}), 'protected')
  assert.equal(plannerProbeResult(200, []), 'resolved')
})

test('missing schema, invalid credentials and server failures still fail the release check', () => {
  for (const [status, data] of [
    [404, {code:'PGRST202'}],
    [400, {code:'42703'}],
    [401, {message:'Invalid API key'}],
    [401, {code:'PGRST301'}],
    [403, {}],
    [500, {code:'42501'}],
    [503, null],
  ]) assert.equal(plannerProbeResult(status, data), 'failed')
})
