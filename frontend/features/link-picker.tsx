'use client';
import {useEffect,useMemo,useState} from 'react';
import {useLocale} from './locale-provider';
import {kinds as kindNames} from '../lib/data';

// «Nimaga bog'lash»: tayyor ro'yxatdan tanlanadi (hudud, loyiha, infratuzilma, hujjat va h.k.) yoki havola yoziladi.
// Natija oddiy manzil (/map?lot=…, /projects/…, https://…) — qo'lda yozish shart emas.
const PATHS:Record<string,string>={projects:'/projects',infrastructure:'/infrastructure',events:'/events',documents:'/documents',news:'/news',partners:'/partners',pages:'/pages',faqs:'/faq'};
type Mode='none'|'plot'|'content'|'page'|'map'|'url';
const PAGES:[string,string][]=[['/','Bosh sahifa'],['/about','Shaharcha haqida'],['/masterplan','Bosh reja'],['/investment','Investitsiya va hamkorlik'],['/projects','Loyihalar'],['/infrastructure','Infratuzilma'],['/construction','Loyihalar monitoringi'],['/news','Yangiliklar'],['/news#documents','Yangiliklardagi hujjatlar bo‘limi'],['/gallery','Galereya'],['/contact','Aloqa va murojaat'],['/pages','Axborot sahifalari']];

export function linkLabelOf(url:string):string{return url?url:''}
function detect(v:string):Mode{
  if(!v)return 'none';
  if(v.startsWith('/map?lot='))return 'plot';
  if(v.startsWith('/map/'))return 'map';
  if(PAGES.some(p=>p[0]===v))return 'page';
  if(/^\/[a-z-]+\/[A-Za-z0-9-]+$/.test(v)&&Object.values(PATHS).includes('/'+v.split('/')[1]))return 'content';
  return 'url';
}

export default function LinkPicker({value,onChange,label,compact=false}:{value:string;onChange:(url:string,title?:string)=>void;label?:string;compact?:boolean}){
  const {t:tx}=useLocale();
  const [mode,setMode]=useState<Mode>(detect(value));
  const [plots,setPlots]=useState<any[]|null>(null),[items,setItems]=useState<any[]|null>(null),[maps,setMaps]=useState<any[]|null>(null),[mapError,setMapError]=useState('');
  useEffect(()=>{setMode(m=>detect(value)==='none'&&m!=='none'?m:detect(value))},[value]);
  useEffect(()=>{
    if(mode==='plot'&&!plots)fetch('/api/plots',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then((d:any)=>setPlots(d)).catch(()=>setPlots([]));
    if(mode==='map'&&!maps)fetch('/api/maps',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then((d:any)=>setMaps(d.filter((m:any)=>m.published))).catch(()=>setMapError(tx('Xaritalar ro‘yxatini yuklab bo‘lmadi')));
    if(mode==='content'&&!items)fetch('/api/map/objects',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(async(o:any)=>{
      // Obyektlardan tashqari: hujjat, tadbir va h.k. ham tanlansin
      const pub:any=await fetch('/api/public',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
      setItems((pub?.items||o).filter((i:any)=>PATHS[i.kind]))
    }).catch(()=>setItems([]));
  },[mode,plots,items]);
  const plotId=value.startsWith('/map?lot=')?decodeURIComponent(value.slice(9)):'';
  const grouped=useMemo(()=>{const g:Record<string,any[]>={};for(const i of items||[])(g[i.kind]=g[i.kind]||[]).push(i);return g},[items]);
  return <div className={'lk'+(compact?' lk-compact':'')}>
    {label&&<span className="lk-label">{label}</span>}
    <div className="lk-row">
      <select value={mode} onChange={e=>{const m=e.target.value as Mode;setMode(m);if(m==='none')onChange('')}} aria-label={tx('Nimaga bog‘lash')}>
        <option value="none">{tx('Bog‘lanmagan')}</option>
        <option value="plot">{tx('Hududga')}</option>
        <option value="content">{tx('Loyiha / material')}</option>
        <option value="page">{tx('Sayt sahifasiga')}</option>
        <option value="map">{tx('Alohida xaritaga')}</option>
        <option value="url">{tx('Tashqi havola')}</option>
      </select>
      {mode==='plot'&&<select value={plotId} onChange={e=>{const p=(plots||[]).find(x=>x.id===e.target.value);onChange(e.target.value?'/map?lot='+encodeURIComponent(e.target.value):'',p?`${p.lotNumber||''} ${p.title||''}`.trim():undefined)}}>
        <option value="">{plots?tx('Hududni tanlang…'):'…'}</option>
        {(plots||[]).map(p=><option key={p.id} value={p.id}>{p.lotNumber||'—'} · {p.title}</option>)}
      </select>}
      {mode==='content'&&<select value={value} onChange={e=>{const i=(items||[]).find(x=>PATHS[x.kind]+'/'+x.id===e.target.value);onChange(e.target.value,i?.title)}}>
        <option value="">{items?tx('Materialni tanlang…'):'…'}</option>
        {Object.entries(grouped).map(([k,list])=><optgroup key={k} label={(kindNames as any)[k]||k}>{list.map(i=><option key={i.id} value={PATHS[k]+'/'+i.id}>{i.title}</option>)}</optgroup>)}
      </select>}
      {mode==='page'&&<select value={value} onChange={e=>onChange(e.target.value,PAGES.find(p=>p[0]===e.target.value)?.[1])}>
        <option value="">{tx('Sahifani tanlang…')}</option>
        {PAGES.map(([href,t])=><option key={href} value={href}>{tx(t)}</option>)}
      </select>}
      {mode==='map'&&<select value={value} onChange={e=>{const m=(maps||[]).find(x=>'/map/'+x.slug===e.target.value);onChange(e.target.value,m?.title)}}>
        <option value="">{maps?tx('Xaritani tanlang…'):'…'}</option>
        {(maps||[]).filter(m=>m.slug).map(m=><option key={m.id} value={'/map/'+m.slug}>{tx(m.title)} · /map/{m.slug}</option>)}
      </select>}
      {mode==='url'&&<input value={value} placeholder="https://… yoki /sahifa" maxLength={300} onChange={e=>onChange(e.target.value)} aria-label={tx('Havola manzili')}/>}
    </div>
    {mapError&&mode==='map'&&<small className="lk-error" role="alert">{mapError}</small>}
  </div>;
}
