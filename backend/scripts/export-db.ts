// Ommaviy ma'lumotlarni (kontent, sayt sozlamalari, xarita, hududlar, rasm/fayllar) data/db/ ga chiqaradi.
// Foydalanuvchilar, parollar, sessiyalar, murojaatlar, vazifalar va jurnal CHIQARILMAYDI (shaxsiy ma'lumot).
// Ishga tushirish:  npm run db:export
import {MongoClient,GridFSBucket,BSON} from 'mongodb';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve(import.meta.dirname,'..','data','db');
const PUBLIC=['content','assets','plots','map_layers','map_maps'];
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');
await client.connect();
const db=client.db(process.env.MONGODB_DB||'shirin');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'files'),{recursive:true});
const write=(name:string,docs:any[])=>fs.writeFileSync(path.join(out,name+'.json'),BSON.EJSON.stringify(docs,undefined,1,{relaxed:false}));
for(const c of PUBLIC){const docs=await db.collection(c).find().toArray();write(c,docs);console.log(c,docs.length)}
// sozlamalar: faqat sayt va xarita (stats:* — foydalanuvchiga tegishli, chiqarilmaydi)
const settings=await db.collection('settings').find({key:{$in:['site','map:config','map:revision','initialized']}}).toArray();write('settings',settings);console.log('settings',settings.length);
const files=await db.collection('files.files').find().toArray();write('files',files);
const bucket=new GridFSBucket(db,{bucketName:'files'});
for(const f of files){
  const chunks:Buffer[]=[];
  for await(const ch of bucket.openDownloadStream(f._id))chunks.push(ch as Buffer);
  fs.writeFileSync(path.join(out,'files',String(f._id)),Buffer.concat(chunks));
}
console.log('files',files.length);
await client.close();
