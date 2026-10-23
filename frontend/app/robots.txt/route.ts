import {publicData} from '../../lib/server-data';
export const dynamic='force-dynamic';
export async function GET(req:Request){const {settings}=await publicData();const origin=settings.canonicalDomain||new URL(req.url).origin;return new Response(settings.indexable?'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /my-appeals\nSitemap: '+origin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}})}
