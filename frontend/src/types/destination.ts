export type DestinationSource = 'search' | 'map' | 'gps'
export interface DestinationFields {
  destination_latitude?: number | null
  destination_longitude?: number | null
  destination_source?: DestinationSource | null
}
export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180
}
export function destinationFields(value: DestinationFields): Required<DestinationFields> {
  const lat = value.destination_latitude ?? null, lng = value.destination_longitude ?? null
  const source = value.destination_source ?? null
  if (lat === null && lng === null && source === null) return { destination_latitude: null, destination_longitude: null, destination_source: null }
  if (!validCoordinates(lat, lng) || !['search', 'map', 'gps'].includes(source || '')) throw new Error('Choose a valid destination pin or remove it.')
  return { destination_latitude: lat, destination_longitude: lng, destination_source: source }
}
