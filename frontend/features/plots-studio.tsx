'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Plus,Upload,Download,Trash2,Save,Eye,EyeOff,Search,X,Pencil,PenTool,Undo2,Check,Ruler,HelpCircle,MapPin} from 'lucide-react';
import {useLocale} from './locale-provider';
import {statusList,statusInfo} from '../lib/map-status';
import {statusMatch} from '../lib/map-status';
import {defaultMapConfig,type MapConfig} from '../lib/map-config';
import {mapStyle,emptyCollection,bboxOf,unionBounds,type Bounds} from '../lib/map-style';

// Admin: hududlar xaritasi. Kontent menejer uchun: xaritada chizish va tahrirlash, ro'yxatdan tanlash,
// GeoJSON importni oldindan ko'rish, ommaviy holat o'zgartirish. Matn bilan GeoJSON yozish shart emas.
type Mode='view'|'draw'|'edit';
type Pt=number[];
const IMPORT_CHUNK=250;
const TEXT_FIELDS=['lotNumber','title','function','functionSecondary','description','company'];
const NUM_FIELDS=['areaHa','floorsMin','floorsMax','buildingAreaM2','grossAreaM2','openAreaM2','kmn','umn','functionShare'];

const emptyForm=()=>({...Object.fromEntries(TEXT_FIELDS.map(k=>[k,''])),...Object.fromEntries(NUM_FIELDS.map(k=>[k,''])),statusKey:'planned',categories:[] as string[],published:false,auction:{lotId:'',name:'',startsAt:'',applicationDeadline:'',url:'',startPrice:'',currency:'UZS',winner:'',winningPrice:'',document:''}} as any);
const localInput=(iso?:string)=>{if(!iso)return '';const d=new Date(iso);return Number.isNaN(+d)?'':new Date(+d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)};
async function api(path:string,method='GET',body?:any):Promise<any>{
  const res=await fetch('/api/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data:any=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Amal bajarilmadi');
  return data;
}
function fromPlot(p:any){
  const a=p.auction||{},f=emptyForm();
  for(const k of TEXT_FIELDS)f[k]=p[k]||'';
  for(const k of NUM_FIELDS)f[k]=p[k]?String(p[k]):'';
  f.statusKey=p.statusKey||'unknown';f.categories=p.categories||[];f.published=p.published===true;
  f.auction={lotId:a.lotId||'',name:a.name||'',startsAt:localInput(a.startsAt),applicationDeadline:localInput(a.applicationDeadline),url:a.url||'',startPrice:a.startPrice?.amount||'',currency:a.startPrice?.currency||a.result?.winningPrice?.currency||'UZS',winner:a.result?.winner||'',winningPrice:a.result?.winningPrice?.amount||'',document:a.result?.document||''};
  return f;
}
function toPayload(f:any){
  const n=(v:any)=>v===''||v===null?undefined:Number(v);
  const a=f.auction,auction:any={};
  if(a.lotId)auction.lotId=a.lotId;if(a.name)auction.name=a.name;if(a.url)auction.url=a.url;
  if(a.startsAt)auction.startsAt=new Date(a.startsAt).toISOString();
  if(a.applicationDeadline)auction.applicationDeadline=new Date(a.applicationDeadline).toISOString();
  if(a.startPrice)auction.startPrice={amount:String(a.startPrice),currency:a.currency};
  if(a.winner)auction.result={winner:a.winner,...(a.winningPrice?{winningPrice:{amount:String(a.winningPrice),currency:a.currency}}:{}),...(a.document?{document:a.document}:{})};
  const payload:any={...Object.fromEntries(TEXT_FIELDS.map(k=>[k,f[k]])),statusKey:f.statusKey,categories:f.categories,published:f.published,auction:Object.keys(auction).length?auction:null};
  for(const k of NUM_FIELDS)payload[k]=n(f[k]);
  return payload;
}
// Halqa (yopilmagan nuqtalar) -> Polygon; maydon (gektar) taxminiy hisob
const ringToPolygon=(ring:Pt[])=>({type:'Polygon',coordinates:[[...ring,ring[0]]]});
function ringAreaHa(ring:Pt[]){
  if(ring.length<3)return 0;
  const lat0=ring.reduce((s,p)=>s+p[1],0)/ring.length*Math.PI/180,kx=111320*Math.cos(lat0),ky=110540;
  let sum=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];sum+=a[0]*kx*b[1]*ky-b[0]*kx*a[1]*ky}
  return Math.abs(sum)/2/10000;
}
function simpleRing(g:any):Pt[]|null{
  if(g?.type!=='Polygon'||g.coordinates.length!==1)return null;
  return g.coordinates[0].slice(0,-1);
}
function drawData(ring:Pt[]){
  const features:any[]=[];
  if(ring.length>=3)features.push({type:'Feature',properties:{},geometry:ringToPolygon(ring)});
  else if(ring.length===2)features.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:ring}});
  return {type:'FeatureCollection',features};
}
// Eng yaqin chekka (segment) indeksi — yangi nuqtani shu yerga qo'shamiz
function nearestEdge(ring:Pt[],p:Pt){
  let best=0,bestD=Infinity;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
    const t=len?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len)):0;
    const d=(a[0]+t*dx-p[0])**2+(a[1]+t*dy-p[1])**2;
    if(d<bestD){bestD=d;best=i}
  }
  return best+1;
}

export default function PlotsStudio(){
  const {t:tx}=useLocale();
  const [fc,setFc]=useState<any>(emptyCollection),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState('all'),[checked,setChecked]=useState<Set<string>>(new Set()),[bulkStatus,setBulkStatus]=useState('');
  const [form,setForm]=useState<any>(null),[editing,setEditing]=useState(''),[mode,setMode]=useState<Mode>('view'),[ring,setRing]=useState<Pt[]>([]),[geomChanged,setGeomChanged]=useState(false),[geomOverride,setGeomOverride]=useState<any>(null),[rawGeom,setRawGeom]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[mapReady,setMapReady]=useState(false),[help,setHelp]=useState(false);
  const [bgLayers,setBgLayers]=useState<any[]>([]),[bgId,setBgId]=useState(''),[bgOn,setBgOn]=useState(true),[bgOpacity,setBgOpacity]=useState(0.6);
  const [importFile,setImportFile]=useState<{name:string;features:any[]}|null>(null),[preview,setPreview]=useState<{ok:number;skipped:number;errors:string[]}|null>(null),[publishOnImport,setPublishOnImport]=useState(true),[replaceOnImport,setReplaceOnImport]=useState(false),[progress,setProgress]=useState('');

  const box=useRef<HTMLDivElement>(null),map=useRef<any>(null),maplibre=useRef<any>(null),markers=useRef<any[]>([]),fileInput=useRef<HTMLInputElement>(null);
  const ringRef=useRef<Pt[]>([]),modeRef=useRef<Mode>('view'),selectRef=useRef<(id:string)=>void>(()=>{}),fitted=useRef(false);
  ringRef.current=ring;modeRef.current=mode;

  const rows=useMemo(()=>fc.features.map((f:any)=>f.properties),[fc]);
  const shown=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter((r:any)=>(statusFilter==='all'||r.statusKey===statusFilter)&&(!q||[r.lotNumber,r.title,r.company,r.function].some(v=>String(v||'').toLowerCase().includes(q))))},[rows,query,statusFilter]);
  const ok=(text:string)=>{setMessage(text);setError('')};
  const fail=(e:any)=>{setError(e?.message||'Xatolik');setMessage('')};
  const reload=useCallback(async()=>{try{setFc(await api('plots/geojson'));setError('')}catch(e:any){setError(e.message)}finally{setLoading(false)}},[]);
  useEffect(()=>{reload()},[reload]);
  const [cfg,setCfg]=useState<MapConfig>(defaultMapConfig);
  useEffect(()=>{fetch('/api/map/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(c=>{if(c)setCfg({...defaultMapConfig,...c})}).catch(()=>{})},[]);
  const statuses=statusList(cfg);
  useEffect(()=>{if(mapReady&&map.current?.getLayer('plots-fill'))map.current.setPaintProperty('plots-fill','fill-color',statusMatch(cfg,'statusKey'))},[mapReady,cfg]);
  // Reja rasmlari (generplan): hududlarni shu rasm ustidan chizish uchun fon sifatida ko'rsatiladi
  useEffect(()=>{api('maplayers').then((all:any[])=>{const imgs=all.filter(l=>l.type==='image'&&l.corners);setBgLayers(imgs);if(imgs.length)setBgId(imgs[0].id)}).catch(()=>{})},[]);

  // ---------- Xarita ----------
  useEffect(()=>{
    let cancelled=false,instance:any;
    import('maplibre-gl').then(mod=>{
      const lib:any=(mod as any).default||mod;
      if(cancelled||!box.current)return;
      maplibre.current=lib;
      instance=new lib.Map({container:box.current,style:mapStyle(),center:[67.0015,39.7123],zoom:14,attributionControl:{compact:true},doubleClickZoom:false});
      map.current=instance;
      instance.addControl(new lib.NavigationControl({showCompass:false}),'bottom-right');
      instance.addControl(new lib.ScaleControl({unit:'metric'}),'bottom-left');
      instance.on('load',()=>{
        instance.addSource('plots',{type:'geojson',data:emptyCollection,promoteId:'id'});
        instance.addLayer({id:'plots-fill',type:'fill',source:'plots',paint:{'fill-color':statusMatch(defaultMapConfig,'statusKey'),'fill-opacity':['case',['get','published'],0.72,0.3]}});
        instance.addLayer({id:'plots-line',type:'line',source:'plots',filter:['==',['get','published'],true],paint:{'line-color':'#ffffff','line-width':1,'line-opacity':0.85}});
        instance.addLayer({id:'plots-line-draft',type:'line',source:'plots',filter:['==',['get','published'],false],paint:{'line-color':'#333333','line-width':1.4,'line-dasharray':[2,2]}});
        instance.addLayer({id:'plots-labels',type:'symbol',source:'plots',minzoom:14,layout:{'text-field':['get','lotNumber'],'text-font':['Open Sans Regular'],'text-size':11},paint:{'text-color':'#002b3c','text-halo-color':'rgba(255,255,255,.92)','text-halo-width':1.5}});
        instance.addLayer({id:'plots-selected',type:'line',source:'plots',filter:['==',['get','id'],''],paint:{'line-color':'#1683ff','line-width':3.2}});
        instance.addSource('shape',{type:'geojson',data:emptyCollection});
        instance.addLayer({id:'shape-fill',type:'fill',source:'shape',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#1683ff','fill-opacity':0.25}});
        instance.addLayer({id:'shape-line',type:'line',source:'shape',paint:{'line-color':'#1683ff','line-width':2.5,'line-dasharray':[2,1]}});
        instance.addSource('preview',{type:'geojson',data:emptyCollection});
        instance.addLayer({id:'preview-fill',type:'fill',source:'preview',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':'#1fa36b','fill-opacity':0.2}});
        instance.addLayer({id:'preview-line',type:'line',source:'preview',paint:{'line-color':'#1fa36b','line-width':1.5}});
        instance.on('click','plots-fill',(e:any)=>{if(modeRef.current!=='view')return;const id=e.features?.[0]?.properties?.id;if(id)selectRef.current(id)});
        instance.on('mouseenter','plots-fill',()=>{if(modeRef.current==='view')instance.getCanvas().style.cursor='pointer'});
        instance.on('mouseleave','plots-fill',()=>{instance.getCanvas().style.cursor=''});
        instance.on('click',(e:any)=>{
          const p:Pt=[Number(e.lngLat.lng.toFixed(6)),Number(e.lngLat.lat.toFixed(6))],cur=ringRef.current;
          if(modeRef.current==='draw'){setRing([...cur,p]);setDirty(true);setGeomChanged(true);setGeomOverride(null)}
          else if(modeRef.current==='edit'&&cur.length>=3){const at=nearestEdge(cur,p),next=[...cur];next.splice(at,0,p);setRing(next);setDirty(true);setGeomChanged(true);setGeomOverride(null)}
        });
        setMapReady(true);
      });
    }).catch(()=>setError('Xaritani yuklab bo‘lmadi'));
    return()=>{cancelled=true;markers.current.forEach(m=>m.remove());markers.current=[];instance?.remove();map.current=null;setMapReady(false)};
  },[]);

  useEffect(()=>{
    const m=map.current;if(!mapReady||!m)return;
    const l=bgLayers.find(x=>x.id===bgId);
    if(!l||!bgOn){if(m.getLayer('plan-bg'))m.removeLayer('plan-bg');if(m.getSource('plan-bg'))m.removeSource('plan-bg');return}
    const url=l.imageUrl+'?v='+encodeURIComponent(l.updated||'');
    const src:any=m.getSource('plan-bg');
    if(!src)m.addSource('plan-bg',{type:'image',url,coordinates:l.corners});
    else if(src._ntUrl!==url)src.updateImage({url,coordinates:l.corners});
    (m.getSource('plan-bg') as any)._ntUrl=url;
    if(!m.getLayer('plan-bg'))m.addLayer({id:'plan-bg',type:'raster',source:'plan-bg',paint:{'raster-opacity':bgOpacity,'raster-fade-duration':0}},'plots-fill');
    else m.setPaintProperty('plan-bg','raster-opacity',bgOpacity);
  },[mapReady,bgLayers,bgId,bgOn,bgOpacity]);
  useEffect(()=>{if(!mapReady)return;map.current.getSource('plots')?.setData(fc);
    if(!fitted.current&&fc.features.length){fitted.current=true;const b=unionBounds(fc.features.map((f:any)=>bboxOf(f.geometry)));if(b)map.current.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:50,duration:0})}
  },[mapReady,fc]);
  useEffect(()=>{if(!mapReady)return;map.current.setFilter('plots-selected',['==',['get','id'],editing]);
    // Chizilayotgan/tahrirlanayotgan hududning eski shaklini yashirish
    const hide=mode!=='view'&&editing?['!=',['get','id'],editing]:true;
    map.current.setFilter('plots-fill',hide===true?null:hide);
    map.current.setFilter('plots-line',hide===true?['==',['get','published'],true]:['all',hide,['==',['get','published'],true]]);
    map.current.setFilter('plots-line-draft',hide===true?['==',['get','published'],false]:['all',hide,['==',['get','published'],false]]);
  },[mapReady,editing,mode]);
  useEffect(()=>{if(mapReady)map.current.getSource('shape')?.setData(drawData(ring))},[mapReady,ring]);

  // Tugun (vertex) markerlari: sudrab joyini o'zgartirish, ikki marta bosib o'chirish
  useEffect(()=>{
    markers.current.forEach(m=>m.remove());markers.current=[];
    if(!mapReady||mode==='view'||!maplibre.current)return;
    ring.forEach((pt,i)=>{
      const el=document.createElement('div');el.className='pe-vertex';el.title=tx('Sudrang; o‘chirish uchun ikki marta bosing');
      const marker=new maplibre.current.Marker({element:el,draggable:true}).setLngLat(pt as [number,number]).addTo(map.current);
      marker.on('drag',()=>{const ll=marker.getLngLat();ringRef.current=ringRef.current.map((p,j)=>j===i?[ll.lng,ll.lat]:p);map.current.getSource('shape')?.setData(drawData(ringRef.current))});
      marker.on('dragend',()=>{const ll=marker.getLngLat();setRing(ringRef.current.map((p,j)=>j===i?[Number(ll.lng.toFixed(6)),Number(ll.lat.toFixed(6))]:p));setDirty(true);setGeomChanged(true);setGeomOverride(null)});
      el.addEventListener('dblclick',ev=>{ev.stopPropagation();ev.preventDefault();if(ringRef.current.length<=(modeRef.current==='edit'?3:1))return;setRing(ringRef.current.filter((_,j)=>j!==i));setDirty(true);setGeomChanged(true);setGeomOverride(null)});
      markers.current.push(marker);
    });
  },[mapReady,mode,ring]);

  const flyTo=(b:Bounds)=>map.current?.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:70,bottom:70,left:60,right:window.innerWidth>1000?440:60},maxZoom:17,duration:600});
  const confirmLeave=()=>!dirty||confirm(tx('Saqlanmagan o‘zgarishlar bor. Davom etasizmi?'));

  function reset(){setForm(null);setEditing('');setMode('view');setRing([]);setGeomChanged(false);setGeomOverride(null);setRawGeom('');setDirty(false)}
  function select(id:string){
    const f=fc.features.find((x:any)=>x.properties.id===id);if(!f||!confirmLeave())return;
    reset();setForm(fromPlot(f.properties));setEditing(id);setRing(simpleRing(f.geometry)||[]);setMessage('');setError('');
    flyTo(bboxOf(f.geometry));
  }
  selectRef.current=select;
  function startNew(){
    if(!confirmLeave())return;
    reset();setForm(emptyForm());setMode('draw');ok(tx('Xaritada hudud burchaklarini ketma-ket bosing, so‘ng «Chizishni tugatish» tugmasini bosing.'));
  }
  function redraw(){setMode('draw');setRing([]);setGeomChanged(true);setGeomOverride(null);setDirty(true);ok(tx('Yangi chegarani xaritada chizing.'))}
  function finishDraw(){
    if(ring.length<3){setError(tx('Kamida 3 ta nuqta kerak'));return}
    setMode('edit');setError('');
    setForm((f:any)=>f&&!f.areaHa?{...f,areaHa:ringAreaHa(ring).toFixed(2)}:f);
    ok(tx('Chegara tayyor. Nuqtalarni sudrab to‘g‘rilashingiz yoki chiziq ustini bosib yangi nuqta qo‘shishingiz mumkin.'));
  }
  const setField=(k:string,v:any)=>{setForm((f:any)=>({...f,[k]:v}));setDirty(true)};
  const setAuction=(k:string,v:any)=>{setForm((f:any)=>({...f,auction:{...f.auction,[k]:v}}));setDirty(true)};
  function applyRawGeometry(){
    try{
      const parsed=JSON.parse(rawGeom),g=parsed.type==='Feature'?parsed.geometry:parsed;
      if(!g||!['Polygon','MultiPolygon'].includes(g.type))throw Error('Polygon yoki MultiPolygon kerak');
      setGeomOverride(g);setGeomChanged(true);setDirty(true);const r=simpleRing(g);setRing(r||[]);setMode('view');
      flyTo(bboxOf(g));ok(tx('Geometriya qabul qilindi. Saqlash tugmasini bosing.'));
    }catch(e:any){fail(Error(e instanceof SyntaxError?tx('To‘g‘ri JSON emas'):e.message))}
  }
  async function save(next=false){
    if(!form)return;
    const prev=form;
    setBusy(true);
    try{
      const payload=toPayload(form);
      if(!editing||geomChanged){
        if(geomOverride)payload.geometry=geomOverride;
        else{if(ring.length<3)throw Error(tx('Avval hudud chegarasini xaritada chizing'));payload.geometry=ringToPolygon(ring)}
      }
      if(editing)await api('plots/'+editing,'PATCH',payload);else await api('plots','POST',payload);
      reset();ok(tx('Saqlandi'));await reload();
      if(next){ // Tezkor chizish: keyingi hudud — xuddi shu sozlamalar, raqam bittaga oshirilgan, darhol chizish rejimi
        const m=/^(.*?)(\d+)$/.exec(prev.lotNumber||'');
        const nextNo=m?m[1]+String(Number(m[2])+1).padStart(m[2].length,'0'):'';
        setForm({...emptyForm(),lotNumber:nextNo,function:prev.function,functionSecondary:prev.functionSecondary,statusKey:prev.statusKey,published:prev.published,categories:prev.categories,company:'',title:prev.title&&!nextNo?prev.title:''});
        setMode('draw');setDirty(false);ok(tx('Saqlandi. Keyingi hududni chizing.'));
      }
    }catch(e){fail(e)}finally{setBusy(false)}
  }
  async function remove(){
    if(!editing||!confirm(tx('Hududni o‘chirish?')))return;
    try{await api('plots/'+editing,'DELETE');reset();ok(tx('O‘chirildi'));await reload()}catch(e){fail(e)}
  }
  async function bulk(body:any,question:string){
    const ids=[...checked];if(!ids.length||!confirm(`${ids.length} ${tx('ta hudud')}: ${question}`))return;
    try{const r=await api('plots/bulk','POST',{ids,...body});ok(`${r.changed} ${tx('ta hudud yangilandi')}`);setChecked(new Set());setBulkStatus('');await reload()}catch(e){fail(e)}
  }
  async function loadSamples(){try{const r=await api('plots/sample','POST',{});ok(`${r.count} ${tx('ta namuna hudud yuklandi')}`);fitted.current=false;await reload()}catch(e){fail(e)}}
  // Reja rasmi shaffofligi qatlamga saqlanadi, shuning uchun ommaviy xaritada ham shunday ko'rinadi
  useEffect(()=>{const l=bgLayers.find(x=>x.id===bgId);if(l&&typeof l.opacity==='number')setBgOpacity(l.opacity)},[bgId,bgLayers.length]);
  async function saveBgOpacity(){
    const l=bgLayers.find(x=>x.id===bgId);if(!l||Math.abs((l.opacity??0)-bgOpacity)<0.001)return;
    try{await api('maplayers/'+l.id,'PATCH',{opacity:bgOpacity});setBgLayers(prev=>prev.map(x=>x.id===l.id?{...x,opacity:bgOpacity}:x));ok(tx('Shaffoflik saqlandi'))}catch(e){fail(e)}
  }
  async function removeChecked(){
    const ids=[...checked];if(!ids.length||!confirm(`${ids.length} ${tx('ta hudud butunlay o‘chiriladi. Davom etilsinmi?')}`))return;
    try{const r=await api('plots/bulk','POST',{ids,delete:true});ok(`${r.deleted} ${tx('ta hudud o‘chirildi')}`);setChecked(new Set());if(editing)reset();await reload()}catch(e){fail(e)}
  }
  async function toggleOne(r:any){try{await api('plots/bulk','POST',{ids:[r.id],published:!r.published});await reload()}catch(e){fail(e)}}
  const toggleCheck=(id:string)=>setChecked(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});
  const allChecked=shown.length>0&&shown.every((r:any)=>checked.has(r.id));

  // ---------- Import / eksport ----------
  function downloadJson(name:string,data:any){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/geo+json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function template(){
    const c=map.current?.getCenter?.()||{lng:69.47,lat:41.28},sq=(dx:number,dy:number)=>{const x=c.lng+dx,y=c.lat+dy,s=0.003;return {type:'Polygon',coordinates:[[[x,y],[x+s,y],[x+s,y+s*0.8],[x,y+s*0.8],[x,y]].map(p=>p.map(v=>Number(v.toFixed(6))))]}};
    downloadJson('hududlar-namuna.geojson',{type:'FeatureCollection',features:[
      {type:'Feature',properties:{lotNumber:'A-1',function:'Kop qavatli turar-joy',statusKey:'planned',areaHa:1.2,floorsMax:9,buildingAreaM2:6000,kmn:35,umn:2.5},geometry:sq(-0.006,0)},
      {type:'Feature',properties:{lotNumber:'A-2',function:'Ofis',statusKey:'listed',areaHa:0.8,floorsMax:12,auction:{lotId:'12345',applicationDeadline:new Date(Date.now()+7*864e5).toISOString(),startPrice:{amount:'1000000000.00',currency:'UZS'}}},geometry:sq(0.006,0)},
    ]});
  }
  async function exportAll(){try{downloadJson('hududlar.geojson',await api('plots/geojson'))}catch(e){fail(e)}}
  async function pickFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];setPreview(null);setImportFile(null);if(!f)return;setError('');setMessage('');
    try{
      const json=JSON.parse(await f.text());
      const features=json.type==='FeatureCollection'?json.features:json.type==='Feature'?[json]:null;
      if(!Array.isArray(features)||!features.length)throw Error(tx('GeoJSON FeatureCollection kerak'));
      setImportFile({name:f.name,features});
      map.current?.getSource('preview')?.setData({type:'FeatureCollection',features:features.filter((x:any)=>x?.geometry)});
      const b=unionBounds(features.filter((x:any)=>x?.geometry?.coordinates).map((x:any)=>{try{return bboxOf(x.geometry)}catch{return [180,90,-180,-90] as Bounds}}).filter((x:Bounds)=>x[0]<=x[2]));
      if(b)flyTo(b);
      // Serverda tekshirish (hech narsa yozilmaydi)
      setBusy(true);let okCount=0,skipped=0;const errors:string[]=[];
      for(let i=0;i<features.length;i+=IMPORT_CHUNK){
        setProgress(`${tx('Tekshirilmoqda')} ${Math.min(i+IMPORT_CHUNK,features.length)} / ${features.length}`);
        const r=await api('plots/import','POST',{dryRun:true,features:features.slice(i,i+IMPORT_CHUNK)});
        okCount+=r.imported;skipped+=r.skipped;for(const er of r.errors)if(errors.length<10)errors.push(`#${i+er.index+1}: ${er.message}`);
      }
      setPreview({ok:okCount,skipped,errors});
    }catch(err:any){setImportFile(null);fail(err instanceof SyntaxError?Error(tx('Fayl to‘g‘ri JSON emas')):err)}finally{setBusy(false);setProgress('')}
  }
  function cancelImport(){setImportFile(null);setPreview(null);if(fileInput.current)fileInput.current.value='';map.current?.getSource('preview')?.setData(emptyCollection)}
  async function runImport(){
    if(!importFile)return;
    if(replaceOnImport&&!confirm(tx('Mavjud barcha hududlar o‘chirilib, fayl bilan almashtiriladi. Davom etasizmi?')))return;
    setBusy(true);setError('');setMessage('');let imported=0,skipped=0;
    try{
      const all=importFile.features;
      for(let i=0;i<all.length;i+=IMPORT_CHUNK){
        setProgress(`${Math.min(i+IMPORT_CHUNK,all.length)} / ${all.length}`);
        const r=await api('plots/import','POST',{features:all.slice(i,i+IMPORT_CHUNK),publish:publishOnImport,replace:replaceOnImport&&i===0});
        imported+=r.imported;skipped+=r.skipped;
      }
      ok(`${tx('Import tugadi')}: ${imported} ${tx('ta qo‘shildi/yangilandi')}${skipped?`, ${skipped} ${tx('ta o‘tkazib yuborildi')}`:''}`);
      cancelImport();await reload();fitted.current=false;
    }catch(e){fail(e)}finally{setBusy(false);setProgress('')}
  }

  // ---------- Ko'rinish ----------
  const input=(k:string,label:string,type='text',extra:any={})=><label key={k} className="pe-field">{tx(label)}<input type={type} value={form[k]} onChange={e=>setField(k,e.target.value)} {...extra}/></label>;
  const ainput=(k:string,label:string,type='text')=><label key={k} className="pe-field">{tx(label)}<input type={type} value={form.auction[k]} onChange={e=>setAuction(k,e.target.value)}/></label>;
  const polyHint=editing&&ring.length===0&&!geomOverride&&mode==='view';
  return <div className="pe">
    <div className="pe-bar">
      <button className="btn dark small" onClick={startNew}><Plus size={14}/> {tx('Yangi hudud')}</button>
      <details className="pe-menu"><summary className="btn outline small"><Upload size={14}/> {tx('Import / eksport')}</summary>
        <div className="pe-pop">
          <ol className="pe-steps"><li>{tx('Namuna faylni yuklab oling va o‘z ma’lumotingizni shu shaklda tayyorlang.')}</li><li>{tx('Faylni tanlang: hududlar xaritada ko‘rinadi va server tekshiradi.')}</li><li>{tx('Natijadan mamnun bo‘lsangiz «Import qilish» ni bosing.')}</li></ol>
          <div className="pe-row"><button className="btn outline small" onClick={template}><Download size={14}/> {tx('Namuna fayl')}</button><button className="btn outline small" onClick={exportAll}><Download size={14}/> {tx('Hammasini yuklab olish')}</button></div>
          <input ref={fileInput} type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={pickFile} aria-label={tx('GeoJSON fayl')} disabled={busy}/>
          {importFile&&<div className="pe-import"><b>{importFile.name}</b>: {importFile.features.length} {tx('ta obyekt')}
            {preview&&<p className={preview.skipped?'pe-warn':'pe-okmsg'}>✔ {preview.ok} {tx('ta to‘g‘ri')}{preview.skipped?` · ✖ ${preview.skipped} ${tx('ta xato (o‘tkazib yuboriladi)')}`:''}</p>}
            {preview?.errors.length?<pre className="pe-errors">{preview.errors.join('\n')}</pre>:null}
            <label><input type="checkbox" checked={publishOnImport} onChange={e=>setPublishOnImport(e.target.checked)}/> {tx('Darhol xaritada ko‘rsatish')}</label>
            <label><input type="checkbox" checked={replaceOnImport} onChange={e=>setReplaceOnImport(e.target.checked)}/> {tx('Mavjud hududlarni almashtirish')}</label>
            <div className="pe-row"><button className="btn dark small" disabled={busy||!preview||!preview.ok} onClick={runImport}><Upload size={14}/> {busy?progress||'…':tx('Import qilish')}</button><button className="btn outline small" disabled={busy} onClick={cancelImport}>{tx('Bekor qilish')}</button></div></div>}
        </div></details>
      <button className="btn outline small" onClick={()=>setHelp(!help)} aria-expanded={help}><HelpCircle size={14}/> {tx('Yo‘riqnoma')}</button>
      <span className="pe-count">{rows.length} {tx('ta hudud')} · {rows.filter((r:any)=>r.published).length} {tx('ta nashr qilingan')}</span>
    </div>
    {help&&<div className="pe-help"><b>{tx('Qanday ishlaydi?')}</b><ul>
      <li>{tx('Hududni xaritadan yoki ro‘yxatdan tanlang — o‘ng tomonda ma’lumotlari ochiladi.')}</li>
      <li>{tx('«Yangi hudud» → xaritada burchaklarni ketma-ket bosing → «Chizishni tugatish».')}</li>
      <li>{tx('Chegarani to‘g‘rilash: «Chegarani tahrirlash» → nuqtalarni sudrang; chiziq ustini bosing — yangi nuqta; nuqtaga ikki marta bosing — o‘chadi.')}</li>
      <li>{tx('Hudud faqat «Xaritada ko‘rsatish» belgilanganda ommaga ko‘rinadi. Qoralamalar xaritada xira va chiziqli ko‘rinadi.')}</li>
      <li>{tx('Bir nechta hududning holatini birdan o‘zgartirish uchun ro‘yxatda ularni belgilang.')}</li></ul></div>}
    {(message||error)&&<p className={'pe-msg'+(error?' err':'')} role={error?'alert':'status'} style={{whiteSpace:'pre-line'}}>{error||message}</p>}
    <div className="pe-body">
      <aside className="pe-list">
        <div className="pe-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tx('Raqam, nom yoki kompaniya')} aria-label={tx('Qidiruv')}/></div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label={tx('Holat')}><option value="all">{tx('Barcha holatlar')}</option>{statuses.map(k=><option key={k.key} value={k.key}>{tx(k.label)}</option>)}</select>
        <label className="pe-all"><input type="checkbox" checked={allChecked} onChange={e=>setChecked(e.target.checked?new Set(shown.map((r:any)=>r.id)):new Set())}/> {tx('Hammasini belgilash')} <span>{shown.length} / {rows.length}</span></label>
        {checked.size>0&&<div className="pe-bulk"><b>{checked.size} {tx('ta tanlandi')}</b>
          <div className="pe-row"><select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)} aria-label={tx('Yangi holat')}><option value="">{tx('Holatni tanlang…')}</option>{statuses.map(k=><option key={k.key} value={k.key}>{tx(k.label)}</option>)}</select><button className="btn dark small" disabled={!bulkStatus} onClick={()=>bulk({statusKey:bulkStatus},tx('holatni o‘zgartirish'))}>{tx('Qo‘llash')}</button></div>
          <div className="pe-row"><button className="btn outline small" onClick={()=>bulk({published:true},tx('xaritada ko‘rsatish'))}><Eye size={13}/> {tx('Ko‘rsatish')}</button><button className="btn outline small" onClick={()=>bulk({published:false},tx('yashirish'))}><EyeOff size={13}/> {tx('Yashirish')}</button><button className="btn outline small" onClick={removeChecked}><Trash2 size={13}/> {tx('O‘chirish')}</button></div></div>}
        <ul>{shown.slice(0,300).map((r:any)=><li key={r.id} className={r.id===editing?'on':''}>
          <input type="checkbox" checked={checked.has(r.id)} onChange={()=>toggleCheck(r.id)} aria-label={tx('Belgilash')}/>
          <button className="pe-item" onClick={()=>select(r.id)}><i style={{background:statusInfo(cfg,r.statusKey).color}}/><span><b>{r.lotNumber||'—'}</b> {r.title}</span>{!r.published&&<em>{tx('qoralama')}</em>}</button>
          <button className="icon-btn" onClick={()=>toggleOne(r)} title={tx(r.published?'Yashirish':'Ko‘rsatish')}>{r.published?<Eye size={15}/>:<EyeOff size={15}/>}</button></li>)}
          {!loading&&!shown.length&&<li className="pe-none">{tx(rows.length?'Hech narsa topilmadi':'Hozircha hudud yo‘q. «Yangi hudud» yoki import orqali qo‘shing.')}{!rows.length&&<><br/><button className="btn outline small" style={{marginTop:10}} onClick={loadSamples}>{tx('Namuna hududlar yuklash')}</button></>}</li>}
          {shown.length>300&&<li className="pe-none">{tx('Dastlabki 300 ta ko‘rsatilgan — qidiruvdan foydalaning.')}</li>}</ul>
      </aside>
      <div className="pe-map">
        <div ref={box} className="pe-canvas" role="application" aria-label={tx('Hududlar xaritasi (tahrirlash)')}/>
        {bgLayers.length>0&&<div className="pe-bg"><label className="ma-check"><input type="checkbox" checked={bgOn} onChange={e=>setBgOn(e.target.checked)}/> {tx('Reja rasmi')}</label>{bgLayers.length>1&&<select value={bgId} onChange={e=>setBgId(e.target.value)} aria-label={tx('Reja rasmi')}>{bgLayers.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>}<input type="range" min={0.1} max={1} step={0.05} value={bgOpacity} onChange={e=>setBgOpacity(Number(e.target.value))} onPointerUp={saveBgOpacity} onKeyUp={saveBgOpacity} onBlur={saveBgOpacity} aria-label={tx('Shaffoflik')} title={tx('Shaffoflik ommaviy xaritada ham shunday bo‘ladi')}/></div>}
        {mode!=='view'&&<div className="pe-tools" role="toolbar" aria-label={tx('Chizish asboblari')}><PenTool size={15}/> <b>{mode==='draw'?tx('Chizish'):tx('Chegarani tahrirlash')}</b> <span>{ring.length} {tx('ta nuqta')}</span>
          {mode==='draw'&&<><button className="btn outline small" disabled={!ring.length} onClick={()=>setRing(ring.slice(0,-1))}><Undo2 size={13}/> {tx('Orqaga')}</button><button className="btn dark small" disabled={ring.length<3} onClick={finishDraw}><Check size={13}/> {tx('Chizishni tugatish')}</button></>}
          {mode==='edit'&&<button className="btn dark small" onClick={()=>setMode('view')}><Check size={13}/> {tx('Tayyor')}</button>}
          {ring.length>=3&&<span><Ruler size={13}/> {ringAreaHa(ring).toFixed(2)} {tx('ga')}</span>}</div>}
        {form&&<section className="pe-card" aria-label={tx('Hudud ma’lumotlari')}>
          <button className="icon-btn pe-x" onClick={()=>{if(confirmLeave())reset()}} title={tx('Yopish')}><X size={16}/></button>
          <h3>{editing?tx('Hududni tahrirlash'):tx('Yangi hudud')}{dirty&&<small> • {tx('saqlanmagan')}</small>}</h3>
          <div className="pe-geom">
            <MapPin size={14}/> {ring.length>=3?`${ring.length} ${tx('ta nuqta')} · ${ringAreaHa(ring).toFixed(2)} ${tx('ga')}`:geomOverride?tx('Geometriya GeoJSON orqali berilgan'):editing?tx('Murakkab chegara (ko‘p qismli yoki teshikli)'):tx('Chegara hali chizilmagan')}
            <div className="pe-row">
              {ring.length>=3&&mode!=='edit'&&<button className="btn outline small" onClick={()=>setMode('edit')}><Pencil size={13}/> {tx('Chegarani tahrirlash')}</button>}
              {(editing||ring.length>0)&&mode!=='draw'&&<button className="btn outline small" onClick={redraw}><PenTool size={13}/> {tx('Qayta chizish')}</button>}
              {ring.length>=3&&<button className="btn outline small" onClick={()=>setField('areaHa',ringAreaHa(ring).toFixed(2))}><Ruler size={13}/> {tx('Maydonni hisoblash')}</button>}
            </div>
            {polyHint&&<small className="muted">{tx('Bu chegarani nuqta bo‘yicha tahrirlab bo‘lmaydi; «Qayta chizish» yoki GeoJSON orqali almashtiring.')}</small>}
          </div>
          <fieldset><legend>{tx('Asosiy')}</legend>
            {input('lotNumber','Hudud raqami')}{input('title','Nomi')}
            <label className="pe-field">{tx('Holat')}<select value={form.statusKey} onChange={e=>setField('statusKey',e.target.value)}>{statuses.map(k=><option key={k.key} value={k.key}>{tx(k.label)}</option>)}</select></label>
            <label className="pe-check"><input type="checkbox" checked={form.published} onChange={e=>setField('published',e.target.checked)}/> {tx('Xaritada ko‘rsatish (ommaga ochiq)')}</label>
          </fieldset>
          <fieldset><legend>{tx('Vazifa va o‘lchamlar')}</legend>
            {input('function','Asosiy vazifa')}{input('functionSecondary','Qo‘shimcha vazifa')}{input('areaHa','Maydon (ga)','number',{step:'any',min:0})}
            {input('floorsMin','Qavatlar (min)','number',{min:0})}{input('floorsMax','Qavatlar (max)','number',{min:0})}{input('buildingAreaM2','Qurilish maydoni (m²)','number',{min:0})}
            <div className="pe-cats"><span>{tx('Toifa (turar-joy, noturar-joy, restoran…; bo‘sh qolsa vazifadan aniqlanadi)')}</span>{(cfg.categories||[]).map(c=><label key={c.key}><input type="checkbox" checked={form.categories.includes(c.key)} onChange={e=>setField('categories',e.target.checked?[...form.categories,c.key]:form.categories.filter((x:string)=>x!==c.key))}/> {tx(c.label)}</label>)}</div>
            <details><summary>{tx('Qo‘shimcha ko‘rsatkichlar')}</summary>{input('functionShare','Asosiy vazifa ulushi (%)','number',{min:0,max:100})}{input('grossAreaM2','Umumiy maydon (m²)','number',{min:0})}{input('openAreaM2','Ochiq maydon (m²)','number',{min:0})}{input('kmn','KMN (%)','number',{min:0})}{input('umn','UMN','number',{min:0})}</details>
            <label className="pe-field">{tx('Tavsif')}<textarea rows={3} value={form.description} onChange={e=>setField('description',e.target.value)}/></label>
          </fieldset>
          <details open={!!(form.auction.lotId||form.auction.winner)}><summary>{tx('Auksion ma’lumoti')}</summary>
            {ainput('lotId','Auksion lot raqami')}{ainput('name','Auksion nomi')}{ainput('applicationDeadline','Ariza muddati','datetime-local')}{ainput('startsAt','Auksion boshlanishi','datetime-local')}
            <div className="pe-row"><label className="pe-field">{tx('Boshlang‘ich narx')}<input type="number" min={0} value={form.auction.startPrice} onChange={e=>setAuction('startPrice',e.target.value)}/></label><label className="pe-field pe-cur">{tx('Valyuta')}<select value={form.auction.currency} onChange={e=>setAuction('currency',e.target.value)}><option>UZS</option><option>USD</option><option>EUR</option></select></label></div>
            {ainput('url','Auksion havolasi (https)','url')}{ainput('winner','G‘olib (natija)')}{ainput('winningPrice','Yakuniy narx','number')}{ainput('document','Natija hujjati (https yoki /assets/…)')}
          </details>
          {input('company','Kompaniya (g‘olib / egasi)')}
          <details><summary>{tx('Ilg‘or: GeoJSON geometriyani qo‘lda kiritish')}</summary><textarea rows={4} value={rawGeom} onChange={e=>setRawGeom(e.target.value)} placeholder='{"type":"Polygon","coordinates":[[[69.4,41.3],[69.41,41.3],[69.41,41.31],[69.4,41.3]]]}'/><button className="btn outline small" onClick={applyRawGeometry} disabled={!rawGeom.trim()}>{tx('Qo‘llash')}</button></details>
          <div className="pe-actions"><button className="btn dark" disabled={busy} onClick={()=>save()}><Save size={15}/> {tx('Saqlash')}</button>{!editing&&<button className="btn outline" disabled={busy} onClick={()=>save(true)} title={tx('Saqlab, keyingi hududni darhol chizishga o‘tadi')}><PenTool size={15}/> {tx('Saqlash va keyingisini chizish')}</button>}{editing&&<button className="btn destructive" onClick={remove}><Trash2 size={15}/> {tx('O‘chirish')}</button>}</div>
        </section>}
      </div>
    </div>
  </div>;
}
