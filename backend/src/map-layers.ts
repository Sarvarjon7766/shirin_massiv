import {cleanGeometry} from './plots';

// Xarita qatlamlari (zonalar, infratuzilma, metro va h.k.): kontent menejer GeoJSON yuklaydi va ko'rinishini sozlaydi.
const txt=(x:any,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';
const round=(x:number)=>Math.round(x*1e6)/1e6;
const link=(x:any)=>{const v=txt(x,300);return v&&((v.startsWith('/')&&!v.startsWith('//')&&!v.startsWith('/\\'))||/^https:\/\/[^\s]+$/.test(v))?v:''};
const hex=(x:any)=>typeof x==='string'&&/^#[0-9a-fA-F]{6}$/.test(x)?x.toLowerCase():'';
const propName=(x:any)=>{const v=txt(x,40);return /^[\p{L}\p{N}_ .-]{0,40}$/u.test(v)?v:null};
export const LAYER_TYPES=['fill','line','point','image'] as const;
export const POINT_STYLES=['dot','chip'] as const;
export const LAYER_PLACEMENTS=['panel','toolbar'] as const;
const MAX_FEATURES=5000,MAX_VERTICES=300000,MAX_BYTES=6*1024*1024;

function pos(p:any):number[]|null{
  if(!Array.isArray(p)||p.length<2)return null;
  const lon=Number(p[0]),lat=Number(p[1]);
  return Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=85?[round(lon),round(lat)]:null;
}
function line(c:any,min:number):number[][]|null{
  if(!Array.isArray(c)||c.length<min)return null;
  const out:number[][]=[];for(const p of c){const q=pos(p);if(!q)return null;out.push(q)}return out;
}
// Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon; boshqasi rad etiladi
export function cleanAnyGeometry(g:any):{geometry:any;vertices:number}|null{
  if(!g||typeof g!=='object')return null;
  let vertices=0;
  switch(g.type){
    case 'Point':{const p=pos(g.coordinates);return p?{geometry:{type:'Point',coordinates:p},vertices:1}:null}
    case 'MultiPoint':{const l=line(g.coordinates,1);return l&&l.length<=5000?{geometry:{type:'MultiPoint',coordinates:l},vertices:l.length}:null}
    case 'LineString':{const l=line(g.coordinates,2);return l?{geometry:{type:'LineString',coordinates:l},vertices:l.length}:null}
    case 'MultiLineString':{
      if(!Array.isArray(g.coordinates)||!g.coordinates.length||g.coordinates.length>2000)return null;
      const parts=g.coordinates.map((c:any)=>line(c,2));if(parts.some((p:any)=>!p))return null;
      vertices=parts.reduce((s:number,p:any)=>s+p.length,0);return {geometry:{type:'MultiLineString',coordinates:parts},vertices};
    }
    case 'Polygon':case 'MultiPolygon':{
      const geometry=cleanGeometry(g);if(!geometry)return null;
      const count=(c:any):number=>typeof c[0]==='number'?1:c.reduce((s:number,x:any)=>s+count(x),0);
      return {geometry,vertices:count(geometry.coordinates)};
    }
    default:return null;
  }
}
function cleanProps(p:any){
  const out:Record<string,string|number|boolean>={};
  if(!p||typeof p!=='object'||Array.isArray(p))return out;
  let n=0;
  for(const [k,v] of Object.entries(p)){
    if(n>=20)break;
    const key=propName(k);if(!key)continue;
    if(typeof v==='string')out[key]=v.slice(0,200);
    else if(typeof v==='number'&&Number.isFinite(v))out[key]=v;
    else if(typeof v==='boolean')out[key]=v;
    else continue;
    n++;
  }
  return out;
}

export type LayerResult={doc:any}|{error:string};
// input.features berilsa almashtiriladi; berilmasa mavjud (existing) saqlanadi
export function normalizeLayer(input:any,existing?:any):LayerResult{
  if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Qatlam ma’lumoti noto‘g‘ri'};
  const pick=(k:string)=>input[k]!==undefined?input[k]:existing?.[k];
  const doc:any={};
  doc.title=txt(pick('title'),120);
  if(!doc.title)return {error:'Qatlam nomini kiriting'};
  doc.description=txt(pick('description'),300);
  doc.color=hex(pick('color'))||'#1683ff';
  const opacity=Number(pick('opacity')??0.5);
  doc.opacity=Number.isFinite(opacity)?Math.min(1,Math.max(0.05,opacity)):0.5;
  const type=pick('type')??'fill';
  if(!LAYER_TYPES.includes(type))return {error:'Qatlam turi noto‘g‘ri'};
  doc.type=type;
  const placement=pick('placement')??'panel';
  if(!LAYER_PLACEMENTS.includes(placement))return {error:'Joylashuv noto‘g‘ri'};
  doc.placement=placement;
  const pointStyle=pick('pointStyle')??'dot';
  if(!POINT_STYLES.includes(pointStyle))return {error:'Nuqta ko‘rinishi noto‘g‘ri'};
  doc.pointStyle=pointStyle;
  doc.linkLabel=txt(pick('linkLabel'),60);doc.linkUrl=link(pick('linkUrl'));
  doc.defaultOn=pick('defaultOn')===true;
  doc.published=pick('published')===true;
  const label=propName(pick('labelProperty')??''),group=propName(pick('groupProperty')??'');
  if(label===null||group===null)return {error:'Maydon nomi noto‘g‘ri (harf, raqam, bo‘shliq, . _ -)'};
  doc.labelProperty=label;doc.groupProperty=group;
  const order=Number(pick('order')??0);doc.order=Number.isFinite(order)?Math.round(order):0;

  if(type==='image'){
    // Reja rasmi (generplan): o'zimizning yuklangan fayl + 4 burchak koordinatasi (chap-yuqori, o'ng-yuqori, o'ng-past, chap-past)
    const url=txt(pick('imageUrl'),120);
    if(!/^\/api\/files\/[A-Za-z0-9-]{8,64}$/.test(url))return {error:'Rasm havolasi noto‘g‘ri (avval faylni yuklang)'};
    const c=pick('corners');
    if(!Array.isArray(c)||c.length!==4)return {error:'Rasmning 4 ta burchagi kerak'};
    const corners=c.map(pos);
    if(corners.some(x=>!x))return {error:'Burchak koordinatalari noto‘g‘ri'};
    doc.imageUrl=url;doc.corners=corners;doc.features=[];doc.featureCount=0;doc.propertyKeys=[];doc.groups=[];
    doc.labelProperty='';doc.groupProperty='';
    return {doc};
  }
  if(input.features!==undefined){
    const raw=input.features;
    if(!Array.isArray(raw)||!raw.length)return {error:'GeoJSON da obyekt yo‘q'};
    if(raw.length>MAX_FEATURES)return {error:`Qatlamda ${MAX_FEATURES} tadan ko‘p obyekt bo‘lmasin`};
    const features:any[]=[];let vertices=0;
    for(let i=0;i<raw.length;i++){
      const f=raw[i],g=cleanAnyGeometry(f?.geometry);
      if(!g)return {error:`#${i+1}-obyekt geometriyasi noto‘g‘ri (Point, LineString, Polygon va ularning Multi turlari, longitude/latitude)`};
      vertices+=g.vertices;
      if(vertices>MAX_VERTICES)return {error:'Qatlam juda murakkab (nuqtalar soni oshib ketdi)'};
      features.push({type:'Feature',geometry:g.geometry,properties:cleanProps(f.properties)});
    }
    if(JSON.stringify(features).length>MAX_BYTES)return {error:'Qatlam hajmi juda katta (6 MB dan oshmasin)'};
    doc.features=features;
  }else if(existing?.features)doc.features=existing.features;
  else return {error:'GeoJSON fayl kerak'};

  const keys=new Set<string>(),groups=new Set<string>();
  for(const f of doc.features){for(const k of Object.keys(f.properties))keys.add(k);if(doc.groupProperty&&f.properties[doc.groupProperty]!==undefined&&groups.size<40)groups.add(String(f.properties[doc.groupProperty]))}
  doc.featureCount=doc.features.length;
  doc.propertyKeys=[...keys].slice(0,40);
  doc.groups=[...groups].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  return {doc};
}
export const layerMeta=(l:any)=>{const {features,...rest}=l;return rest};
export const publicLayerMeta=(l:any)=>({pointStyle:l.pointStyle||'dot',linkLabel:l.linkLabel||'',linkUrl:l.linkUrl||'',imageUrl:l.imageUrl||'',corners:l.corners||null,id:l.id,title:l.title,description:l.description,color:l.color,opacity:l.opacity,type:l.type,placement:l.placement,defaultOn:l.defaultOn,labelProperty:l.labelProperty,groupProperty:l.groupProperty,groups:l.groups,featureCount:l.featureCount,order:l.order,updated:l.updated});
