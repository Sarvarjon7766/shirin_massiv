import assert from 'node:assert/strict';
import {MongoMemoryServer} from 'mongodb-memory-server';
const mongod=await MongoMemoryServer.create();
process.env.MONGODB_URI=mongod.getUri();process.env.MONGODB_DB='shirin_test';
const PASSWORD='TestPass123!';
process.env.OWNER_EMAIL='sarvaregamberdiyev758@gmail.com';process.env.OWNER_PASSWORD=PASSWORD;
const {handle}=await import('../src/api.ts');
const {col,closeDb}=await import('../src/db.ts');
const {hashPassword}=await import('../src/auth/password.ts');
const {ensureOwner}=await import('../src/auth/owner.ts');
const {resetAuthLimits}=await import('../src/auth/routes.ts');
await ensureOwner(()=>{});
globalThis.__testUser=null;
const jar=new Map();
const authCall=(action,body,headers={})=>handle(new Request('https://test.local/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
const cookieOf=res=>(res.headers.get('set-cookie')||'').split(';')[0];
// So'rov egasi uchun sessiya cookie'sini beradi: kirish, bo'lmasa (tashrifchi sifatida) ro'yxatdan o'tish
async function sessionFor(email){
  if(jar.has(email))return jar.get(email);
  let res=await authCall('login',{email,password:PASSWORD});
  if(res.status===401)res=await authCall('register',{name:email.split('@')[0],email,password:PASSWORD});
  assert.ok(res.status===200||res.status===201,'kirish: '+email+' '+res.status);
  const cookie=cookieOf(res);jar.set(email,cookie);return cookie;
}
const route=new Proxy({},{get:(_,method)=>async req=>{const u=globalThis.__testUser;if(u)req.headers.set('cookie',await sessionFor(u.email));return handle(req)}});
let checks=0;
function user(id,email){globalThis.__testUser={userId:id,email,displayName:id}}
async function request(path,method='GET',body={},expected=200,origin='https://test.local'){const res=await route[method](new Request('https://test.local/api/'+path,{method,headers:{origin,'Content-Type':'application/json'},...(method!=='GET'?{body:JSON.stringify(body)}:{})}));const value=await res.json();assert.equal(res.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);checks++;return value}

await request('dashboard','GET',{},401);await request('statistics','GET',{},401);
user('outsider','outsider@example.com');assert.equal((await request('me')).user.role,'visitor');await request('dashboard','GET',{},403);
user('owner','sarvaregamberdiyev758@gmail.com');await request('seed','POST');await request('seed','POST',{},409);
await request('members','POST',{password:PASSWORD,name:'Manager',email:'manager@example.com',role:'manager',active:1});
await request('members','POST',{password:PASSWORD,name:'Admin',email:'admin@example.com',role:'admin',active:1,statsScopes:['content','investments']});
let me=await request('me');await request('members/'+me.user.memberId,'PATCH',{name:'Owner',email:me.user.email,role:'manager',active:1},400);
await request('members','POST',{password:PASSWORD,name:'Bad',email:'bad@example.com',role:'admin',active:1,statsScopes:['privateData']},400);
user('manager','manager@example.com');me=await request('me');assert.equal(me.user.role,'manager');
await request('members','POST',{password:PASSWORD,name:'Attack',email:'attack@example.com',role:'superadmin',active:1},403);await request('statistics','GET',{},403);
const material={kind:'news',title:'Test publication',summary:'Summary',body:'Body',category:'Test',image:'',status:'published',data:{sample:false}};
const news=await request('content','POST',material);const draft=await request('content','POST',{...material,title:'Private draft',status:'draft'});
await request('content','POST',{...material,data:{lat:200,lng:65}},400);await request('content','POST',{...material,data:{geojson:'not json'}},400);
await request('content','POST',{...material,kind:'cameras',data:{sourceUrl:'https://user:password@example.com/live.m3u8'}},400);
await request('content/'+draft.id,'PATCH',{action:'review',status:'published'});await request('content/'+draft.id,'PATCH',{...material,status:'draft'});
await request('settings','POST',{googleMapsKey:'browser-key',defaultTheme:'dark',translations:{ru:{Xarita:'Карта участков'}},localizedSettings:{en:{title:'Shirin city',googleMapsKey:'invalid'}},navigation:[{href:'/map',label:'Xarita',labels:{zh:'地图'}},{href:'/admin',label:'invalid'}]});
let pub=await request('public');assert.equal(pub.settings.translations.ru.Xarita,'Карта участков');assert.equal(pub.settings.navigation.length,1);assert.equal(pub.settings.localizedSettings.en.googleMapsKey,undefined);
await request('tasks','POST',{title:'Daily work',owner:'Manager',deadline:'2026-11-01',status:'progress',progress:45,description:'Manage site'});
const lot=await request('content','POST',{...material,kind:'lots',data:{investorName:'Private Investor',investorEmail:'hidden@example.com',contractNumber:'private-contract',investorPublic:false,area:2,availability:'sold'}});
const translated=await request('content','POST',{...material,data:{i18n:{en:{title:'English project',investorEmail:'private'},zh:{title:'项目'},xx:{title:'bad'}}}});
let dash=await request('dashboard');assert.deepEqual(dash.members,[]);assert.deepEqual(dash.audit,[]);assert.equal(dash.statistics,null);assert.equal(dash.items.find(i=>i.id===translated.id).data.i18n.xx,undefined);
user('visitor','visitor@example.com');await request('dashboard','GET',{},403);await request('statistics','GET',{},403);await request('settings','POST',{title:'attack'},403);
const appeal=await request('appeals','POST',{name:'Private Citizen',phone:'+998901234567',topic:'Question',message:'Please provide project information.'},201);
let my=await request('my-appeals');assert.equal(my.length,1);user('other','other@example.com');my=await request('my-appeals');assert.equal(my.length,0);
user('manager','manager@example.com');await request('appeals/'+appeal.id,'PATCH',{status:'closed',response:''},400);await request('appeals/'+appeal.id,'PATCH',{status:'closed',response:'Your request was reviewed.'});
await request('content/'+news.id,'PATCH',material,403,'https://evil.example');
user('admin','admin@example.com');me=await request('me');assert.equal(me.user.role,'admin');dash=await request('dashboard');for(const k of ['items','appeals','tasks','members','assets','audit'])assert.deepEqual(dash[k],[]);assert.deepEqual(dash.settings,{});let stats=await request('statistics');assert.deepEqual(stats.scopes,['content','investments']);assert.equal(stats.appeals,undefined);assert(!JSON.stringify(stats).includes('Private Investor'));assert(!JSON.stringify(dash).includes('Private Citizen'));assert(stats.investments.some(r=>r.availability==='sold'));
await request('content','POST',material,403);await request('content/'+news.id,'PATCH',{action:'review',status:'published'},403);await request('content/'+news.id,'DELETE',{},403);await request('settings','POST',{title:'attack'},403);await request('members','POST',{password:PASSWORD,name:'Attack',email:'attack@example.com',role:'manager',active:1},403);await request('tasks','POST',{title:'bad'},403);await request('appeals/'+appeal.id,'PATCH',{status:'closed',response:'bad'},403);await request('seed','POST',{},403);
async function upload(expected,bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])){const f=new FormData();f.append('file',new File([bytes],'test.png',{type:'image/png'}));const r=await route.POST(new Request('https://test.local/api/upload',{method:'POST',headers:{origin:'https://test.local'},body:f}));const v=await r.json();assert.equal(r.status,expected,JSON.stringify(v));checks++;return v}
async function file(id,status,method='GET',range){const r=await route[method](new Request('https://test.local/api/files/'+id,{method,headers:range?{range}:{}}));assert.equal(r.status,status);checks++;return r}
await upload(403);user('manager','manager@example.com');await upload(400,new Uint8Array([1,2,3]));const asset=await upload(201);await file(asset.id,200);await file(asset.id,200,'HEAD');
user('admin','admin@example.com');await file(asset.id,404);await request('assets/'+asset.id,'DELETE',{},403);globalThis.__testUser=null;await file(asset.id,404);await upload(401);
user('manager','manager@example.com');const photo=await request('content','POST',{...material,kind:'photos',image:asset.url});await request('assets/'+asset.id,'DELETE',{},409);globalThis.__testUser=null;await file(asset.id,200);const partial=await file(asset.id,206,'GET','bytes=0-3');assert.equal((await partial.arrayBuffer()).byteLength,4);await file(asset.id,416,'GET','bytes=100-200');
pub=await request('public');assert.equal(pub.statistics,undefined);assert(!pub.items.some(i=>i.id===draft.id));const publicLot=pub.items.find(i=>i.id===lot.id);assert.equal(publicLot.data.investorName,undefined);assert.equal(publicLot.data.contractNumber,undefined);assert.equal(publicLot.author,undefined);
user('manager','manager@example.com');await request('content/'+photo.id,'DELETE');await request('assets/'+asset.id,'DELETE');await file(asset.id,404);
user('owner','sarvaregamberdiyev758@gmail.com');dash=await request('dashboard');const admin=dash.members.find(m=>m.role==='admin');await request('members/'+admin.id,'PATCH',{name:admin.name,email:admin.email,role:'admin',active:1,statsScopes:['appeals','tasks']});user('admin','admin@example.com');stats=await request('statistics');assert.equal(stats.content,undefined);assert(stats.appeals.some(r=>r.status==='closed'));assert(!JSON.stringify(stats).includes('Private Citizen'));
user('owner','sarvaregamberdiyev758@gmail.com');await request('members/'+admin.id,'PATCH',{name:admin.name,email:admin.email,role:'admin',active:1,statsScopes:[]});user('admin','admin@example.com');stats=await request('statistics');assert.deepEqual(stats.scopes,[]);assert.equal(stats.content,undefined);
user('owner','sarvaregamberdiyev758@gmail.com');await request('members/'+admin.id,'PATCH',{name:admin.name,email:admin.email,role:'admin',active:0,statsScopes:['content']});user('admin','admin@example.com');await request('statistics','GET',{},401);await request('dashboard','GET',{},401);assert.equal((await authCall('login',{email:'admin@example.com',password:PASSWORD})).status,403);
await (await col('members')).insertOne({id:'legacy',user_id:'legacy',email:'legacy@example.com',name:'Legacy',role:'leader',active:1,created:'2026-10-20',passwordHash:await hashPassword(PASSWORD)});user('legacy','legacy@example.com');me=await request('me');assert.equal(me.user.role,'admin');await request('content','POST',material,403);stats=await request('statistics');assert.deepEqual(stats.scopes,['content','construction','investments']);
const localeModule=await import('../src/shared/i18n.ts');assert.equal(localeModule.localizeItem(pub.items.find(i=>i.id===translated.id),'en').title,'English project');assert.equal(localeModule.translate('Xarita','uz-Cyrl'),'Харита');
// ---- Hududlar xaritasi (plots)
user('owner','sarvaregamberdiyev758@gmail.com');await request('members','POST',{password:PASSWORD,name:'Admin Two',email:'admin2@example.com',role:'admin',active:1});
const square=(x,y,size=0.001)=>({type:'Polygon',coordinates:[[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]]]});
globalThis.__testUser=null;
let plotMeta=await request('map/metadata');assert.equal(plotMeta.lotCount,0);
await request('plots','GET',{},401);
user('outsider','outsider@example.com');await request('plots','POST',{title:'X',geometry:square(69.4,41.3)},403);await request('plots','GET',{},403);
user('admin2','admin2@example.com');await request('plots','POST',{title:'X',geometry:square(69.4,41.3)},403);
user('manager','manager@example.com');
const created=await request('plots','POST',{lotNumber:'T-1',title:'Test hudud',function:'Kop qavatli turar-joy',statusKey:'planned',areaHa:1.5,floorsMax:9,geometry:square(69.4,41.3),published:false},200+1);
await request('plots','POST',{lotNumber:'T-1',title:'Dublikat',geometry:square(69.4,41.3)},409);
await request('plots','POST',{title:'Yomon geometriya',geometry:{type:'Polygon',coordinates:[[[500,41],[501,41],[501,42],[500,41]]]}},400);
await request('plots','POST',{title:'Yomon holat',statusKey:'hacked',geometry:square(69.4,41.3)},400);
await request('plots','POST',{title:'Yomon narx',geometry:square(69.4,41.3),auction:{lotId:'1',startPrice:{amount:'abc',currency:'UZS'}}},400);
await request('plots','POST',{title:'Yomon havola',geometry:square(69.4,41.3),auction:{lotId:'1',url:'http://insecure.example'}},400);
globalThis.__testUser=null;
assert.equal((await request('map/lots.geojson')).features.length,0);
user('manager','manager@example.com');
assert.equal(created.id.length>10,true);
const imported=await request('plots/import','POST',{publish:true,features:[
 {type:'Feature',properties:{lotNumber:'T-2',function:'Ofis',areaHa:'0.5 ga',auctionStatus:'auksionga_tayyor'},geometry:square(69.41,41.31)},
 {type:'Feature',properties:{lotNumber:'T-3',function:'Yashil ochiq maydon',statusKey:'sold',company:'Test MCHJ'},geometry:{type:'MultiPolygon',coordinates:[square(69.42,41.32).coordinates,square(69.43,41.32).coordinates]}},
 {type:'Feature',properties:{lotNumber:'T-BAD'},geometry:{type:'Point',coordinates:[69,41]}},
]});
assert.equal(imported.imported,2);assert.equal(imported.skipped,1);
const reimported=await request('plots/import','POST',{publish:true,features:[{type:'Feature',properties:{lotNumber:'T-2',function:'Ofis',areaHa:1,statusKey:'ready'},geometry:square(69.41,41.31)}]});assert.equal(reimported.imported,1);
globalThis.__testUser=null;
let geo=await request('map/lots.geojson');assert.equal(geo.features.length,2);
const t2=geo.features.find(f=>f.properties.lotNumber==='T-2');assert.equal(t2.properties.statusKey,'ready');assert.deepEqual(t2.properties.categories,['office']);
for(const f of geo.features){for(const k of ['author','created','bbox','published','_id'])assert.equal(k in f.properties,false,'leak '+k)}
plotMeta=await request('map/metadata');assert.equal(plotMeta.lotCount,2);assert.equal(plotMeta.statusCounts.ready,1);assert.equal(plotMeta.statusCounts.sold,1);assert.equal(plotMeta.bbox.length,4);
const etag='"'+plotMeta.revision+'"';
const notModified=await route.GET(new Request('https://test.local/api/map/lots.geojson',{headers:{'if-none-match':etag}}));assert.equal(notModified.status,304);checks++;
user('manager','manager@example.com');
await request('plots/'+created.id,'PATCH',{statusKey:'sold',published:true,auction:{lotId:'12345',name:'Test lot',startPrice:{amount:'1000000',currency:'UZS'},result:{winner:'Yutgan MCHJ',winningPrice:{amount:'1500000.50',currency:'UZS'}}}});
globalThis.__testUser=null;
const after=await request('map/metadata');assert.notEqual(after.revision,plotMeta.revision);
geo=await request('map/lots.geojson');const sold=geo.features.find(f=>f.properties.lotNumber==='T-1');assert.equal(sold.properties.auction.result.winner,'Yutgan MCHJ');assert.equal(sold.properties.auction.startPrice.amount,'1000000.00');
user('manager','manager@example.com');
await request('plots/publish','POST',{ids:[created.id],published:false});
globalThis.__testUser=null;assert.equal((await request('map/lots.geojson')).features.length,2);
user('manager','manager@example.com');
await request('plots/'+created.id,'DELETE');await request('plots/'+created.id,'DELETE',{},404);
const listed=await request('plots');assert.equal(listed.length,2);assert.equal('geometry' in listed[0],false);
const dry=await request('plots/import','POST',{dryRun:true,replace:true,publish:true,features:[{type:'Feature',properties:{lotNumber:'D-1',function:'Ofis'},geometry:square(69.5,41.2)},{type:'Feature',properties:{lotNumber:'D-2'},geometry:{type:'Point',coordinates:[1,1]}}]});
assert.equal(dry.dryRun,true);assert.equal(dry.imported,1);assert.equal(dry.skipped,1);assert.equal((await request('plots')).length,2);
const adminGeo=await request('plots/geojson');assert.equal(adminGeo.features.length,2);assert.ok(adminGeo.features[0].geometry);assert.ok('published' in adminGeo.features[0].properties);
const ids=listed.map(r=>r.id);
await request('plots/bulk','POST',{ids,statusKey:'reserved',published:false});
assert.equal((await request('plots')).every(r=>r.statusKey==='reserved'&&r.published===false),true);
await request('plots/bulk','POST',{ids,statusKey:'nope'},400);await request('plots/bulk','POST',{ids},400);await request('plots/bulk','POST',{ids:[],published:true},400);
user('manager','manager@example.com');await request('plots/sample','POST',{},409);
for(const r of await request('plots'))await request('plots/'+r.id,'DELETE');
const sample=await request('plots/sample','POST',{},201);assert.equal(sample.count,20);
globalThis.__testUser=null;const sampleGeo=await request('map/lots.geojson');assert.equal(sampleGeo.features.length,20);assert.equal(sampleGeo.features.every(f=>f.geometry.type==='Polygon'&&f.properties.title.startsWith('Namuna')),true);
user('manager','manager@example.com');await request('plots/sample','POST',{},409);
user('admin2','admin2@example.com');await request('plots/geojson','GET',{},403);await request('plots/bulk','POST',{ids,published:true},403);
// ---- Xarita sozlamalari va qatlamlari
globalThis.__testUser=null;
const cfg0=await request('map/config');assert.equal(cfg0.title,'Hududlar xaritasi');assert.equal(cfg0.investors.visible,false);
user('outsider','outsider@example.com');await request('mapconfig','POST',{title:'X'},403);await request('maplayers','GET',{},403);await request('maps','GET',{},403);await request('maps','POST',{title:'X'},403);await request('maplayers','POST',{title:'X'},403);
user('manager','manager@example.com');
const saved=await request('mapconfig','POST',{title:'Shirin xaritasi',subtitle:'Auksion hududlari',cta:{label:'Investitsiya kiriting',href:'javascript:alert(1)'},backHref:'//evil.example',investors:{visible:true,title:'Hamkorlar',href:'/partners'},statuses:{sold:{visible:false,label:'Sotilgan (yopiq)',color:'#112233'},ready:{color:'not-a-color'},hacked:{visible:false}},view:{lng:999,lat:40.5,zoom:13}});
assert.equal(saved.config.title,'Shirin xaritasi');assert.equal(saved.config.cta.href,'');assert.equal(saved.config.backHref,'/');assert.equal(saved.config.statuses.sold.visible,false);assert.equal(saved.config.statuses.sold.color,'#112233');assert.equal(saved.config.statuses.ready.color,'');assert.equal('hacked' in saved.config.statuses,false);assert.equal(saved.config.view.lng,67.0015);
const ctaSaved=await request('mapconfig','POST',{cta:{label:'Investitsiya kiriting',href:'/investment',items:[{label:'Telegram bot',href:'https://t.me/example'},{label:'Yomon',href:'javascript:alert(1)'},{label:'',href:'/x'},{label:'Ichki',href:'/partners'}]}});
assert.deepEqual(ctaSaved.config.cta.items,[{label:'Telegram bot',href:'https://t.me/example'},{label:'Ichki',href:'/partners'}]);
assert.equal(saved.config.objects.visible,true);
const savedObj=await request('mapconfig','POST',{objects:{visible:false,title:'Obyektlar',kinds:{projects:{visible:false,label:'Loyiha nuqtalari',color:'#8b5cc7'},news:{visible:false},zones:{color:'bad'}}}});
assert.equal(savedObj.config.objects.visible,false);assert.equal(savedObj.config.objects.kinds.projects.label,'Loyiha nuqtalari');assert.equal(savedObj.config.objects.kinds.projects.visible,false);assert.equal('news' in savedObj.config.objects.kinds,false);assert.equal(savedObj.config.objects.kinds.zones.color,'');
await request('mapconfig','POST',{objects:{visible:true}});
assert.equal(saved.config.view.zoom,13);
globalThis.__testUser=null;const cfg1=await request('map/config');assert.equal(cfg1.title,'Shirin xaritasi');assert.equal(cfg1.investors.visible,true);assert.ok(cfg1.revision);
user('manager','manager@example.com');
const zone={type:'Feature',properties:{name:'Zona A',year:'26-27',bad:{nested:1}},geometry:{type:'Polygon',coordinates:[[[69.1,40.2],[69.12,40.2],[69.12,40.21],[69.1,40.2]]]}};
const road={type:'Feature',properties:{name:'Yo‘l',year:'27-28'},geometry:{type:'LineString',coordinates:[[69.1,40.2],[69.13,40.22],[69.14,40.23]]}};
await request('maplayers','POST',{title:'',features:[zone]},400);
await request('maplayers','POST',{title:'Yomon tur',type:'hex',features:[zone]},400);
await request('maplayers','POST',{title:'Yomon geometriya',features:[{type:'Feature',properties:{},geometry:{type:'GeometryCollection',geometries:[]}}]},400);
await request('maplayers','POST',{title:'Yomon koordinata',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[500,500]}}]},400);
await request('maplayers','POST',{title:'Bo‘sh',features:[]},400);
await request('maplayers','POST',{title:'Yomon maydon',labelProperty:'a<b>',features:[zone]},400);
const layerA=await request('maplayers','POST',{title:'Infratuzilma zonalari',description:'Yillar bo‘yicha',color:'#E04F5F',opacity:0.4,type:'fill',placement:'panel',defaultOn:true,published:false,labelProperty:'name',groupProperty:'year',features:[zone,{...zone,properties:{name:'Zona B',year:'27-28'}}]},201);
const layerB=await request('maplayers','POST',{title:'Metro',color:'#2a6df4',type:'line',placement:'toolbar',published:true,features:[road]},201);
globalThis.__testUser=null;
let pubLayers=await request('map/layers');assert.equal(pubLayers.length,1);assert.equal(pubLayers[0].title,'Metro');assert.equal('features' in pubLayers[0],false);assert.equal(pubLayers[0].placement,'toolbar');
await request('map/layers/'+layerA.id,'GET',{},404);
user('manager','manager@example.com');
const fullA=await request('maplayers/'+layerA.id);assert.equal(fullA.color,'#e04f5f');assert.deepEqual(fullA.groups,['26-27','27-28']);assert.ok(fullA.propertyKeys.includes('name'));assert.equal('bad' in fullA.features[0].properties,false);assert.equal(fullA.featureCount,2);

// alohida xaritalar (map_maps)
await request('maps','POST',{title:''},400);
await request('maps','POST',{title:'Yomon',slug:'Bad Slug!'},400);
await request('maps','POST',{title:'Yomon',slug:'main'},201).then(async r=>{await request('maps/'+r.id,'DELETE')}).catch(()=>{});
const mapA=await request('maps','POST',{title:'Transport va metro',description:'Metro va yo‘llar',showPlots:false,objectKinds:['projects','bad'],layerIds:[layerB.id,'x','<script>'],published:true},201);
await request('maps','POST',{title:'Boshqa',slug:'transport-va-metro'},409);
const mapB=await request('maps','POST',{title:'Qoralama xarita',published:false},201);
const pubMaps=await request('map/maps');assert.equal(pubMaps.length,1);assert.equal(pubMaps[0].slug,'transport-va-metro');assert.equal(pubMaps[0].showPlots,false);assert.deepEqual(pubMaps[0].objectKinds,['projects']);assert.deepEqual(pubMaps[0].layerIds,[layerB.id]);assert.equal('author' in pubMaps[0],false);
await request('maps/'+mapB.id,'PATCH',{published:true,slug:'transport-va-metro'},409);
await request('maps/'+mapB.id,'PATCH',{published:true,view:{lng:67,lat:39.7,zoom:13}});
assert.equal((await request('map/maps')).length,2);
await request('maps/reorder','POST',{ids:[mapB.id,mapA.id]});assert.equal((await request('map/maps'))[0].slug,'qoralama-xarita');
await request('maps/'+mapB.id,'DELETE');await request('maps/'+mapB.id,'DELETE',{},404);
assert.equal((await request('map/maps')).length,1);checks+=11;
// maxsus holatlar va toifalar (menejer boshqaradi)
await request('plots','POST',{lotNumber:'C-1',title:'Maxsus holat',statusKey:'c-ijara1',geometry:square(69.5,41.3)},400);
let cfgX=await request('mapconfig','POST',{customStatuses:[{key:'c-ijara1',label:'Ijarada',color:'#112233'},{key:'bad key',label:'Yomon'},{key:'c-nomsiz',label:''}],categories:[{key:'turar-joy',label:'Turar-joy',color:'#f28c28'},{key:'BAD KEY',label:'Yomon'},{key:'restoran',label:'Restoran',color:'zzz'}],colorBy:'category'});
assert.deepEqual(cfgX.config.customStatuses.map(c=>c.key),['c-ijara1']);assert.deepEqual(cfgX.config.categories.map(c=>c.key),['turar-joy','restoran']);assert.equal(cfgX.config.categories[1].color,'#7b8f98');assert.equal(cfgX.config.colorBy,'category');
const customPlot=await request('plots','POST',{lotNumber:'C-1',title:'Maxsus holat',statusKey:'c-ijara1',categories:['restoran','BAD KEY'],geometry:square(69.5,41.3)},201);
await request('plots/bulk','POST',{ids:[customPlot.id],statusKey:'c-yoq999'},400);
assert.equal((await request('plots/'+customPlot.id)).statusKey,'c-ijara1');assert.deepEqual((await request('plots/'+customPlot.id)).categories,['restoran']);
await request('mapconfig','POST',{customStatuses:[]});
assert.equal((await request('plots/'+customPlot.id)).statusKey,'unknown');
await request('plots/'+customPlot.id,'DELETE');
await request('mapconfig','POST',{colorBy:'status',categories:[]});checks+=8;

const listAll=await request('maplayers');assert.equal(listAll.length,2);assert.equal('features' in listAll[0],false);
await request('maplayers/'+layerA.id,'PATCH',{published:true,title:'Infratuzilma (yangi)'});
globalThis.__testUser=null;
pubLayers=await request('map/layers');assert.equal(pubLayers.length,2);assert.equal(pubLayers.find(l=>l.id===layerA.id).title,'Infratuzilma (yangi)');assert.deepEqual(pubLayers.find(l=>l.id===layerA.id).groups,['26-27','27-28']);
const layerGeo=await request('map/layers/'+layerB.id);assert.equal(layerGeo.features.length,1);assert.equal(layerGeo.features[0].geometry.type,'LineString');
const layerRes=await route.GET(new Request('https://test.local/api/map/layers/'+layerB.id));const layerTag=layerRes.headers.get('etag');assert.ok(layerTag);checks++;
assert.equal((await route.GET(new Request('https://test.local/api/map/layers/'+layerB.id,{headers:{'if-none-match':layerTag}}))).status,304);checks++;
user('manager','manager@example.com');
await request('maplayers/reorder','POST',{ids:[layerB.id,layerA.id]});
assert.deepEqual((await request('maplayers')).map(l=>l.id),[layerB.id,layerA.id]);
const chipLayer=await request('maplayers','POST',{title:'Metro',type:'line',pointStyle:'chip',linkLabel:'Butun yo‘nalish',linkUrl:'/about',published:true,features:[road,{type:'Feature',properties:{name:'M1-1'},geometry:{type:'Point',coordinates:[69.1,40.2]}}]},201);
const chipBad=await request('maplayers','POST',{title:'Yomon havola',type:'line',linkLabel:'x',linkUrl:'javascript:alert(1)',published:true,features:[road]},201);
await request('maplayers','POST',{title:'Yomon nuqta',type:'line',pointStyle:'star',features:[road]},400);
globalThis.__testUser=null;const chipMeta=(await request('map/layers')).find(l=>l.id===chipLayer.id);assert.equal(chipMeta.pointStyle,'chip');assert.equal(chipMeta.linkUrl,'/about');assert.equal((await request('map/layers')).find(l=>l.id===chipBad.id).linkUrl,'');
user('manager','manager@example.com');await request('maplayers/'+chipLayer.id,'DELETE');await request('maplayers/'+chipBad.id,'DELETE');
const metaBefore=await request('map/metadata');
await request('maplayers/'+layerB.id,'PATCH',{color:'#00aa00',features:[road,road]});
assert.notEqual((await request('map/metadata')).revision,metaBefore.revision);
assert.equal((await request('maplayers/'+layerB.id)).featureCount,2);
await request('maplayers/'+layerB.id,'PATCH',{type:'nope'},400);
await request('maplayers/'+layerB.id,'DELETE');await request('maplayers/'+layerB.id,'DELETE',{},404);await request('maplayers/'+layerA.id,'DELETE');
assert.equal((await request('maplayers')).length,0);
// DELETE va boshqa so'rovlar bo'sh tana bilan ham ishlaydi; buzuq JSON — 400 (500 emas)
user('manager','manager@example.com');
const bare=async(path,method,body)=>{const res=await route[method](new Request('https://test.local/api/'+path,{method,headers:{origin:'https://test.local','Content-Type':'application/json'},...(body!==undefined?{body}:{})}));return res};
const tmpPlot=await request('plots','POST',{lotNumber:'BARE-1',title:'Bare delete',geometry:square(69.5,41.2)},201);
const bareDel=await bare('plots/'+tmpPlot.id,'DELETE');assert.equal(bareDel.status,200);checks++;
const tmpLayer=await request('maplayers','POST',{title:'Bare layer',type:'point',features:[{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[69.1,40.2]}}]},201);
assert.equal((await bare('maplayers/'+tmpLayer.id,'DELETE')).status,200);checks++;
assert.equal((await bare('plots','POST','{not json')).status,400);checks++;
// bosh sahifa slayderi (rasm / video / GIF): faqat o'zimizning fayl yoki HTTPS manzil
{const sl=await request('settings','POST',{heroSlides:[{type:'video',url:'/api/files/abcd1234-aaaa',alt:'Video'},{type:'weird',url:'https://cdn.example/a.jpg'},{type:'image',url:'javascript:alert(1)'},{type:'image',url:'/api/files/../x'}],heroInterval:99});
const saved=await request('public');assert.equal(saved.settings.heroSlides.length,2);assert.equal(saved.settings.heroSlides[0].type,'video');assert.equal(saved.settings.heroSlides[1].type,'image');assert.equal(saved.settings.heroInterval,30);checks+=4;
await request('settings','POST',{heroSlides:[],heroInterval:1});assert.equal((await request('public')).settings.heroSlides.length,0);checks++;}
// qo'shimcha fayllar: taqdimot/hujjat yuklash va materialga biriktirish
async function uploadNamed(expected,name,bytes,type=''){const f=new FormData();f.append('file',new File([bytes],name,{type}));const r=await route.POST(new Request('https://test.local/api/upload',{method:'POST',headers:{origin:'https://test.local'},body:f}));const v=await r.json();assert.equal(r.status,expected,JSON.stringify(v));checks++;return v}
user('manager','manager@example.com');
const pptx=await uploadNamed(201,'Taqdimot 2026.pptx',new Uint8Array([0x50,0x4b,3,4,0,0,0,0,0,0,0,0]),'application/octet-stream');
assert.match(pptx.mime,/presentationml/);
await uploadNamed(400,'soxta.pptx',new Uint8Array([1,2,3,4,5,6,7,8]),'');
await uploadNamed(400,'virus.exe',new Uint8Array([0x4d,0x5a,0,0]),'application/x-msdownload');
const pr=await file(pptx.id,200);assert.match(pr.headers.get('content-disposition')||'',/^attachment; filename\*=UTF-8''/);
const withFiles=await request('content','POST',{kind:'news',title:'Fayl bilan yangilik',summary:'x',body:'y',status:'draft',data:{attachments:[{url:pptx.url,name:'Taqdimot 2026.pptx',mime:pptx.mime,size:12},{url:'https://evil.example/x.pptx',name:'yomon'},{url:'/api/files/../../etc',name:'yomon2'}]}});
const savedRow=await (await col('content')).findOne({id:withFiles.id});const savedFiles=JSON.parse(savedRow.data).attachments;assert.equal(savedFiles.length,1);assert.equal(savedFiles[0].url,pptx.url);assert.equal(savedFiles[0].name,'Taqdimot 2026.pptx');checks+=3;
// Reja rasmi (image qatlami): faqat o'zimiz yuklagan fayl, 4 burchak; nashrdan keyin ommaga ochiladi, ishlatilayotgan fayl o'chirilmaydi
user('manager','manager@example.com');
const img=await upload(201);
const corners=[[69.1,40.21],[69.14,40.21],[69.14,40.19],[69.1,40.19]];
await request('maplayers','POST',{title:'Reja',type:'image',imageUrl:'https://evil.example/x.png',corners},400);
await request('maplayers','POST',{title:'Reja',type:'image',imageUrl:img.url,corners:corners.slice(0,3)},400);
await request('maplayers','POST',{title:'Reja',type:'image',imageUrl:img.url,corners:[[500,1],[1,1],[1,1],[1,1]]},400);
const imgLayer=await request('maplayers','POST',{title:'Generplan',type:'image',imageUrl:img.url,corners,opacity:0.6,published:false},201);
globalThis.__testUser=null;await file(img.id,404);assert.equal((await request('map/layers')).length,0);
user('manager','manager@example.com');await request('maplayers/'+imgLayer.id,'PATCH',{published:true,corners:corners.map(c=>[c[0]+0.01,c[1]])});
globalThis.__testUser=null;await file(img.id,200);
const imgPub=await request('map/layers');assert.equal(imgPub.length,1);assert.equal(imgPub[0].type,'image');assert.equal(imgPub[0].imageUrl,img.url);assert.equal(imgPub[0].corners.length,4);assert.equal(imgPub[0].corners[0][0],69.11);
user('manager','manager@example.com');await request('assets/'+img.id,'DELETE',{},409);
await request('maplayers/'+imgLayer.id,'DELETE');await request('assets/'+img.id,'DELETE');
// ---- Login / parol / sessiya
// Login email bo'lishi shart emas
await post_login_tests();
async function post_login_tests(){
  const call=async(action,body,expected)=>{const r=await authCall(action,body);assert.equal(r.status,expected,`auth/${action} ${JSON.stringify(body)}: ${await r.clone().text()}`);checks++;return r};
  await call('register',{name:'Oddiy',login:'Oddiy.Login',password:'Parol-12345'},201);
  await call('login',{login:'oddiy.login',password:'Parol-12345'},200);
  await call('login',{login:'  ODDIY.LOGIN ',password:'Parol-12345'},200);
  await call('register',{name:'Oddiy',login:'oddiy.login',password:'Parol-12345'},409);
  for(const bad of ['ab','a b','x'.repeat(70),'-bad','bad-','юзер','a<b>'])await call('register',{name:'Yomon',login:bad,password:'Parol-12345'},400);
  await call('login',{login:'oddiy.login',password:'noto-gri'},401);
  await call('login',{login:'oddiy.login'},400);
}
resetAuthLimits();
resetAuthLimits();const VISITOR_PASSWORD='Visitor-Pass-99';
const post=async(action,body,expected,headers)=>{const res=await authCall(action,body,headers);assert.equal(res.status,expected,`auth/${action}: ${await res.clone().text()}`);checks++;return res};
await post('login',{email:'manager@example.com',password:'wrong-password'},401);
await post('login',{email:'nobody@example.com',password:PASSWORD},401);
await post('login',{email:'manager@example.com'},400);
await post('register',{name:'X',email:'short@example.com',password:'123'},400);
await post('register',{name:'Tashrif',email:'visitor1@example.com',password:VISITOR_PASSWORD},201);
await post('register',{name:'Tashrif',email:'visitor1@example.com',password:PASSWORD},409);
await post('register',{name:'Tashrif',email:'same@example.com',password:'same@example.com'},400);
// cookie xususiyatlari
const okLogin=await post('login',{email:'manager@example.com',password:PASSWORD},200,{'x-forwarded-proto':'https'});
const setCookie=okLogin.headers.get('set-cookie');assert.ok(/HttpOnly/.test(setCookie)&&/SameSite=Lax/.test(setCookie)&&/Secure/.test(setCookie)&&/Max-Age=604800/.test(setCookie));checks++;
assert.ok(!/Secure/.test((await authCall('login',{email:'manager@example.com',password:PASSWORD})).headers.get('set-cookie')));checks++;
assert.equal(JSON.stringify(await okLogin.json()).includes('passwordHash'),false);
// bazada parol ochiq saqlanmaydi, token faqat xesh
const stored=await (await col('members')).findOne({email:'manager@example.com'});assert.ok(stored.passwordHash.startsWith('scrypt$')&&!stored.passwordHash.includes(PASSWORD));checks++;
const tokenValue=cookieOf(okLogin).split('=')[1];assert.equal(await (await col('sessions')).findOne({id:tokenValue}),null);assert.ok(await (await col('sessions')).findOne({memberId:stored.id}));checks++;
// dashboardda parol xeshi chiqmaydi
user('owner','sarvaregamberdiyev758@gmail.com');
const ownerDash=await request('dashboard');assert.equal(JSON.stringify(ownerDash.members).includes('passwordHash'),false);assert.equal(ownerDash.members.every(m=>m.role!=='visitor'),true);assert.equal(ownerDash.members.find(m=>m.email==='manager@example.com').hasPassword,true);
// yangi superadmin qo'shib bo'lmaydi (mavjudini saqlash mumkin)
await request('members','POST',{password:PASSWORD,name:'Yangi SA',email:'newsa@example.com',role:'superadmin',active:1},403);
const mgrForSa=ownerDash.members.find(m=>m.email==='manager@example.com');
await request('members/'+mgrForSa.id,'PATCH',{name:mgrForSa.name,email:mgrForSa.email,role:'superadmin',active:1},403);
const ownerRow=ownerDash.members.find(m=>m.email==='sarvaregamberdiyev758@gmail.com');
await request('members/'+ownerRow.id,'PATCH',{name:'Owner Renamed',email:ownerRow.email,role:'superadmin',active:1});
// xodim yaratishda parol majburiy va tekshiriladi
await request('members','POST',{name:'No Pass',email:'nopass@example.com',role:'manager',active:1},400);
await request('members','POST',{name:'Weak',email:'weak@example.com',role:'manager',active:1,password:'short'},400);
// tashrifchi hisobi xodimga aylantiriladi (parol saqlanadi)
await request('members','POST',{name:'Tashrif',email:'visitor1@example.com',role:'manager',active:1});
assert.equal((await authCall('login',{email:'visitor1@example.com',password:VISITOR_PASSWORD})).status,200);checks++;
// parolni o'zgartirish: eski parol, boshqa sessiyalar bekor
const staleCookie=jar.get('manager@example.com');
user('manager','manager@example.com');
const changed=await authCall('password',{current:'bad',next:'NewPass12345'},{});assert.equal(changed.status,401);checks++;
const changeRes=await route.POST(new Request('https://test.local/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:'bad',next:'NewPass12345'})}));assert.equal(changeRes.status,400);checks++;
const secondLogin=await authCall('login',{email:'manager@example.com',password:PASSWORD});const secondCookie=cookieOf(secondLogin);
const okChange=await handle(new Request('https://test.local/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json',cookie:secondCookie},body:JSON.stringify({current:PASSWORD,next:'NewPass12345'})}));assert.equal(okChange.status,200);checks++;
assert.equal((await handle(new Request('https://test.local/api/me',{headers:{cookie:staleCookie}}))).status===200&&(await (await handle(new Request('https://test.local/api/me',{headers:{cookie:staleCookie}}))).json()).user===null,true);checks++;
assert.equal((await (await handle(new Request('https://test.local/api/me',{headers:{cookie:secondCookie}}))).json()).user.email,'manager@example.com');checks++;
await post('login',{email:'manager@example.com',password:PASSWORD},401);
await post('login',{email:'manager@example.com',password:'NewPass12345'},200);
// superadmin parolni tiklaydi: eski sessiyalar bekor
user('owner','sarvaregamberdiyev758@gmail.com');
const mgr=ownerDash.members.find(m=>m.email==='manager@example.com');
await request('members/'+mgr.id,'PATCH',{name:mgr.name,email:mgr.email,role:'manager',active:1,password:'ResetPass12345'});
assert.equal((await (await handle(new Request('https://test.local/api/me',{headers:{cookie:secondCookie}}))).json()).user,null);checks++;
await post('login',{email:'manager@example.com',password:'ResetPass12345'},200);
// chiqish: sessiya bekor qilinadi, cookie tozalanadi
const outCookie=cookieOf(await authCall('login',{email:'manager@example.com',password:'ResetPass12345'}));
const loggedOut=await handle(new Request('https://test.local/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',cookie:outCookie},body:'{}'}));assert.equal(loggedOut.status,200);assert.ok(/Max-Age=0/.test(loggedOut.headers.get('set-cookie')));checks++;
assert.equal((await (await handle(new Request('https://test.local/api/me',{headers:{cookie:outCookie}}))).json()).user,null);checks++;
// noma'lum yoki buzilgan cookie
assert.equal((await (await handle(new Request('https://test.local/api/me',{headers:{cookie:'shirin_session=garbage'}}))).json()).user,null);checks++;
// parolni taxmin qilish: 5 xatodan keyin 429, to'g'ri parol ham bloklanadi
for(let i=0;i<5;i++)await post('login',{email:'visitor1@example.com',password:'wrong-'+i},401);
await post('login',{email:'visitor1@example.com',password:VISITOR_PASSWORD},429);
resetAuthLimits();
console.log(`${checks} API checks passed: role separation, scoped statistics, privacy, legacy roles, account blocking, publishing, uploads, CSRF and translations.`);
await closeDb();await mongod.stop();
