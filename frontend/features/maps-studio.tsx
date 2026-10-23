'use client';
import {useCallback,useEffect,useState} from 'react';
import {Plus,Trash2,Pencil,Eye,EyeOff,ArrowUp,ArrowDown,X,ExternalLink,Save} from 'lucide-react';
import {useLocale} from './locale-provider';
import {objectKinds} from '../lib/map-config';
import {kinds as kindNames} from '../lib/data';

// Admin → Xarita → «Xaritalar»: bir nechta alohida xarita. Har biri o'z manzili (/map/<nom>), nomi, hudud
// ko'rinishi, obyekt turlari va qatlamlar to'plamiga ega (masalan: Investitsiya, Bosh reja, Metro va transport, Ijara).
async function api(path:string,method='GET',body?:any):Promise<any>{
  const res=await fetch('/api/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data:any=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Amal bajarilmadi');
  return data;
}
const slugify=(s:string)=>s.toLowerCase().replace(/[‘’ʻʼ'`]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
const PRESETS:{title:string;description:string;showPlots:boolean;kinds:string[]}[]=[
  {title:'Investitsiya xaritasi',description:'Auksion hududlari, holati va narxi.',showPlots:true,kinds:['lots']},
  {title:'Bosh reja',description:'Loyihalar, hududlar va infratuzilma.',showPlots:false,kinds:['projects','zones','infrastructure']},
  {title:'Transport va metro',description:'Metro, yo‘llar va bekatlar.',showPlots:false,kinds:[]},
];
type Form={title:string;slug:string;description:string;showPlots:boolean;objectKinds:string[];layerIds:string[];published:boolean};
const empty=():Form=>({title:'',slug:'',description:'',showPlots:true,objectKinds:[...objectKinds],layerIds:[],published:true});

export default function MapsStudio(){
  const {t:tx}=useLocale();
  const [rows,setRows]=useState<any[]>([]),[layers,setLayers]=useState<any[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [form,setForm]=useState<Form|null>(null),[editing,setEditing]=useState(''),[slugTouched,setSlugTouched]=useState(false),[busy,setBusy]=useState(false);
  const reload=useCallback(async()=>{try{const [m,l]=await Promise.all([api('maps'),api('maplayers')]);setRows(m);setLayers(l);setError('')}catch(e:any){setError(e.message)}finally{setLoading(false)}},[]);
  useEffect(()=>{reload()},[reload]);
  const ok=(t:string)=>{setMessage(t);setError('')};
  const fail=(e:any)=>{setError(e?.message||'Xatolik');setMessage('')};
  const close=()=>{setForm(null);setEditing('');setSlugTouched(false)};
  const open=(r?:any)=>{setMessage('');setError('');if(!r){setForm(empty());setEditing('');setSlugTouched(false);return}setForm({title:r.title,slug:r.slug,description:r.description||'',showPlots:r.showPlots!==false,objectKinds:r.objectKinds||[],layerIds:r.layerIds||[],published:!!r.published});setEditing(r.id);setSlugTouched(true)};
  const set=<K extends keyof Form>(k:K,v:Form[K])=>setForm(prev=>prev&&({...prev,[k]:v}));
  const toggleIn=(k:'objectKinds'|'layerIds',id:string)=>setForm(prev=>prev&&({...prev,[k]:prev[k].includes(id)?prev[k].filter(x=>x!==id):[...prev[k],id]}));
  async function save(){
    if(!form)return;setBusy(true);
    try{const body={...form,slug:form.slug||slugify(form.title)};if(editing)await api('maps/'+editing,'PATCH',body);else await api('maps','POST',body);close();ok(tx('Saqlandi'));await reload()}
    catch(e){fail(e)}finally{setBusy(false)}
  }
  async function remove(r:any){if(!confirm(tx('Xaritani o‘chirish?')+' '+r.title))return;try{await api('maps/'+r.id,'DELETE');if(editing===r.id)close();ok(tx('O‘chirildi'));await reload()}catch(e){fail(e)}}
  async function toggle(r:any){try{await api('maps/'+r.id,'PATCH',{published:!r.published});await reload()}catch(e){fail(e)}}
  async function move(i:number,dir:-1|1){const j=i+dir;if(j<0||j>=rows.length)return;const ids=rows.map(r=>r.id);[ids[i],ids[j]]=[ids[j],ids[i]];try{await api('maps/reorder','POST',{ids});await reload()}catch(e){fail(e)}}

  return <div className="ma-layers">
    <section className="panel ma-card">
      <div className="ma-head"><div><h3>{tx('Xaritalar')}</h3><p className="muted">{tx('Har bir xarita alohida sahifa: o‘z nomi, o‘z qatlamlari va obyektlari bor. Saytda yuqorida almashtirgich chiqadi. Birinchi xarita — /map ning o‘zi.')}</p></div>
        <button className="btn dark small" onClick={()=>open()}><Plus size={14}/> {tx('Yangi xarita')}</button></div>
      {(message||error)&&<p className={'ma-msg'+(error?' err':'')} role={error?'alert':'status'}>{error||message}</p>}
      {loading?<p className="muted">…</p>:!rows.length?<div className="ma-empty">
        <p className="muted">{tx('Hozircha alohida xarita yaratilmagan: sayt hamma narsani bitta xaritada ko‘rsatadi. Boshlash uchun namunani tanlang:')}</p>
        <div className="ma-presets">{PRESETS.map(p=><button key={p.title} type="button" className="btn outline small" onClick={()=>{setForm({...empty(),title:p.title,slug:slugify(p.title),description:p.description,showPlots:p.showPlots,objectKinds:p.kinds});setEditing('');setSlugTouched(false)}}><Plus size={13}/> {tx(p.title)}</button>)}</div>
      </div>:<ul className="ma-list">{rows.map((r,i)=><li key={r.id} className={editing===r.id?'on':''}>
        <div className="ma-li-main"><b>{r.title}</b><small>/map{i===0?'':'/'+r.slug} · {r.showPlots?tx('hududlar bor'):tx('hududsiz')} · {(r.layerIds||[]).length} {tx('ta qatlam')} · {(r.objectKinds||[]).length} {tx('tur obyekt')}</small></div>
        <button className="icon-btn" disabled={i===0} onClick={()=>move(i,-1)} title={tx('Yuqoriga')}><ArrowUp size={15}/></button>
        <button className="icon-btn" disabled={i===rows.length-1} onClick={()=>move(i,1)} title={tx('Pastga')}><ArrowDown size={15}/></button>
        <button className="icon-btn" onClick={()=>toggle(r)} title={tx(r.published?'Yashirish':'Ko‘rsatish')}>{r.published?<Eye size={15}/>:<EyeOff size={15}/>}</button>
        <a className="icon-btn" href={'/map'+(i===0?'':'/'+r.slug)} target="_blank" rel="noopener noreferrer" title={tx('Saytda ochish')}><ExternalLink size={15}/></a>
        <button className="icon-btn" onClick={()=>open(r)} title={tx('Tahrirlash')}><Pencil size={15}/></button>
        <button className="icon-btn" onClick={()=>remove(r)} title={tx('O‘chirish')}><Trash2 size={15}/></button></li>)}</ul>}
    </section>
    {form&&<section className="panel ma-card">
      <div className="ma-head"><h3>{tx(editing?'Xaritani tahrirlash':'Yangi xarita')}</h3><button className="icon-btn" onClick={close} title={tx('Yopish')}><X size={16}/></button></div>
      <div className="ma-grid">
        <label className="ma-field">{tx('Nomi')}<input value={form.title} maxLength={80} onChange={e=>{set('title',e.target.value);if(!slugTouched)set('slug',slugify(e.target.value))}}/></label>
        <label className="ma-field">{tx('Manzil (/map/…)')}<input value={form.slug} maxLength={40} onChange={e=>{setSlugTouched(true);set('slug',slugify(e.target.value))}}/><small>/map/{form.slug||'…'}</small></label>
        <div style={{gridColumn:'1/-1'}}><label className="ma-field">{tx('Qisqa izoh (sarlavha ostida)')}<input value={form.description} maxLength={300} onChange={e=>set('description',e.target.value)}/></label></div>
      </div>
      <div className="ma-block"><h4>{tx('Bu xaritada nimalar ko‘rinadi?')}</h4>
        <label className="ma-check"><input type="checkbox" checked={form.showPlots} onChange={e=>set('showPlots',e.target.checked)}/> <b>{tx('Hududlar (lotlar)')}</b> <small>{tx('— holat bo‘yicha ranglangan, auksion va narxi bilan')}</small></label>
        <div className="ma-sub-h">{tx('Kontent obyektlari')}</div>
        <div className="ma-checks">{objectKinds.map(k=><label className="ma-check" key={k}><input type="checkbox" checked={form.objectKinds.includes(k)} onChange={()=>toggleIn('objectKinds',k)}/> {(kindNames as any)[k]||k}</label>)}</div>
        <div className="ma-sub-h">{tx('Qatlamlar (zona, metro, yo‘l, reja rasmi)')}</div>
        {!layers.length?<p className="muted">{tx('Hali qatlam yo‘q. «Qatlamlar» tabida yarating.')}</p>:<div className="ma-checks">{layers.map(l=><label className="ma-check" key={l.id}><input type="checkbox" checked={form.layerIds.includes(l.id)} onChange={()=>toggleIn('layerIds',l.id)}/> <i style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:l.color,marginRight:6}}/>{l.title}</label>)}</div>}
      </div>
      <label className="ma-check"><input type="checkbox" checked={form.published} onChange={e=>set('published',e.target.checked)}/> {tx('Ommaga ko‘rsatish')}</label>
      <div className="ma-actions"><button className="btn dark" disabled={busy||!form.title.trim()} onClick={save}><Save size={15}/> {tx('Saqlash')}</button></div>
    </section>}
  </div>;
}
