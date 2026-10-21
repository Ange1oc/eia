"""Validate canonical JSON and export clearly identified reference documents.

Authored narrative Markdown is never overwritten. A manifest protects manual changes
in generated reference files: move those edits into JSON before regenerating.
"""
from pathlib import Path
import argparse, csv, hashlib, io, json, collections
R=Path(__file__).resolve().parents[1]
MANIFEST=R/'data/generated-manifest.json'

def digest(data):return hashlib.sha256(data).hexdigest()
def refs(ids):return ' '.join('['+x+']' for x in dict.fromkeys(ids))
def exports(d):
    E={e['id']:e for e in d['entities']};P={p['id']:p for p in d['evidence']}
    out={};preamble='\n\nСправочник из канонического `data/research.json`. Редактируйте структурированные записи; авторские аналитические главы находятся в FULL_REPORT.md, GOVERNMENT_CONNECTIONS.md, MEDIA_RIGHTS.md, FINANCES.md и LEGAL.md.\n'
    for name,people in [('PEOPLE.md',True),('COMPANIES.md',False)]:
        text=('# Профессиональные досье' if people else '# Компании, институты и медиапроекты')+preamble
        for e in d['entities']:
            if (e['kind']=='Человек')!=people:continue
            text+='\n## '+e['name']+'\n\n'+e['body']+'\n\n'
            fields=[f'{k}: {e[k]}' for k in ['inn','ogrn','registered','closed','capital'] if e.get(k) is not None]
            text+='; '.join(fields)+'\n\n'+refs(e['sources'])+'\n'
            es=[x for x in d['edges'] if e['id'] in [x['source'],x['target']]]
            for x in es:text+='\n- '+E[x['source']]['name']+' → **'+x['relation']+'** → '+E[x['target']]['name']+'. '+x['period']+'. '+x['significance']+' '+refs(x['sources'])+'\n'
        out[name]=text
    text='# Находки: факт, значение и доказательства'+preamble
    for c in d['claims']:
        text+='\n## '+c['id']+' · '+c['title']+'\n\n'+c['body']+'\n\n**Значение.** '+c['significance']+'\n\n**Предел.** '+c['limits']+'\n\n**Статус факта:** '+c['fact_status']+'. **Тип источника:** '+c['evidence_type']+'.\n'
        for id in c['evidence']:
            p=P[id];text+='\n> '+p['quote']+'\n\n'+p['location']+'. '+refs([p['source']])+'\n'
    out['FINDINGS.md']=text
    text='# Отдельные связи и исследовательские маршруты'+preamble
    for r in d['routes']:text+='\n## '+r['title']+'\n\n'+r['body']+'\n\n'+' → '.join(E[x]['name'] for x in r['nodes'])+'\n'
    for e in d['edges']:text+='\n## '+e['id']+' · '+E[e['source']]['name']+' → '+E[e['target']]['name']+'\n\n**'+e['relation']+'**. '+e['period']+(' — '+str(e['end']) if e.get('end') else '')+'.\n\n'+e['significance']+'\n\n'+e['fact_status']+'; '+e['kind']+'. '+refs(e['sources'])+'\n'
    out['CONNECTIONS.md']=text
    text='# Хронология'+preamble
    for t in sorted(d['timeline'],key=lambda x:x['date']):text+='\n## '+t['date']+' · '+t['title']+'\n\n'+t['body']+'\n\n'+refs(t['sources'])+'\n'
    out['TIMELINE.md']=text
    text='# Источники: доступ, происхождение и использование'+preamble
    for s in d['sources']:
        text+='\n## '+s['id']+' · '+(s.get('title') or s['url'])+'\n\n'+s['url']+'\n\nДоступ: '+s['accessed']+'. '+s.get('content_status','')+'. '+str(s.get('error') or 'HTTP '+str(s.get('status','?')))+'.\n\n'+s['reliability']+'\n\nSHA-256: '+s.get('sha256','не получен')+'\n'
    out['SOURCES.md']=text
    text='# Открытые вопросы и результаты проверки'+preamble
    for l in d['leads']:text+='\n## '+l['id']+' · '+l['title']+'\n\n'+l.get('status','открыто')+'. '+l['body']+'\n'
    out['LEADS.md']=text
    for name,items,fields in [('nodes.csv',d['entities'],['id','name','kind','country','inn','ogrn','registered','closed','summary']),('edges.csv',d['edges'],['id','source','target','relation','period','end','fact_status','kind','significance'])]:
        f=io.StringIO(newline='');w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore',lineterminator='\n');w.writeheader();w.writerows(items);out[name]=f.getvalue()
    return {k:v.rstrip()+'\n' for k,v in out.items()}

def validate(d):
    sets={k:{x['id'] for x in d[k]} for k in ['entities','claims','edges','evidence','sources']}
    for k,s in sets.items():assert len(s)==len(d[k]),'Duplicate '+k
    for k in ['claims','edges']:
        for x in d[k]:
            for field in ['significance','fact_status','evidence']:assert x.get(field),(x['id'],field)
            assert set(x['evidence'])<=sets['evidence'],x['id']
            assert set(x['sources'])<=sets['sources'],x['id']
    for e in d['edges']:assert {e['source'],e['target']}<=sets['entities'],e['id']
    for c in d['claims']:assert set(c['objects'])<=sets['entities'],c['id']
    for p in d['evidence']:
        assert p['source'] in sets['sources'] and p['location'] and p['quote'],p['id']
        assert not __import__('re').search(r'паспорт\s+(?:гр|сер|№)|адрес регистрации|кв\.\s*\d',p['quote'],__import__('re').I),p['id']
    G={x['id']:x for x in d['edges']}
    for r in d['routes']:
        assert len(r['nodes'])==len(r['edge_ids'])+1,r['id']
        for a,b,id in zip(r['nodes'],r['nodes'][1:],r['edge_ids']):assert {a,b}=={G[id]['source'],G[id]['target']},(r['id'],id)
    assert len({e['significance'] for e in d['edges']})==len(d['edges']),'Repeated significance'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    d=json.loads((R/'data/research.json').read_text());validate(d);out=exports(d)
    previous=json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    if args.write:
        modified=[n for n,h in previous.items() if (R/n).exists() and digest((R/n).read_bytes())!=h]
        if modified:raise SystemExit('Ручные изменения защищены: '+', '.join(modified)+'. Перенесите правку в канонический JSON и согласуйте файл; ничего не перезаписано.')
        for n,t in out.items():(R/n).write_text(t)
        MANIFEST.write_text(json.dumps({n:digest((R/n).read_bytes()) for n in out},indent=2)+'\n')
    else:
        stale=[n for n,t in out.items() if not (R/n).exists() or (R/n).read_text()!=t]
        if stale:raise SystemExit('Обновите справочники (--write): '+', '.join(stale))
    print(json.dumps(dict(valid=True,generated=len(out),claims=len(d['claims']),evidence=len(d['evidence'])),ensure_ascii=False))
if __name__=='__main__':main()
