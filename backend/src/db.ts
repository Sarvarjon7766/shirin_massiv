import {MongoClient,GridFSBucket,type Db,type Document} from 'mongodb';

let client:MongoClient|undefined;
let pending:Promise<Db>|undefined;

// Jadvallar o'rniga kolleksiyalar: members, content, appeals, tasks, audit, settings, assets, plots, map_layers, sessions (+ GridFS "files" bucket).
// Hujjat shakli avvalgi SQL qatorlari bilan bir xil saqlangan (id, user_id, data — JSON matn va h.k.).
async function connect():Promise<Db>{
  client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');
  await client.connect();
  const db=client.db(process.env.MONGODB_DB||'shirin');
  await Promise.all([
    db.collection('members').createIndexes([
      {key:{id:1},unique:true},
      {key:{email:1},unique:true},
      {key:{user_id:1},unique:true,partialFilterExpression:{user_id:{$type:'string'}}},
    ]),
    db.collection('content').createIndexes([{key:{id:1},unique:true},{key:{status:1,updated:-1}},{key:{kind:1}}]),
    db.collection('appeals').createIndexes([{key:{id:1},unique:true},{key:{user_id:1,created:-1}}]),
    db.collection('tasks').createIndex({id:1},{unique:true}),
    db.collection('assets').createIndex({id:1},{unique:true}),
    db.collection('settings').createIndex({key:1},{unique:true}),
    db.collection('audit').createIndex({created:-1}),
    db.collection('map_layers').createIndex({id:1},{unique:true}),
    db.collection('map_maps').createIndexes([{key:{id:1},unique:true},{key:{slug:1},unique:true}]),
    db.collection('sessions').createIndexes([{key:{id:1},unique:true},{key:{expiresAt:1},expireAfterSeconds:0},{key:{memberId:1}}]),
    db.collection('plots').createIndexes([{key:{id:1},unique:true},{key:{lotNumber:1}},{key:{published:1,statusKey:1}}]),
  ]);
  return db;
}

export function getDb():Promise<Db>{
  pending??=connect().catch(e=>{pending=undefined;throw e});
  return pending;
}
export async function col(name:string){return (await getDb()).collection<Document>(name)}
export async function filesBucket(){return new GridFSBucket(await getDb(),{bucketName:'files'})}
export async function closeDb(){const c=client;client=undefined;pending=undefined;await c?.close()}
