// Anonymous probes must not require public access to private planner data.
// A denial establishes resolution, not authenticated permissions or RLS behavior.
export function plannerProbeResult(status, data) {
  if (status >= 200 && status < 300) return 'resolved'
  if ([401, 403].includes(status) && ['42501', '28000'].includes(data?.code)) return 'protected'
  return 'failed'
}
