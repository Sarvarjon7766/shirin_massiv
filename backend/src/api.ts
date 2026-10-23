import {sanitizeTranslations} from './shared/i18n';
import {extendedDefaults,sanitizeConfig,safeAssetUrl,publicItem,youtubeEmbed} from './shared/site-config';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {col,filesBucket} from './db';
import {normalizePlot,featureToInput,plotFeature} from './plots';
import {samplePlots} from './plot-samples';
import {normalizeMap,publicMap} from './maps';
import {normalizeLayer,layerMeta,publicLayerMeta} from './map-layers';
import {sanitizeMapConfig,defaultMapConfig} from './shared/map-config';
import {plotStatuses} from './shared/plot-model';
import {sessionActor,destroyMemberSessions} from './auth/session';
import {handleAuth} from './auth/routes';
import {sha256} from './auth/password';
import {hashPassword,passwordError,normalizeLogin,loginOk,LOGIN_HINT} from './auth/password';
import {geographicPoint,polygonGeometry} from './shared/map-data';
import {samples,defaults,kinds} from './shared/data';
import {canEdit,canApprove,canOperate,allowedStatus,normalizeRole,canViewStatistics,statsScopes,defaultStatsScopes} from './shared/permissions';
const now=()=>new Date().toISOString();const uid=()=>crypto.randomUUID();
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
type Opts={sort?:any;limit?:number;projection?:any};
const find=async(name:string,filter:any={},o:Opts={})=>{let c=(await col(name)).find(filter,{projection:o.projection||{_id:0}});if(o.sort)c=c.sort(o.sort);if(o.limit)c=c.limit(o.limit);return await c.toArray() as any[]};
const one=async(name:string,filter:any)=>await (await col(name)).findOne(filter,{projection:{_id:0}}) as any;
const upsert=async(name:string,filter:any,set:any,onInsert:any={})=>(await col(name)).updateOne(filter,{...(Object.keys(set).length?{$set:set}:{}),...(Object.keys(onInsert).length?{$setOnInsert:onInsert}:{})},{upsert:true});
const setSetting=(key:string,value:string)=>upsert('settings',{key},{value});
const esc=(x:string)=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const contentUses=(ref:string,onlyPublished=false)=>one('content',{...(onlyPublished?{status:'published'}:{}),$or:[{image:ref},{data:{$regex:esc(ref)}},{body:{$regex:esc(ref)}}]});
const siteUses=(ref:string)=>one('settings',{key:'site',value:{$regex:esc(ref)}});
const extraStatuses=async()=>(await mapConfig()).customStatuses.map(c=>c.key);
const mapConfig=async()=>{const raw=await one('settings',{key:'map:config'});let stored:any={};try{stored=raw?JSON.parse(raw.value):{}}catch{}return sanitizeMapConfig(stored,defaultMapConfig)};
const sitePrevious=async()=>JSON.parse((await one('settings',{key:'site'}))?.value||'{}');
const groupCount=async(name:string,key:string)=>(await (await col(name)).aggregate([{$group:{_id:'$'+key,total:{$sum:1}}}]).toArray()).map(r=>({[key]:r._id,total:r.total}));
const parse=(x:any)=>{try{const v=JSON.parse(x||'{}');return v&&typeof v==='object'?v:{}}catch{return {}}};
const num=(x:any)=>Number(x)||0;
const bodyLimit=(path:string[])=>path[0]==='upload'?101*1024*1024:path[0]==='settings'?2000000:path[0]==='plots'&&path[1]==='import'?12*1024*1024:path[0]==='maplayers'?8*1024*1024:300000;
const bumpMapRevision=()=>setSetting('map:revision',uid().replace(/-/g,'').slice(0,24));
const unpack=(r:any)=>({...r,data:JSON.parse(r.data||'{}')});
function clean(x:any,n=5000){return typeof x==='string'?x.trim().slice(0,n):''}
function url(x:any){return safeAssetUrl(x)}
const actor=(req:Request)=>sessionActor(req);
async function log(a:any,action:string,target:string){await (await col('audit')).insertOne({id:uid(),actor:a.email,action,target,created:now()})}
async function permittedScopes(a:any){if(a.role==='superadmin')return Object.keys(statsScopes);const saved=await one('settings',{key:'stats:'+a.memberId});return saved?JSON.parse(saved.value).filter((k:string)=>k in statsScopes):defaultStatsScopes}
async function statistics(a:any){const scopes=await permittedScopes(a),result:any={scopes,generatedAt:now()};
if(scopes.includes('content'))result.content=(await (await col('content')).aggregate([{$group:{_id:{kind:'$kind',status:'$status'},total:{$sum:1}}}]).toArray()).map(r=>({kind:r._id.kind,status:r._id.status,total:r.total}));
if(scopes.includes('construction')){const g=new Map<string,{total:number;sum:number}>();for(const r of await find('content',{kind:'projects'},{projection:{_id:0,data:1}})){const d=parse(r.data),k=String(d.stage??'planned'),e=g.get(k)||{total:0,sum:0};e.total++;e.sum+=num(d.progress);g.set(k,e)}result.construction=[...g].map(([stage,e])=>({stage,total:e.total,progress:Math.round(e.sum/e.total*10)/10}))}
if(scopes.includes('investments')){const g=new Map<string,{total:number;area:number}>();for(const r of await find('content',{kind:'lots'},{projection:{_id:0,data:1}})){const d=parse(r.data),k=String(d.availability??'available'),e=g.get(k)||{total:0,area:0};e.total++;e.area+=num(d.area);g.set(k,e)}result.investments=[...g].map(([availability,e])=>({availability,total:e.total,area:Math.round(e.area*100)/100}))}
if(scopes.includes('appeals'))result.appeals=await groupCount('appeals','status');
if(scopes.includes('tasks'))result.tasks={groups:await groupCount('tasks','status'),overdue:await (await col('tasks')).countDocuments({status:{$ne:'closed'},deadline:{$lt:now().slice(0,10)}})};
return result}
async function staffMembers(){const rows=await find('members',{role:{$ne:'visitor'}},{sort:{created:1}});for(const m of rows){m.role=normalizeRole(m.role);m.hasPassword=!!m.passwordHash;delete m.passwordHash;m.statsScopes=m.role==='admin'?await permittedScopes({role:m.role,memberId:m.id}):[]}return rows}
async function handle(req:Request){try{
const path=new URL(req.url).pathname.replace(/^\/api\//,'').split('/');const method=req.method;
if(method!=='GET'&&method!=='HEAD'){if(Number(req.headers.get('content-length')||0)>bodyLimit(path))return json({error:'So‘rov hajmi juda katta'},413);const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'So‘rov manbasi mos emas'},403);if(path[0]!=='upload'&&!(req.headers.get('content-type')||'').includes('application/json'))return json({error:'JSON kerak'},415)}
const a=await actor(req);const member=!!a&&a.role!=='visitor';
if(path[0]==='auth'){const r=await handleAuth(req,path,a);if(r)return r}
if(path[0]==='files'&&(method==='GET'||method==='HEAD')){
const f=await one('assets',{id:path[1]||''});if(!f)return json({error:'Fayl topilmadi'},404);
const ref='/api/files/'+f.id;const published=await contentUses(ref,true);const branded=await siteUses(ref);const overlay=await one('map_layers',{imageUrl:ref,published:true});
if(!canEdit(a?.role||'visitor')&&!published&&!branded&&!overlay)return json({error:'Fayl nashr qilinmagan'},404);
const headers=new Headers({'Content-Type':f.mime,'X-Content-Type-Options':'nosniff','Cache-Control':member?'private, no-store':'public, max-age=300','Accept-Ranges':'bytes'});
if(f.mime==='application/pdf')headers.set('Content-Disposition','inline; filename="document.pdf"');else if(!/^(image|video)\//.test(f.mime))headers.set('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(f.name||'fayl'));
let offset=0,length=f.size,status=200;const range=req.headers.get('range');if(range){const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+f.size}});if(m[1]){offset=Number(m[1]);const end=m[2]?Math.min(Number(m[2]),f.size-1):f.size-1;length=end-offset+1}else{length=Math.min(Number(m[2]),f.size);offset=f.size-length}if(offset<0||offset>=f.size||length<=0)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+f.size}});status=206;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${f.size}`)}
headers.set('Content-Length',String(length));if(method==='HEAD')return new Response(null,{status,headers});const bucket=await filesBucket();if(!(await bucket.find({filename:f.key}).limit(1).hasNext()))return json({error:'Fayl topilmadi'},404);const stream=bucket.openDownloadStreamByName(f.key,range?{start:offset,end:offset+length}:undefined);return new Response(Readable.toWeb(stream) as any,{status,headers});}

if(method==='GET'&&path[0]==='me')return json({user:a,initialized:true,canBootstrap:false});
if(method==='GET'&&path[0]==='public'){const rows=await find('content',{status:'published'},{sort:{updated:-1}});const initialized=await one('settings',{key:'initialized'});const settings=await one('settings',{key:'site'});return json({items:(initialized?rows:samples).map(publicItem),settings:{...extendedDefaults,...(settings?JSON.parse(settings.value):{})},sample:!initialized})}
if(method==='GET'&&path[0]==='map'){
const revision=(await one('settings',{key:'map:revision'}))?.value||'0';
if(path[1]==='lots.geojson'){const etag='"'+revision+'"';if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{ETag:etag}});const rows=await find('plots',{published:true},{sort:{lotNumber:1}});return Response.json({type:'FeatureCollection',features:rows.map(plotFeature)},{headers:{'Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'}})}
if(path[1]==='maps'){const rows=await find('map_maps',{published:true},{sort:{order:1,title:1},projection:{_id:0}});return Response.json(rows.map(publicMap),{headers:{'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}})}
const MAP_KINDS=['projects','infrastructure','zones','lots'];
const objectRows=async()=>{const initialized=await one('settings',{key:'initialized'});const rows=initialized?await find('content',{status:'published',kind:{$in:MAP_KINDS}},{sort:{updated:-1}}):samples.filter((x:any)=>MAP_KINDS.includes(x.kind));return rows.map(publicItem).map((i:any)=>({id:i.id,kind:i.kind,title:i.title,category:i.category,summary:String(i.summary||'').slice(0,200),updated:i.updated,data:{lat:i.data.lat,lng:i.data.lng,plotId:i.data.plotId,geojson:i.data.geojson}}))};
if(path[1]==='objects'){const rows=await objectRows();const etag='"'+sha256(JSON.stringify(rows)).slice(0,24)+'"';if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{ETag:etag}});return Response.json(rows,{headers:{'Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'}})}
if(path[1]==='metadata'){const rows=await find('plots',{published:true},{projection:{_id:0,statusKey:1,areaHa:1,bbox:1,categories:1}});const statusCounts:Record<string,number>=Object.fromEntries(plotStatuses.map(k=>[k,0])),categoryCounts:Record<string,number>={};let area=0,bbox:number[]|null=null;for(const r of rows){statusCounts[r.statusKey]=(statusCounts[r.statusKey]||0)+1;area+=num(r.areaHa);for(const c of r.categories||[])categoryCounts[c]=(categoryCounts[c]||0)+1;if(Array.isArray(r.bbox))bbox=bbox?[Math.min(bbox[0],r.bbox[0]),Math.min(bbox[1],r.bbox[1]),Math.max(bbox[2],r.bbox[2]),Math.max(bbox[3],r.bbox[3])]:[...r.bbox]}const objRows=await objectRows();const objectsRev=sha256(objRows.map((o:any)=>o.id+o.updated).join('|')).slice(0,16);return json({revision,objectsRev,lotCount:rows.length,totalAreaHa:Math.round(area*100)/100,statusCounts,categoryCounts,bbox})}
if(path[1]==='config')return json({...await mapConfig(),revision});
if(path[1]==='layers'&&!path[2]){const rows=await find('map_layers',{published:true},{projection:{_id:0,features:0},sort:{order:1,title:1}});return json(rows.map(publicLayerMeta))}
if(path[1]==='layers'&&path[2]){const l=await one('map_layers',{id:path[2],published:true});if(!l)return json({error:'Qatlam topilmadi'},404);const etag='"'+l.id+'-'+l.updated+'"';if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:{ETag:etag}});return Response.json({type:'FeatureCollection',features:l.features},{headers:{'Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'}})}
}
if(!a)return json({error:'Kirish talab etiladi'},401);
if(method==='GET'&&path[0]==='my-appeals')return json(await find('appeals',{user_id:a.userId},{sort:{created:-1},projection:{_id:0,id:1,topic:1,message:1,status:1,response:1,created:1,updated:1}}));
if(method==='POST'&&path[0]==='appeals'){
const b:any=await req.json();if(!clean(b.name,100)||!/^\+?[0-9 ()-]{9,20}$/.test(b.phone||'')||clean(b.message).length<10)return json({error:'Ism, telefon va kamida 10 belgili xabarni kiriting'},400);
const recent=await (await col('appeals')).countDocuments({user_id:a.userId,created:{$gt:new Date(Date.now()-3600000).toISOString()}});if(recent>=5)return json({error:'Bir soatda 5 ta murojaat chegarasi'},429);
const id=uid();await (await col('appeals')).insertOne({id,user_id:a.userId,name:clean(b.name,100),phone:b.phone,topic:clean(b.topic,100),message:clean(b.message),plotId:typeof b.plotId==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(b.plotId)?b.plotId:'',status:'new',response:'',created:now(),updated:now()});return json({ok:true,id},201)}
if(!member)return json({error:'Boshqaruv paneliga ruxsat berilmagan'},403);
if(method==='GET'&&path[0]==='statistics'){if(!canViewStatistics(a.role))return json({error:'Ruxsat yo‘q'},403);return json(await statistics(a))}
if(method==='GET'&&path[0]==='dashboard'){
if(a.role==='admin')return json({items:[],appeals:[],tasks:[],audit:[],members:[],assets:[],settings:{},statistics:await statistics(a)});
const content=canEdit(a.role)?await find('content',{},{sort:{updated:-1}}):[];const appeals=canOperate(a.role)?await find('appeals',{},{sort:{created:-1}}):[];const tasks=canOperate(a.role)?await find('tasks',{},{sort:{deadline:1}}):[];return json({items:content.map(unpack),appeals,tasks,audit:a.role==='superadmin'?await find('audit',{},{sort:{created:-1},limit:100}):[],members:a.role==='superadmin'?await staffMembers():[],assets:canEdit(a.role)?await find('assets',{},{sort:{created:-1},projection:{_id:0,id:1,name:1,mime:1,size:1,author:1,created:1}}):[],settings:{...extendedDefaults,...await sitePrevious()},statistics:canViewStatistics(a.role)?await statistics(a):null})}
if(method==='POST'&&path[0]==='upload'){
if(!canEdit(a.role))return json({error:'Fayl yuklash huquqi yo‘q'},403);const data=await req.formData();const file=data.get('file');if(!(file instanceof File)||file.size<1)return json({error:'Fayl tanlang'},400);
const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','application/pdf':'pdf'};
// Taqdimot va hujjatlar (qo'shimcha material sifatida): kengaytma bo'yicha aniqlanadi
const docTypes:Record<string,string>={pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',doc:'application/msword',xls:'application/vnd.ms-excel'};
const ext=(file.name.split('.').pop()||'').toLowerCase();const isDoc=!types[file.type]&&!!docTypes[ext];const mime=isDoc?docTypes[ext]:file.type;
if(!types[mime]&&!isDoc)return json({error:'JPG, PNG, WEBP, GIF, MP4, WEBM, PDF, PPTX, DOCX yoki XLSX yuklang'},400);
const maxBytes=isDoc||mime==='application/pdf'?100*1024*1024:25*1024*1024;if(file.size>maxBytes)return json({error:`Fayl juda katta. Maksimal hajm ${isDoc||mime==='application/pdf'?'100':'25'} MB`},400);
const head=new Uint8Array(await file.slice(0,16).arrayBuffer()),str=new TextDecoder().decode(head);const valid=isDoc?(['pptx','docx','xlsx'].includes(ext)?head[0]===0x50&&head[1]===0x4b:head[0]===0xd0&&head[1]===0xcf&&head[2]===0x11&&head[3]===0xe0):mime==='image/jpeg'?head[0]===255&&head[1]===216&&head[2]===255:mime==='image/png'?head[0]===137&&str.slice(1,4)==='PNG':mime==='image/webp'?str.startsWith('RIFF')&&str.slice(8,12)==='WEBP':mime==='image/gif'?str.startsWith('GIF8'):mime==='video/mp4'?str.slice(4,8)==='ftyp':mime==='video/webm'?head[0]===26&&head[1]===69&&head[2]===223&&head[3]===163:str.startsWith('%PDF-');if(!valid)return json({error:'Fayl turi va tarkibi mos emas'},400);
const id=uid(),key='media/'+id+'.'+(isDoc?ext:types[mime]);const bucket=await filesBucket(),sink=bucket.openUploadStream(key,{contentType:mime});await pipeline(Readable.fromWeb(file.stream() as any),sink);try{await (await col('assets')).insertOne({id,key,name:clean(file.name,200),mime,size:file.size,author:a.email,created:now()})}catch(e){await bucket.delete(sink.id);throw e}await log(a,'Fayl yuklandi',clean(file.name,200));return json({ok:true,id,url:'/api/files/'+id,name:file.name,mime,size:file.size},201)}
if(method==='DELETE'&&path[0]==='assets'){
if(!canEdit(a.role))return json({error:'Ruxsat yo‘q'},403);const f=await one('assets',{id:path[1]});if(!f)return json({error:'Fayl topilmadi'},404);const ref='/api/files/'+f.id;const used=await contentUses(ref);const configUsed=await siteUses(ref);const layerUsed=await one('map_layers',{imageUrl:ref});if(used||configUsed||layerUsed)return json({error:'Fayl materialda ishlatilmoqda. Avval havolasini olib tashlang.'},409);const bucket=await filesBucket(),stored=await bucket.find({filename:f.key}).next();if(stored)await bucket.delete(stored._id);await (await col('assets')).deleteOne({id:f.id});await log(a,'Fayl o‘chirildi',f.name);return json({ok:true})}
const raw=method==='GET'?'{}':await req.text();if(raw.length>bodyLimit(path))return json({error:'So‘rov hajmi juda katta'},413);let b:any={};if(raw.trim()){try{b=JSON.parse(raw)}catch{return json({error:'JSON noto‘g‘ri'},400)}}
if(path[0]==='plots'){
if(!canEdit(a.role))return json({error:'Ruxsat yo‘q'},403);
const plots=await col('plots');
if(method==='GET'&&path[1]==='geojson'){const rows=await find('plots',{},{sort:{lotNumber:1}});return json({type:'FeatureCollection',features:rows.map(({geometry,...props}:any)=>({type:'Feature',id:props.id,geometry,properties:props}))})}
if(method==='GET'&&!path[1])return json(await find('plots',{},{sort:{lotNumber:1},projection:{_id:0,geometry:0}}));
if(method==='GET'){const p=await one('plots',{id:path[1]});return p?json(p):json({error:'Topilmadi'},404)}
if(method==='POST'&&path[1]==='import'){
const features=Array.isArray(b.features)?b.features:null;if(!features||!features.length||features.length>1000)return json({error:'Bir so‘rovda 1 dan 1000 gacha obyekt yuboring'},400);
if(b.replace===true&&b.dryRun!==true)await plots.deleteMany({});
const errors:{index:number;message:string}[]=[];const ops:any[]=[];const stamp=now();const extra=await extraStatuses();
features.forEach((f:any,index:number)=>{const input=featureToInput(f);input.published=b.publish===true;const r=normalizePlot(input,undefined,extra);if('error' in r){errors.push({index,message:r.error});return}const doc=r.doc;doc.updated=stamp;ops.push(doc.lotNumber?{updateOne:{filter:{lotNumber:doc.lotNumber},update:{$set:doc,$setOnInsert:{id:uid(),author:a.email,created:stamp}},upsert:true}}:{insertOne:{document:{...doc,id:uid(),author:a.email,created:stamp}}})});
if(b.dryRun===true)return json({dryRun:true,imported:ops.length,skipped:errors.length,errors:errors.slice(0,20)});
if(ops.length)await plots.bulkWrite(ops,{ordered:false});
if(ops.length){await bumpMapRevision();await log(a,'Hududlar import qilindi',String(ops.length))}
return json({imported:ops.length,skipped:errors.length,errors:errors.slice(0,20)})}
if(method==='POST'&&path[1]==='sample'){if(await plots.countDocuments({},{limit:1}))return json({error:'Hududlar allaqachon mavjud'},409);const stamp=now(),docs:any[]=[];for(const input of samplePlots()){const r=normalizePlot(input);if('error' in r)continue;docs.push({...r.doc,id:uid(),author:a.email,created:stamp,updated:stamp})}if(docs.length)await plots.insertMany(docs);await bumpMapRevision();await log(a,'Namuna hududlar yuklandi',String(docs.length));return json({ok:true,count:docs.length},201)}
if(method==='POST'&&path[1]==='bulk'){const ids=Array.isArray(b.ids)?b.ids.filter((x:any)=>typeof x==='string').slice(0,5000):[];if(!ids.length)return json({error:'Hududlarni tanlang'},400);if(b.delete===true){const r=await plots.deleteMany({id:{$in:ids}});await bumpMapRevision();await log(a,'Hududlar o‘chirildi',String(r.deletedCount));return json({ok:true,deleted:r.deletedCount})}const set:any={};if(b.statusKey!==undefined){if(!plotStatuses.includes(b.statusKey)&&!(await extraStatuses()).includes(b.statusKey))return json({error:'Holat noto‘g‘ri'},400);set.statusKey=b.statusKey}if(b.published!==undefined)set.published=b.published===true;if(!Object.keys(set).length)return json({error:'O‘zgartirish tanlanmagan'},400);set.updated=now();const r=await plots.updateMany({id:{$in:ids}},{$set:set});await bumpMapRevision();await log(a,'Hududlar ommaviy yangilandi',String(r.modifiedCount));return json({ok:true,changed:r.modifiedCount})}
if(method==='POST'&&path[1]==='publish'){const published=b.published===true;const filter=b.all===true?{}:Array.isArray(b.ids)&&b.ids.length&&b.ids.length<=5000?{id:{$in:b.ids.filter((x:any)=>typeof x==='string')}}:null;if(!filter)return json({error:'Hududlarni tanlang'},400);const r=await plots.updateMany(filter,{$set:{published,updated:now()}});await bumpMapRevision();await log(a,published?'Hududlar nashr qilindi':'Hududlar nashrdan olindi',String(r.modifiedCount));return json({ok:true,changed:r.modifiedCount})}
if(method==='POST'&&!path[1]){const r=normalizePlot(b,undefined,await extraStatuses());if('error' in r)return json({error:r.error},400);const dup=r.doc.lotNumber?await one('plots',{lotNumber:r.doc.lotNumber}):null;if(dup)return json({error:'Bu raqamli hudud allaqachon mavjud'},409);const id=uid();await plots.insertOne({...r.doc,id,author:a.email,created:now(),updated:now()});await bumpMapRevision();await log(a,'Hudud yaratildi',r.doc.lotNumber||r.doc.title);return json({ok:true,id},201)}
if(method==='PATCH'&&path[1]){const old=await one('plots',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);const r=normalizePlot(b,old,await extraStatuses());if('error' in r)return json({error:r.error},400);if(r.doc.lotNumber&&r.doc.lotNumber!==old.lotNumber&&await one('plots',{lotNumber:r.doc.lotNumber}))return json({error:'Bu raqamli hudud allaqachon mavjud'},409);await plots.updateOne({id:old.id},{$set:{...r.doc,updated:now()}});await bumpMapRevision();await log(a,'Hudud tahrirlandi',r.doc.lotNumber||r.doc.title);return json({ok:true})}
if(method==='DELETE'&&path[1]){const old=await one('plots',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);await plots.deleteOne({id:old.id});await bumpMapRevision();await log(a,'Hudud o‘chirildi',old.lotNumber||old.title);return json({ok:true})}
return json({error:'Usul qo‘llanmaydi'},405)}
if(path[0]==='mapconfig'){
if(!canEdit(a.role))return json({error:'Ruxsat yo‘q'},403);
if(method==='GET')return json(await mapConfig());
if(method!=='POST')return json({error:'Usul qo‘llanmaydi'},405);
const prevCfg=await mapConfig();const next=sanitizeMapConfig(b,prevCfg);const kept=new Set(next.customStatuses.map(c=>c.key));const gone=prevCfg.customStatuses.map(c=>c.key).filter(k=>!kept.has(k));if(gone.length)await (await col('plots')).updateMany({statusKey:{$in:gone}},{$set:{statusKey:'unknown',updated:now()}});await setSetting('map:config',JSON.stringify(next));await bumpMapRevision();await log(a,'Xarita sozlamalari yangilandi','Xarita');return json({ok:true,config:next})}
if(path[0]==='maps'){
if(!canEdit(a.role))return json({error:'Ruxsat yo‘q'},403);
const maps=await col('map_maps');
if(method==='GET'&&!path[1])return json(await find('map_maps',{},{projection:{_id:0},sort:{order:1,title:1}}));
if(method==='POST'&&path[1]==='reorder'){const ids=Array.isArray(b.ids)?b.ids.filter((x:any)=>typeof x==='string').slice(0,100):[];await Promise.all(ids.map((id:string,order:number)=>maps.updateOne({id},{$set:{order}})));return json({ok:true})}
if(method==='POST'&&!path[1]){const r=normalizeMap(b);if('error' in r)return json({error:r.error},400);if(await one('map_maps',{slug:r.doc.slug}))return json({error:'Bu manzil (slug) band'},409);const last=(await find('map_maps',{},{sort:{order:-1},limit:1,projection:{_id:0,order:1}}))[0];const id=uid(),stamp=now();await maps.insertOne({...r.doc,order:last?last.order+1:0,id,author:a.email,created:stamp,updated:stamp});await log(a,'Xarita yaratildi',r.doc.title);return json({ok:true,id},201)}
if(method==='PATCH'&&path[1]){const old=await one('map_maps',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);const r=normalizeMap(b,old);if('error' in r)return json({error:r.error},400);const dup=await one('map_maps',{slug:r.doc.slug});if(dup&&dup.id!==old.id)return json({error:'Bu manzil (slug) band'},409);await maps.updateOne({id:old.id},{$set:{...r.doc,updated:now()}});await log(a,'Xarita tahrirlandi',r.doc.title);return json({ok:true})}
if(method==='DELETE'&&path[1]){const old=await one('map_maps',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);await maps.deleteOne({id:old.id});await log(a,'Xarita o‘chirildi',old.title);return json({ok:true})}
return json({error:'Usul qo‘llanmaydi'},405)}
if(path[0]==='maplayers'){
if(!canEdit(a.role))return json({error:'Ruxsat yo‘q'},403);
const layers=await col('map_layers');
if(method==='GET'&&!path[1])return json(await find('map_layers',{},{projection:{_id:0,features:0},sort:{order:1,title:1}}));
if(method==='GET'){const l=await one('map_layers',{id:path[1]});return l?json(l):json({error:'Topilmadi'},404)}
if(method==='POST'&&path[1]==='reorder'){const ids=Array.isArray(b.ids)?b.ids.filter((x:any)=>typeof x==='string').slice(0,200):[];await Promise.all(ids.map((id:string,order:number)=>layers.updateOne({id},{$set:{order}})));await bumpMapRevision();return json({ok:true})}
if(method==='POST'&&!path[1]){const r=normalizeLayer(b);if('error' in r)return json({error:r.error},400);const id=uid(),stamp=now();const last=(await find('map_layers',{},{sort:{order:-1},limit:1,projection:{_id:0,order:1}}))[0];await layers.insertOne({...r.doc,order:b.order!==undefined?r.doc.order:(last?last.order+1:0),id,author:a.email,created:stamp,updated:stamp});await bumpMapRevision();await log(a,'Xarita qatlami yaratildi',r.doc.title);return json({ok:true,id},201)}
if(method==='PATCH'&&path[1]){const old=await one('map_layers',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);const r=normalizeLayer(b,old);if('error' in r)return json({error:r.error},400);await layers.updateOne({id:old.id},{$set:{...r.doc,updated:now()}});await bumpMapRevision();await log(a,'Xarita qatlami tahrirlandi',r.doc.title);return json({ok:true})}
if(method==='DELETE'&&path[1]){const old=await one('map_layers',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);await layers.deleteOne({id:old.id});await bumpMapRevision();await log(a,'Xarita qatlami o‘chirildi',old.title);return json({ok:true})}
return json({error:'Usul qo‘llanmaydi'},405)}
if(method==='POST'&&path[0]==='seed'&&canEdit(a.role)){
if(await one('settings',{key:'initialized'}))return json({error:'Namuna ma’lumotlar avval yuklangan'},409);
await (await col('content')).bulkWrite(samples.map(s=>({updateOne:{filter:{id:s.id},update:{$setOnInsert:{kind:s.kind,title:s.title,summary:s.summary,body:s.body,image:s.image,category:s.category,status:s.status,data:JSON.stringify(s.data),author:a.email,updated:now(),note:''}},upsert:true}})));await upsert('settings',{key:'initialized'},{},{value:'true'});await log(a,'Namuna kontent yuklandi','Portal');return json({ok:true})}
if(path[0]==='content'){
const old=path[1]?await one('content',{id:path[1]}):null;
if(method==='DELETE'){if(!canEdit(a.role))return json({error:'Ruxsat yo‘q'},403);if(!old)return json({error:'Topilmadi'},404);await (await col('content')).deleteOne({id:path[1]});await log(a,'Material o‘chirildi',old.title);return json({ok:true})}
if(method==='PATCH'&&b.action==='review'){if(!canApprove(a.role))return json({error:'Tasdiqlash huquqi yo‘q'},403);if(!old)return json({error:'Topilmadi'},404);if(!['published','rejected'].includes(b.status))return json({error:'Noto‘g‘ri holat'},400);await (await col('content')).updateOne({id:old.id},{$set:{status:b.status,note:clean(b.note,1000),updated:now()}});await log(a,b.status==='published'?'Material tasdiqlandi':'Material qaytarildi',old.title);return json({ok:true})}
if(!canEdit(a.role))return json({error:'Tahrirlash huquqi yo‘q'},403);
if(!['POST','PATCH'].includes(method))return json({error:'Usul qo‘llanmaydi'},405);
if(method==='PATCH'&&!old)return json({error:'Topilmadi'},404);
const status=b.status||'draft';if(!allowedStatus(a.role,status)||!kinds[b.kind]||!clean(b.title,160))return json({error:'Sarlavha, tur yoki nashr holati noto‘g‘ri'},400);
const data=b.data&&typeof b.data==='object'&&!Array.isArray(b.data)?b.data:{};if(JSON.stringify(data).length>150000)return json({error:'Ma’lumot juda katta'},400);if(data.geojson&&!polygonGeometry(data.geojson))return json({error:'GeoJSON yopiq Polygon bo‘lishi kerak (longitude, latitude)'},400);if((data.lat!==undefined&&data.lat!=='')||(data.lng!==undefined&&data.lng!=='')){if(!geographicPoint({data} as any))return json({error:'Latitude va longitude qiymatlarini tekshiring'},400)}if(data.attachments!==undefined){const list=Array.isArray(data.attachments)?data.attachments:[];data.attachments=list.slice(0,12).filter((x:any)=>x&&typeof x==='object'&&/^\/api\/files\/[A-Za-z0-9-]{8,64}$/.test(String(x.url||''))).map((x:any)=>({url:String(x.url),name:clean(x.name,200)||'Fayl',mime:clean(x.mime,120),size:Number(x.size)||0}))}
for(const k of ['url','videoUrl','beforeImage','afterImage','sourceUrl']){if(data[k]&&!url(data[k]))return json({error:'Media havolasi HTTPS bo‘lishi va parol saqlamasligi kerak'},400);if(data[k])data[k]=url(data[k]);}if(b.kind==='cameras'&&data.sourceUrl&&data.streamType==='youtube'&&!youtubeEmbed(data.sourceUrl))return json({error:'YouTube video yoki jonli efir manzilini kiriting'},400);if(data.i18n)data.i18n=sanitizeTranslations(data.i18n);data.plotId=typeof data.plotId==='string'&&/^[0-9a-fA-F-]{8,64}$/.test(data.plotId)?data.plotId:'';data.investorPublic=data.investorPublic===true;data.investorName=clean(data.investorName,200);if(data.availability&&!['available','reserved','sold'].includes(data.availability))return json({error:'Hudud holati noto‘g‘ri'},400);data.progress=Math.min(100,Math.max(0,Number(data.progress)||0));if(data.x!==undefined)data.x=Math.min(95,Math.max(5,Number(data.x)||50));if(data.y!==undefined)data.y=Math.min(95,Math.max(5,Number(data.y)||50));
const id=old?.id||uid();await upsert('content',{id},{kind:b.kind,title:clean(b.title,160),summary:clean(b.summary,500),body:clean(b.body,20000),image:url(b.image),category:clean(b.category,80),status,data:JSON.stringify(data),updated:now(),note:''},{author:old?.author||a.email});await upsert('settings',{key:'initialized'},{},{value:'true'});await log(a,old?'Material tahrirlandi':'Material yaratildi',b.title);return json({ok:true,id})}
if(path[0]==='appeals'&&method==='PATCH'&&canOperate(a.role)){if(!['new','progress','closed'].includes(b.status))return json({error:'Holat noto‘g‘ri'},400);if(b.status==='closed'&&!clean(b.response))return json({error:'Yakunlash uchun javob yozing'},400);const old=await one('appeals',{id:path[1]});if(!old)return json({error:'Topilmadi'},404);await (await col('appeals')).updateOne({id:path[1]},{$set:{status:b.status,response:clean(b.response),updated:now()}});await log(a,'Murojaat yangilandi',path[1]);return json({ok:true})}
if(path[0]==='tasks'&&canOperate(a.role)&&['POST','PATCH'].includes(method)){if(!clean(b.title,160)||!/^\d{4}-\d{2}-\d{2}$/.test(b.deadline)||!['new','progress','closed'].includes(b.status))return json({error:'Vazifa, muddat va holatni tekshiring'},400);const id=path[1]||uid();await upsert('tasks',{id},{title:clean(b.title,160),owner:clean(b.owner,100),deadline:b.deadline,status:b.status,progress:b.status==='closed'?100:Math.min(100,Math.max(0,Number(b.progress)||0)),description:clean(b.description),updated:now()});await log(a,'Vazifa saqlandi',b.title);return json({ok:true})}
if(path[0]==='members'&&a.role==='superadmin'&&['POST','PATCH'].includes(method)){
b.email=normalizeLogin(b.login??b.email);if(!['superadmin','admin','manager'].includes(b.role)||!clean(b.name,100))return json({error:'Ism va rolni tekshiring'},400);if(!loginOk(b.email))return json({error:LOGIN_HINT},400);
if(b.statsScopes!==undefined&&(!Array.isArray(b.statsScopes)||b.statsScopes.some((k:any)=>typeof k!=='string'||!Object.hasOwn(statsScopes,k))))return json({error:'Statistika ruxsati noto‘g‘ri'},400);let old=path[1]?await one('members',{id:path[1]}):null;if(!old&&!path[1]){const byEmail=await one('members',{email:b.email.toLowerCase()});if(byEmail&&byEmail.role==='visitor')old=byEmail}if(path[1]&&!old)return json({error:'Topilmadi'},404);
if(b.role==='superadmin'&&old?.role!=='superadmin')return json({error:'Yangi superadmin qo‘shib bo‘lmaydi'},403);
if(old?.id===a.memberId&&(b.role!=='superadmin'||!b.active))return json({error:'O‘z superadmin huquqingizni olib tashlay olmaysiz'},400);
if(old&&old.email!==b.email.toLowerCase())return json({error:'Mavjud foydalanuvchi logini o‘zgartirilmaydi'},400);
const wantsPassword=typeof b.password==='string'&&b.password!=='';if(wantsPassword||!old?.passwordHash){const pe=passwordError(b.password,b.email);if(pe)return json({error:pe},400)}
const id=old?.id||uid();const selected=b.role==='admin'?(b.statsScopes||defaultStatsScopes):[];await upsert('members',{id},{name:clean(b.name,100),role:b.role,active:b.active?1:0,...(wantsPassword?{passwordHash:await hashPassword(b.password)}:{})},{user_id:null,email:b.email.toLowerCase(),created:now()});if(wantsPassword||!b.active)await destroyMemberSessions(id);await setSetting('stats:'+id,JSON.stringify([...new Set(selected)]));await log(a,'Foydalanuvchi huquqlari yangilandi',b.email);return json({ok:true})}
if(path[0]==='settings'&&method==='POST'&&canEdit(a.role)){const previous=await sitePrevious();const v=sanitizeConfig(b,previous);await setSetting('site',JSON.stringify(v));await log(a,'Sozlamalar yangilandi','Portal');return json({ok:true})}
return json({error:'Ruxsat yo‘q yoki manzil topilmadi'},403);
}catch(e:any){console.error('API error',e.message);return json({error:(e.code===11000||e.message?.includes('E11000'))?'Bu login allaqachon mavjud':'Amal bajarilmadi. Qayta urinib ko‘ring.'},500)}}
export {handle};
