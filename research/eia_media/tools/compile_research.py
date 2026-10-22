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
def reader_profile(data, entity):
    profile=data.get('reader',{}).get('profiles',{}).get(entity['id'])
    if not profile:return entity['body']+'\n'
    text=profile['lead']+'\n'
    for title,paragraph in profile['sections']:
        text+='\n### '+title+'\n\n'+paragraph+'\n'
    text+='\n**Наш вывод.** '+profile['conclusion']+'\n'
    # Keep substantive source detail, while omitting infrastructure diagnostics.
    if entity['id']!='domain':
        text+='\n### Дополнительные сведения из источников\n\n'+entity['body']+'\n'
    return text

def exports(d):
    E={e['id']:e for e in d['entities']};P={p['id']:p for p in d['evidence']}
    out={};preamble='\n\nЗдесь объясняется, что удалось установить, почему это важно и на какой вопрос пока нет ответа. Документ, заявление участника и наш собственный вывод рассматриваются отдельно. Нажмите на название источника рядом с абзацем, если хотите проверить основание.\n'
    for name,people in [('PEOPLE.md',True),('COMPANIES.md',False)]:
        text=('# Профессиональные досье' if people else '# Компании, институты и медиапроекты')+preamble
        for e in d['entities']:
            if (e['kind']=='Человек')!=people:continue
            text+='\n## '+e['name']+'\n\n'+reader_profile(d,e)+'\n'
            labels={'inn':'ИНН','ogrn':'ОГРН','registered':'Дата регистрации','closed':'Дата закрытия','capital':'Уставный капитал'}
            fields=[f'{labels[k]}: {e[k]}' for k in labels if e.get(k) is not None]
            text+='; '.join(fields)+'\n\n'+refs(e['sources'])+'\n'
            es=[x for x in d['edges'] if e['id'] in [x['source'],x['target']]]
            if es:text+='\n### Конкретные связи и их значение\n'
            for x in es:text+='\n- **'+x['relation']+'**. Участники: '+E[x['source']]['name']+' и '+E[x['target']]['name']+'. Период: '+x['period']+'. '+x['significance']+' '+refs(x['sources'])+'\n'
        out[name]=text
    text='# Находки: факт, значение и доказательства'+preamble
    for c in d['claims']:
        reading=d.get('reader',{}).get('findings',{}).get(c['id'],{})
        text+='\n## '+c['title']+'\n\n**Что обнаружено.** '+c['body']+'\n\n**Как это понимать.** '+reading.get('explanation',c['significance'])+'\n\n**Почему это важно.** '+c['significance']+'\n\n**Наш вывод.** '+reading.get('conclusion',c['significance'])+'\n\n**На какой вопрос пока нет ответа.** '+c['limits']+'\n\n**Основание:** '+c['evidence_type']+'. Оценка факта: '+c['fact_status']+'.\n'
        for id in c['evidence']:
            p=P[id];text+='\n> '+p['quote']+'\n\n'+p['location']+'. '+refs([p['source']])+'\n'
    out['FINDINGS.md']=text
    text='# Отдельные связи и исследовательские маршруты'+preamble
    for r in d['routes']:text+='\n## '+r['title']+'\n\n'+r['body']+'\n\n'+' → '.join(E[x]['name'] for x in r['nodes'])+'\n'
    for e in d['edges']:text+='\n## '+E[e['source']]['name']+' и '+E[e['target']]['name']+'\n\n**Какая связь:** '+e['relation']+'. Период: '+e['period']+(' — '+str(e['end']) if e.get('end') else '')+'.\n\n**Что это объясняет.** '+e['significance']+'\n\nОценка факта: '+e['fact_status']+'. '+refs(e['sources'])+'\n'
    out['CONNECTIONS.md']=text
    text='# Хронология'+preamble
    for t in sorted(d['timeline'],key=lambda x:x['date']):text+='\n## '+t['date']+' · '+t['title']+'\n\n'+t['body']+'\n\n'+refs(t['sources'])+'\n'
    out['TIMELINE.md']=text
    text='# Источники: доступ, происхождение и использование'+preamble
    for s in d['sources']:
        access='Содержание пока не удалось получить.' if s.get('error') or s.get('characters',0)<100 else 'Материал получен для проверки.'
        text+='\n## '+(s.get('title') or s['publisher'])+'\n\n'+access+' Проверка: '+s['accessed'][:10]+'.\n\n'+s['reliability']+'\n\n[Открыть оригинал]('+s['url']+') '+refs([s['id']])+'\n'
    out['SOURCES.md']=text
    text='# Открытые вопросы и результаты проверки'+preamble
    for l in d['leads']:
        question=d.get('reader',{}).get('questions',{}).get(l['id'],{})
        body=__import__('re').sub(r'\s*\(c\d+\)','',l['body'])
        text+='\n## '+question.get('title',l['title'])+'\n\n**Что известно сейчас.** '+l.get('status','Вопрос открыт')+'. '+body+'\n\n**Зачем нужен ответ.** '+question.get('why','Ответ позволит уточнить конкретное отношение.')+'\n'
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
    if 'reader' in d:
        assert set(d['reader']['profiles'])==sets['entities'],'Every dossier needs a reader explanation'
        assert set(d['reader']['findings'])==sets['claims'],'Every finding needs an interpretation'
        for id,profile in d['reader']['profiles'].items():
            assert len(profile['sections'])>=2 and profile['lead'] and profile['conclusion'],id
        for id,reading in d['reader']['findings'].items():
            assert reading['explanation'] and reading['conclusion'],id

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
