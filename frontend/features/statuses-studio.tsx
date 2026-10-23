'use client';
import {useEffect,useState} from 'react';
import {Plus,Trash2,Save,RotateCcw,ArrowUp,ArrowDown} from 'lucide-react';
import {useLocale} from './locale-provider';
import {plotStatuses,plotStatusMeta} from '../lib/plot-model';
import {defaultMapConfig,type MapConfig,type CustomStatus,type CategorySetting} from '../lib/map-config';

// Admin → «Holat va toifalar»: hududlar (hududlar) holatlari va toifalarini kontent menejer o'zi boshqaradi.
// Holat — hudud hozir qanday (bo'sh, kutishda, sotuvda, sotilgan…). Toifa — hudud nima uchun mo'ljallangan (turar-joy, noturar-joy, restoran, tashkilot…).
async function api(path:string,method='GET',body?:any):Promise<any>{
  const res=await fetch('/api/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data:any=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||'Amal bajarilmadi');
  return data;
}
const rid=()=>Math.random().toString(36).slice(2,8).padEnd(6,'x');
const slug=(s:string)=>s.toLowerCase().replace(/[‘’ʻʼ'`]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,20);
const STATUS_PRESETS=['Bo‘sh','Kutishda','Sotuvda','Olingan','Ijarada'];
const CAT_PRESETS:[string,string][]=[['Turar-joy','#f28c28'],['Noturar-joy','#2f4b9b'],['Restoran va kafe','#c04a8e'],['Tashkilotlar','#1a9bb0'],['Savdo','#e04f5f'],['Ta’lim','#2e9d5b'],['Davlat idoralari','#5b6b73'],['Sport va dam olish','#7cb342']];

export default function StatusesStudio(){
  const {t:tx}=useLocale();
  const [cfg,setCfg]=useState<MapConfig>(defaultMapConfig),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  useEffect(()=>{api('mapconfig').then(c=>setCfg({...defaultMapConfig,...c})).catch(e=>setError(e.message))},[]);
  const patch=(fn:(c:MapConfig)=>MapConfig)=>{setCfg(prev=>fn(structuredClone(prev)));setDirty(true);setMessage('')};
  const setSys=(k:string,v:any)=>patch(c=>{const cur=c.statuses[k]||{visible:true,label:'',color:''};c.statuses[k]={...cur,...v};return c});
  const setCustom=(i:number,v:Partial<CustomStatus>)=>patch(c=>{c.customStatuses[i]={...c.customStatuses[i],...v};return c});
  const addCustom=(label='')=>patch(c=>{if(c.customStatuses.length>=20)return c;c.customStatuses.push({key:'c-'+rid(),label,color:'#7b8f98',visible:true});return c});
  const setCat=(i:number,v:Partial<CategorySetting>)=>patch(c=>{c.categories[i]={...c.categories[i],...v};return c});
  const addCat=(label='',color='#7b8f98')=>patch(c=>{if(c.categories.length>=40)return c;let key=slug(label)||'toifa';if(key.length<2)key='toifa';while(c.categories.some(x=>x.key===key))key=(slug(label)||'toifa').slice(0,20)+'-'+rid().slice(0,3);c.categories.push({key,label,color});return c});
  const moveCat=(i:number,d:-1|1)=>patch(c=>{const j=i+d;if(j<0||j>=c.categories.length)return c;[c.categories[i],c.categories[j]]=[c.categories[j],c.categories[i]];return c});
  async function save(){
    setBusy(true);setError('');setMessage('');
    try{
      const body={statuses:cfg.statuses,customStatuses:cfg.customStatuses.filter(s=>s.label.trim()),categories:cfg.categories.filter(c=>c.label.trim()),colorBy:cfg.colorBy};
      const r=await api('mapconfig','POST',body);setCfg({...defaultMapConfig,...r.config});setDirty(false);setMessage(tx('Saqlandi. Xaritada bir necha soniyada yangilanadi.'));
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="ma-layers">
    <section className="panel ma-card">
      <div className="ma-head"><div><h3>{tx('Hudud holatlari')}</h3><p className="muted">{tx('Holat — hudud hozir qanday: bo‘sh, kutishda, sotuvda, sotilgan… Xaritada shu rangda chiqadi. Tizim holatlari auksion bilan ishlaydi (nomi va rangini o‘zgartirish mumkin); o‘zingiz yangi holat ham qo‘shishingiz mumkin.')}</p></div>
        <button className="btn dark small" onClick={()=>addCustom()}><Plus size={14}/> {tx('Yangi holat')}</button></div>
      <div className="ma-status">
        {plotStatuses.map(k=>{const s=cfg.statuses[k]||{visible:true,label:'',color:''};return <div key={k} className="ma-srow ma-srow-x">
          <label className="ma-check"><input type="checkbox" checked={s.visible!==false} onChange={e=>setSys(k,{visible:e.target.checked})}/> <span>{tx(plotStatusMeta[k].label)}</span></label>
          <input value={s.label} placeholder={tx('Boshqa nom (ixtiyoriy)')} maxLength={60} onChange={e=>setSys(k,{label:e.target.value})} aria-label={tx('Nom')}/>
          <span className="ma-color"><input type="color" value={s.color||plotStatusMeta[k].color} onChange={e=>setSys(k,{color:e.target.value})} aria-label={tx('Rang')}/>{s.color&&<button type="button" className="icon-btn" title={tx('Standart rangga qaytarish')} onClick={()=>setSys(k,{color:''})}><RotateCcw size={13}/></button>}</span>
          <span className="ma-badge">{tx('tizim')}</span>
        </div>})}
        {cfg.customStatuses.map((s,i)=><div key={s.key} className="ma-srow ma-srow-x">
          <label className="ma-check"><input type="checkbox" checked={s.visible} onChange={e=>setCustom(i,{visible:e.target.checked})}/> <span>{tx('Ko‘rsatish')}</span></label>
          <input value={s.label} placeholder={tx('Holat nomi (masalan: Ijarada)')} maxLength={60} onChange={e=>setCustom(i,{label:e.target.value})} aria-label={tx('Nom')}/>
          <span className="ma-color"><input type="color" value={s.color} onChange={e=>setCustom(i,{color:e.target.value})} aria-label={tx('Rang')}/></span>
          <button type="button" className="icon-btn" onClick={()=>patch(c=>{c.customStatuses.splice(i,1);return c})} title={tx('O‘chirish')}><Trash2 size={14}/></button>
        </div>)}
      </div>
      <div className="ma-presets"><span className="muted">{tx('Tez qo‘shish')}:</span>{STATUS_PRESETS.filter(p=>!cfg.customStatuses.some(s=>s.label===p)).map(p=><button key={p} type="button" className="btn outline small" onClick={()=>addCustom(p)}><Plus size={12}/> {tx(p)}</button>)}</div>
      <p className="muted">{tx('O‘chirilgan holatdagi hududlar «Ma’lumot yo‘q» holatiga o‘tadi.')}</p>
    </section>

    <section className="panel ma-card">
      <div className="ma-head"><div><h3>{tx('Toifalar (hudud turi)')}</h3><p className="muted">{tx('Toifa — hudud nima uchun mo‘ljallangan: turar-joy, noturar-joy, restoran, tashkilotlar… Har bir hududga bir yoki bir nechta toifa beriladi (Hududlar sahifasida). Xaritada filtr va rang sifatida chiqadi.')}</p></div>
        <button className="btn dark small" onClick={()=>addCat()}><Plus size={14}/> {tx('Yangi toifa')}</button></div>
      <div className="ma-status">
        {cfg.categories.map((c,i)=><div key={c.key} className="ma-srow ma-srow-x">
          <span className="ma-color"><input type="color" value={c.color} onChange={e=>setCat(i,{color:e.target.value})} aria-label={tx('Rang')}/></span>
          <input value={c.label} placeholder={tx('Toifa nomi')} maxLength={60} onChange={e=>setCat(i,{label:e.target.value})} aria-label={tx('Nom')}/>
          <button type="button" className="icon-btn" disabled={i===0} onClick={()=>moveCat(i,-1)} title={tx('Yuqoriga')}><ArrowUp size={14}/></button>
          <button type="button" className="icon-btn" disabled={i===cfg.categories.length-1} onClick={()=>moveCat(i,1)} title={tx('Pastga')}><ArrowDown size={14}/></button>
          <button type="button" className="icon-btn" onClick={()=>patch(c2=>{c2.categories.splice(i,1);return c2})} title={tx('O‘chirish')}><Trash2 size={14}/></button>
        </div>)}
        {!cfg.categories.length&&<p className="muted">{tx('Hali toifa yo‘q. Quyidagi namunalardan tanlang yoki «Yangi toifa» ni bosing.')}</p>}
      </div>
      <div className="ma-presets"><span className="muted">{tx('Tez qo‘shish')}:</span>{CAT_PRESETS.filter(([n])=>!cfg.categories.some(c=>c.label===n)).map(([n,col])=><button key={n} type="button" className="btn outline small" onClick={()=>addCat(n,col)}><Plus size={12}/> {tx(n)}</button>)}</div>
    </section>

    <section className="panel ma-card">
      <h3>{tx('Xarita qanday ranglansin?')}</h3>
      <p className="muted">{tx('Foydalanuvchi xaritaning o‘zida ham ikkalasini almashtira oladi; bu — boshlang‘ich holat.')}</p>
      <div className="ma-checks">
        <label className="ma-check"><input type="radio" name="colorBy" checked={cfg.colorBy!=='category'} onChange={()=>patch(c=>{c.colorBy='status';return c})}/> {tx('Holat bo‘yicha (bo‘sh, sotuvda, sotilgan…)')}</label>
        <label className="ma-check"><input type="radio" name="colorBy" checked={cfg.colorBy==='category'} onChange={()=>patch(c=>{c.colorBy='category';return c})}/> {tx('Toifa bo‘yicha (turar-joy, noturar-joy…)')}</label>
      </div>
    </section>
    {(message||error)&&<p className={'ma-msg'+(error?' err':'')} role={error?'alert':'status'}>{error||message}</p>}
    <div className="ma-actions ma-sticky"><button className="btn dark" disabled={busy||!dirty} onClick={save}><Save size={15}/> {tx('Saqlash')}</button>{dirty&&<span className="muted">{tx('Saqlanmagan o‘zgarish bor')}</span>}</div>
  </div>;
}
