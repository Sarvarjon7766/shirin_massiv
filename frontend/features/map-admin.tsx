'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,Save,Trash2,Pencil,Eye,EyeOff,ArrowUp,ArrowDown,Upload,X,ExternalLink,RotateCcw} from 'lucide-react';
import {useLocale} from './locale-provider';
import PlotsStudio from './plots-studio';
import OverlayEditor from './overlay-editor';
import MapsStudio from './maps-studio';
import StatusesStudio from './statuses-studio';
import LinkPicker from './link-picker';
import LayerDraw,{drawable} from './layer-draw';
import {plotStatuses,plotStatusMeta} from '../lib/plot-model';
import {defaultMapConfig,objectKinds,type MapConfig} from '../lib/map-config';
import {kinds as kindNames} from '../lib/data';

// Admin → «Xarita»: hududlar, qo'shimcha qatlamlar va xarita ko'rinishi sozlamalari (kontent menejer uchun).
async function api(path:string,method='GET',body?:any):Promise<any>{
  const res=await fetch('/api/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data:any=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Amal bajarilmadi');
  return data;
}

export type MapSection='maps'|'plots'|'statuses'|'layers'|'transit'|'mapview';
// Har bir xarita bo'limi — admin yon menyusida alohida sahifa. Sarlavha ostida shu sahifa nima uchun va saytda qayerda ko'rinishi yoziladi.
const SECTIONS:Record<MapSection,{what:string;where:string;href:string}>={
  maps:{what:'Alohida xaritalar yarating (Investitsiya, Bosh reja, Metro…) va har birida qaysi hududlar, obyektlar va qatlamlar ko‘rinishini tanlang.',where:'Saytda: /map, /map/<nom>',href:'/map'},
  plots:{what:'Hududlar (xaritadagi lotlar): xaritada chizing yoki fayldan import qiling, holati, toifasi, maydoni va auksionini kiriting.',where:'Saytda: /map va /investment',href:'/investment'},
  statuses:{what:'Hudud holatlari (bo‘sh, kutishda, sotuvda, olingan…) va toifalari (turar-joy, noturar-joy, restoran, tashkilotlar…) ni o‘zingiz yarating, nomi va rangini o‘zgartiring.',where:'Saytda: xarita tepasidagi tugmalar va filtrlar',href:'/map'},
  layers:{what:'Zona (maydon) qatlamlari va reja rasmlari (generplan). Qatlam xaritada yoqiladi/o‘chiriladi.',where:'Saytda: xaritaning chap paneli',href:'/map'},
  transit:{what:'Metro, yo‘l va bekatlarni xaritada o‘zingiz chizing: yo‘nalishni chizasiz, bekatlarni qo‘yasiz, nom va havola berasiz.',where:'Saytda: xaritaning yuqori tugmalari',href:'/map'},
  mapview:{what:'Xarita sarlavhasi, tugmalari, yo‘riqnomasi, boshlang‘ich joyi va obyekt turlari ko‘rinishi.',where:'Saytda: xarita sahifasining tepa qismi',href:'/map'},
};
export default function MapAdmin({section='maps'}:{section?:MapSection}){
  const {t:tx}=useLocale();
  const info=SECTIONS[section];
  return <div className="ma">
    <div className="where-box"><ExternalLink size={18}/><div><b>{tx(info.what)}</b><p>{tx(info.where)}</p></div><a className="btn outline small" href={info.href} target="_blank" rel="noopener noreferrer">{tx('Saytda ochish')}<ExternalLink size={14}/></a></div>
    <nav className="map-workflow" aria-label={tx('Xarita va kontent boshqaruvi')}>
      <span>{tx('Bog‘liq boshqaruv:')}</span>
      <a className={section==='maps'?'active':''} href="/admin/maps">{tx('Xaritalar')}</a>
      <a className={section==='plots'?'active':''} href="/admin/plots">{tx('Hududlar')}</a>
      <a className={section==='layers'?'active':''} href="/admin/layers">{tx('Qatlamlar')}</a>
      <a href="/admin/content">{tx('Kontent menejeri')}</a>
    </nav>
    {section==='maps'&&<MapsStudio/>}
    {section==='plots'&&<PlotsStudio/>}
    {section==='statuses'&&<StatusesStudio/>}
    {section==='layers'&&<><LayersStudio mode="areas"/><div className="ma-sub"><h3>{tx('Reja rasmlari (generplan, PDF/JPG/PNG)')}</h3><p className="muted">{tx('Rasm ham qatlam: qancha xohlasangiz qo‘shing. Har biri xaritada alohida yoqiladi/o‘chiriladi va shaffofligi sozlanadi.')}</p><OverlayEditor/></div></>}
    {section==='transit'&&<LayersStudio mode="transit"/>}
    {section==='mapview'&&<ConfigStudio/>}
  </div>;
}

// ---------------- Xarita ko'rinishi va matnlari ----------------
function ConfigStudio(){
  const {t:tx}=useLocale();
  const [cfg,setCfg]=useState<MapConfig>(defaultMapConfig),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{api('mapconfig').then(c=>setCfg({...defaultMapConfig,...c})).catch(e=>setError(e.message))},[]);
  const set=(path:string[],value:any)=>setCfg(prev=>{const next:any=structuredClone(prev);let o=next;for(const k of path.slice(0,-1))o=o[k]??={};o[path.at(-1)!]=value;return next});
  async function save(){
    setBusy(true);setError('');setMessage('');
    try{const r=await api('mapconfig','POST',cfg);setCfg({...defaultMapConfig,...r.config});setMessage(tx('Saqlandi. Xarita ochiq sahifada bir necha soniyada yangilanadi.'))}
    catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  const text=(label:string,path:string[],opts:{area?:boolean;max?:number;hint?:string}={})=>{
    const value=path.reduce((o:any,k)=>o?.[k],cfg)??'';
    return <label className="ma-field">{tx(label)}{opts.area?<textarea rows={5} value={value} maxLength={opts.max} onChange={e=>set(path,e.target.value)}/>:<input value={value} maxLength={opts.max} onChange={e=>set(path,e.target.value)}/>}{opts.hint&&<small>{tx(opts.hint)}</small>}</label>;
  };
  const check=(label:string,path:string[])=><label className="ma-check"><input type="checkbox" checked={!!path.reduce((o:any,k)=>o?.[k],cfg)} onChange={e=>set(path,e.target.checked)}/> {tx(label)}</label>;
  return <div className="ma-form">
    {(message||error)&&<p className={'ma-msg'+(error?' err':'')} role={error?'alert':'status'}>{error||message}</p>}
    <section className="panel ma-card"><h3>{tx('Sarlavha')}</h3><div className="ma-grid">
      {text('Xarita nomi',['title'],{max:100})}{text('Qisqa izoh (ixtiyoriy)',['subtitle'],{max:200})}
      {text('«Orqaga» tugmasi matni',['backLabel'],{max:40})}{text('«Orqaga» tugmasi manzili',['backHref'],{hint:'Masalan: / yoki /about'})}
    </div></section>
    <section className="panel ma-card"><h3>{tx('Yuqoridagi tugma (ixtiyoriy)')}</h3><p className="muted">{tx('Matn va manzil ikkalasi ham kiritilsa, yuqori o‘ng burchakda ko‘rinadi.')}</p><div className="ma-grid">
      {text('Tugma matni',['cta','label'],{max:60})}{text('Tugma manzili',['cta','href'],{hint:'/ bilan boshlanadigan yoki https:// manzil (menyu bandlari bo‘lsa, tugma menyu ochadi)'})}
    </div>
      <h4>{tx('Tugma menyusi (ixtiyoriy)')}</h4><p className="muted">{tx('Band qo‘shsangiz, tugma bosilganda ochiladigan menyu bo‘ladi (masalan: Telegram bot, investor yo‘riqnomasi).')}</p>
      <div className="ma-status">{(cfg.cta.items||[]).map((it,i)=><div key={i} className="ma-srow">
        <input value={it.label} placeholder={tx('Band nomi')} maxLength={60} onChange={e=>set(['cta','items'],cfg.cta.items.map((x,j)=>j===i?{...x,label:e.target.value}:x))} aria-label={tx('Band nomi')}/>
        <input value={it.href} placeholder="https://… yoki /sahifa" onChange={e=>set(['cta','items'],cfg.cta.items.map((x,j)=>j===i?{...x,href:e.target.value}:x))} aria-label={tx('Manzil')}/>
        <button type="button" className="icon-btn" onClick={()=>set(['cta','items'],cfg.cta.items.filter((_,j)=>j!==i))} title={tx('O‘chirish')}><Trash2 size={14}/></button></div>)}
        {(cfg.cta.items||[]).length<8&&<button type="button" className="btn outline small" style={{alignSelf:'flex-start'}} onClick={()=>set(['cta','items'],[...(cfg.cta.items||[]),{label:'',href:''}])}><Plus size={14}/> {tx('Band qo‘shish')}</button>}</div></section>
    <section className="panel ma-card"><h3>{tx('Yordam oynasi')}</h3><div className="ma-grid">
      {text('Sarlavha',['help','title'],{max:60})}
      <div style={{gridColumn:'1/-1'}}>{text('Matn (har bir qator — alohida abzats)',['help','text'],{area:true,max:1500})}</div>
    </div></section>
    <section className="panel ma-card"><h3>{tx('Xaritadagi obyektlar (loyihalar, infratuzilma, hududlar)')}</h3><p className="muted">{tx('Kontent bo‘limlaridagi obyektlar, agar joylashuvi (nuqta), tayyor hududi yoki chegarasi belgilangan bo‘lsa, xaritada chiqadi. Qaysi turlar ko‘rinishi, nomi va rangini shu yerda sozlang.')}</p>
      <div className="ma-grid">{check('Chap tomondagi «Obyektlar» kartasini ko‘rsatish',['objects','visible'])}{text('Karta sarlavhasi',['objects','title'],{max:80})}</div>
      <div className="ma-status">{objectKinds.map(k=>{const s=cfg.objects.kinds[k]||{visible:true,label:'',color:''};return <div key={k} className="ma-srow">
        <label className="ma-check"><input type="checkbox" checked={s.visible!==false} onChange={e=>set(['objects','kinds',k],{...s,visible:e.target.checked})}/> <span>{tx((kindNames as any)[k]||k)}</span></label>
        <input value={s.label} placeholder={tx('Boshqa nom (ixtiyoriy)')} maxLength={60} onChange={e=>set(['objects','kinds',k],{...s,label:e.target.value})} aria-label={tx('Nom')}/>
        <span className="ma-color"><input type="color" value={s.color||({projects:'#8b5cc7',infrastructure:'#3b82f6',zones:'#2e9d5b',lots:'#d6a454'} as any)[k]} onChange={e=>set(['objects','kinds',k],{...s,color:e.target.value})} aria-label={tx('Rang')}/>{s.color&&<button type="button" className="icon-btn" title={tx('Standart rangga qaytarish')} onClick={()=>set(['objects','kinds',k],{...s,color:''})}><RotateCcw size={13}/></button>}</span>
      </div>})}</div></section>
    <section className="panel ma-card"><h3>{tx('Qidiruv va statistika')}</h3><div className="ma-grid">
      {check('Qidiruv maydonini ko‘rsatish',['showSearch'])}{check('Statistika kartalarini ko‘rsatish (jami maydon va soni)',['showStats'])}
      {text('Maydon kartasi izohi',['stats','areaLabel'],{max:60})}{text('Soni kartasi izohi',['stats','countLabel'],{max:60})}
    </div></section>
    <section className="panel ma-card"><h3>{tx('Investorlar va hamkorlar kartasi')}</h3><div className="ma-grid">
      {check('Kartani ko‘rsatish',['investors','visible'])}<span/>
      {text('Sarlavha',['investors','title'],{max:80})}{text('Qisqa matn',['investors','text'],{max:160})}{text('Manzil',['investors','href'])}
    </div></section>
    <section className="panel ma-card"><h3>{tx('Boshlang‘ich ko‘rinish')}</h3><p className="muted">{tx('Hali hudud bo‘lmaganda xarita shu joyda ochiladi.')}</p><div className="ma-grid ma-grid3">
      <label className="ma-field">{tx('Uzunlik (longitude)')}<input type="number" step="any" value={cfg.view.lng} onChange={e=>set(['view','lng'],Number(e.target.value))}/></label>
      <label className="ma-field">{tx('Kenglik (latitude)')}<input type="number" step="any" value={cfg.view.lat} onChange={e=>set(['view','lat'],Number(e.target.value))}/></label>
      <label className="ma-field">{tx('Masshtab (1–19)')}<input type="number" min={1} max={19} step="0.5" value={cfg.view.zoom} onChange={e=>set(['view','zoom'],Number(e.target.value))}/></label>
    </div></section>
    <div className="ma-actions"><button className="btn dark" disabled={busy} onClick={save}><Save size={15}/> {tx('Saqlash')}</button></div>
  </div>;
}

// ---------------- Qatlamlar ----------------
type LayerForm={title:string;description:string;type:string;color:string;opacity:number;placement:string;defaultOn:boolean;published:boolean;labelProperty:string;groupProperty:string;pointStyle:string;linkLabel:string;linkUrl:string};
const emptyLayer=(mode:'areas'|'transit'='areas'):LayerForm=>({title:'',description:'',type:mode==='transit'?'line':'fill',color:mode==='transit'?'#2a6df4':'#1683ff',opacity:0.4,placement:mode==='transit'?'toolbar':'panel',defaultOn:mode==='transit',published:mode==='transit',labelProperty:'',groupProperty:'',pointStyle:mode==='transit'?'chip':'dot',linkLabel:'',linkUrl:''});
const typeLabels:Record<string,string>={fill:'Maydon (zona)',line:'Chiziq (yo‘l, metro)',point:'Nuqta (obyekt)',image:'Reja rasmi'};

function LayersStudio({mode='areas'}:{mode?:'areas'|'transit'}){
  const {t:tx}=useLocale();
  const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [form,setForm]=useState<LayerForm|null>(null),[editing,setEditing]=useState(''),[file,setFile]=useState<{name:string;features:any[];keys:string[]}|null>(null),[keys,setKeys]=useState<string[]>([]),[busy,setBusy]=useState(false),[drawing,setDrawing]=useState(false),[drawInit,setDrawInit]=useState<any[]>([]),fileInput=useRef<HTMLInputElement>(null);
  const inMode=(l:any)=>mode==='transit'?(l.type==='line'||l.type==='point'):(l.type==='fill'||l.type==='image');
  const reload=useCallback(async()=>{try{setRows((await api('maplayers')).filter(inMode));setError('')}catch(e:any){setError(e.message)}finally{setLoading(false)}},[]);
  useEffect(()=>{reload()},[reload]);
  useEffect(()=>{const h=()=>{reload()};window.addEventListener('shirin:layers-changed',h);return()=>window.removeEventListener('shirin:layers-changed',h)},[reload]);
  const ok=(t:string)=>{setMessage(t);setError('')};
  const fail=(e:any)=>{setError(e?.message||'Xatolik');setMessage('')};

  function close(){setForm(null);setEditing('');setFile(null);setKeys([]);setDrawing(false);setDrawInit([]);if(fileInput.current)fileInput.current.value=''}
  async function open(id?:string){
    setMessage('');setError('');close();
    if(!id){setForm(emptyLayer(mode));if(mode==='transit')setDrawing(true);return}
    try{const l=await api('maplayers/'+id);setForm({title:l.title,description:l.description||'',type:l.type,color:l.color,opacity:l.opacity,placement:l.placement,defaultOn:l.defaultOn,published:l.published,labelProperty:l.labelProperty||'',groupProperty:l.groupProperty||'',pointStyle:l.pointStyle||'dot',linkLabel:l.linkLabel||'',linkUrl:l.linkUrl||''});setEditing(id);setKeys(l.propertyKeys||[]);setDrawInit(Array.isArray(l.features)?l.features:[]);if(mode==='transit')setDrawing(true)}catch(e){fail(e)}
  }
  async function pickFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0];if(!f)return;setError('');
    try{
      const json=JSON.parse(await f.text());
      const features=json.type==='FeatureCollection'?json.features:json.type==='Feature'?[json]:null;
      if(!Array.isArray(features)||!features.length)throw Error(tx('GeoJSON FeatureCollection kerak'));
      const k=new Set<string>();for(const x of features)for(const key of Object.keys(x?.properties||{}))k.add(key);
      setFile({name:f.name,features,keys:[...k].slice(0,40)});setKeys([...k].slice(0,40));
      // Geometriya turidan qatlam turini taxmin qilish
      const t=String(features[0]?.geometry?.type||'');
      setForm(prev=>prev&&!editing?{...prev,type:/Point/.test(t)?'point':/Line/.test(t)?'line':'fill',title:prev.title||f.name.replace(/\.(geo)?json$/i,'')}:prev);
    }catch(err:any){setFile(null);fail(err instanceof SyntaxError?Error(tx('Fayl to‘g‘ri JSON emas')):err)}
  }
  async function save(){
    if(!form)return;setBusy(true);
    try{
      const body:any={...form};
      if(file)body.features=file.features;
      if(!editing&&!file)throw Error(tx(mode==='transit'?'Avval xaritada yo‘nalish chizing':'GeoJSON faylni tanlang'));
      if(editing)await api('maplayers/'+editing,'PATCH',body);else await api('maplayers','POST',body);
      close();ok(tx('Saqlandi'));await reload();
    }catch(e){fail(e)}finally{setBusy(false)}
  }
  async function remove(r:any){
    if(!confirm(tx('Qatlamni o‘chirish?')+' '+r.title))return;
    try{await api('maplayers/'+r.id,'DELETE');if(editing===r.id)close();ok(tx('O‘chirildi'));await reload()}catch(e){fail(e)}
  }
  async function toggle(r:any){try{await api('maplayers/'+r.id,'PATCH',{published:!r.published});await reload()}catch(e){fail(e)}}
  async function move(i:number,dir:-1|1){
    const j=i+dir;if(j<0||j>=rows.length)return;
    const ids=rows.map(r=>r.id);[ids[i],ids[j]]=[ids[j],ids[i]];
    try{await api('maplayers/reorder','POST',{ids});await reload()}catch(e){fail(e)}
  }
  const set=(k:keyof LayerForm,v:any)=>setForm(prev=>prev&&({...prev,[k]:v}));
  return <div className="ma-layers">
    <section className="panel ma-card">
      <div className="ma-head"><div><h3>{tx(mode==='transit'?'Metro, yo‘l va bekatlar':'Zona qatlamlari')}</h3><p className="muted">{tx(mode==='transit'?'Yo‘nalishni o‘zgartirish: qalamcha (✎) tugmasini bosing — xarita ochiladi. Nuqtani sudrab suring, o‘ng tugma bilan o‘chiring, «Davom ettirish» bilan chiziqni uzaytiring, yangi bekat qo‘shing; oxirida «Saqlash».':'Zonalar va maydon qatlamlari GeoJSON fayldan qo‘shiladi. Qatlam xaritada chap tomonda karta bo‘lib chiqadi, ko‘rsatish/yashirish mumkin.')}</p></div>
        <button className="btn dark small" onClick={()=>open()}><Plus size={14}/> {tx(mode==='transit'?'Yangi yo‘nalish':'Qatlam qo‘shish')}</button></div>
      {(message||error)&&<p className={'ma-msg'+(error?' err':'')} role={error?'alert':'status'}>{error||message}</p>}
      {loading?<p className="muted">…</p>:!rows.length?<p className="muted">{tx('Hali qatlam yo‘q.')}</p>:<ul className="ma-list">{rows.map((r,i)=><li key={r.id} className={editing===r.id?'on':''}>
        <i style={{background:r.color}}/><div className="ma-li-main"><b>{r.title}</b><small>{tx(typeLabels[r.type]||r.type)} · {r.featureCount} {tx('ta obyekt')} · {tx(r.placement==='toolbar'?'yuqoridagi tugma':'chap karta')}{r.defaultOn?` · ${tx('boshida yoqilgan')}`:''}</small></div>
        <button className="icon-btn" disabled={i===0} onClick={()=>move(i,-1)} title={tx('Yuqoriga')}><ArrowUp size={15}/></button>
        <button className="icon-btn" disabled={i===rows.length-1} onClick={()=>move(i,1)} title={tx('Pastga')}><ArrowDown size={15}/></button>
        <button className="icon-btn" onClick={()=>toggle(r)} title={tx(r.published?'Yashirish':'Ko‘rsatish')}>{r.published?<Eye size={15}/>:<EyeOff size={15}/>}</button>
        {r.type!=='image'&&<button className="icon-btn" onClick={()=>open(r.id)} title={tx('Tahrirlash')}><Pencil size={15}/></button>}
        <button className="icon-btn" onClick={()=>remove(r)} title={tx('O‘chirish')}><Trash2 size={15}/></button></li>)}</ul>}
    </section>
    {form&&<section className="panel ma-card"><div className="ma-head"><h3>{tx(editing?'Qatlamni tahrirlash':'Yangi qatlam')}</h3><button className="icon-btn" onClick={close} title={tx('Yopish')}><X size={16}/></button></div>
      <div className="ma-grid">
        <label className="ma-field">{tx('Nomi')}<input value={form.title} maxLength={120} onChange={e=>set('title',e.target.value)}/></label>
        <label className="ma-field">{tx('Turi')}<select value={form.type} onChange={e=>set('type',e.target.value)}>{Object.entries(typeLabels).filter(([k])=>mode==='transit'?(k==='line'||k==='point'):k==='fill').map(([k,v])=><option key={k} value={k}>{tx(v)}</option>)}</select></label>
        <div style={{gridColumn:'1/-1'}}><label className="ma-field">{tx('Qisqa izoh')}<textarea rows={2} maxLength={300} value={form.description} onChange={e=>set('description',e.target.value)}/></label></div>
        <label className="ma-field">{tx('Rang')}<input type="color" value={form.color} onChange={e=>set('color',e.target.value)} className="ma-colorbig"/></label>
        {form.type==='fill'&&<label className="ma-field">{tx('Shaffoflik')}: {Math.round(form.opacity*100)}%<input type="range" min={0.05} max={1} step={0.05} value={form.opacity} onChange={e=>set('opacity',Number(e.target.value))}/></label>}
        <label className="ma-field">{tx('Qayerda ko‘rinadi')}<select value={form.placement} onChange={e=>set('placement',e.target.value)}><option value="panel">{tx('Chap tomondagi karta')}</option><option value="toolbar">{tx('Yuqoridagi yoqish/o‘chirish tugmasi')}</option></select></label>
        <label className="ma-field">{tx('Nuqtalar ko‘rinishi')}<select value={form.pointStyle} onChange={e=>set('pointStyle',e.target.value)}><option value="dot">{tx('Doira (stansiya belgisi) + nom yozuvi')}</option><option value="chip">{tx('Nomli belgi-chip (≤150 nuqta, masalan metro bekatlari)')}</option></select></label>
        <label className="ma-field">{tx('Havola matni (ixtiyoriy)')}<input value={form.linkLabel} maxLength={60} onChange={e=>set('linkLabel',e.target.value)} placeholder={tx('Masalan: Butun yo‘nalish')}/></label>
        <div style={{gridColumn:'1/-1'}}><LinkPicker label={tx('Qatlam nimaga bog‘lansin? (kartadagi havola)')} value={form.linkUrl} onChange={(u,t)=>{set('linkUrl',u);if(u&&t&&!form.linkLabel)set('linkLabel',t.slice(0,60))}}/></div>
        <div className="ma-checks"><label className="ma-check"><input type="checkbox" checked={form.defaultOn} onChange={e=>set('defaultOn',e.target.checked)}/> {tx('Xarita ochilganda yoqilgan bo‘lsin')}</label><label className="ma-check"><input type="checkbox" checked={form.published} onChange={e=>set('published',e.target.checked)}/> {tx('Ommaga ko‘rsatish')}</label></div>
      </div>
      <div className="ma-file"><b>{tx('GeoJSON fayl')}</b>
        <p className="muted">{tx(editing?'Obyektlarni almashtirish uchun yangi fayl tanlang; tanlamasangiz o‘zgarmaydi.':'Polygon/MultiPolygon (zonalar), LineString (yo‘l, metro) yoki Point (obyektlar). Koordinatalar: longitude, latitude.')}</p>
        <input ref={fileInput} type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={pickFile}/>
        {file&&<p><b>{file.name}</b>: {file.features.length} {tx('ta obyekt')}{file.keys.length?` · ${tx('maydonlar')}: ${file.keys.join(', ')}`:''}</p>}</div>
      {form.type!=='image'&&<div className="ma-file"><b>{tx('Yoki xaritada o‘zingiz chizing')}</b>
        <p className="muted">{tx('Metro, yo‘l yoki bekatlarni GeoJSON faylsiz, to‘g‘ridan-to‘g‘ri xaritada chizing: yo‘nalish chiziladi, bekatlar qo‘yiladi, har biriga nom va havola beriladi.')}</p>
        {!drawing?<button type="button" className="btn outline small" onClick={()=>setDrawing(true)}>{tx(editing?'Chizish orqali tahrirlash':'Chizishni boshlash')}</button>
          :drawable(drawInit)?<LayerDraw initial={drawInit} color={form.color} onChange={feats=>{
              if(!feats.length){setFile(null);return}
              setFile({name:tx('Chizilgan'),features:feats,keys:['name','href']});setKeys(['name','href']);
              setForm(prev=>prev&&({...prev,type:feats.some(f=>f.geometry.type==='LineString')?'line':'point',pointStyle:'chip',labelProperty:'name'}));
            }}/>:<p className="muted">{tx('Bu qatlamda maydon (poligon) bor — uni chizish bilan tahrirlab bo‘lmaydi, faqat chiziq va nuqta.')}</p>}</div>}
      {keys.length>0&&<div className="ma-grid">
        <label className="ma-field">{tx('Obyekt nomi qaysi maydondan olinsin')}<select value={form.labelProperty} onChange={e=>set('labelProperty',e.target.value)}><option value="">{tx('— ko‘rsatilmasin —')}</option>{keys.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
        <label className="ma-field">{tx('Guruhlash maydoni (masalan: yil)')}<select value={form.groupProperty} onChange={e=>set('groupProperty',e.target.value)}><option value="">{tx('— guruhlanmasin —')}</option>{keys.map(k=><option key={k} value={k}>{k}</option>)}</select><small>{tx('Tanlansa, kartada shu qiymatlar bo‘yicha filtr tugmalari chiqadi.')}</small></label>
      </div>}
      <div className="ma-actions"><button className="btn dark" disabled={busy} onClick={save}><Upload size={15}/> {tx('Saqlash')}</button></div>
    </section>}
  </div>;
}
