"""Bundle current narratives, generated references, dated versions and inputs locally."""
from pathlib import Path
import json, shutil, hashlib
from compile_research import validate
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'dashboard'

def document_files():
    return sorted(ROOT.glob('*.md'))+[ROOT/'BRIEF.txt']+sorted((ROOT/'versions').glob('*/*.md'))+sorted((ROOT/'imports').glob('*.md'))+sorted((ROOT/'imports').glob('*.txt'))

def build():
    data=json.loads((ROOT/'data/research.json').read_text());validate(data)
    files=[p for p in document_files() if p.name!='COVERAGE.md']
    rows=[(p.relative_to(ROOT).as_posix(),len(p.read_text()),hashlib.sha256(p.read_bytes()).hexdigest()) for p in files]
    coverage='# Полнота публикации собственного корпуса\n\nСборка переносит перечисленные документы дословно в локальный пакет данных и archive/. Датированная версия 21.10 и входные вложения различимо маркируются интерфейсом; их положения не подменяют актуальные выводы.\n\n'
    coverage+='Текущий корпус: '+', '.join(f'{k}: {len(data[k])}' for k in ['entities','claims','edges','evidence','sources','routes','catalogue'])+'. Числа описывают сохранённые записи, не полноту расследования. Проверены отдельные колофоны, не все 40 выпусков.\n\n'
    coverage+='Реестр доказательств содержит короткие фрагменты с местом и источником. Оригиналы чужих PDF и личные данные из сканов не включены. Исторические JSON/CSV и входной реестр URL сохранены отдельно для скачивания.\n\n| Документ | Символов | SHA-256 |\n|---|---:|---|\n'
    for name,length,digest in rows:coverage+=f'| {name} | {length} | {digest} |\n'
    (ROOT/'COVERAGE.md').write_text(coverage)
    docs={p.relative_to(ROOT).as_posix():p.read_text() for p in document_files()}
    data['documents']=docs
    archive=SITE/'archive';archive.mkdir(exist_ok=True)
    for name in docs:
        target=archive/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,target)
    extras=[ROOT/'nodes.csv',ROOT/'edges.csv',ROOT/'data/research.json']+sorted((ROOT/'versions').glob('*/*.json'))+sorted((ROOT/'versions').glob('*/*.csv'))+sorted((ROOT/'imports').glob('*.json'))
    for file in extras:
        name='research.json' if file==ROOT/'data/research.json' else file.relative_to(ROOT).as_posix();target=archive/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
    serialized=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    (SITE/'site-data.js').write_text('window.EIA_DATA = '+serialized+';\n')
    print(json.dumps(dict(documents=len(docs),bundle_bytes=(SITE/'site-data.js').stat().st_size),ensure_ascii=False))
if __name__=='__main__':build()
