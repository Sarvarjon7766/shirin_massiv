'use client';
import {useEffect,useRef,useState} from 'react';
import {MapPin,X} from 'lucide-react';
import {useLocale} from './locale-provider';
import {mapStyle} from '../lib/map-style';

// Kontent formasida: xaritani bosib obyekt joylashuvini (latitude/longitude) belgilash. Marker sudralib to'g'rilanadi.
const num=(v:any)=>{if(v===''||v===null||v===undefined)return null;const n=Number(v);return Number.isFinite(n)?n:null};

export default function LocationPicker({lat,lng,onChange}:{lat:any;lng:any;onChange:(lat:number|'',lng:number|'')=>void}){
  const {t:tx}=useLocale();
  const box=useRef<HTMLDivElement>(null),map=useRef<any>(null),marker=useRef<any>(null),lib=useRef<any>(null),change=useRef(onChange),[ready,setReady]=useState(false);
  change.current=onChange;
  const la=num(lat),ln=num(lng),has=la!==null&&ln!==null&&Math.abs(la)<=85&&Math.abs(ln)<=180;

  useEffect(()=>{
    let cancelled=false,instance:any;
    (async()=>{
      let view={lng:67.0015,lat:39.7123,zoom:14};
      try{const c:any=await fetch('/api/map/config',{cache:'no-store'}).then(r=>r.json());if(c?.view)view=c.view}catch{}
      const mod:any=await import('maplibre-gl');const maplibre=mod.default||mod;
      if(cancelled||!box.current)return;
      lib.current=maplibre;
      instance=new maplibre.Map({container:box.current,style:mapStyle(),center:has?[ln!,la!]:[view.lng,view.lat],zoom:has?15:view.zoom,attributionControl:{compact:true}});
      map.current=instance;
      instance.addControl(new maplibre.NavigationControl({showCompass:false}),'top-right');
      instance.on('click',(e:any)=>change.current(Number(e.lngLat.lat.toFixed(6)),Number(e.lngLat.lng.toFixed(6))));
      instance.on('load',()=>setReady(true));
    })();
    return()=>{cancelled=true;marker.current?.remove();marker.current=null;instance?.remove();map.current=null;setReady(false)};
  },[]);

  // Marker lat/lng bilan sinxron
  useEffect(()=>{
    if(!ready||!map.current||!lib.current)return;
    if(!has){marker.current?.remove();marker.current=null;return}
    if(!marker.current){
      marker.current=new lib.current.Marker({draggable:true,color:'#d94a43'}).setLngLat([ln,la]).addTo(map.current);
      marker.current.on('dragend',()=>{const p=marker.current.getLngLat();change.current(Number(p.lat.toFixed(6)),Number(p.lng.toFixed(6)))});
    }else marker.current.setLngLat([ln,la]);
  },[ready,has,la,ln]);

  return <div className="lp">
    <span className="lp-label">{tx('Xaritadagi joylashuv')}</span>
    <div className="lp-map" ref={box} role="application" aria-label={tx('Joylashuvni belgilash uchun xaritani bosing')}/>
    <div className="lp-foot">
      <MapPin size={14}/>
      {has?<span>{la!.toFixed(6)}, {ln!.toFixed(6)}</span>:<span className="muted">{tx('Joylashuvni belgilash uchun xaritani bosing')}</span>}
      {has&&<button type="button" className="icon-btn" onClick={()=>onChange('','')} title={tx('Joylashuvni olib tashlash')}><X size={14}/></button>}
    </div>
  </div>;
}
