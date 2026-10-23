'use client';
import {useEffect} from 'react';

// Telefonda jadvallar kartochka ko'rinishiga o'tadi (CSS). Har bir katakka ustun nomi `data-label` sifatida yoziladi.
// Jadval qayta chizilganda (qidiruv, filtr, yangilash) belgilar avtomatik qayta qo'yiladi.
export default function TableLabels(){
  useEffect(()=>{
    const root=document.querySelector('.admin-main')||document.body;
    const run=()=>{
      root.querySelectorAll('table').forEach(t=>{
        const heads=[...t.querySelectorAll('thead th')].map(h=>(h.textContent||'').trim());
        t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{const v=heads[i]||'';if(td.getAttribute('data-label')!==v)td.setAttribute('data-label',v)}));
      });
    };
    let raf=0;const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(run)};
    run();const mo=new MutationObserver(schedule);mo.observe(root,{childList:true,subtree:true});
    return()=>{mo.disconnect();cancelAnimationFrame(raf)};
  },[]);
  return null;
}
