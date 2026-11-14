export type Coord=[number,number];
export interface Geometry {type:string;coordinates:Coord[][]|Coord[][][]}
export interface Feature {geometry:Geometry;properties:{title?:string;layer?:string;anchor?:Coord;id?:string;[key:string]:unknown}}
export interface Collection {features:Feature[]}
export interface Site {id:string;name:string;en?:string;coord:Coord;kind:'seal'|'gate'|'battle'|'scroll'|'bead'|'lantern';priority:number;modern?:string;description?:string;quote?:string;year?:number;capital?:boolean}
export interface Dated {appear?:number;vanish?:number}
export function activeAt(item:Dated,year:number){return (item.appear==null||year>=item.appear)&&(item.vanish==null||year<item.vanish);}
export function polygons(g:Geometry):Coord[][][]{return g.type==='Polygon'?[g.coordinates as Coord[][]]:g.coordinates as Coord[][][];}
export function insideRing(p:Coord,ring:Coord[]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i]!,b=ring[j]!;if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function contains(g:Geometry,p:Coord){return polygons(g).some(r=>r[0]&&insideRing(p,r[0])&&!r.slice(1).some(h=>insideRing(p,h)));}
export function atPoint(data:Collection,p:Coord){return data.features.filter(f=>contains(f.geometry,p));}
export function distance(a:Coord,b:Coord){return Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])*Math.PI/360),a[1]-b[1])*111;}
export interface LabelInput {id:string;position:[number,number,number];priority:number;width:number}
export interface ScreenLabel {id:string;x:number;y:number;visible:boolean}
export function layoutLabels(items:LabelInput[],m:number[],width:number,height:number,limit:number,exclusions:{x:number;y:number;width:number;height:number}[]=[]):ScreenLabel[]{const boxes:{x:number;y:number;w:number}[]=[];return [...items].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)).map(item=>{const [x,y,z]=item.position,w=m[3]!*x+m[7]!*y+m[11]!*z+m[15]!,cx=(m[0]!*x+m[4]!*y+m[8]!*z+m[12]!)/w,cy=(m[1]!*x+m[5]!*y+m[9]!*z+m[13]!)/w,cz=(m[2]!*x+m[6]!*y+m[10]!*z+m[14]!)/w;const px=(cx+1)*width/2,py=(1-cy)*height/2;const visible=w>0&&cz>=-1&&cz<=1&&px>24&&px<width-24&&py>100&&py<height-120&&boxes.length<limit&&!exclusions.some(b=>px+item.width/2>b.x&&px-item.width/2<b.x+b.width&&py+(width<768?56:44)>b.y&&py+12<b.y+b.height)&&!boxes.some(b=>Math.abs(b.x-px)<(b.w+item.width)/2+8&&Math.abs(b.y-py)<(width<768?52:36));if(visible)boxes.push({x:px,y:py,w:item.width});return {id:item.id,x:px,y:py,visible};});}
