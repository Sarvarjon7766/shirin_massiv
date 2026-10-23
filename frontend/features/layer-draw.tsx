'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Trash2,Flag,Spline,Check,Undo2,Image as ImageIcon} from 'lucide-react';
import {useLocale} from './locale-provider';
import {mapStyle,emptyCollection} from '../lib/map-style';
import LinkPicker from './link-picker';

// Qatlamni xaritada o'zimiz chizamiz: yo'nalish (metro, yo'l) chiziladi, bekatlar/nuqtalar qo'yiladi, nomi va havolasi yoziladi.
// GeoJSON fayl kerak emas. Natija: LineString + Point obyektlari (properties: name, href).
type Pt=[number,number];
type F={type:'Feature';geometry:{type:'LineString';coordinates:Pt[]}|{type:'Point';coordinates:Pt};properties:Record<string,any>};
const r6=(n:number)=>Math.round(n*1e6)/1e6;

export const drawable=(features:any[])=>features.every(f=>f?.geometry?.type==='LineString'||f?.geometry?.type==='Point');

export default function LayerDraw({initial,color,onChange}:{initial:any[];color:string;onChange:(features:F[])=>void}){
  const {t:tx}=useLocale();
  const [feats,setFeats]=useState<F[]>(()=>initial.filter(f=>f?.geometry).map(f=>({type:'Feature',geometry:f.geometry,properties:{...(f.properties||{})}})));
  const [mode,setMode]=useState<'line'|'point'|'none'>('none'),[active,setActive]=useState<number>(-1);
  const box=useRef<HTMLDivElement>(null),map=useRef<any>(null),lib=useRef<any>(null),markers=useRef<any[]>([]),[ready,setReady]=useState(false);
  // Reja rasmi (generplan) fon sifatida: yo'nalishni shu rasm ustidan chizish uchun
  const [plans,setPlans]=useState<any[]>([]),[planId,setPlanId]=useState(''),[planOn,setPlanOn]=useState(true),[planOpacity,setPlanOpacity]=useState(0.6),fitted=useRef(false);
  useEffect(()=>{fetch('/api/maplayers',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then((all:any)=>{const imgs=(all as any[]).filter((l:any)=>l.type==='image'&&Array.isArray(l.corners)&&l.corners.length===4);setPlans(imgs);if(imgs.length)setPlanId(imgs[0].id)}).catch(()=>{})},[]);
  const listRef=useRef<HTMLDivElement>(null),focusNew=useRef(false),[linkOpen,setLinkOpen]=useState<Set<number>>(new Set());
  const modeRef=useRef(mode),activeRef=useRef(active),featsRef=useRef(feats),change=useRef(onChange);
  modeRef.current=mode;activeRef.current=active;featsRef.current=feats;change.current=onChange;
  const update=(next:F[])=>{setFeats(next);change.current(next)};

  useEffect(()=>{
    let cancelled=false,instance:any;
    (async()=>{
      let view={lng:67.0015,lat:39.7123,zoom:13};
      try{const c:any=await fetch('/api/map/config',{cache:'no-store'}).then(r=>r.json());if(c?.view)view=c.view}catch{}
      const first=featsRef.current[0]?.geometry;
      const mod:any=await import('maplibre-gl');const maplibre=mod.default||mod;
      if(cancelled||!box.current)return;
      lib.current=maplibre;
      const c0:Pt|null=first?(first.type==='Point'?first.coordinates:first.coordinates[0]):null;
      instance=new maplibre.Map({container:box.current,style:mapStyle(),center:c0||[view.lng,view.lat],zoom:c0?13:view.zoom,attributionControl:{compact:true}});
      map.current=instance;
      instance.addControl(new maplibre.NavigationControl({showCompass:false}),'top-right');
      instance.on('load',()=>{
        instance.addSource('draw',{type:'geojson',data:emptyCollection});
        instance.addLayer({id:'draw-line',type:'line',source:'draw',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':['get','_c'],'line-width':4,'line-opacity':.9}});
        setReady(true);
      });
      instance.on('click',(e:any)=>{
        const m=modeRef.current,p:Pt=[r6(e.lngLat.lng),r6(e.lngLat.lat)],cur=featsRef.current;
        if(m==='point'){
          const n=cur.filter(f=>f.geometry.type==='Point').length+1;
          focusNew.current=true;
          update([...cur,{type:'Feature',geometry:{type:'Point',coordinates:p},properties:{name:`${tx('Bekat')} ${n}`}}]);
        }else if(m==='line'){
          const a=activeRef.current;
          if(a>=0&&cur[a]?.geometry.type==='LineString'){
            update(cur.map((f,i)=>i===a?{...f,geometry:{type:'LineString',coordinates:[...(f.geometry as any).coordinates,p]}}:f));
          }else{
            const next:F[]=[...cur,{type:'Feature',geometry:{type:'LineString',coordinates:[p]} as any,properties:{name:`${tx('Yo‘nalish')} ${cur.filter(f=>f.geometry.type==='LineString').length+1}`}}];
            setFeats(next);setActive(next.length-1);
          }
        }
      });
    })();
    return()=>{cancelled=true;markers.current.forEach(m=>m.remove());markers.current=[];instance?.remove();map.current=null;setReady(false)};
  },[]);

  // Chiziqlar va markerlarni chizish (sudrab surish mumkin)
  useEffect(()=>{
    if(!ready||!map.current||!lib.current)return;
    const m=map.current;
    m.getSource('draw')?.setData({type:'FeatureCollection',features:feats.filter(f=>f.geometry.type==='LineString'&&(f.geometry as any).coordinates.length>1).map(f=>({...f,properties:{...f.properties,_c:color}}))});
    markers.current.forEach(x=>x.remove());markers.current=[];
    feats.forEach((f,fi)=>{
      if(f.geometry.type==='Point'){
        const el=document.createElement('div');el.className='ld-pt';el.textContent=String(f.properties.name||'');
        const mk=new lib.current.Marker({element:el,draggable:true}).setLngLat(f.geometry.coordinates).addTo(m);
        mk.on('dragend',()=>{const q=mk.getLngLat();update(featsRef.current.map((x,i)=>i===fi?{...x,geometry:{type:'Point',coordinates:[r6(q.lng),r6(q.lat)]}}:x))});
        markers.current.push(mk);
      }else{
        (f.geometry as any).coordinates.forEach((c:Pt,ci:number)=>{
          const el=document.createElement('div');el.className='ld-vx'+(fi===active?' on':'');el.style.borderColor=color;
          const mk=new lib.current.Marker({element:el,draggable:true}).setLngLat(c).addTo(m);
          mk.on('dragend',()=>{const q=mk.getLngLat();update(featsRef.current.map((x,i)=>i===fi?{...x,geometry:{type:'LineString',coordinates:(x.geometry as any).coordinates.map((o:Pt,k:number)=>k===ci?[r6(q.lng),r6(q.lat)]:o)}}:x))});
          el.addEventListener('contextmenu',e=>{e.preventDefault();const g=(featsRef.current[fi].geometry as any).coordinates;if(g.length<=2)return;update(featsRef.current.map((x,i)=>i===fi?{...x,geometry:{type:'LineString',coordinates:g.filter((_:any,k:number)=>k!==ci)}}:x))});
          markers.current.push(mk);
        });
      }
    });
  },[ready,feats,color,active]);

  useEffect(()=>{
    const m=map.current;if(!ready||!m)return;
    const l=plans.find(x=>x.id===planId);
    if(!l||!planOn){if(m.getLayer('plan-bg'))m.removeLayer('plan-bg');if(m.getSource('plan-bg'))m.removeSource('plan-bg');return}
    const url=l.imageUrl+'?v='+encodeURIComponent(l.updated||'');
    const src:any=m.getSource('plan-bg');
    if(!src)m.addSource('plan-bg',{type:'image',url,coordinates:l.corners});
    else if(src._ntUrl!==url)src.updateImage({url,coordinates:l.corners});
    (m.getSource('plan-bg') as any)._ntUrl=url;
    if(!m.getLayer('plan-bg'))m.addLayer({id:'plan-bg',type:'raster',source:'plan-bg',paint:{'raster-opacity':planOpacity,'raster-fade-duration':0}},m.getLayer('draw-line')?'draw-line':undefined);
    else m.setPaintProperty('plan-bg','raster-opacity',planOpacity);
    // Chizma hali bo'sh bo'lsa, xaritani reja rasmiga olib borish
    if(!fitted.current&&!featsRef.current.length){fitted.current=true;const xs=l.corners.map((c:number[])=>c[0]),ys=l.corners.map((c:number[])=>c[1]);m.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding:30,duration:0})}
  },[ready,plans,planId,planOn,planOpacity]);
  useEffect(()=>{
    if(!focusNew.current)return;focusNew.current=false;
    const inputs=listRef.current?.querySelectorAll<HTMLInputElement>('.ld-name input');const last=inputs?.[inputs.length-1];
    if(last){last.scrollIntoView({block:'nearest'});last.focus();last.select()}
  },[feats]);
  useEffect(()=>{if(map.current)map.current.getCanvas().style.cursor=mode==='none'?'':'crosshair'},[mode,ready]);
  const finishLine=()=>{setActive(-1);setMode('none');const cur=featsRef.current;const clean=cur.filter(f=>f.geometry.type!=='LineString'||(f.geometry as any).coordinates.length>1);if(clean.length!==cur.length)update(clean);else change.current(cur)};
  const lines=feats.map((f,i)=>({f,i})).filter(x=>x.f.geometry.type==='LineString'),points=feats.map((f,i)=>({f,i})).filter(x=>x.f.geometry.type==='Point');
  const setProp=(i:number,k:string,v:string)=>update(feats.map((f,j)=>j===i?{...f,properties:{...f.properties,[k]:v}}:f));
  const remove=(i:number)=>{if(active===i)setActive(-1);update(feats.filter((_,j)=>j!==i))};
  const undo=()=>{const a=active;if(a<0)return;const g=(feats[a].geometry as any).coordinates;if(g.length<=1){remove(a);return}update(feats.map((f,i)=>i===a?{...f,geometry:{type:'LineString',coordinates:g.slice(0,-1)}}:f))};
  const total=useMemo(()=>`${lines.length} ${tx('ta yo‘nalish')} · ${points.length} ${tx('ta bekat/nuqta')}`,[lines.length,points.length]);

  return <div className="ld">
    <div className="ld-bar" role="toolbar" aria-label={tx('Chizish vositalari')}>
      <button type="button" className={'btn small '+(mode==='line'?'dark':'outline')} onClick={()=>{setMode(mode==='line'?'none':'line');setActive(-1)}}><Spline size={14}/> {tx('Yo‘nalish chizish')}</button>
      <button type="button" className={'btn small '+(mode==='point'?'dark':'outline')} onClick={()=>{setMode(mode==='point'?'none':'point');setActive(-1)}}><Flag size={14}/> {tx('Bekat / nuqta qo‘yish')}</button>
      {mode==='line'&&<><button type="button" className="btn outline small" onClick={undo} disabled={active<0}><Undo2 size={14}/> {tx('Oxirgi nuqtani olib tashlash')}</button><button type="button" className="btn dark small" onClick={finishLine}><Check size={14}/> {tx('Yo‘nalishni tugatish')}</button></>}
      <span className="muted">{total}</span>
    </div>
    <p className="ld-hint">{mode==='line'?tx('Xaritani ketma-ket bosing — yo‘nalish nuqtalari qo‘shiladi. Tugagach «Yo‘nalishni tugatish» ni bosing. Nuqtani sudrab surish, o‘ng tugma bilan o‘chirish mumkin.'):mode==='point'?tx('Xaritani bosing — bekat (nuqta) qo‘yiladi. Nomini pastdagi ro‘yxatda yozing. Sudrab surish mumkin.'):tx('Avval «Yo‘nalish chizish» yoki «Bekat / nuqta qo‘yish» ni tanlang.')}</p>
    {plans.length>0&&<div className="ld-bg"><label className="ma-check"><input type="checkbox" checked={planOn} onChange={e=>setPlanOn(e.target.checked)}/> <ImageIcon size={14}/> {tx('Reja rasmini ko‘rsatish')}</label>{plans.length>1&&<select value={planId} onChange={e=>setPlanId(e.target.value)} aria-label={tx('Reja rasmi')}>{plans.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select>}<label className="ld-op">{tx('Shaffoflik')}<input type="range" min={0.1} max={1} step={0.05} value={planOpacity} onChange={e=>setPlanOpacity(Number(e.target.value))}/></label></div>}
    <div className="ld-map" ref={box} role="application" aria-label={tx('Chizish xaritasi')}/>
    {(lines.length>0||points.length>0)&&<div className="ld-lists" ref={listRef}>
      {lines.length>0&&<div><h4>{tx('Yo‘nalishlar')}</h4>{lines.map(({f,i})=><div className="ld-item" key={i}><input value={f.properties.name||''} maxLength={60} onChange={e=>setProp(i,'name',e.target.value)} aria-label={tx('Yo‘nalish nomi')}/><small>{(f.geometry as any).coordinates.length} {tx('nuqta')}</small><button type="button" className="icon-btn" onClick={()=>{setMode('line');setActive(i)}} title={tx('Davom ettirish')}><Spline size={14}/></button><button type="button" className="icon-btn" onClick={()=>remove(i)} title={tx('O‘chirish')}><Trash2 size={14}/></button></div>)}</div>}
      {points.length>0&&<div><h4>{tx('Bekatlar')} <small className="muted">{tx('— har birining nomini yozing')}</small></h4>{points.map(({f,i},k)=><div className="ld-station" key={i}>
        <span className="ld-no">{k+1}</span>
        <div className="ld-station-main">
          <label className="ld-name"><span>{tx('Bekat nomi')}</span><input value={f.properties.name||''} maxLength={60} placeholder={tx('Bekat nomini yozing (masalan: Universitet)')} onChange={e=>setProp(i,'name',e.target.value)}/></label>
          {linkOpen.has(i)||f.properties.href?<LinkPicker compact label={tx('Havola (ixtiyoriy)')} value={f.properties.href||''} onChange={u=>setProp(i,'href',u)}/>:<button type="button" className="ld-linkbtn" onClick={()=>setLinkOpen(prev=>new Set(prev).add(i))}>+ {tx('Havola qo‘shish (ixtiyoriy)')}</button>}
        </div>
        <button type="button" className="icon-btn" onClick={()=>remove(i)} title={tx('O‘chirish')}><Trash2 size={14}/></button></div>)}</div>}
    </div>}
  </div>;
}
