import type {Metadata} from 'next';
import {cookies} from 'next/headers';
import Portal from '../../features/portal';
import {publicData,routeKinds} from '../../lib/server-data';
import {validLocale,localizeSettings,localizeItem,localeCodes} from '../../lib/i18n';
export const dynamic='force-dynamic';
type Props={params:Promise<{path?:string[]}>;searchParams:Promise<{lang?:string;q?:string}>};
async function language(props:Props,settings:any){const q=await props.searchParams;const jar=await cookies();return validLocale(q?.lang||jar.get('shirin-lang')?.value||settings.defaultLocale)}
export async function generateMetadata(props:Props):Promise<Metadata>{const {path=[]}=await props.params;const data=await publicData();const locale=await language(props,data.settings),settings=localizeSettings(data.settings,locale);const secret=['admin','my-appeals'].includes(path[0]);const found=path[1]?data.items.find((i:any)=>i.id===path[1]&&i.kind===routeKinds[path[0]]):null;const item=found?localizeItem(found,locale,data.settings):null;const title=item?.title||settings.seoTitle,description=item?.summary||settings.seoDescription;const base=settings.canonicalDomain||'https://shirin-city-design.alivedrum4.chatgpt.site';return {metadataBase:new URL(base),title,description,robots:secret||!settings.indexable?{index:false,follow:false}:{index:true,follow:true},alternates:{canonical:base+'/'+path.join('/')+'?lang='+locale,languages:Object.fromEntries(localeCodes.map(l=>[l==='zh'?'zh-Hans':l,base+'/'+path.join('/')+'?lang='+l]))},openGraph:{title,description,type:'website',locale,images:[item?.image||settings.heroImage]},verification:settings.searchConsoleVerification?{google:settings.searchConsoleVerification}:undefined}}
export default async function Page(props:Props){const [data,search]=await Promise.all([publicData(),props.searchParams]);return <Portal initialData={data} initialLocale={await language(props,data.settings)} initialSearchQuery={search.q||''}/>}
