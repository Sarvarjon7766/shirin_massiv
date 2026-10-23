import {plotStatuses,plotStatusMeta,type PlotStatus} from './plot-model';
import type {MapConfig} from './map-config';

// Hudud holatlari: tizim holatlari (auksion mantiqi bilan) + kontent menejer qo'shgan o'z holatlari.
// Nomi va rangini menejer admin → Xarita → «Holat va toifalar» da o'zgartiradi.
export type StatusInfo={key:string;label:string;color:string;visible:boolean;system:boolean};
export function statusList(cfg:MapConfig):StatusInfo[]{
  const sys=plotStatuses.map(k=>({key:k as string,label:cfg.statuses?.[k]?.label||plotStatusMeta[k].label,color:cfg.statuses?.[k]?.color||plotStatusMeta[k].color,visible:cfg.statuses?.[k]?.visible!==false,system:true}));
  const custom=(cfg.customStatuses||[]).map(c=>({key:c.key,label:c.label,color:c.color,visible:c.visible!==false,system:false}));
  return [...sys,...custom];
}
export const statusInfo=(cfg:MapConfig,key:string):StatusInfo=>statusList(cfg).find(s=>s.key===key)||{key,label:key,color:'#7b8f98',visible:true,system:false};
export const isSystemStatus=(k:string):k is PlotStatus=>(plotStatuses as readonly string[]).includes(k);
// Toifa (turar-joy, noturar-joy, restoran, tashkilot va h.k.): menejer boshqaradigan ro'yxat
export const categoryInfo=(cfg:MapConfig,key:string)=>(cfg.categories||[]).find(c=>c.key===key);
export const plotColorByCategory=(cfg:MapConfig,keys:string[]|undefined)=>{for(const k of keys||[]){const c=categoryInfo(cfg,k);if(c)return c.color}return '#7b8f98'};
export function statusMatch(cfg:MapConfig,prop='paint'):any{const m:any[]=['match',['get',prop]];for(const s of statusList(cfg))m.push(s.key,s.color);m.push('#7b8f98');return m}
