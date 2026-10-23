'use client';
import LotsMap from './lots-map';

// Barcha xarita sahifalari (/map, /map/<slug>, eski /masterplan) bitta OpenStreetMap xaritasi komponentini ochadi;
// qaysi qatlam, hudud va obyektlar ko'rinishi admin → Xarita → «Xaritalar» da sozlanadi.
export default function MapExplorer({slug=''}:{slug?:string}){
  return <LotsMap slug={slug}/>;
}
