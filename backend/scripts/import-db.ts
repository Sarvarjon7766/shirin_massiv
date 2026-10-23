// data/db/ dagi ma'lumotlarni bazaga yuklaydi (mavjud yozuvlar _id bo'yicha almashtiriladi, boshqalar tegilmaydi).
// Ishga tushirish:  npm run db:import      (bo'sh bazada: serverni bir marta ishga tushiring — superadmin yaratiladi)
import {MongoClient,GridFSBucket,BSON} from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
import {Readable} from 'node:stream';
const dir=path.resolve(import.meta.dirname,'..','data','db');
if(!fs.existsSync(dir)){console.error('data/db topilmadi');process.exit(1)}
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');
await client.connect();
const db=client.db(process.env.MONGODB_DB||'shirin');
const read=(n:string):any[]=>BSON.EJSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'),{relaxed:false}) as any[];
for(const c of ['content','assets','plots','map_layers','map_maps','settings']){
  const docs=read(c);
  for(const d of docs)await db.collection(c).replaceOne({_id:d._id},d,{upsert:true});
  console.log(c,docs.length);
}
const bucket=new GridFSBucket(db,{bucketName:'files'});
const files=read('files');
for(const f of files){
  if(await db.collection('files.files').findOne({_id:f._id}))continue;
  await new Promise<void>((res,rej)=>{
    Readable.from(fs.readFileSync(path.join(dir,'files',String(f._id)))).pipe(bucket.openUploadStreamWithId(f._id,f.filename,{contentType:f.contentType,metadata:f.metadata})).on('finish',()=>res()).on('error',rej);
  });
}
console.log('files',files.length);
await client.close();
