import boundaryText from '@/data/philippines.geojson.json?raw'
import {validCoordinates} from '@/types/destination'
export const PH_BOUNDS: [[number,number],[number,number]] = [[116.7,4.4],[127.2,21.3]]
// Wide enough for fitBounds on a landscape canvas; membership uses country evidence, never this rectangle.
export const PH_NAVIGATION: [[number,number],[number,number]] = [[108,1],[136,24]]
export const OUTSIDE_PH = 'Philippine destinations are supported for now. Choose a place in the Philippines.'
type Ring = number[][]
const boundary=JSON.parse(boundaryText) as {features:{geometry:{type:string;coordinates:Ring[][]}}[]}
const polygons = boundary.features.flatMap(f => f.geometry.coordinates)
const indexed = polygons.map(rings => {let minX=180,maxX=-180,minY=90,maxY=-90;for(const p of rings[0]!){minX=Math.min(minX,p[0]!);maxX=Math.max(maxX,p[0]!);minY=Math.min(minY,p[1]!);maxY=Math.max(maxY,p[1]!)}return {rings,minX,maxX,minY,maxY}})
function inRing(x:number,y:number,ring:Ring) {
  let inside=false
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i]!,b=ring[j]!
    if((a[1]!>y)!==(b[1]!>y)&&x<(b[0]!-a[0]!)*(y-a[1]!)/(b[1]!-a[1]!)+a[0]!)inside=!inside
  }
  return inside
}
// Country evidence takes precedence; bounds alone NEVER establish country membership.
export function inPhilippines(latitude:number,longitude:number,countryCode?:string) {
  if(!validCoordinates(latitude,longitude))return false
  if(countryCode)return countryCode.toLowerCase()==='ph'
  return indexed.some(p=>longitude>=p.minX&&longitude<=p.maxX&&latitude>=p.minY&&latitude<=p.maxY&&inRing(longitude,latitude,p.rings[0]!)&&!p.rings.slice(1).some(r=>inRing(longitude,latitude,r)))
}
