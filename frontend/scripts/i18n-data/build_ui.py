import json,runpy,os,sys
here=os.path.dirname(os.path.abspath(__file__))
miss=json.load(open(os.path.join(here,'miss_static.json'),encoding='utf8'))
out={};seen=set()
for f in sorted(os.listdir(here)):
    if f.startswith('ui-') and f.endswith('.py'):
        for i,en,ru,zh in runpy.run_path(os.path.join(here,f))['T']:
            key=miss[i]['s']
            seen.add(i)
            out[key]={'en':en,'ru':ru,'zh':zh}
missing=[i for i in range(len(miss)) if i not in seen]
print('translated',len(out),'missing idx',[(i,miss[i]['s'][:40]) for i in missing])
json.dump(out,open(os.path.join(here,'..','..','lib','locales','part-d.json'),'w',encoding='utf8'),ensure_ascii=False,indent=2)
