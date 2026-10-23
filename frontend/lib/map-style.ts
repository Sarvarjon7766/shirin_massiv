import {plotStatuses,plotStatusMeta} from './plot-model';

// Hududlar xaritasi (ommaviy va admin) uchun umumiy MapLibre sozlamalari.
export const mapStyle=()=>({
  version:8 as const,
  glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources:{osm:{type:'raster' as const,tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors',maxzoom:19}},
  layers:[{id:'basemap',type:'raster' as const,source:'osm',paint:{'raster-saturation':-0.72,'raster-contrast':-0.06,'raster-brightness-min':0.16,'raster-brightness-max':0.94,'raster-opacity':0.68}}],
});

// Holat (statusKey yoki "paint" xossasi) bo'yicha rang ifodasi
export function statusColors(prop='paint'):any{
  const m:any[]=['match',['get',prop]];
  for(const k of plotStatuses)m.push(k,plotStatusMeta[k].color);
  m.push('#7b8f98');
  return m;
}
export const emptyCollection={type:'FeatureCollection' as const,features:[] as any[]};

export type Bounds=[number,number,number,number];
export function bboxOf(geometry:any):Bounds{
  let w=180,s=90,e=-180,n=-90;
  const visit=(c:any)=>{if(typeof c[0]==='number'){w=Math.min(w,c[0]);e=Math.max(e,c[0]);s=Math.min(s,c[1]);n=Math.max(n,c[1])}else c.forEach(visit)};
  visit(geometry.coordinates);return [w,s,e,n];
}
export function unionBounds(list:Bounds[]):Bounds|null{
  if(!list.length)return null;
  return list.reduce((a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])] as Bounds);
}
