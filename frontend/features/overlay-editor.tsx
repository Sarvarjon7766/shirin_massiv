'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,Save,Trash2,Pencil,Eye,EyeOff,X,ZoomIn,ZoomOut,RotateCw,RotateCcw,FileUp,Move} from 'lucide-react';
import {useLocale} from './locale-provider';
import {mapStyle} from '../lib/map-style';
import {prepareImage,type Prepared} from '../lib/image-prep';
import {defaultMapConfig} from '../lib/map-config';

// Admin → Xarita → «Reja rasmi»: generplan (PDF / JPG / PNG) ni xaritaga joylashtirish (georeferensiya).
// 4 burchakni sudrab rasm xaritadagi haqiqiy joyiga moslanadi; keyin «Hududlar» bo'limida shu rasm ustidan lotlar chiziladi.
type P=[number,number];
async function api(path:string,method='GET',body?:any):Promise<any>{
  const res=await fetch('/api/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data:any=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Amal bajarilmadi');
  return data;
}
const M_LAT=111320;
// Boshlang'ich joylashuv: xarita markazida ~1.2 km kenglikda, rasm nisbati saqlanadi
function initialCorners(c:{lng:number;lat:number},aspect:number):P[]{
  const halfW=600,halfH=halfW/aspect,kLng=M_LAT*Math.cos(c.lat*Math.PI/180);
  const dx=halfW/kLng,dy=halfH/M_LAT;
  return [[c.lng-dx,c.lat+dy],[c.lng+dx,c.lat+dy],[c.lng+dx,c.lat-dy],[c.lng-dx,c.lat-dy]];
}
const centroid=(c:P[]):P=>[c.reduce((s,p)=>s+p[0],0)/4,c.reduce((s,p)=>s+p[1],0)/4];
// Burchaklarni markaz atrofida kattalashtirish va burish (metrlarda)
function transform(c:P[],scale:number,deg:number):P[]{
  const [cx,cy]=centroid(c),k=M_LAT*Math.cos(cy*Math.PI/180),a=deg*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
  return c.map(p=>{const x=(p[0]-cx)*k*scale,y=(p[1]-cy)*M_LAT*scale;return [cx+(x*cos-y*sin)/k,cy+(x*sin+y*cos)/M_LAT] as P});
}

export default function OverlayEditor(){
  const {t:tx}=useLocale();
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [form,setForm]=useState<any>(null),[editing,setEditing]=useState(''),[prepared,setPrepared]=useState<(Prepared&{name:string})|null>(null),[pdfFile,setPdfFile]=useState<File|null>(null),[page,setPage]=useState(1),[preview,setPreview]=useState(''),[corners,setCorners]=useState<P[]|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
  const box=useRef<HTMLDivElement>(null),map=useRef<any>(null),lib=useRef<any>(null),markers=useRef<any[]>([]),cornersRef=useRef<P[]|null>(null),viewRef=useRef(defaultMapConfig.view),fileInput=useRef<HTMLInputElement>(null);
  cornersRef.current=corners;

  const reload=useCallback(async()=>{try{setRows((await api('maplayers')).filter((l:any)=>l.type==='image'));setError('');window.dispatchEvent(new Event('shirin:layers-changed'))}catch(e:any){setError(e.message)}finally{setLoading(false)}},[]);
  useEffect(()=>{reload()},[reload]);

  // ---------- Xarita ----------
  useEffect(()=>{
    let cancelled=false,instance:any;
    (async()=>{
      try{const c:any=await fetch('/api/map/config',{cache:'no-store'}).then(r=>r.json());if(c?.view)viewRef.current=c.view}catch{}
      const mod:any=await import('maplibre-gl');const maplibre=mod.default||mod;
      if(cancelled||!box.current)return;
      lib.current=maplibre;const v=viewRef.current;
      instance=new maplibre.Map({container:box.current,style:mapStyle(),center:[v.lng,v.lat],zoom:v.zoom,attributionControl:{compact:true}});
      map.current=instance;
      instance.addControl(new maplibre.NavigationControl({showCompass:false}),'top-right');
      instance.addControl(new maplibre.ScaleControl({unit:'metric'}),'bottom-left');
      instance.on('load',()=>setReady(true));
    })();
    return()=>{cancelled=true;markers.current.forEach(m=>m.remove());markers.current=[];instance?.remove();map.current=null;setReady(false)};
  },[]);

  // Rasm va burchak markerlari
  useEffect(()=>{
    const m=map.current;if(!ready||!m)return;
    if(!preview||!corners){
      if(m.getLayer('plan'))m.removeLayer('plan');if(m.getSource('plan'))m.removeSource('plan');
      markers.current.forEach(x=>x.remove());markers.current=[];return;
    }
    const src:any=m.getSource('plan');
    if(!src){
      m.addSource('plan',{type:'image',url:preview,coordinates:corners});
      m.addLayer({id:'plan',type:'raster',source:'plan',paint:{'raster-opacity':form?.opacity??0.7,'raster-fade-duration':0}});
    }else if(src._ntUrl!==preview)src.updateImage({url:preview,coordinates:corners});
    else src.setCoordinates(corners);
    (m.getSource('plan') as any)._ntUrl=preview;
  },[ready,preview,corners]);
  useEffect(()=>{const m=map.current;if(ready&&m?.getLayer('plan'))m.setPaintProperty('plan','raster-opacity',form?.opacity??0.7)},[ready,form?.opacity,preview]);
  // Markerlar faqat rasm almashganda/yangi qo'yilganda qayta yaratiladi (sudralayotganda emas)
  const markerKey=preview+'|'+(corners?'1':'0');
  useEffect(()=>{
    const m=map.current,L=lib.current;if(!ready||!m||!L)return;
    markers.current.forEach(x=>x.remove());markers.current=[];
    const cs=cornersRef.current;if(!cs||!preview)return;
    const sync=()=>{const src:any=m.getSource('plan');if(src&&cornersRef.current)src.setCoordinates(cornersRef.current);
      const [cx,cy]=centroid(cornersRef.current!);markers.current[4]?.setLngLat([cx,cy])};
    cs.forEach((p,i)=>{
      const el=document.createElement('div');el.className='ov-corner';el.textContent=String(i+1);el.title=tx('Burchakni sudrang');
      const mk=new L.Marker({element:el,draggable:true}).setLngLat(p).addTo(m);
      mk.on('drag',()=>{const ll=mk.getLngLat();const next=[...cornersRef.current!];next[i]=[ll.lng,ll.lat];cornersRef.current=next;sync()});
      mk.on('dragend',()=>setCorners([...cornersRef.current!]));
      markers.current.push(mk);
    });
    const el=document.createElement('div');el.className='ov-center';el.title=tx('Rasmni butunlay siljitish uchun sudrang');el.innerHTML='✥';
    const [cx,cy]=centroid(cs);
    const mk=new L.Marker({element:el,draggable:true}).setLngLat([cx,cy]).addTo(m);
    let start:[number,number]=[cx,cy],base:P[]=cs;
    mk.on('dragstart',()=>{start=[mk.getLngLat().lng,mk.getLngLat().lat];base=[...cornersRef.current!]});
    mk.on('drag',()=>{
      const ll=mk.getLngLat(),dx=ll.lng-start[0],dy=ll.lat-start[1];
      const next=base.map(p=>[p[0]+dx,p[1]+dy] as P);cornersRef.current=next;
      const src:any=m.getSource('plan');src?.setCoordinates(next);
      next.forEach((p,i)=>markers.current[i]?.setLngLat(p));
    });
    mk.on('dragend',()=>setCorners([...cornersRef.current!]));
    markers.current.push(mk);
  },[ready,markerKey]);
  // Burchaklar tashqaridan o'zgarganda (masshtab/burish tugmalari) markerlarni yangilash
  useEffect(()=>{if(!corners)return;corners.forEach((p,i)=>markers.current[i]?.setLngLat(p));if(markers.current[4]){const [cx,cy]=centroid(corners);markers.current[4].setLngLat([cx,cy])}},[corners]);

  const fit=(cs:P[])=>{const lngs=cs.map(p=>p[0]),lats=cs.map(p=>p[1]);map.current?.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],{padding:60,duration:500})};

  // ---------- Fayl ----------
  async function load(file:File,pageNo:number){
    setBusy(true);setError('');
    try{
      const p=await prepareImage(file,pageNo);
      setPdfFile(/\.pdf$/i.test(file.name)||file.type==='application/pdf'?file:null);
      setPrepared({...p,name:file.name});
      if(preview.startsWith('blob:'))URL.revokeObjectURL(preview);
      const url=URL.createObjectURL(p.blob);setPreview(url);
      if(!cornersRef.current||!editing){
        const c=map.current.getCenter(),next=initialCorners({lng:c.lng,lat:c.lat},p.width/p.height);
        setCorners(next);setTimeout(()=>fit(next),50);
      }
      setForm((f:any)=>f&&!f.title?{...f,title:file.name.replace(/\.[^.]+$/,'')}:f);
    }catch(e:any){setError(e?.message||tx('Faylni o‘qib bo‘lmadi'))}finally{setBusy(false)}
  }
  async function pickFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];if(!f)return;setPage(1);setMessage('');
    if(!form)setForm({title:'',opacity:0.7,placement:'toolbar',defaultOn:true,published:false});
    await load(f,1);
  }
  function startNew(){close();setForm({title:'',opacity:0.7,placement:'toolbar',defaultOn:true,published:false})}
  async function edit(id:string){
    close();setError('');setMessage('');
    try{
      const l=await api('maplayers/'+id);
      setForm({title:l.title,opacity:l.opacity??0.7,placement:l.placement,defaultOn:l.defaultOn,published:l.published,description:l.description||''});
      setEditing(id);setPreview(l.imageUrl);setCorners(l.corners);setTimeout(()=>fit(l.corners),80);
    }catch(e:any){setError(e.message)}
  }
  function close(){
    if(preview.startsWith('blob:'))URL.revokeObjectURL(preview);
    setForm(null);setEditing('');setPrepared(null);setPdfFile(null);setPreview('');setCorners(null);setPage(1);if(fileInput.current)fileInput.current.value='';
  }
  const adjust=(scale:number,deg:number)=>{if(corners)setCorners(transform(corners,scale,deg))};

  async function save(){
    if(!form||!corners)return;
    setBusy(true);setError('');setMessage('');
    try{
      let imageUrl:string|undefined;
      if(prepared){
        const fd=new FormData();fd.append('file',new File([prepared.blob],`reja.${prepared.ext}`,{type:prepared.ext==='png'?'image/png':'image/jpeg'}));
        const up=await fetch('/api/upload',{method:'POST',body:fd});const uj:any=await up.json().catch(()=>({}));
        if(!up.ok)throw new Error(uj.error||tx('Rasmni yuklab bo‘lmadi'));
        imageUrl=uj.url;
      }
      const body:any={title:form.title,description:form.description||'',type:'image',opacity:form.opacity,placement:form.placement,defaultOn:form.defaultOn,published:form.published,corners};
      if(imageUrl)body.imageUrl=imageUrl;
      if(editing)await api('maplayers/'+editing,'PATCH',body);
      else{if(!imageUrl)throw new Error(tx('Avval rasm yoki PDF tanlang'));await api('maplayers','POST',body)}
      close();setMessage(tx('Saqlandi. «Hududlar» bo‘limida shu rasm ustidan lotlarni chizishingiz mumkin.'));await reload();
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  async function remove(r:any){if(!confirm(tx('Reja rasmini xaritadan olib tashlash?')+' '+r.title))return;try{await api('maplayers/'+r.id,'DELETE');if(editing===r.id)close();await reload()}catch(e:any){setError(e.message)}}
  async function toggle(r:any){try{await api('maplayers/'+r.id,'PATCH',{published:!r.published});await reload()}catch(e:any){setError(e.message)}}
  const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));

  return <div className="ove">
    <section className="panel ma-card">
      <div className="ma-head"><div><h3>{tx('Reja rasmi (generplan)')}</h3><p className="muted">{tx('Generplan rasmini (JPG, PNG yoki PDF) xaritaga joylashtiring: 4 ta burchakni xaritadagi haqiqiy joyiga sudrab moslaysiz. Shundan keyin «Hududlar» bo‘limida shu rasm ustidan lotlarni chizasiz.')}</p></div>
        <button className="btn dark small" onClick={startNew}><Plus size={14}/> {tx('Reja rasmi qo‘shish')}</button></div>
      {(message||error)&&<p className={'ma-msg'+(error?' err':'')} role={error?'alert':'status'}>{error||message}</p>}
      {loading?<p className="muted">…</p>:!rows.length?<p className="muted">{tx('Hali reja rasmi yo‘q.')}</p>:<ul className="ma-list">{rows.map(r=><li key={r.id} className={editing===r.id?'on':''}>
        <i style={{background:'#8b5cc7'}}/><div className="ma-li-main"><b>{r.title}</b><small>{tx(r.published?'ommaga ko‘rinadi':'qoralama')} · {Math.round((r.opacity??0.7)*100)}% {tx('shaffofsizlik')}</small></div>
        <button className="icon-btn" onClick={()=>toggle(r)} title={tx(r.published?'Yashirish':'Ko‘rsatish')}>{r.published?<Eye size={15}/>:<EyeOff size={15}/>}</button>
        <button className="icon-btn" onClick={()=>edit(r.id)} title={tx('Joyini to‘g‘rilash')}><Pencil size={15}/></button>
        <button className="icon-btn" onClick={()=>remove(r)} title={tx('O‘chirish')}><Trash2 size={15}/></button></li>)}</ul>}
    </section>

    <div className={'ove-grid'+(form?'':' solo')}>
      {form&&<section className="panel ma-card">
        <div className="ma-head"><h3>{tx(editing?'Reja rasmini sozlash':'Yangi reja rasmi')}</h3><button className="icon-btn" onClick={close} title={tx('Yopish')}><X size={16}/></button></div>
        <label className="ove-drop"><FileUp size={20}/> <span>{prepared?prepared.name:editing?tx('Rasmni almashtirish (ixtiyoriy)'):tx('JPG, PNG yoki PDF faylni tanlang')}</span><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" onChange={pickFile} disabled={busy}/></label>
        {prepared&&prepared.pages>1&&pdfFile&&<div className="pe-row"><label className="ma-field">{tx('PDF sahifasi')} (1–{prepared.pages})<input type="number" min={1} max={prepared.pages} value={page} onChange={e=>setPage(Number(e.target.value)||1)}/></label><button className="btn outline small" disabled={busy} onClick={()=>load(pdfFile,page)}>{tx('Sahifani yuklash')}</button></div>}
        {busy&&<p className="muted" role="status">{tx('Tayyorlanmoqda…')}</p>}
        <label className="ma-field">{tx('Nomi')}<input value={form.title} maxLength={120} onChange={e=>set('title',e.target.value)} placeholder={tx('Masalan: Shirin massivi generplani')}/></label>
        <label className="ma-field">{tx('Shaffoflik')}: {Math.round(form.opacity*100)}%<input type="range" min={0.1} max={1} step={0.05} value={form.opacity} onChange={e=>set('opacity',Number(e.target.value))}/></label>
        {corners&&<><p className="muted"><Move size={13}/> {tx('Xaritadagi 1–4 raqamli burchaklarni sudrab rasmni haqiqiy joyiga moslang (yo‘l, daryo, bino kabi aniq belgilar bo‘yicha). O‘rtadagi ✥ belgisi rasmni butunlay siljitadi. Aniqroq moslash uchun xaritani yaqinlashtiring.')}</p>
          <div className="pe-row"><button type="button" className="btn outline small" onClick={()=>adjust(1.05,0)}><ZoomIn size={14}/> {tx('Kattalashtirish')}</button><button type="button" className="btn outline small" onClick={()=>adjust(1/1.05,0)}><ZoomOut size={14}/> {tx('Kichraytirish')}</button>
            <button type="button" className="btn outline small" onClick={()=>adjust(1,-1)}><RotateCcw size={14}/> {tx('Burish −1°')}</button><button type="button" className="btn outline small" onClick={()=>adjust(1,1)}><RotateCw size={14}/> {tx('Burish +1°')}</button></div></>}
        <label className="ma-field">{tx('Qayerda ko‘rinadi')}<select value={form.placement} onChange={e=>set('placement',e.target.value)}><option value="panel">{tx('Chap tomondagi karta')}</option><option value="toolbar">{tx('Yuqoridagi yoqish/o‘chirish tugmasi')}</option></select></label>
        <label className="ma-check"><input type="checkbox" checked={form.defaultOn} onChange={e=>set('defaultOn',e.target.checked)}/> {tx('Xarita ochilganda yoqilgan bo‘lsin')}</label>
        <label className="ma-check"><input type="checkbox" checked={form.published} onChange={e=>set('published',e.target.checked)}/> {tx('Ommaga ko‘rsatish (aks holda faqat adminlarga ko‘rinadi)')}</label>
        <div className="ma-actions"><button className="btn dark" disabled={busy||!corners||!form.title.trim()} onClick={save}><Save size={15}/> {tx('Saqlash')}</button></div>
      </section>}
      <section className="ove-preview"><div className="ove-map" ref={box} role="application" aria-label={tx('Reja rasmini joylashtirish xaritasi')}/></section>
    </div>
  </div>;
}
