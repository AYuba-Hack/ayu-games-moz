#!/usr/bin/env python3
"""Collect factual guide metadata and real screenshots from exact official listings.

No search-based image matching. Bounded provider concurrency, resumable cache,
explicit unavailable records, and small hashed JSON files for mobile readers.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import threading
import time
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.guide-cache'
OUT = ROOT / 'assets' / 'guide-data'
TODAY = date.today().isoformat()
LOCK = threading.Lock()
NEXT = {}


def plain(value):
    return re.sub(r'\s+', ' ', unescape(re.sub(r'<[^>]*>', ' ', str(value or '')))).strip()


def excerpt(value, count=22):
    words = plain(value).split()
    return ' '.join(words[:count]) + ('…' if len(words) > count else '')


def requirements_text(value):
    text=plain(value)
    labels={'sistema operativo':'Sistema','sistema operacional':'Sistema','so':'Sistema','os':'Sistema','os version':'Sistema',
            'processador':'CPU','processor':'CPU','memória':'RAM','memory':'RAM',
            'placa gráfica':'GPU','graphics':'GPU','directx':'DirectX',
            'rede':'Rede','network':'Rede','espaço no disco':'Armazenamento','armazenamento':'Armazenamento','storage':'Armazenamento'}
    field=re.compile(r'\b(Sistema Operativo|Sistema Operacional|SO|OS(?: Version)?|Processador|Processor|Memória|Memory|Placa gráfica|Graphics|DirectX|Rede|Network|Espaço no disco|Armazenamento|Storage|Placa de som|Sound Card|Notas adicionais|Additional Notes)\s*:',re.I)
    matches=list(field.finditer(text));rows=[]
    for n,match in enumerate(matches):
        key=labels.get(match[1].lower())
        val=text[match.end():matches[n+1].start() if n+1<len(matches) else len(text)].strip()
        if key and val and val!='…': rows.append(key+': '+val)
    return '\n'.join(rows) if rows else text


def fetch(url):
    host = urlparse(url).netloc
    while True:
        with LOCK:
            delay = NEXT.get(host, 0) - time.monotonic()
            if delay <= 0:
                NEXT[host] = time.monotonic() + (1.8 if 'steampowered.com' in host else 0.8)
                break
        time.sleep(min(delay, 5))
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; AYUGamesMetadata/1.0)', 'Accept-Language': 'pt,en;q=0.8'})
    try:
        with urlopen(req, timeout=35) as response:
            return response.read().decode('utf-8', errors='replace')
    except HTTPError as error:
        if error.code == 429:
            # Do not send another request to a provider that asks us to stop.
            with LOCK: NEXT[host] = max(NEXT.get(host, 0), time.monotonic() + 600)
        raise


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.shots = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'img' and re.search(r'screenshot|captura', a.get('alt', ''), re.I):
            src = a.get('src', '')
            if src.startswith('https://') and src not in [s['thumb'] for s in self.shots]:
                # Both variants were returned by the store's real src/srcset.
                full = a.get('srcset', '').split(' ')[0] or src
                self.shots.append({'thumb': src, 'full': full})


CATEGORIES = {'GAME_ACTION':'Acção', 'GAME_ADVENTURE':'Aventura', 'GAME_ARCADE':'Arcade',
              'GAME_BOARD':'Tabuleiro', 'GAME_CARD':'Cartas', 'GAME_CASINO':'Casino',
              'GAME_CASUAL':'Casual', 'GAME_EDUCATIONAL':'Educativo', 'GAME_MUSIC':'Música',
              'GAME_PUZZLE':'Puzzle', 'GAME_RACING':'Corridas', 'GAME_ROLE_PLAYING':'RPG',
              'GAME_SIMULATION':'Simulação', 'GAME_SPORTS':'Desporto', 'GAME_STRATEGY':'Estratégia',
              'GAME_TRIVIA':'Perguntas', 'GAME_WORD':'Palavras', 'Games':'Jogos'}


def steam(game, appid):
    source = f'https://store.steampowered.com/app/{appid}/'
    endpoint = f'https://store.steampowered.com/api/appdetails?appids={appid}&l=portuguese&cc=MZ'
    response = json.loads(fetch(endpoint)).get(str(appid), {})
    regional_note=''
    if not response.get('success') or not response.get('data',{}).get('screenshots'):
        global_endpoint=f'https://store.steampowered.com/api/appdetails?appids={appid}&l=portuguese&cc=US'
        global_response=json.loads(fetch(global_endpoint)).get(str(appid),{})
        if global_response.get('success') and global_response.get('data',{}).get('screenshots'):
            response=global_response;endpoint=global_endpoint;source+='?cc=US'
            regional_note='A Steam forneceu estes dados e imagens através da ficha dos Estados Unidos. Confirma separadamente a disponibilidade e o acesso em Moçambique.'
    if not response.get('success'):
        raise ValueError('Steam não devolveu uma ficha para este ID')
    d = response['data']
    unique_shots={s['path_full']:{'thumb':s['path_thumbnail'], 'full':s['path_full']} for s in d.get('screenshots', [])}
    shots = list(unique_shots.values())[:4]
    req = d.get('pc_requirements') or {}
    if not isinstance(req, dict): req = {}
    platforms = [label for key,label in [('windows','Windows'),('mac','macOS'),('linux','Linux')] if d.get('platforms',{}).get(key)]
    return {'store':'Steam', 'source':source, 'metadataSource':endpoint, 'storeTitle':d.get('name'),
            'excerpt':excerpt(d.get('short_description')), 'developer':d.get('developers',[]),
            'publisher':d.get('publishers',[]), 'genres':[x['description'] for x in d.get('genres',[])],
            'modes':[x['description'] for x in d.get('categories',[]) if x['id'] in [1,2,9,24,27,36,37,38,39,44]],
            'systems':platforms, 'release':d.get('release_date',{}).get('date',''),
            'comingSoon':bool(d.get('release_date',{}).get('coming_soon')), 'free':d.get('is_free'),
            'age':str(d.get('required_age') or ''),
            'requirements':{'minimum':excerpt(req.get('minimum'),80),'recommended':excerpt(req.get('recommended'),60)},
            'screenshots':shots, 'regionalNote':regional_note}


def google(game):
    appid = parse_qs(urlparse(game['shop']).query)['id'][0]
    source = f'https://play.google.com/store/apps/details?id={appid}&hl=pt&gl=MZ'
    sample = CACHE / 'sample-google.html'
    raw = sample.read_text() if appid == 'com.dts.freefireth' and sample.exists() else fetch(source)
    objects = [json.loads(t) for t in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',raw,re.S)]
    d = next((o for o in objects if o.get('@type') == 'SoftwareApplication'),None)
    if not d: raise ValueError('Google Play sem ficha estruturada')
    parser = Images(); parser.feed(raw)
    offers = d.get('offers') or []
    if isinstance(offers,dict): offers=[offers]
    free = None
    if offers and 'price' in offers[0]: free = str(offers[0]['price']) in ['0','0.0','0.00']
    return {'store':'Google Play','source':source,'storeTitle':d.get('name'),
            'excerpt':excerpt(d.get('description')), 'developer':[d.get('author',{}).get('name','')],
            'publisher':[], 'genres':[CATEGORIES.get(d.get('applicationCategory'), 'Jogos')],
            'systems':['Android'], 'age':d.get('contentRating',''), 'free':free,
            'screenshots':parser.shots[:4]}


def apple(game):
    appid = re.search(r'/id(\d+)',game['shop'])[1]
    endpoint = f'https://itunes.apple.com/lookup?id={appid}&country=mz'
    data = json.loads(fetch(endpoint))
    if not data.get('results'): raise ValueError('App Store sem resultado em MZ')
    d=data['results'][0]
    shots = d.get('screenshotUrls') or d.get('ipadScreenshotUrls') or []
    return {'store':'App Store','source':game['shop'],'metadataSource':endpoint,
            'storeTitle':d.get('trackName'), 'excerpt':excerpt(d.get('description')),
            'developer':[d.get('sellerName') or d.get('artistName','')], 'publisher':[],
            'genres':[CATEGORIES.get(x,x) for x in d.get('genres',[]) if x!='Games'],
            'systems':['iOS / iPadOS'], 'minimumOS':'iOS '+d.get('minimumOsVersion',''),
            'age':d.get('contentAdvisoryRating',''), 'version':d.get('version',''),
            'release':d.get('releaseDate','')[:10], 'free':d.get('price')==0,
            'screenshots':[{'thumb':u,'full':u} for u in shots[:4]]}


def collect(game, retry=False):
    dest = CACHE / (game['id']+'.json')
    if dest.exists():
        cached=json.loads(dest.read_text())
        if cached.get('available') or not retry: return cached
    base = {k:game[k] for k in ['id','name','platform','shop','art','genre','price']}
    if game.get('desc'): base['summary']=game['desc']
    if game.get('guide'): base['practicalGuide']=game['guide']
    base['checkedAt']=TODAY
    try:
        if 'store.steampowered.com/app/' in game['shop']:
            data=steam(game,re.search(r'/app/(\d+)',game['shop'])[1])
        elif 'play.google.com/' in game['shop']: data=google(game)
        elif 'apps.apple.com/' in game['shop']: data=apple(game)
        elif game['id']=='pc-rocket-league': data=steam(game,'252950')
        else:
            manual=ROOT/'scripts'/'publisher-guides.json'
            data=json.loads(manual.read_text())[game['id']]
        base.update(data,available=True)
    except (HTTPError, ValueError, OSError, KeyError) as error:
        base.update(available=False, source=game['shop'], screenshots=[], error=str(error)[:160])
    dest.write_text(json.dumps(base,ensure_ascii=False,indent=2)+'\n')
    return base


def shard(gameid):
    h=0
    for c in gameid: h=(h*31+ord(c))%32
    return h


def build(records):
    OUT.mkdir(exist_ok=True)
    for row in records:
        row['screenshots']=list({s['full']:s for s in row.get('screenshots',[])}.values())[:4]
    shards=[{} for _ in range(32)]
    for row in sorted(records,key=lambda x:x['id']):
        clean={k:v for k,v in row.items() if k!='error'}
        if clean.get('requirements'):
            clean['requirements']={key:requirements_text(value) for key,value in clean['requirements'].items()}
        shards[shard(row['id'])][row['id']]=clean
    for n,rows in enumerate(shards):
        (OUT/f'{n:02d}.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
    manifest={'checkedAt':TODAY,'total':len(records),'available':sum(bool(x['available']) for x in records),
              'withFourImages':sum(len(x.get('screenshots',[]))>=4 for x in records),
              'unavailable':[x['id'] for x in records if not x['available']],
              'fewerImages':[x['id'] for x in records if len(x.get('screenshots',[]))<4]}
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    index=[{k:g[k] for k in ['id','name','platform']} for g in records]
    (ROOT/'assets'/'guide-search.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps(manifest,ensure_ascii=False),flush=True)


if __name__=='__main__':
    args=argparse.ArgumentParser()
    args.add_argument('--retry-unavailable',action='store_true')
    args.add_argument('--build-only',action='store_true')
    opt=args.parse_args()
    CACHE.mkdir(exist_ok=True)
    if opt.retry_unavailable:
        limits=[p.stat().st_mtime for p in CACHE.glob('*.json') if '429: Too Many Requests' in p.read_text()]
        if limits:
            remaining=max(0,max(limits)+600-time.time())
            if remaining:
                NEXT['store.steampowered.com']=time.monotonic()+remaining
                print(f'Steam: respeitar pausa de {round(remaining)} segundos antes de retomar.',flush=True)
    games=sum([json.loads((ROOT/'assets'/(f+'.json')).read_text()) for f in ['games','mobile-expanded','pc-expanded']],[])
    records=[]
    if opt.build_only:
        records=[json.loads((CACHE/(g['id']+'.json')).read_text()) for g in games]
    else:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures=[pool.submit(collect,g,opt.retry_unavailable) for g in games]
            for done in as_completed(futures):
                row=done.result();records.append(row)
                if len(records)%25==0:print(f'{len(records)}/{len(games)}; disponíveis: {sum(bool(x["available"]) for x in records)}',flush=True)
    build(records)
