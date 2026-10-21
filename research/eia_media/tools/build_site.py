"""Bundle every authored research document for offline use; do not fetch sources."""
from pathlib import Path
import json, shutil, hashlib

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'dashboard'

def build():
    data=json.loads((ROOT/'data/research.json').read_text())
    files=sorted(ROOT.glob('*.md'))+[ROOT/'BRIEF.txt']
    files=[p for p in files if p.name!='COVERAGE.md']
    rows=[(p.name,len(p.read_text()),hashlib.sha256(p.read_bytes()).hexdigest()) for p in files]
    coverage='''# Сверка полноты переноса

Этот файл описывает проверяемый перенос собственного исследовательского корпуса, а не полноту всех существующих сведений об EIA.

Все перечисленные ниже документы включены в site-data.js дословно, доступны через «Полные материалы» и глобальный поиск. Оригиналы для скачивания находятся в archive/. Интерфейс карточек не заменяет полные тексты.

Структурированный корпус: {entities} объектов, {claims} утверждения, {edges} отношений, {sources} обращений к источникам, {timeline} событий, {leads} открытых направлений, {catalogue} карточек выпусков и {photos} ссылок на портреты. Каталог включает семь записей из публичных данных страницы, не раскрытых начальной компоновкой.

nodes.csv и edges.csv включены в архив; все объекты и отношения доступны через досье и режим исследования. Узлы без установленной связи также доступны в каталоге и поиске. Доказательства каждого отношения открываются с линии графа.

Сведения о книгах, журналах и изображениях третьих лиц сохранены с URL и происхождением. Произведения полностью не перепубликуются без установленного разрешения. Авторская аналитика не сокращена. Не извлечённые PDF и недоступные источники честно обозначены в журнале и зацепках.

Ниже — число символов и SHA-256 оригинального файла. Генератор проверок сравнивает эти файлы с встроенными текстами и копиями в archive/.

'''.format(**{k:len(data[k]) for k in ['entities','claims','edges','sources','timeline','leads','catalogue','photos']})
    for name,length,digest in rows:coverage+=f'## {name}\n\n{length} символов. SHA-256: {digest}\n\n'
    (ROOT/'COVERAGE.md').write_text(coverage.rstrip()+'\n')
    docs={p.name:p.read_text() for p in sorted(ROOT.glob('*.md'))}
    docs['BRIEF.txt']=(ROOT/'BRIEF.txt').read_text()
    data['documents']=docs
    (SITE/'archive').mkdir(exist_ok=True)
    for name in docs:shutil.copy2(ROOT/name,SITE/'archive'/name)
    for name in ['nodes.csv','edges.csv']:shutil.copy2(ROOT/name,SITE/'archive'/name)
    shutil.copy2(ROOT/'data/research.json',SITE/'archive/research.json')
    serialized=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    (SITE/'site-data.js').write_text('window.EIA_DATA = '+serialized+';\n')
    # The full compiled source data and texts are also downloadable without JavaScript.
    print(json.dumps(dict(documents=len(docs),bundle_bytes=(SITE/'site-data.js').stat().st_size),ensure_ascii=False))

if __name__=='__main__':build()
