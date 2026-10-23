import json,runpy,os
here=os.path.dirname(os.path.abspath(__file__))
miss=json.load(open(os.path.join(here,'content_missing.json'),encoding='utf8'))
out={};seen=set()
for f in sorted(os.listdir(here)):
    if f.startswith('ct-') and f.endswith('.py'):
        for i,en,ru,zh in runpy.run_path(os.path.join(here,f))['T']:
            out[miss[i]]={'en':en,'ru':ru,'zh':zh};seen.add(i)
missing=[i for i in range(len(miss)) if i not in seen]
print('content translated',len(out),'missing',missing)
json.dump(out,open(os.path.join(here,'..','..','lib','locales','part-e.json'),'w',encoding='utf8'),ensure_ascii=False,indent=2)
