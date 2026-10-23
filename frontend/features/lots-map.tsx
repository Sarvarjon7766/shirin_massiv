'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Search,SlidersHorizontal,X,RotateCcw,ExternalLink,Clock,FileText,Building2,Link2,Check,ArrowLeft,Eye,EyeOff,HelpCircle,Layers,ArrowUpRight,Users,Crosshair,ChevronDown} from 'lucide-react';
import {useLocale,AppearanceControls} from './locale-provider';
import {statusList,statusInfo,plotColorByCategory,categoryInfo} from '../lib/map-status';
import {mapStyle,emptyCollection,bboxOf,unionBounds} from '../lib/map-style';
import {defaultMapConfig,objectKinds,type MapConfig} from '../lib/map-config';
import {geographicPoint,polygonGeometry} from '../lib/map-data';
import {kinds as kindNames} from '../lib/data';

// Hududlar xaritasi (to'liq ekran): MapLibre GL + OpenStreetMap. Hamma narsa — sarlavha, holat tugmalari,
// qatlam kartalari, yordam, statistika — kontent menejer tomonidan admin → «Xarita» dan sozlanadi.
const LIVE_REFRESH_MS=30000;
const AUCTION_URL='https://e-auksion.uz/lot-view?lot_id={id}';
const numberLocale:Record<string,string>={uz:'uz-Latn-UZ','uz-Cyrl':'uz-Cyrl-UZ',ru:'ru-RU',en:'en-GB',zh:'zh-CN'};

type Plot={id:string;lotNumber:string;title:string;function:string;functionSecondary:string;description:string;statusKey:string;categories:string[];company:string;areaHa:number;areaM2:number;floorsMin:number;floorsMax:number;buildingAreaM2:number;grossAreaM2:number;openAreaM2:number;kmn:number;umn:number;functionShare:number;auction:any;updated:string};
type Meta={revision:string;objectsRev?:string;lotCount:number;totalAreaHa:number;statusCounts:Record<string,number>;categoryCounts:Record<string,number>;bbox:number[]|null};
type Layer={pointStyle?:'dot'|'chip';linkLabel?:string;linkUrl?:string;imageUrl?:string;corners?:number[][]|null;id:string;title:string;description:string;color:string;opacity:number;type:'fill'|'line'|'point'|'image';placement:'panel'|'toolbar';defaultOn:boolean;labelProperty:string;groupProperty:string;groups:string[];featureCount:number;updated:string};

// Ariza muddati o'tgan e'lon qilingan auksion "kutilmoqda" holatida ko'rsatiladi.
export function effectiveStatus(p:Plot,now=Date.now()):string{
  if(p.statusKey==='listed'&&p.auction?.applicationDeadline&&Date.parse(p.auction.applicationDeadline)<=now)return 'pending';
  return p.statusKey;
}
function countdown(deadline:string,now:number){
  const left=Date.parse(deadline)-now;if(!(left>0))return null;
  return {d:Math.floor(left/864e5),h:Math.floor(left%864e5/36e5),m:Math.floor(left%36e5/6e4),s:Math.floor(left%6e4/1e3)};
}
const pad=(n:number)=>String(n).padStart(2,'0');
const colorOf=(cfg:MapConfig,k:string)=>statusInfo(cfg,k).color;
// Ranglash: holat bo'yicha yoki toifa bo'yicha (menejer tanlaydi, foydalanuvchi ham almashtira oladi)
function statusExpr(cfg:MapConfig,by:'status'|'category'='status'):any{if(by==='category')return ['coalesce',['get','catColor'],'#7b8f98'];const m:any[]=['match',['get','paint']];for(const s of statusList(cfg))m.push(s.key,s.color);m.push('#7b8f98');return m}
const kindColors:Record<string,string>={projects:'#8b5cc7',infrastructure:'#3b82f6',zones:'#2e9d5b',lots:'#d6a454'};
const CAT_COLORS=['#2f4b9b','#8b5cc7','#2e9d5b','#e04f5f','#d6892b','#c04a8e','#5b6b73','#1a9bb0','#8a9a2b','#6d4c41'];
const kindPaths:Record<string,string>={projects:'/projects',infrastructure:'/infrastructure',lots:'/investment',zones:'/masterplan'};
const ovIds=(id:string)=>({img:`ov-${id}-img`,fill:`ov-${id}-fill`,line:`ov-${id}-line`,point:`ov-${id}-pt`,label:`ov-${id}-label`,src:`ov-${id}`});

type MapDef={id:string;slug:string;title:string;description:string;showPlots:boolean;objectKinds:string[];layerIds:string[];view:{lng:number;lat:number;zoom:number}|null;order:number};
export default function LotsMap({slug=''}:{slug?:string}){
  const {t:tx,locale}=useLocale();
  const fmt=useMemo(()=>new Intl.NumberFormat(numberLocale[locale]||'uz-Latn-UZ',{maximumFractionDigits:2}),[locale]);
  const dateFmt=useMemo(()=>new Intl.DateTimeFormat(numberLocale[locale]||'uz-Latn-UZ',{dateStyle:'medium',timeStyle:'short'}),[locale]);
  const [features,setFeatures]=useState<any[]>([]),[meta,setMeta]=useState<Meta|null>(null),[cfg,setCfg]=useState<MapConfig>(defaultMapConfig),[allLayers,setLayers]=useState<Layer[]>([]),[maps,setMaps]=useState<MapDef[]>([]),[state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [query,setQuery]=useState(''),[statuses,setStatuses]=useState<Set<string>>(new Set()),[cats,setCats]=useState<Set<string>>(new Set()),[selected,setSelected]=useState(''),[mapReady,setMapReady]=useState(false),[now,setNow]=useState(Date.now());
  const [drawer,setDrawer]=useState(false),[help,setHelp]=useState(false),[leftOpen,setLeftOpen]=useState(false),[ctaMenu,setCtaMenu]=useState(false);
  const [colorBy,setColorBy]=useState<'status'|'category'>('status'),[catSel,setCatSel]=useState(''),[catOpen,setCatOpen]=useState(false),[items,setItems]=useState<any[]>([]),[objOff,setObjOff]=useState<Set<string>>(new Set());
  const [layerQuery,setLayerQuery]=useState(''),[imgOpacity,setImgOpacity]=useState<Record<string,number>>({}),[layerOn,setLayerOn]=useState<Set<string>>(new Set()),[layerGroup,setLayerGroup]=useState<Record<string,string>>({}),[dataTick,setDataTick]=useState(0);
  const box=useRef<HTMLDivElement>(null),map=useRef<any>(null),lib=useRef<any>(null),revision=useRef(''),fitted=useRef(false),pick=useRef<(id:string)=>void>(()=>{});
  const chipMarkers=useRef(new Map<string,{updated:string;items:{marker:any;el:HTMLElement;props:any}[]}>()),layerCache=useRef(new Map<string,{updated:string;data:any}>()),defaultsApplied=useRef(new Set<string>()),popup=useRef<any>(null);
  const cfgRef=useRef(cfg);cfgRef.current=cfg;const colorInit=useRef(false);
  // Alohida xaritalar: /map/<slug> tanlangan xaritaning sozlamasini qo'llaydi (bo'sh bo'lsa — birinchi xarita yoki hammasi)
  const def:MapDef|null=useMemo(()=>maps.length?(slug?maps.find(m=>m.slug===slug)||null:maps[0]):null,[maps,slug]);
  const missing=!!slug&&maps.length>0&&!def;
  const plotsOn=!def||def.showPlots;
  const layers=useMemo(()=>def?allLayers.filter(l=>def.layerIds.includes(l.id)):allLayers,[allLayers,def]);
  const mapTitle=def?.title||cfg.title,mapSubtitle=def?def.description:cfg.subtitle;

  // ---------- Ma'lumot ----------
  const load=useCallback(async(force=false)=>{
    try{
      const m:Meta=await fetch('/api/map/metadata',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('meta');return r.json()});
      const rev=m.revision+'|'+(m.objectsRev||'');
      if(!force&&rev===revision.current){setMeta(m);return}
      const [g,c,l,pub,mp]:any[]=await Promise.all([
        fetch('/api/map/lots.geojson',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('geo');return r.json()}),
        fetch('/api/map/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch('/api/map/layers',{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch('/api/map/objects',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
        fetch('/api/map/maps',{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]),
      ]);
      setMaps(Array.isArray(mp)?mp:[]);
      if(Array.isArray(pub))setItems(pub.map((i:any)=>({...i,data:i.data||{}})));
      revision.current=rev;setMeta(m);setFeatures(g.features||[]);
      if(c){setCfg({...defaultMapConfig,...c});if(!colorInit.current){colorInit.current=true;setColorBy(c.colorBy==='category'?'category':'status')}}
      const list:Layer[]=Array.isArray(l)?l:[];
      for(const layer of list){const cached=layerCache.current.get(layer.id);if(cached&&cached.updated!==layer.updated)layerCache.current.delete(layer.id)}
      setLayers(list);setDataTick(t=>t+1);setState('ready');
    }catch{setState(s=>s==='ready'?s:'error')}
  },[]);
  useEffect(()=>{load(true);const timer=setInterval(()=>{if(!document.hidden)load()},LIVE_REFRESH_MS);return()=>clearInterval(timer)},[load]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
  // Ochiladigan menyular: boshqa joy bosilsa, Esc bosilsa yoki sichqoncha ketsa yopiladi
  useEffect(()=>{
    if(!ctaMenu&&!catOpen)return;
    const down=(e:Event)=>{const t=e.target as Element;if(!t.closest?.('.mx-view,.mx-cat')){setCtaMenu(false);setCatOpen(false)}};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setCtaMenu(false);setCatOpen(false)}};
    document.addEventListener('pointerdown',down,true);document.addEventListener('keydown',key);
    const m=map.current;const mv=()=>{setCtaMenu(false);setCatOpen(false)};m?.on('movestart',mv);
    return()=>{document.removeEventListener('pointerdown',down,true);document.removeEventListener('keydown',key);m?.off('movestart',mv)};
  },[ctaMenu,catOpen]);
  // Qatlamlarning boshlang'ich holati (menejer "Boshida yoqilgan" belgilagan qatlamlar)
  useEffect(()=>{
    const add=layers.filter(l=>l.defaultOn&&!defaultsApplied.current.has(l.id));
    if(!add.length)return;
    add.forEach(l=>defaultsApplied.current.add(l.id));
    setLayerOn(prev=>new Set([...prev,...add.map(l=>l.id)]));
  },[layers]);

  // ---------- Hisoblar ----------
  const statusLabel=useCallback((k:string)=>tx(statusInfo(cfg,k).label),[cfg,tx]);
  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!plotsOn)return [];
    return features.filter(f=>{
      const p=f.properties as Plot,st=effectiveStatus(p,now);
      if(statuses.size&&!statuses.has(st))return false;
      if(cats.size&&!p.categories?.some(c=>cats.has(c)))return false;
      if(!q)return true;
      return [p.lotNumber,p.title,p.function,p.company,p.auction?.lotId].some(v=>String(v||'').toLowerCase().includes(q));
    });
  },[features,query,statuses,cats,now,plotsOn]);
  const counts=useMemo(()=>{const c:Record<string,number>={};for(const f of features){const k=effectiveStatus(f.properties,now);c[k]=(c[k]||0)+1}return c},[features,now]);
  const current:Plot|undefined=useMemo(()=>features.find(f=>f.properties.id===selected)?.properties,[features,selected]);
  const totalArea=useMemo(()=>visible.reduce((s,f)=>s+(f.properties.areaHa||0),0),[visible]);
  const filtered=statuses.size>0||cats.size>0||query.trim()!=='';
  const chips=!plotsOn?[]:statusList(cfg).filter(s=>s.visible&&((counts[s.key]||0)>0||statuses.has(s.key))).map(s=>s.key);
  const catCounts:Record<string,number>=meta?.categoryCounts||{};
  const catChips=(cfg.categories||[]).filter(c=>(catCounts[c.key]||0)>0||cats.has(c.key));
  const legend=colorBy==='category'?catChips.map(c=>({key:c.key,label:tx(c.label),color:c.color,count:catCounts[c.key]||0,on:cats.has(c.key),click:()=>toggle(cats,setCats,c.key)})):chips.map(k=>({key:k,label:statusLabel(k),color:colorOf(cfg,k),count:counts[k]||0,on:statuses.has(k),click:()=>toggle(statuses,setStatuses,k)}));
  // Kontent obyektlari (loyihalar, infratuzilma, hududlar, investitsiya obyektlari): koordinata, tayyor hudud yoki GeoJSON bo'yicha xaritaga qo'yiladi
  const kindColor=(k:string)=>cfg.objects.kinds[k]?.color||kindColors[k]||'#7b8f98';
  const kindLabel=(k:string)=>cfg.objects.kinds[k]?.label||tx((kindNames as any)[k]||k);
  const objects=useMemo(()=>{
    const out:any[]=[],counts:Record<string,number>={};let unlocated=0;
    const plotGeo=new Map<string,any>();for(const f of features)plotGeo.set(f.properties.id,f.geometry);
    for(const i of items){
      if(!(objectKinds as readonly string[]).includes(i.kind)||cfg.objects.kinds[i.kind]?.visible===false||(def&&!def.objectKinds.includes(i.kind)))continue;
      const d=i.data||{};let geometry:any=polygonGeometry(d.geojson);
      if(!geometry&&d.plotId&&plotGeo.has(d.plotId))geometry=plotGeo.get(d.plotId);
      if(!geometry){const pt=geographicPoint(i);if(pt)geometry={type:'Point',coordinates:[pt[1],pt[0]]}}
      if(!geometry){unlocated++;continue}
      counts[i.kind]=(counts[i.kind]||0)+1;
      out.push({type:'Feature',geometry,properties:{plotId:d.plotId||'',oid:i.id,kind:i.kind,title:i.title||'',category:i.category||'',summary:(i.summary||'').slice(0,160),href:(kindPaths[i.kind]||'/')+'/'+i.id}});
    }
    // Toifalar (kontent «category» maydoni): har biriga barqaror rang, obyektlarga ketma-ket raqam
    const cats:{name:string;color:string;count:number}[]=[];
    for(const f of out){const name=f.properties.category||'Boshqa';let c=cats.find(x=>x.name===name);if(!c){c={name,color:CAT_COLORS[cats.length%CAT_COLORS.length],count:0};cats.push(c)}c.count++;f.properties.color=c.color;f.properties.n=out.indexOf(f)+1}
    return {features:out,counts,unlocated,cats};
  },[items,features,cfg,def]);
  const objVisible=objects.features.filter(f=>!objOff.has(f.properties.kind)&&(!catSel||(f.properties.category||'Boshqa')===catSel));
  const panelLayers=layers.filter(l=>l.placement!=='toolbar'),toolbarLayers=layers.filter(l=>l.placement==='toolbar');

  const showObject=(props:any,lngLat:any)=>{
    const m=map.current,maplibre=lib.current;if(!m||!maplibre)return;
    const content=document.createElement('div');content.className='mx-pop';
    const title=document.createElement('b');title.textContent=String(props.title||'');content.appendChild(title);
    const meta=document.createElement('span');meta.className='mx-pop-meta';meta.textContent=[kindLabel(String(props.kind)),props.category].filter(Boolean).join(' · ');content.appendChild(meta);
    if(props.summary){const p=document.createElement('div');p.textContent=String(props.summary);content.appendChild(p)}
    if(props.href){const a=document.createElement('a');a.href=String(props.href);a.textContent=tx('Batafsil');a.className='mx-pop-link';content.appendChild(a)}
    popup.current?.remove();
    popup.current=new maplibre.Popup({maxWidth:'280px'}).setLngLat(lngLat).setDOMContent(content).addTo(m);
  };
  const showObjectRef=useRef(showObject);showObjectRef.current=showObject;
  // Qatlam obyektiga (bekat, zona) bosilganda: nomi, xossalari va «bog'langan» havola (hudud, loyiha, sahifa)
  const showFeature=(title:string,props:any,lngLat:any)=>{
    const m=map.current,maplibre=lib.current;if(!m||!maplibre)return;
    const content=document.createElement('div');content.className='mx-pop';
    const t=document.createElement('b');t.textContent=title;content.appendChild(t);
    for(const [k,val] of Object.entries(props||{}).filter(([k])=>k!=='href'&&k!=='name').slice(0,8)){const row=document.createElement('div');row.textContent=`${k}: ${val}`;content.appendChild(row)}
    const href=String(props?.href||'');
    if(href&&((href.startsWith('/')&&!href.startsWith('//'))||/^https:\/\//.test(href))){const a=document.createElement('a');a.href=href;a.textContent=tx('Batafsil');a.className='mx-pop-link';if(!href.startsWith('/')){a.target='_blank';a.rel='noopener noreferrer'}content.appendChild(a)}
    popup.current?.remove();
    popup.current=new maplibre.Popup({maxWidth:'260px'}).setLngLat(lngLat).setDOMContent(content).addTo(m);
  };
  const showFeatureRef=useRef(showFeature);showFeatureRef.current=showFeature;
  pick.current=(id:string)=>{
    setSelected(id);
    const f=features.find(x=>x.properties.id===id);
    if(f&&map.current){const b=bboxOf(f.geometry);map.current.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:90,bottom:90,left:70,right:window.innerWidth>900?440:70},maxZoom:17,duration:600})}
  };

  // ---------- Xarita ----------
  useEffect(()=>{
    let cancelled=false,instance:any;
    import('maplibre-gl').then(mod=>{
      const maplibre:any=(mod as any).default||mod;
      if(cancelled||!box.current)return;
      lib.current=maplibre;
      const v=cfgRef.current.view;
      instance=new maplibre.Map({container:box.current,style:mapStyle(),center:[v.lng,v.lat],zoom:v.zoom,attributionControl:{compact:true}});
      map.current=instance;
      instance.addControl(new maplibre.NavigationControl({showCompass:false}),'bottom-right');
      instance.addControl(new maplibre.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:false}),'bottom-right');
      instance.addControl(new maplibre.ScaleControl({unit:'metric'}),'bottom-left');
      instance.on('load',()=>{
        instance.addSource('lots',{type:'geojson',data:emptyCollection,promoteId:'id'});
        instance.addLayer({id:'lots-fill',type:'fill',source:'lots',paint:{'fill-color':statusExpr(cfgRef.current,'status'),'fill-opacity':0.78}});
        instance.addLayer({id:'lots-outline',type:'line',source:'lots',paint:{'line-color':'#ffffff','line-width':0.8,'line-opacity':0.85}});
        instance.addLayer({id:'lots-labels',type:'symbol',source:'lots',minzoom:14,layout:{'text-field':['get','lotNumber'],'text-font':['Open Sans Regular'],'text-size':11,'text-allow-overlap':false},paint:{'text-color':'#002b3c','text-halo-color':'rgba(255,255,255,.92)','text-halo-width':1.5}});
        instance.addSource('objs',{type:'geojson',data:emptyCollection});
        const kindMatch:any=['coalesce',['get','color'],'#7b8f98'];
        instance.addLayer({id:'objs-fill',type:'fill',source:'objs',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':kindMatch,'fill-opacity':0.3}});
        instance.addLayer({id:'objs-line',type:'line',source:'objs',filter:['==',['geometry-type'],'Polygon'],paint:{'line-color':kindMatch,'line-width':2}});
        instance.addLayer({id:'objs-circle',type:'circle',source:'objs',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':12,'circle-color':kindMatch,'circle-stroke-color':'#ffffff','circle-stroke-width':2.5}});
        instance.addLayer({id:'objs-num',type:'symbol',source:'objs',filter:['==',['geometry-type'],'Point'],layout:{'text-field':['to-string',['get','n']],'text-font':['Open Sans Bold'],'text-size':11,'text-allow-overlap':true,'text-ignore-placement':true},paint:{'text-color':'#ffffff'}});
        instance.addLayer({id:'objs-label',type:'symbol',source:'objs',minzoom:11,layout:{'text-field':['get','title'],'text-font':['Open Sans Regular'],'text-size':11.5,'text-offset':[0,1.6],'text-anchor':'top','text-allow-overlap':false},paint:{'text-color':'#12303a','text-halo-color':'rgba(255,255,255,.92)','text-halo-width':1.6}});
        instance.addLayer({id:'lots-selected-halo',type:'line',source:'lots',filter:['==',['get','id'],''],paint:{'line-color':'#1683ff','line-width':8,'line-opacity':0.22,'line-blur':4}});
        instance.addLayer({id:'lots-selected',type:'line',source:'lots',filter:['==',['get','id'],''],paint:{'line-color':'#1683ff','line-width':3.2}});
        for(const id of ['lots-fill','objs-circle','objs-fill']){
          instance.on('mouseenter',id,()=>{instance.getCanvas().style.cursor='pointer'});
          instance.on('mouseleave',id,()=>{instance.getCanvas().style.cursor=''});
        }
        // Qo'shimcha qatlam obyektiga bosilganda — nomi va xossalari
        instance.on('click',(e:any)=>{
          // Ustuvorlik: nuqta-obyekt → hudud → obyekt maydoni → qo'shimcha qatlam
          const point=instance.queryRenderedFeatures(e.point,{layers:['objs-circle']})[0];
          if(point){showObjectRef.current(point.properties,e.lngLat);return}
          const lot=instance.queryRenderedFeatures(e.point,{layers:['lots-fill']})[0];
          if(lot){const id=lot.properties?.id;if(id)pick.current(id);return}
          const area=instance.queryRenderedFeatures(e.point,{layers:['objs-fill']})[0];
          if(area){showObjectRef.current(area.properties,e.lngLat);return}
          const ids=(instance.getStyle().layers||[]).map((l:any)=>l.id).filter((id:string)=>id.startsWith('ov-')&&!id.endsWith('-label')&&!id.endsWith('-img'));
          const hit=ids.length?instance.queryRenderedFeatures(e.point,{layers:ids})[0]:null;
          if(!hit)return;
          const props=hit.properties||{},md=(hit.layer as any)?.metadata||{};
          showFeatureRef.current(String(props[md.label]??props.name??md.title??''),props,e.lngLat);
        });
        setMapReady(true);
      });
    }).catch(()=>setState('error'));
    return()=>{cancelled=true;popup.current?.remove();instance?.remove();map.current=null;setMapReady(false)};
  },[]);

  // Hududlar ma'lumoti va ranglari
  useEffect(()=>{
    if(!mapReady)return;
    map.current.getSource('lots')?.setData({type:'FeatureCollection',features:visible.map(f=>({...f,properties:{...f.properties,paint:effectiveStatus(f.properties,now),catColor:plotColorByCategory(cfg,f.properties.categories),auction:undefined}}))});
  },[mapReady,visible,now,cfg]);
  useEffect(()=>{if(mapReady)map.current.setPaintProperty('lots-fill','fill-color',statusExpr(cfg,colorBy))},[mapReady,cfg,colorBy]);
  useEffect(()=>{
    if(!mapReady)return;
    const m=map.current,kindMatch:any=['coalesce',['get','color'],'#7b8f98'];
    m.getSource('objs')?.setData({type:'FeatureCollection',features:objVisible});
    for(const id of ['objs-fill','objs-line'])m.setPaintProperty(id,id==='objs-fill'?'fill-color':'line-color',kindMatch);
    m.setPaintProperty('objs-circle','circle-color',kindMatch);
  },[mapReady,items,features,cfg,objOff,catSel]);
  // Boshlang'ich ko'rinish: hududlar va kontent obyektlarining hammasini qamrab oladi
  useEffect(()=>{
    if(!mapReady||fitted.current||state!=='ready')return;
    const boxes:any[]=[];if(meta?.bbox&&features.length)boxes.push(meta.bbox);
    for(const f of objects.features)boxes.push(bboxOf(f.geometry));
    if(def?.view){fitted.current=true;map.current.jumpTo({center:[def.view.lng,def.view.lat],zoom:def.view.zoom});return}
    const b=unionBounds(boxes);if(!b)return;
    fitted.current=true;map.current.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:70,duration:0,maxZoom:15});
  },[mapReady,state,meta,features.length,objects.features.length]);
  useEffect(()=>{if(mapReady&&!features.length&&!objects.features.length&&state==='ready'&&!fitted.current){map.current.jumpTo({center:[cfg.view.lng,cfg.view.lat],zoom:cfg.view.zoom})}},[mapReady,state,features.length,cfg.view.lng,cfg.view.lat,cfg.view.zoom]);
  useEffect(()=>{if(mapReady)for(const id of ['lots-selected','lots-selected-halo'])map.current.setFilter(id,['==',['get','id'],selected])},[mapReady,selected]);

  // Qo'shimcha qatlamlar: yoqilganda yuklanadi, ko'rinish va guruh filtri qo'llanadi
  useEffect(()=>{
    for(const id of layerOn){
      const l=layers.find(x=>x.id===id);if(!l||l.type==='image'||layerCache.current.has(id))continue;
      fetch('/api/map/layers/'+id,{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(data=>{if(data){layerCache.current.set(id,{updated:l.updated,data});setDataTick(t=>t+1)}}).catch(()=>{});
    }
  },[layerOn,layers,dataTick]);
  useEffect(()=>{
    if(!mapReady)return;
    const m=map.current,keep=new Set<string>();
    for(const l of layers){
      const ids=ovIds(l.id),cached=layerCache.current.get(l.id),on=layerOn.has(l.id);
      keep.add(l.id);
      if(l.type==='image'){
        if(!l.imageUrl||!l.corners||l.corners.length!==4)continue;
        let isrc:any=m.getSource(ids.src);
        if(!isrc){m.addSource(ids.src,{type:'image',url:l.imageUrl,coordinates:l.corners});isrc=m.getSource(ids.src);isrc._ntUpdated=l.updated}
        else if(isrc._ntUpdated!==l.updated){isrc.updateImage({url:l.imageUrl+'?v='+encodeURIComponent(l.updated),coordinates:l.corners});isrc._ntUpdated=l.updated}
        if(!m.getLayer(ids.img))m.addLayer({id:ids.img,type:'raster',source:ids.src,paint:{'raster-opacity':imgOpacity[l.id]??l.opacity,'raster-fade-duration':0}},m.getLayer('lots-fill')?'lots-fill':undefined);
        m.setPaintProperty(ids.img,'raster-opacity',imgOpacity[l.id]??l.opacity);
        m.setLayoutProperty(ids.img,'visibility',on?'visible':'none');
        continue;
      }
      if(!cached)continue;
      let src:any=m.getSource(ids.src);
      if(!src){m.addSource(ids.src,{type:'geojson',data:cached.data});src=m.getSource(ids.src);src._ntUpdated=cached.updated}
      else if(src._ntUpdated!==cached.updated){src.setData(cached.data);src._ntUpdated=cached.updated}
      const md={label:l.labelProperty,title:l.title};
      const group=layerGroup[l.id]&&l.groupProperty?['==',['to-string',['get',l.groupProperty]],layerGroup[l.id]]:null;
      const before=m.getLayer('lots-selected-halo')?'lots-selected-halo':undefined;
      const pointFeatures=cached.data.features.filter((f:any)=>/Point/.test(f.geometry?.type));
      const chip=l.pointStyle==='chip'&&pointFeatures.length>0&&pointFeatures.length<=150;
      if(l.type==='fill'&&!m.getLayer(ids.fill)){
        m.addLayer({id:ids.fill,type:'fill',source:ids.src,metadata:md,paint:{'fill-color':l.color,'fill-opacity':l.opacity}},'lots-fill');
        m.addLayer({id:ids.line,type:'line',source:ids.src,metadata:md,paint:{'line-color':l.color,'line-width':1.4,'line-opacity':Math.min(1,l.opacity+0.4)}},'lots-fill');
      }
      if(l.type==='line'&&!m.getLayer(ids.line))m.addLayer({id:ids.line,type:'line',source:ids.src,metadata:md,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':l.color,'line-width':4,'line-opacity':0.95}},before);
      // Nuqtalar: «point» qatlamida rangli doira; chiziq/maydon qatlamida — stansiya belgisi (oq doira, rangli hoshiya)
      const ptFilter:any=['==',['geometry-type'],'Point'];
      if(pointFeatures.length&&!chip&&!m.getLayer(ids.point)){
        const station=l.type!=='point';
        m.addLayer({id:ids.point,type:'circle',source:ids.src,metadata:md,filter:ptFilter,paint:station
          ?{'circle-radius':7,'circle-color':'#ffffff','circle-stroke-color':l.color,'circle-stroke-width':3.5}
          :{'circle-radius':6,'circle-color':l.color,'circle-stroke-color':'#ffffff','circle-stroke-width':2,'circle-opacity':Math.max(0.6,l.opacity)}},before);
      }
      if(l.labelProperty&&!chip&&!m.getLayer(ids.label))m.addLayer({id:ids.label,type:'symbol',source:ids.src,minzoom:12,layout:{'text-field':['to-string',['get',l.labelProperty]],'text-font':['Open Sans Regular'],'text-size':11,'text-allow-overlap':false},paint:{'text-color':'#12303a','text-halo-color':'rgba(255,255,255,.9)','text-halo-width':1.4}},before);
      for(const id of [ids.fill,ids.line,ids.point,ids.label]){
        if(!m.getLayer(id))continue;
        m.setLayoutProperty(id,'visibility',on?'visible':'none');
        m.setFilter(id,id===ids.point?(group?['all',ptFilter,group]:ptFilter):group);
      }
      // Nomli belgi-chiplar (DOM): stansiya nomlari kabi; 150 tagacha nuqta uchun
      const store=chipMarkers.current,cur=store.get(l.id);
      if(chip&&lib.current){
        if(!cur||cur.updated!==cached.updated){
          cur?.items.forEach(i=>i.marker.remove());
          const items=pointFeatures.map((f:any)=>{
            const el=document.createElement('div');el.className='mx-chip-pt';el.style.setProperty('--c',l.color);
            const dot=document.createElement('i');el.appendChild(dot);
            const name=String((l.labelProperty?f.properties?.[l.labelProperty]:f.properties?.name)??f.properties?.name??'');
            if(name){const t=document.createElement('span');t.textContent=name;el.appendChild(t)}
            el.tabIndex=0;el.setAttribute('role','button');if(name)el.setAttribute('aria-label',name);el.addEventListener('click',()=>{const was=el.classList.contains('open');document.querySelectorAll('.mx-chip-pt.open').forEach(x=>x.classList.remove('open'));if(!was)el.classList.add('open')});
            const at=f.geometry.type==='Point'?f.geometry.coordinates:f.geometry.coordinates[0];
            if(f.properties?.href){el.style.cursor='pointer';el.addEventListener('click',ev=>{ev.stopPropagation();showFeatureRef.current(name,f.properties,{lng:at[0],lat:at[1]})})}
            const marker=new lib.current.Marker({element:el}).setLngLat(at).addTo(m);
            return {marker,el,props:f.properties||{}};
          });
          store.set(l.id,{updated:cached.updated,items});
        }
        const groupVal=l.groupProperty?layerGroup[l.id]:'';
        for(const i of store.get(l.id)!.items)i.el.style.display=on&&(!groupVal||String(i.props[l.groupProperty])===groupVal)?'':'none';
      }else if(cur){cur.items.forEach(i=>i.marker.remove());store.delete(l.id)}
    }
    // O'chirilgan qatlamlarni tozalash
    for(const style of (m.getStyle().layers||[])){
      const mt=/^ov-(.+)-(fill|line|pt|label|img)$/.exec(style.id);
      if(mt&&!keep.has(mt[1]))m.removeLayer(style.id);
    }
    for(const [id,v] of [...chipMarkers.current])if(!keep.has(id)){v.items.forEach(i=>i.marker.remove());chipMarkers.current.delete(id)}
    for(const srcId of Object.keys(m.getStyle().sources||{})){
      const mt=/^ov-(.+)$/.exec(srcId);if(mt&&!keep.has(mt[1])){m.removeSource(srcId);layerCache.current.delete(mt[1])}
    }
  },[mapReady,layers,layerOn,layerGroup,dataTick,imgOpacity]);

  // Ulashiladigan havola: ?lot=<id>
  const linked=useRef(false);
  useEffect(()=>{
    if(linked.current||!mapReady||!features.length)return;
    linked.current=true;
    const id=new URLSearchParams(window.location.search).get('lot');
    if(id&&features.some(f=>f.properties.id===id))setTimeout(()=>pick.current(id),50);
  },[mapReady,features]);
  // Loyiha/infratuzilma/zona va h.k. havolasi: ?obj=<kontent id>
  const objLinked=useRef(false);
  useEffect(()=>{
    if(objLinked.current||!mapReady||!objects.features.length)return;
    const id=new URLSearchParams(window.location.search).get('obj');
    if(!id){objLinked.current=true;return}
    const f=objects.features.find((x:any)=>x.properties.oid===id);
    objLinked.current=true;
    if(f)setTimeout(()=>flyToObject(f),400);
  },[mapReady,objects]);
  useEffect(()=>{
    if(!linked.current)return;
    const url=new URL(window.location.href);
    if(selected)url.searchParams.set('lot',selected);else url.searchParams.delete('lot');
    window.history.replaceState(null,'',url);
  },[selected]);
  // Qidiruv/filtr natijasiga qarab xarita ko'rinishini moslash
  const firstFilter=useRef(true);
  useEffect(()=>{
    if(firstFilter.current){firstFilter.current=false;return}
    if(!mapReady||!filtered||!visible.length)return;
    const b=unionBounds(visible.map(f=>bboxOf(f.geometry)));
    if(b)map.current.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:100,bottom:80,left:60,right:window.innerWidth>900?420:60},maxZoom:16,duration:500});
  },[query,statuses,cats]);
  // To'liq ekran: sahifa aylanmasin, Esc yopsin
  useEffect(()=>{
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setDrawer(false);setHelp(false);setCtaMenu(false)}};
    document.addEventListener('keydown',onKey);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey)};
  },[]);

  const toggle=(set:Set<string>,setter:(s:Set<string>)=>void,key:string)=>{const n=new Set(set);n.has(key)?n.delete(key):n.add(key);setter(n)};
  const reset=()=>{setQuery('');setStatuses(new Set());setCats(new Set());setSelected('')};
  // «Joyiga o'tish»: qatlam obyektlarining hammasi ko'rinadigan qilib xaritani yaqinlashtiradi
  const fitLayer=async(l:Layer)=>{
    const m=map.current;if(!m)return;
    let boxes:any[]=[];
    if(l.type==='image'){if(l.corners)boxes=[bboxOf({coordinates:l.corners})]}
    else{
      let cached=layerCache.current.get(l.id);
      if(!cached){const data=await fetch('/api/map/layers/'+l.id,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);if(data){cached={updated:l.updated,data};layerCache.current.set(l.id,cached);setDataTick(t=>t+1)}}
      boxes=(cached?.data.features||[]).map((f:any)=>bboxOf(f.geometry));
    }
    const b=unionBounds(boxes);
    if(b){setLayerOn(prev=>new Set(prev).add(l.id));m.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:100,bottom:80,left:340,right:window.innerWidth>900?420:60},maxZoom:17,duration:700})}
  };
  const toggleLayer=(id:string)=>setLayerOn(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n});
  const results=visible.slice(0,60);
  const objResults=useMemo(()=>{const q=query.trim().toLowerCase();return q?objects.features.filter(f=>[f.properties.title,f.properties.category].some((v:any)=>String(v||'').toLowerCase().includes(q))).slice(0,20):[]},[objects,query]);
  const flyToObject=(f:any)=>{
    const m=map.current;if(!m)return;const b=bboxOf(f.geometry);
    m.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:100,bottom:100,left:80,right:window.innerWidth>900?440:80},maxZoom:16,duration:600});
    const c=f.geometry.type==='Point'?f.geometry.coordinates:[(b[0]+b[2])/2,(b[1]+b[3])/2];
    setTimeout(()=>showObjectRef.current(f.properties,{lng:c[0],lat:c[1]}),650);setDrawer(false);
  };

  return <div className="mx" role="region" aria-label={tx(mapTitle)}>
    <header className="mx-top">
      <a className="mx-back" href={cfg.backHref||'/'}><ArrowLeft size={15}/> <span>{tx(cfg.backLabel)}</span></a>
      <div className="mx-title"><b>{tx(mapTitle)}</b>{mapSubtitle&&<small>{tx(mapSubtitle)}</small>}</div>
      <div className="mx-top-r">
        {cfg.cta.label&&cfg.cta.items?.length>0&&<div className="mx-view" onMouseLeave={()=>{if(window.matchMedia('(hover:hover)').matches)setCtaMenu(false)}}><button type="button" className="mx-cta" aria-haspopup="menu" aria-expanded={ctaMenu} onClick={()=>setCtaMenu(!ctaMenu)}>{tx(cfg.cta.label)} <ChevronDown size={14}/></button>
          {ctaMenu&&<ul className="ac-menu" role="menu">{cfg.cta.items.map((it:any)=><li key={it.href+it.label} role="none"><a role="menuitem" className="mx-menu-link" href={it.href} target={it.href.startsWith('/')?undefined:'_blank'} rel="noopener noreferrer" onClick={()=>setCtaMenu(false)}>{tx(it.label)}<ArrowUpRight size={13}/></a></li>)}</ul>}</div>}
        {cfg.cta.label&&cfg.cta.href&&!(cfg.cta.items?.length>0)&&<a className="mx-cta" href={cfg.cta.href}>{tx(cfg.cta.label)} <ArrowUpRight size={14}/></a>}
        <AppearanceControls/>
        <button type="button" className="ac-btn" onClick={()=>setHelp(true)} aria-haspopup="dialog"><HelpCircle size={15}/><span>{tx(cfg.help.title)}</span></button>
      </div>
    </header>

    <div className="mx-stage">
      <div ref={box} className="mx-canvas" role="application" aria-label={tx('Hududlar xaritasi')}/>

      <div className="mx-toolbar">
        {maps.length>1&&<nav className="mx-maps" aria-label={tx('Xaritalar')}>{maps.map(m=><a key={m.id} href={'/map/'+m.slug} className={def?.id===m.id?'on':''} aria-current={def?.id===m.id?'page':undefined}>{tx(m.title)}</a>)}</nav>}
        <button type="button" className="mx-filter-btn" onClick={()=>setDrawer(!drawer)} aria-expanded={drawer}><SlidersHorizontal size={15}/> {tx('Qidiruv va filtrlar')}{filtered&&<i className="mx-dot"/>}</button>
        <button type="button" className="mx-layers-btn" onClick={()=>setLeftOpen(!leftOpen)} aria-expanded={leftOpen}><Layers size={15}/> {tx('Qatlamlar')}</button>
        {toolbarLayers.map(l=><button type="button" key={l.id} className={'mx-toggle'+(layerOn.has(l.id)?' on':'')} style={layerOn.has(l.id)?{borderColor:l.color,boxShadow:`0 0 0 1px ${l.color} inset,0 2px 8px rgba(0,0,0,.12)`}:undefined} role="switch" aria-checked={layerOn.has(l.id)} onClick={()=>toggleLayer(l.id)}><i style={{background:l.color}}/>{tx(l.title)}<span className="mx-switch"/></button>)}
        <div className="mx-chips">{legend.map(l=><button type="button" key={l.key} className={'mx-chip'+(l.on?' on':'')} aria-pressed={l.on} onClick={l.click}><i style={{background:l.color}}/>{l.label}<b>{fmt.format(l.count)}</b></button>)}</div>
      </div>

      <aside className={'mx-left'+(leftOpen?' open':'')} aria-label={tx('Xarita qatlamlari')}>
        {toolbarLayers.filter(l=>layerOn.has(l.id)&&(l.description||l.linkUrl)).map(l=><section key={'info-'+l.id} className="mx-lcard mx-info" style={{borderLeftColor:l.color}}>
          <div className="mx-lhead"><h3><i style={{background:l.color}}/>{tx(l.title)}</h3>{l.description&&<p>{tx(l.description)}</p>}</div>
          <div className="mx-linkrow">{l.linkUrl&&<a href={l.linkUrl} target={l.linkUrl.startsWith('/')?undefined:'_blank'} rel="noopener noreferrer">{l.linkLabel?tx(l.linkLabel):tx('Batafsil')} <ArrowUpRight size={13}/></a>}<button type="button" onClick={()=>fitLayer(l)}><Crosshair size={13}/> {tx('Joyiga o‘tish')}</button></div>
        </section>)}
        {cfg.objects.visible&&objectKinds.some(k=>objects.counts[k])&&<section className="mx-lcard">
          <div className="mx-lhead"><h3>{tx(cfg.objects.title)}</h3></div>
          <ul className="mx-kinds">{objectKinds.filter(k=>objects.counts[k]).map(k=><li key={k}><button type="button" className={'mx-kind'+(objOff.has(k)?'':' on')} role="switch" aria-checked={!objOff.has(k)} onClick={()=>setObjOff(prev=>{const n=new Set(prev);n.has(k)?n.delete(k):n.add(k);return n})}><i style={{background:kindColor(k)}}/><span>{kindLabel(k)}</span><b>{objects.counts[k]}</b><span className="mx-switch"/></button></li>)}</ul>
        </section>}
        {objects.cats.length>0&&<section className="mx-lcard mx-cats">
          <div className="mx-lhead"><h3>{tx('Obyektlar ro‘yxati')}</h3></div>
          <div className="mx-cat" onMouseLeave={()=>{if(window.matchMedia('(hover:hover)').matches)setCatOpen(false)}}>
            <button type="button" className="mx-cat-btn" aria-haspopup="listbox" aria-expanded={catOpen} onClick={()=>setCatOpen(o=>!o)}><i style={{background:objects.cats.find(c=>c.name===catSel)?.color||'#9aa7ad'}}/><span>{catSel||tx('Barcha toifalar')}</span><ChevronDown size={15}/></button>
            {catOpen&&<ul className="mx-cat-menu" role="listbox">
              <li><button type="button" role="option" aria-selected={!catSel} className={!catSel?'on':''} onClick={()=>{setCatSel('');setCatOpen(false)}}><i style={{background:'#9aa7ad'}}/>{tx('Barcha toifalar')}</button></li>
              {objects.cats.map(c=><li key={c.name}><button type="button" role="option" aria-selected={catSel===c.name} className={catSel===c.name?'on':''} onClick={()=>{setCatSel(c.name);setCatOpen(false)}}><i style={{background:c.color}}/>{c.name}<small>{c.count}</small></button></li>)}
            </ul>}
          </div>
          <ul className="mx-objlist">{objVisible.map(f=><li key={f.properties.oid}><button type="button" onClick={()=>flyToObject(f)}><b style={{background:f.properties.color}}>{f.properties.n}</b><span>{f.properties.title}</span></button></li>)}</ul>
        </section>}
        {panelLayers.length>5&&<input className="mx-lfilter" type="search" value={layerQuery} onChange={e=>setLayerQuery(e.target.value)} placeholder={tx('Qatlam qidirish…')} aria-label={tx('Qatlam qidirish')}/>}
        {panelLayers.filter(l=>!layerQuery.trim()||(l.title+' '+tx(l.title)).toLowerCase().includes(layerQuery.trim().toLowerCase())).map(l=><section key={l.id} className={'mx-lcard'+(panelLayers.length>5&&!layerOn.has(l.id)?' compact':'')}>
          <div className="mx-lhead"><div><h3><i style={{background:l.color}}/>{tx(l.title)}</h3>{l.description&&(panelLayers.length<=5||layerOn.has(l.id))&&<p>{tx(l.description)}</p>}</div>
            <button type="button" className={'mx-eye'+(layerOn.has(l.id)?' on':'')} onClick={()=>toggleLayer(l.id)} aria-pressed={layerOn.has(l.id)}>{layerOn.has(l.id)?<Eye size={14}/>:<EyeOff size={14}/>} {tx(layerOn.has(l.id)?'Yashirish':'Ko‘rsatish')}</button></div>
          {(l.linkUrl||layerOn.has(l.id))&&<div className="mx-linkrow">{l.linkUrl&&<a href={l.linkUrl} target={l.linkUrl.startsWith('/')?undefined:'_blank'} rel="noopener noreferrer">{l.linkLabel?tx(l.linkLabel):tx('Batafsil')} <ArrowUpRight size={13}/></a>}{layerOn.has(l.id)&&<button type="button" onClick={()=>fitLayer(l)}><Crosshair size={13}/> {tx('Joyiga o‘tish')}</button>}</div>}
          {layerOn.has(l.id)&&l.groups.length>1&&<div className="mx-groups">{['',...l.groups].map(g=><button type="button" key={g||'all'} className={(layerGroup[l.id]||'')===g?'on':''} onClick={()=>setLayerGroup(prev=>({...prev,[l.id]:g}))}>{g||tx('Barchasi')}</button>)}</div>}
        </section>)}
        {!panelLayers.length&&<p className="mx-none">{tx('Qo‘shimcha qatlamlar yo‘q')}</p>}
      </aside>

      <aside className="mx-right" aria-label={tx('Tanlangan hudud va statistika')}>
        {current?<LotCard cfg={cfg} p={current} related={objects.features.filter((f:any)=>f.properties.plotId===current.id)} now={now} fmt={fmt} dateFmt={dateFmt} statusLabel={statusLabel} color={colorOf(cfg,effectiveStatus(current,now))} onClose={()=>setSelected('')}/>
          :<div className="mx-hint"><b>{tx('Hududni tanlang')}</b><p>{tx('Xaritadagi hududni bosing — parametrlari shu yerda ochiladi.')}</p></div>}
        {cfg.showStats&&plotsOn&&<div className="mx-stats"><div><b>{fmt.format(totalArea)}</b><span>{tx(cfg.stats.areaLabel)}</span></div><div><b>{fmt.format(visible.length)}</b><span>{tx(cfg.stats.countLabel)}</span></div></div>}
        {cfg.investors.visible&&<a className="mx-investors" href={cfg.investors.href||'/partners'}><Users size={18}/><span><b>{tx(cfg.investors.title)}</b>{cfg.investors.text&&<small>{tx(cfg.investors.text)}</small>}</span><ArrowUpRight size={16}/></a>}
      </aside>

      {drawer&&<div className="mx-drawer" role="dialog" aria-label={tx('Qidiruv va filtrlar')}>
        <div className="mx-drawer-head"><b>{tx('Qidiruv va filtrlar')}</b><div>{filtered&&<button className="icon-btn" title={tx('Filtrlarni tiklash')} onClick={reset}><RotateCcw size={15}/></button>}<button className="icon-btn" onClick={()=>setDrawer(false)} title={tx('Yopish')}><X size={16}/></button></div></div>
        {cfg.showSearch&&<div className="mx-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tx('Raqam, nom, kompaniya yoki auksion lot raqami')} aria-label={tx('Qidiruv')} autoFocus/></div>}
        <h4>{tx('Holat')}</h4>
        {(cfg.categories||[]).length>0&&<div className="mx-colorby" role="group" aria-label={tx('Ranglash')}><span>{tx('Ranglash')}:</span><button type="button" className={colorBy==='status'?'on':''} onClick={()=>setColorBy('status')}>{tx('Holat bo‘yicha')}</button><button type="button" className={colorBy==='category'?'on':''} onClick={()=>setColorBy('category')}>{tx('Toifa bo‘yicha')}</button></div>}
        <div className="mx-statuslist">{chips.map(k=><button type="button" key={k} className={statuses.has(k)?'on':''} aria-pressed={statuses.has(k)} onClick={()=>toggle(statuses,setStatuses,k)}><i style={{background:colorOf(cfg,k)}}/><span>{statusLabel(k)}</span><b>{fmt.format(counts[k]||0)}</b></button>)}</div>
        {catChips.length>0&&<><h4>{tx('Toifa')}</h4>
        <div className="mx-cats">{catChips.map(c=><button type="button" key={c.key} className={cats.has(c.key)?'on':''} aria-pressed={cats.has(c.key)} onClick={()=>toggle(cats,setCats,c.key)}><i style={{background:c.color,display:'inline-block',width:9,height:9,borderRadius:'50%',marginRight:6}}/>{tx(c.label)} <small>{fmt.format(catCounts[c.key]||0)}</small></button>)}</div></>}
        {objResults.length>0&&<><h4>{tx('Obyektlar')} <small>{objResults.length}</small></h4><ul className="mx-list">{objResults.map(f=><li key={f.properties.oid}><button type="button" onClick={()=>flyToObject(f)}><i style={{background:kindColor(f.properties.kind)}}/><span><b>{kindLabel(f.properties.kind)}</b> {f.properties.title}</span></button></li>)}</ul></>}
        <h4>{tx('Natijalar')} <small>{visible.length>results.length?`${results.length} / ${fmt.format(visible.length)}`:fmt.format(visible.length)}</small></h4>
        <ul className="mx-list">{results.map(f=>{const p=f.properties as Plot,st=effectiveStatus(p,now);return <li key={p.id}><button type="button" className={p.id===selected?'on':''} onClick={()=>{pick.current(p.id);setDrawer(false)}}><i style={{background:colorOf(cfg,st)}}/><span><b>{p.lotNumber||'—'}</b> {p.title}</span><small>{fmt.format(p.areaHa)} {tx('ga')}</small></button></li>})}
          {!results.length&&state==='ready'&&<li className="mx-none">{tx(features.length?'Hech narsa topilmadi':'Hozircha nashr qilingan hududlar yo‘q')}</li>}</ul>
      </div>}

      {missing&&<div className="mx-state error"><p>{tx('Bunday xarita topilmadi.')}</p><a className="btn outline small" href="/map">{tx('Barcha xaritalar')}</a></div>}
      {state==='loading'&&<div className="mx-state">{tx('Xarita yuklanmoqda…')}</div>}
      {state==='error'&&<div className="mx-state error"><p>{tx('Xarita ma’lumotini yuklab bo‘lmadi.')}</p><button className="btn outline small" onClick={()=>{setState('loading');load(true)}}>{tx('Qayta urinish')}</button></div>}
      <p className="mx-note">{tx('Chegaralar sxematik; rasmiy kadastr hujjati emas. Auksion shartlari rasmiy auksion platformasida.')}</p>
    </div>

    {help&&<div className="mx-modal" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false)}}>
      <div className="mx-modal-card" role="dialog" aria-modal="true" aria-label={tx(cfg.help.title)}><button className="icon-btn mx-modal-x" onClick={()=>setHelp(false)} title={tx('Yopish')}><X size={18}/></button>
        <h2>{tx(cfg.help.title)}</h2>{cfg.help.text.split('\n').filter(Boolean).map((line,i)=><p key={i}>{tx(line)}</p>)}</div></div>}
  </div>;
}

function LotCard({cfg,p,related,now,fmt,dateFmt,statusLabel,color,onClose}:{cfg:MapConfig;p:Plot;related:any[];now:number;fmt:Intl.NumberFormat;dateFmt:Intl.DateTimeFormat;statusLabel:(k:string)=>string;color:string;onClose:()=>void}){
  const {t:tx}=useLocale();
  const [copied,setCopied]=useState(false);
  const st=effectiveStatus(p,now),a=p.auction,left=st==='listed'&&a?.applicationDeadline?countdown(a.applicationDeadline,now):null;
  const price=(x:any)=>x?`${fmt.format(Number(x.amount))} ${x.currency}`:'';
  const link=a?.url||(a?.lotId?AUCTION_URL.replace('{id}',encodeURIComponent(a.lotId)):'');
  const row=(label:string,value:any)=>value?<div><dt>{tx(label)}</dt><dd>{value}</dd></div>:null;
  const catLabels=(p.categories||[]).map(k=>categoryInfo(cfg,k)?.label).filter(Boolean) as string[];
  return <section className="mx-card" aria-label={tx('Tanlangan hudud')}>
    <button className="icon-btn mx-card-x" onClick={onClose} title={tx('Yopish')}><X size={16}/></button>
    <span className="mx-eyebrow">{tx('Tanlangan hudud')}</span>
    <h2>{p.lotNumber&&<small>№ {p.lotNumber}</small>} {p.title}</h2>
    <span className="mx-badge"><i style={{background:color}}/>{statusLabel(st)}</span>
    {p.description&&<p className="mx-desc">{p.description}</p>}
    <dl>
      {row('Asosiy vazifa',p.function&&p.function+(p.functionSecondary&&p.functionShare?` (${fmt.format(p.functionShare)}%)`:''))}
      {row('Qo‘shimcha vazifa',p.functionSecondary)}
      {row('Maydon',p.areaHa?`${fmt.format(p.areaHa)} ${tx('ga')} (${fmt.format(p.areaM2)} m²)`:'')}
      {row('Qavatlar',p.floorsMax?(p.floorsMin&&p.floorsMin!==p.floorsMax?`${p.floorsMin}–${p.floorsMax}`:String(p.floorsMax)):'')}
      {row('Qurilish maydoni',p.buildingAreaM2?`${fmt.format(p.buildingAreaM2)} m²`:'')}
      {row('Umumiy maydon',p.grossAreaM2?`${fmt.format(p.grossAreaM2)} m²`:'')}
      {row('Ochiq maydon',p.openAreaM2?`${fmt.format(p.openAreaM2)} m²`:'')}
      {row('Qurilish zichligi (KMN)',p.kmn?`${fmt.format(p.kmn)}%`:'')}
      {row('Qavatlilik koeffitsiyenti (UMN)',p.umn?fmt.format(p.umn):'')}
      {row('Kompaniya',p.company)}
      {row('Yo‘nalish',catLabels.map(l=>tx(l)).join(', '))}
    </dl>
    {a&&<div className="mx-auction">
      <h3><Building2 size={14}/> {tx('Auksion')}{a.lotId&&<small> № {a.lotId}</small>}</h3>
      {a.name&&<p>{a.name}</p>}
      {left&&<div className="mx-timer" role="timer"><Clock size={14}/> {tx('Ariza muddatigacha')}: <b>{left.d}{tx('k')} {pad(left.h)}:{pad(left.m)}:{pad(left.s)}</b></div>}
      {st==='pending'&&a.applicationDeadline&&<p className="mx-muted">{tx('Ariza qabul qilish muddati tugagan.')}</p>}
      <dl>
        {row('Ariza muddati',a.applicationDeadline&&dateFmt.format(new Date(a.applicationDeadline)))}
        {row('Auksion boshlanishi',a.startsAt&&dateFmt.format(new Date(a.startsAt)))}
        {row('Boshlang‘ich narx',price(a.startPrice))}
        {a.result&&row('G‘olib',a.result.winner)}
        {a.result&&row('Yakuniy narx',price(a.result.winningPrice))}
      </dl>
      <div className="mx-links">
        {a.result?.document&&<a href={a.result.document} target="_blank" rel="noopener noreferrer"><FileText size={14}/> {tx('Natija hujjati')}</a>}
        {link&&<a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> {tx('Auksion sahifasi')}</a>}
      </div>
    </div>}
    {related.length>0&&<div className="mx-related"><h3>{tx('Bog‘liq materiallar')}</h3><ul>{related.map((f:any)=><li key={f.properties.oid}><a href={f.properties.href}><b>{f.properties.title}</b><small>{f.properties.category}</small><ArrowUpRight size={13}/></a></li>)}</ul></div>}
    <a className="btn dark small mx-ask" href={'/contact?topic='+encodeURIComponent((tx('Hudud')+' '+(p.lotNumber||p.title)).slice(0,100))+'&plot='+encodeURIComponent(p.id)}>{tx('Shu hudud haqida so‘rash')}<ArrowUpRight size={14}/></a>
    <button className="btn outline small mx-share" onClick={()=>{navigator.clipboard?.writeText(window.location.href).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)}).catch(()=>{})}}>{copied?<Check size={14}/>:<Link2 size={14}/>} {tx(copied?'Havola nusxalandi':'Havolani nusxalash')}</button>
    {p.updated&&<p className="mx-muted mx-updated">{tx('Yangilangan')}: {dateFmt.format(new Date(p.updated))}</p>}
    {!a&&st!=='sold'&&<p className="mx-muted">{tx('Bu hudud uchun auksion ma’lumoti hali e’lon qilinmagan.')}</p>}
  </section>;
}
