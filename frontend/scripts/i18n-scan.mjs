// Tarjima qilinmagan matnlarni topish: kod ichidagi tx('…') / copy("…") chaqiruvlari (ternar ichidagilar ham),
// input/select/… yorliqlari va label/title/placeholder xossalari lug'atda (lib/locales/*.json) bormi.
// Ishga tushirish:  node scripts/i18n-scan.mjs         (ro'yxatni chiqaradi)
//                   node scripts/i18n-scan.mjs --json  (JSON)
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dictDir=path.join(root,'lib/locales');
const dict={};
for(const f of fs.readdirSync(dictDir))if(f.endsWith('.json'))Object.assign(dict,JSON.parse(fs.readFileSync(path.join(dictDir,f),'utf8')));
const norm=s=>s.trim().replace(/\s+/g,' ').replace(/[‘’ʻʼ`]/g,"'").toLowerCase();
const known=new Set(Object.keys(dict).map(norm));
const files=[];
const walk=d=>{for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory()){if(!['node_modules','dist','.vinext','public'].includes(f.name))walk(p)}else if(/\.(tsx|ts)$/.test(f.name))files.push(p)}};
walk(path.join(root,'features'));walk(path.join(root,'app'));
const out=new Map();
const BS=String.fromCharCode(92);
const wanted=s=>{
  if(!s||s.length<3||!/[A-Za-z‘’ʻʼ']/.test(s))return false;
  if(/^(https?:|\/|#|\.|\$\{)/.test(s))return false;
  if(/^[\w./:#@?=&%-]+$/.test(s)&&!s.includes(' ')&&!/[A-Z][a-z]/.test(s))return false; // identifikator / yo'l
  if(/^[a-z]+(-[a-z0-9]+)+$/.test(s)||/^[a-z][A-Za-z0-9]+$/.test(s))return false;
  return !known.has(norm(s));
};
const add=(s,file)=>{if(!out.has(s))out.set(s,new Set());out.get(s).add(path.relative(root,file).split(path.sep).join('/'))};
// tx(...), copy(...), t(...) chaqiruvlari ichidagi barcha qo'shtirnoqli matnlar (ternar ham)
function* callBodies(src){
  const re=/(?:\btx|\bcopy|\bt)\(/g;let m;
  while((m=re.exec(src))){
    let i=m.index+m[0].length,depth=1,q='';const start=i;
    for(;i<src.length&&depth>0;i++){
      const c=src[i];
      if(q){if(c===BS)i++;else if(c===q)q='';continue}
      if(c==="'"||c==='"'||c==='`'){q=c;continue}
      if(c==='(')depth++;else if(c===')')depth--;
    }
    yield src.slice(start,i-1);
  }
}
const lit=/(['"])((?:\\.|(?!\1)[^\\\n])+)\1/g;
const labelRe=/(?:input|area|select|dataInput|dInput|text|check|field)\(\s*['"][\w.-]+['"]\s*,\s*(['"])((?:\\.|(?!\1)[^\\\n])+)\1|(?:label|title|placeholder|aria-label|alt|what|where|hint|summary)\s*[=:]\s*(?:\{\s*)?(['"])((?:\\.|(?!\3)[^\\\n])+)\3/g;
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  for(const body of callBodies(src))for(const m of body.matchAll(lit)){const s=m[2].split(BS+"'").join("'").split(BS+'"').join('"').trim();if(wanted(s))add(s,file)}
  for(const m of src.matchAll(labelRe)){const s=(m[2]||m[4]||'').trim();if(wanted(s))add(s,file)}
}
const list=[...out.entries()].map(([s,f])=>({s,files:[...f]})).sort((a,b)=>a.s.localeCompare(b.s));
if(process.argv.includes('--json'))console.log(JSON.stringify(list,null,1));
else{for(const x of list)console.log(x.s+'   ['+x.files.join(', ')+']');console.log('\nTarjimasiz:',list.length)}
