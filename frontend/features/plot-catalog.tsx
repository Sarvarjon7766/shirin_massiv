'use client';
import {useEffect,useMemo,useState} from 'react';
import {Search,MapPin,ArrowUpRight} from 'lucide-react';
import {useLocale} from './locale-provider';
import {statusList,statusInfo} from '../lib/map-status';
import {defaultMapConfig,type MapConfig} from '../lib/map-config';
import {effectiveStatus} from './lots-map';

// /investment: investorga xaritadagi hududlarning jadval ko'rinishi (yagona manba — xaritadagi hududlar).
// Har bir qator xaritadagi hudud kartasiga olib boradi; auksion, narx va muddat shu yerda ham ko'rinadi.
const PAGE=30;
export default function PlotCatalog(){
  const {t:tx,locale}=useLocale();
  const [rows,setRows]=useState<any[]>([]),[cfg,setCfg]=useState<MapConfig>(defaultMapConfig),[state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [q,setQ]=useState(''),[status,setStatus]=useState<string>(''),[limit,setLimit]=useState(PAGE);
  useEffect(()=>{
    let off=false;
    Promise.all([fetch('/api/map/lots.geojson',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('/api/map/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)])
      .then(([g,c]:any[])=>{if(off)return;setRows((g.features||[]).map((f:any)=>f.properties));if(c)setCfg({...defaultMapConfig,...c});setState('ready')})
      .catch(()=>{if(!off)setState('error')});
    return()=>{off=true};
  },[]);
  const fmt=useMemo(()=>new Intl.NumberFormat(({'uz':'uz-Latn-UZ','uz-Cyrl':'uz-Cyrl-UZ',ru:'ru-RU',en:'en-GB',zh:'zh-CN'} as Record<string,string>)[locale]||'uz-Latn-UZ',{maximumFractionDigits:2}),[locale]);
  const dateFmt=useMemo(()=>new Intl.DateTimeFormat(({'uz':'uz-Latn-UZ','uz-Cyrl':'uz-Cyrl-UZ',ru:'ru-RU',en:'en-GB',zh:'zh-CN'} as Record<string,string>)[locale]||'uz-Latn-UZ',{dateStyle:'medium'}),[locale]);
  const now=Date.now();
  const withStatus=useMemo(()=>rows.map(p=>({p,st:effectiveStatus(p,now)})),[rows]);
  const counts=useMemo(()=>{const c:Record<string,number>={};for(const r of withStatus)c[r.st]=(c[r.st]||0)+1;return c},[withStatus]);
  const filtered=useMemo(()=>{
    const s=q.trim().toLowerCase();
    return withStatus.filter(({p,st})=>(!status||st===status)&&(!s||[p.lotNumber,p.title,p.function,p.company,p.auction?.lotId].some((v:any)=>String(v||'').toLowerCase().includes(s))));
  },[withStatus,q,status]);
  const label=(k:string)=>tx(statusInfo(cfg,k).label);
  const color=(k:string)=>statusInfo(cfg,k).color;
  const area=filtered.reduce((s,r)=>s+(r.p.areaHa||0),0);
  if(state==='loading')return <p className="muted">{tx('Yuklanmoqda…')}</p>;
  if(state==='error')return <p className="muted">{tx('Hududlar ro‘yxatini yuklab bo‘lmadi.')}</p>;
  if(!rows.length)return <p className="muted">{tx('Hozircha nashr qilingan hududlar yo‘q')}</p>;
  return <div className="pc">
    <div className="pc-bar">
      <label className="pc-search"><Search size={16}/><input value={q} onChange={e=>{setQ(e.target.value);setLimit(PAGE)}} placeholder={tx('Raqam, nom, kompaniya yoki auksion lot raqami')} aria-label={tx('Qidiruv')}/></label>
      <div className="pc-chips" role="group" aria-label={tx('Holat')}>
        <button type="button" className={!status?'on':''} onClick={()=>{setStatus('');setLimit(PAGE)}}>{tx('Hammasi')} <b>{rows.length}</b></button>
        {statusList(cfg).map(s=>s.key).filter(k=>counts[k]).map(k=><button type="button" key={k} className={status===k?'on':''} aria-pressed={status===k} onClick={()=>{setStatus(status===k?'':k);setLimit(PAGE)}}><i style={{background:color(k)}}/>{label(k)} <b>{counts[k]}</b></button>)}
      </div>
      <div className="pc-sum"><span><b>{filtered.length}</b> {tx('ta hudud')}</span><span><b>{fmt.format(area)}</b> {tx('ga')}</span><a className="text-link" href="/map"><MapPin size={14}/> {tx('Xaritada ko‘rish')}</a></div>
    </div>
    {!filtered.length?<p className="muted">{tx('Hech narsa topilmadi')}</p>:<div className="pc-list" role="list">
      {filtered.slice(0,limit).map(({p,st})=>{
        const a=p.auction,deadline=st==='listed'&&a?.applicationDeadline?dateFmt.format(new Date(a.applicationDeadline)):'';
        const price=a?.startPrice?.amount?`${fmt.format(Number(a.startPrice.amount))} ${a.startPrice.currency||''}`:'';
        return <a role="listitem" key={p.id} className="pc-row" href={'/map?lot='+encodeURIComponent(p.id)}>
          <span className="pc-no">{p.lotNumber||'—'}</span>
          <span className="pc-main"><b>{p.function||p.title}</b><small>{[p.company,a?.lotId&&`${tx('Lot')} ${a.lotId}`].filter(Boolean).join(' · ')}</small></span>
          <span className="pc-area">{fmt.format(p.areaHa||0)} <small>{tx('ga')}</small></span>
          <span className="pc-price">{price&&<><b>{price}</b><small>{tx('Boshlang‘ich narx')}</small></>}{deadline&&<small>{tx('Ariza muddati')}: {deadline}</small>}</span>
          <span className="pc-st"><i style={{background:color(st)}}/>{label(st)}</span>
          <ArrowUpRight size={15}/>
        </a>;
      })}
    </div>}
    {filtered.length>limit&&<button type="button" className="btn outline pc-more" onClick={()=>setLimit(l=>l+PAGE)}>{tx('Yana ko‘rsatish')} ({filtered.length-limit})</button>}
    <p className="mx-muted pc-note">{tx('Chegaralar sxematik; rasmiy kadastr hujjati emas. Auksion shartlari rasmiy auksion platformasida.')}</p>
  </div>;
}
