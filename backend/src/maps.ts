import {objectKinds} from './shared/map-config';

// Alohida xaritalar (masalan: Investitsiya xaritasi, Bosh reja, Metro va transport, Ijara):
// har biri o'z nomi, manzili (/map/<slug>), hududlar ko'rinishi, obyekt turlari va qatlamlar to'plamiga ega.
const txt=(x:any,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugify=(s:string)=>s.toLowerCase().replace(/[‘’ʻʼ'`]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const num=(x:any,lo:number,hi:number)=>{const v=Number(x);return Number.isFinite(v)&&v>=lo&&v<=hi?v:null};

export type MapResult={doc:any}|{error:string};
export function normalizeMap(input:any,existing?:any):MapResult{
  if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Xarita ma’lumoti noto‘g‘ri'};
  const pick=(k:string)=>input[k]!==undefined?input[k]:existing?.[k];
  const doc:any={};
  doc.title=txt(pick('title'),80);
  if(!doc.title)return {error:'Xarita nomini kiriting'};
  doc.slug=txt(pick('slug'),40).toLowerCase()||slugify(doc.title);
  if(!SLUG.test(doc.slug))return {error:'Manzil (slug) faqat kichik lotin harflari, raqam va chiziqchadan iborat bo‘lsin'};
  if(doc.slug==='main'&&existing&&existing.slug!=='main')return {error:'«main» manzili band'};
  doc.description=txt(pick('description'),300);
  doc.showPlots=pick('showPlots')!==false;
  const kinds=pick('objectKinds');
  doc.objectKinds=Array.isArray(kinds)?kinds.filter((k:any)=>(objectKinds as readonly string[]).includes(k)):[...objectKinds];
  const ids=pick('layerIds');
  doc.layerIds=Array.isArray(ids)?[...new Set<string>(ids.filter((x:any)=>typeof x==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(x)))].slice(0,100):[];
  doc.published=pick('published')===true;
  const order=Number(pick('order')??0);doc.order=Number.isFinite(order)?Math.round(order):0;
  const v=pick('view');
  if(v&&typeof v==='object'){const lng=num(v.lng,-180,180),lat=num(v.lat,-85,85),zoom=num(v.zoom,1,19);doc.view=lng!==null&&lat!==null&&zoom!==null?{lng,lat,zoom}:null}else doc.view=null;
  return {doc};
}
export const publicMap=(m:any)=>({id:m.id,slug:m.slug,title:m.title,description:m.description,showPlots:m.showPlots,objectKinds:m.objectKinds,layerIds:m.layerIds,view:m.view||null,order:m.order});
