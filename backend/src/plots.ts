import {plotStatuses,plotCategories,classifyPlot,type PlotStatus} from './shared/plot-model';
import {safeAssetUrl} from './shared/site-config';

const txt=(x:any,n:number)=>typeof x==='string'?x.trim().slice(0,n):typeof x==='number'&&Number.isFinite(x)?String(x).slice(0,n):'';
const num=(x:any)=>{if(typeof x==='number')return Number.isFinite(x)?x:NaN;if(typeof x!=='string')return NaN;const m=x.replace(',', '.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN};
const round=(x:number,d:number)=>Math.round(x*10**d)/10**d;
const isoDate=(x:any)=>{if(typeof x!=='string'||!x)return '';const t=Date.parse(x);return Number.isFinite(t)?new Date(t).toISOString():''};
const CAT_KEY=/^[a-z0-9-]{2,30}$/;

// ---------- Geometriya ----------
const MAX_VERTICES=20000;
function cleanRing(ring:any):number[][]|null{
  if(!Array.isArray(ring)||ring.length<3)return null;
  const out:number[][]=[];
  for(const p of ring){
    if(!Array.isArray(p)||p.length<2)return null;
    const lon=Number(p[0]),lat=Number(p[1]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>85)return null;
    out.push([round(lon,6),round(lat,6)]);
  }
  const a=out[0],b=out[out.length-1];
  if(a[0]!==b[0]||a[1]!==b[1])out.push([a[0],a[1]]);
  return out.length>=4?out:null;
}
// Polygon yoki MultiPolygon (Feature ham bo'lishi mumkin); balandlik (3-koordinata) olib tashlanadi.
export function cleanGeometry(raw:any):any|null{
  try{
    const parsed=typeof raw==='string'?JSON.parse(raw):raw;
    const g=parsed?.type==='Feature'?parsed.geometry:parsed;
    if(!g||!Array.isArray(g.coordinates))return null;
    let vertices=0;
    const polygon=(rings:any)=>{
      if(!Array.isArray(rings)||!rings.length)return null;
      const cleaned=rings.map(cleanRing);
      if(cleaned.some(r=>!r))return null;
      vertices+=cleaned.reduce((s,r)=>s+r!.length,0);
      return cleaned as number[][][];
    };
    let result:any=null;
    if(g.type==='Polygon'){const p=polygon(g.coordinates);if(p)result={type:'Polygon',coordinates:p}}
    else if(g.type==='MultiPolygon'&&g.coordinates.length&&g.coordinates.length<=200){
      const parts=g.coordinates.map(polygon);
      if(parts.every(Boolean))result={type:'MultiPolygon',coordinates:parts};
    }
    return result&&vertices<=MAX_VERTICES?result:null;
  }catch{return null}
}
export function geometryBounds(g:any):[number,number,number,number]{
  let w=180,s=90,e=-180,n=-90;
  const visit=(c:any)=>{if(typeof c[0]==='number'){w=Math.min(w,c[0]);e=Math.max(e,c[0]);s=Math.min(s,c[1]);n=Math.max(n,c[1])}else c.forEach(visit)};
  visit(g.coordinates);
  return [w,s,e,n];
}

// ---------- Auksion ----------
function cleanPrice(p:any){
  if(!p||typeof p!=='object')return null;
  const amount=typeof p.amount==='number'?p.amount.toFixed(2):typeof p.amount==='string'?p.amount.trim():'';
  const normalized=/^\d{1,13}$/.test(amount)?amount+'.00':amount;
  if(!/^\d{1,13}\.\d{2}$/.test(normalized)||!['UZS','USD','EUR'].includes(p.currency))return null;
  return {amount:normalized,currency:p.currency};
}
function cleanAuction(a:any):{value:any}|{error:string}{
  if(a===undefined||a===null||a==='')return {value:null};
  if(typeof a!=='object'||Array.isArray(a))return {error:'Auksion ma’lumoti noto‘g‘ri'};
  const out:any={};
  if(a.lotId!==undefined&&a.lotId!==''){const id=txt(a.lotId,40);if(!/^[0-9A-Za-z_-]{1,40}$/.test(id))return {error:'Auksion lot raqami noto‘g‘ri'};out.lotId=id}
  out.name=txt(a.name,200);
  for(const k of ['startsAt','applicationDeadline']){if(a[k]){const d=isoDate(a[k]);if(!d)return {error:'Auksion sanasi noto‘g‘ri'};out[k]=d}}
  if(a.url){const u=safeAssetUrl(a.url);if(!u||!/^https:\/\//.test(u))return {error:'Auksion havolasi HTTPS bo‘lishi kerak'};out.url=u}
  if(a.startPrice){const p=cleanPrice(a.startPrice);if(!p)return {error:'Boshlang‘ich narx noto‘g‘ri'};out.startPrice=p}
  if(a.result){
    const winner=txt(a.result.winner,240);
    if(!winner)return {error:'Natija uchun g‘olib nomini kiriting'};
    const result:any={winner};
    if(a.result.winningPrice){const p=cleanPrice(a.result.winningPrice);if(!p)return {error:'Yakuniy narx noto‘g‘ri'};result.winningPrice=p}
    if(a.result.document){const u=safeAssetUrl(a.result.document);if(!u)return {error:'Natija hujjati havolasi noto‘g‘ri'};result.document=u}
    out.result=result;
  }
  return {value:Object.keys(out).some(k=>k!=='name')||out.name?out:null};
}

// ---------- Hudud ----------
export type PlotResult={doc:any}|{error:string};
// input: mijoz yuborgan maydonlar; existing: mavjud hujjat (PATCH uchun) — berilmagan maydonlar saqlanadi.
export function normalizePlot(input:any,existing?:any,extraStatuses:string[]=[]):PlotResult{
  if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Hudud ma’lumoti noto‘g‘ri'};
  const pick=(k:string)=>input[k]!==undefined?input[k]:existing?.[k];
  const doc:any={};
  doc.lotNumber=txt(pick('lotNumber'),40);
  doc.function=txt(pick('function'),160);
  doc.title=txt(pick('title'),160)||doc.function;
  if(!doc.title)return {error:'Hudud nomi yoki vazifasini kiriting'};
  doc.functionSecondary=txt(pick('functionSecondary'),160);
  doc.description=txt(pick('description'),2000);
  doc.company=txt(pick('company'),200);
  const status=pick('statusKey')||'unknown';
  if(!plotStatuses.includes(status)&&!extraStatuses.includes(status))return {error:'Hudud holati noto‘g‘ri'};
  doc.statusKey=status as PlotStatus;
  const numeric:[string,number,number][]=[['areaHa',0,100000],['areaM2',0,1e9],['buildingAreaM2',0,1e9],['grossAreaM2',0,1e10],['openAreaM2',0,1e9],['floorsMin',0,300],['floorsMax',0,300],['kmn',0,1000],['umn',0,1000],['functionShare',0,100]];
  for(const [k,lo,hi] of numeric){
    const raw=pick(k);
    if(raw===undefined||raw===null||raw===''){doc[k]=0;continue}
    const v=num(raw);
    if(!Number.isFinite(v)||v<lo||v>hi)return {error:`“${k}” qiymati noto‘g‘ri`};
    doc[k]=round(v,4);
  }
  if(!doc.areaHa&&doc.areaM2)doc.areaHa=round(doc.areaM2/10000,4);
  if(!doc.areaM2&&doc.areaHa)doc.areaM2=Math.round(doc.areaHa*10000);
  if(doc.floorsMax&&doc.floorsMin>doc.floorsMax)return {error:'Qavatlar oralig‘i noto‘g‘ri'};
  const categories=pick('categories');
  doc.categories=Array.isArray(categories)&&categories.length
    ?[...new Set<string>(categories.filter((c:any)=>typeof c==='string'&&CAT_KEY.test(c)))].slice(0,10)
    :classifyPlot(doc.function,doc.functionSecondary,doc.title);
  const auction=cleanAuction(pick('auction'));
  if('error' in auction)return auction;
  doc.auction=auction.value;
  if(input.geometry!==undefined&&input.geometry!==null){
    const g=cleanGeometry(input.geometry);
    if(!g)return {error:'Geometriya yopiq Polygon yoki MultiPolygon bo‘lishi kerak (longitude, latitude)'};
    doc.geometry=g;
  }else if(existing?.geometry)doc.geometry=existing.geometry;
  else return {error:'Hudud geometriyasi kerak'};
  doc.bbox=geometryBounds(doc.geometry);
  doc.published=input.published!==undefined?input.published===true:existing?.published===true;
  return {doc};
}

// Ommaviy GeoJSON xususiyatlari (maydon nomlari ro'yxati: bizning va davlat auksion jadvallaridagi nomlar).
export const publicProperties=(p:any)=>({
  id:p.id,lotNumber:p.lotNumber,title:p.title,function:p.function,functionSecondary:p.functionSecondary,
  description:p.description,statusKey:p.statusKey,categories:p.categories,company:p.company,
  areaHa:p.areaHa,areaM2:p.areaM2,floorsMin:p.floorsMin,floorsMax:p.floorsMax,
  buildingAreaM2:p.buildingAreaM2,grossAreaM2:p.grossAreaM2,openAreaM2:p.openAreaM2,kmn:p.kmn,umn:p.umn,
  functionShare:p.functionShare,auction:p.auction||null,updated:p.updated,
});
export const plotFeature=(p:any)=>({type:'Feature',id:p.id,geometry:p.geometry,properties:publicProperties(p)});

// ---------- Import ----------
const STATUS_ALIASES:Record<string,PlotStatus>={
  unknown:'unknown',planned:'planned',future:'planned',auksionga_chiqadi:'planned',
  'not-planned':'not-planned',not_for_sale:'not-planned',auksionga_chiqmaydi:'not-planned',
  listed:'listed',auction:'listed',auksionga_qoyildi:'listed',
  ready:'ready',auksionga_tayyor:'ready',pending:'pending',awaiting:'awaiting',reserved:'reserved',
  sold:'sold',auksionda_sotildi:'sold',
};
const first=(p:any,keys:string[])=>{for(const k of keys)if(p[k]!==undefined&&p[k]!==null&&p[k]!=='')return p[k];return undefined};
// GeoJSON Feature -> normalizePlot kirishi. Turli manbalar (KML va boshqa dasturlardan eksport) maydon nomlarini qo'llab-quvvatlaydi.
export function featureToInput(f:any){
  const p=f?.properties&&typeof f.properties==='object'?f.properties:{};
  const src=p.sourceAttributes&&typeof p.sourceAttributes==='object'?p.sourceAttributes:{};
  const fn=first(p,['function','Funksiya 1'])??src['Funksiya 1'];
  const statusRaw=String(first(p,['statusKey','status','auctionStatus'])??'unknown').toLowerCase();
  const area=first(p,['areaHa','area_hectares','Yer maydoni (ga)'])??src['Yer maydoni (ga)'];
  const input:any={
    lotNumber:first(p,['lotNumber','lot_number','Lot raqami','Name'])??src['Lot raqami'],
    title:first(p,['title','name'])??fn,
    function:fn,
    functionSecondary:first(p,['functionSecondary','Funksiya 2'])??src['Funksiya 2'],
    description:p.description,
    company:first(p,['company','winner']),
    statusKey:STATUS_ALIASES[statusRaw]||(/^c-[a-z0-9]{3,12}$/.test(statusRaw)?statusRaw:'unknown'),
    areaHa:area,areaM2:p.areaM2,
    floorsMin:p.floorsMin,floorsMax:p.floorsMax??p.floors,
    buildingAreaM2:p.buildingAreaM2,grossAreaM2:first(p,['grossAreaM2','grossAreaMax']),openAreaM2:p.openAreaM2,
    kmn:first(p,['kmn','qmnAvg']),umn:first(p,['umn','umnAvg']),functionShare:p.functionSharePrimary??p.functionShare,
    categories:p.categories,auction:p.auction,geometry:f?.geometry,
  };
  if(/yo.?q$/i.test(String(input.functionSecondary||'')))input.functionSecondary=''; // «… yo'q» — ikkinchi vazifa yo'q
  return input;
}
