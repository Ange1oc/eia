"""Fetch public pages for research; preserve status, text and links in a local cache."""
import sys, os, json, hashlib, datetime, concurrent.futures, subprocess
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urljoin, quote
sys.path.insert(0, '/workspace/.research-tools')
from bs4 import BeautifulSoup

CACHE = Path(os.environ.get('EIA_EVIDENCE_DIR', '/tmp/eia-evidence'))
CACHE.mkdir(exist_ok=True)

def fetch(url):
    key = hashlib.sha256(url.encode()).hexdigest()[:12]
    meta = dict(url=url, key=key, accessed=datetime.datetime.now(datetime.timezone.utc).isoformat())
    try:
        req = Request(quote(url, safe=':/?&=+%#'), headers={'User-Agent':'Mozilla/5.0 (compatible; PublicSourceResearch/1.0)'})
        with urlopen(req, timeout=35) as res:
            raw = res.read(32 * 1024 * 1024 + 1)
            if len(raw) > 32 * 1024 * 1024:
                raise ValueError('Source exceeds the 32 MiB research download limit')
            meta.update(status=res.status, final_url=res.url, sha256=hashlib.sha256(raw).hexdigest())
        if raw.startswith(b'%PDF'):
            pdf = CACHE / (key+'.pdf')
            pdf.write_bytes(raw)
            result = subprocess.run(['pdftotext','-layout',str(pdf),str(CACHE / (key+'.txt'))], capture_output=True, text=True)
            meta.update(kind='pdf', bytes=len(raw), text_extraction_exit=result.returncode)
            if result.returncode == 0:
                meta['characters'] = len((CACHE / (key+'.txt')).read_text())
            (CACHE / (key+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2))
            return meta
        soup = BeautifulSoup(raw, 'html.parser')
        meta['title'] = soup.title.get_text(' ', strip=True) if soup.title else ''
        meta['links'] = list({(a.get_text(' ',strip=True),urljoin(url,a['href'])) for a in soup.select('a[href]')})
        meta['images'] = [{'alt':i.get('alt',''),'url':urljoin(url,i.get('src',''))} for i in soup.select('img[src]')]
        for el in soup.select('script,style,noscript,svg'):el.decompose()
        text = soup.get_text('\n',strip=True)
        (CACHE / (key+'.txt')).write_text(text)
        (CACHE / (key+'.html')).write_bytes(raw)
        meta['characters'] = len(text)
    except Exception as exc:
        meta['error'] = str(exc)
    (CACHE / (key+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2))
    return {k:v for k,v in meta.items() if k not in ('links','images')}

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for meta in pool.map(fetch,sys.argv[1:]): print(json.dumps(meta,ensure_ascii=False),flush=True)
