import json,runpy,os
here=os.path.dirname(os.path.abspath(__file__))
miss=json.load(open(os.path.join(here,'errors_missing.json'),encoding='utf8'))
out={}
for i,en,ru,zh in runpy.run_path(os.path.join(here,'er-0.py'))['T']:
    out[miss[i]]={'en':en,'ru':ru,'zh':zh}
print('errors translated',len(out))
json.dump(out,open(os.path.join(here,'..','..','lib','locales','part-f.json'),'w',encoding='utf8'),ensure_ascii=False,indent=2)
