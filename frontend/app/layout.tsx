import type {Metadata} from 'next';
import {cookies} from 'next/headers';
import {validLocale} from '../lib/i18n';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
export const metadata:Metadata={title:'Shirin — shahar va imkoniyatlar portali',description:'Shirin shaharchasi: loyihalar, investitsiyalar, infratuzilma va boshqaruv portali.'};
export default async function RootLayout({children}:{children:React.ReactNode}){const jar=await cookies();return <html lang={validLocale(jar.get('shirin-lang')?.value)} translate="no" suppressHydrationWarning><head><meta name="google" content="notranslate"/><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('shirin-theme')||'system';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.style.colorScheme=document.documentElement.dataset.theme}catch(e){}"}}/></head><body>{children}</body></html>}
