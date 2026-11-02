#!/usr/bin/env python3
"""Resolve catalogue artwork from official stores. Never infer a store ID.

Metadata is cached locally so an interrupted refresh can resume. Ambiguous matches
remain for editorial review; a successful HTTP response is not a reuse licence.
"""
import concurrent.futures
import difflib
import html
import json
import re
import threading
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cover-cache'
CACHE.mkdir(exist_ok=True)
ALIASES = {
    'Garena Free Fire': 'Free Fire', 'Minecraft Mobile': 'Minecraft',
    'Call of Duty: Mobile': 'Call of Duty Mobile',
    'Asphalt Legends Unite': 'Asphalt Legends', 'Injustice 2 Mobile': 'Injustice 2',
    'Chess.com': 'Chess Play and Learn', 'Wild Rift': 'League of Legends Wild Rift',
    'Nikke: Goddess of Victory': 'GODDESS OF VICTORY NIKKE',
    'Grand Theft Auto V Enhanced': 'Grand Theft Auto V Enhanced',
    'Football Manager 2026': 'Football Manager 26',
    'Civilization VI': "Sid Meier's Civilization VI",
    'Civilization VII': "Sid Meier's Civilization VII",
    "Baldur's Gate 1 Enhanced Edition": "Baldur's Gate Enhanced Edition",
    'Resident Evil 4 Remake': 'Resident Evil 4', 'Dead Space Remake': 'Dead Space',
    'Pro Evolution Soccer 2021': 'eFootball PES 2021',
    'Sonic Dash 2: Sonic Boom': 'Sonic Dash 2',
    'Plants vs. Zombies': 'Plants vs Zombies',
}

def normal(s):
    s = unicodedata.normalize('NFKD', html.unescape(s).replace('™','').replace('®','').replace('©','')).lower()
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r'\b(iii|ii|iv|vi|vii|viii|ix)\b', lambda m: {'ii':'2','iii':'3','iv':'4','vi':'6','vii':'7','viii':'8','ix':'9'}[m[0]], s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def score(query, title):
    a, b = normal(query), normal(title)
    if a == b or a.replace(' ','') == b.replace(' ',''): return 1.0
    # A season subtitle is acceptable; a different sequel or year is not.
    na, nb = re.findall(r'\b\d+\b', a), re.findall(r'\b\d+\b', b)
    if na != nb: return 0
    if any(x in b for x in ['in game editor','pbe','endfield','tomb raider reloaded']): return 0
    if len(a) >= 8 and b.startswith(a+' '): return .96
    return 0

def get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=22) as r:
        return r.read().decode('utf-8')

def google(query):
    url = 'https://play.google.com/store/search?' + urllib.parse.urlencode({'q':query,'c':'apps','gl':'MZ','hl':'en'})
    s = get(url)
    found = []
    for m in re.finditer(r'<a\b([^>]*href="(/store/apps/details[^\"]+)"[^>]*)>(.*?)</a>', s, re.S):
        attrs, href, body = m.groups()
        label = re.search(r'aria-label="([^"]+)"', attrs)
        title = re.search(r'<span class="DdYX5">(.*?)</span>', body, re.S)
        title = html.unescape(label[1] if label else re.sub('<[^>]*>', '', title[1]) if title else '')
        chunk = body if body else s[m.end():m.end()+1500]
        art = re.search(r'<img[^>]+src="(https://play-lh\.googleusercontent\.com/[^\"]+)"', chunk)
        if title and art:
            art = re.sub(r'=[^/=]+$', '=s256', html.unescape(art[1]))
            found.append({'title':title,'art':art,'artKind':'icon','storeUrl':'https://play.google.com'+html.unescape(href),'provider':'Google Play','queryUrl':url})
    return found

def apple(query):
    url = 'https://itunes.apple.com/search?' + urllib.parse.urlencode({'term':query,'entity':'software','limit':6,'country':'mz'})
    d = json.loads(get(url))
    return [{'title':x['trackName'],'art':x.get('artworkUrl512') or x.get('artworkUrl100'),'artKind':'icon','storeUrl':x['trackViewUrl'],'provider':'Apple App Store','queryUrl':url} for x in d.get('results',[]) if x.get('artworkUrl512') or x.get('artworkUrl100')]

def steam(query):
    url = 'https://store.steampowered.com/search/suggest?' + urllib.parse.urlencode({'term':query,'f':'games','cc':'MZ','l':'english'})
    s = get(url)
    found=[]
    for m in re.finditer(r'<a\b([^>]*data-ds-appid="(\d+)"[^>]*)>(.*?)</a>', s, re.S):
        attrs, appid, body=m.groups()
        name=re.search(r'<div class="match_name">(.*?)</div>',body,re.S)
        art=re.search(r'<img[^>]+src="([^"]+)"',body)
        if name and art:
            # Keep the exact CDN directory returned by Steam, including asset hash.
            art=html.unescape(art[1]).split('?')[0]
            art=re.sub(r'capsule_sm_120\.(jpg|png)$','header.jpg',art)
            found.append({'title':html.unescape(re.sub('<[^>]*>','',name[1])),'art':art,'artKind':'landscape','storeUrl':'https://store.steampowered.com/app/'+appid+'/','provider':'Steam','queryUrl':url,'storeId':appid})
    return found

lock=threading.Lock()
def resolve(g):
    path=CACHE/(g['id']+'.json')
    if path.exists(): return json.loads(path.read_text())
    query=ALIASES.get(g['name'],g['name'])
    providers=[google,apple] if g['platform']=='Mobile' else [steam]
    result={'id':g['id'],'name':g['name'],'platform':g['platform'],'match':None,'errors':[]}
    for provider in providers:
        try:
            candidates=provider(query)
            if candidates:
                for c in candidates:c['score']=round(score(query,c['title']),4)
                best=max(candidates,key=lambda c:c['score'])
                result.setdefault('candidates',[]).extend(sorted(candidates,key=lambda c:-c['score'])[:3])
                if best['score']>=.88:
                    result['match']=best;break
        except Exception as e:
            result['errors'].append(provider.__name__+': '+str(e)[:100])
            if isinstance(e,urllib.error.HTTPError) and e.code==429:break
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    return result

def main():
    files=['games.json','mobile-expanded.json','pc-expanded.json']
    all_games=[g for f in files for g in json.loads((ROOT/'assets'/f).read_text())]
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for i,r in enumerate(pool.map(resolve,all_games),1):
            results.append(r)
            if i%25==0 or i==len(all_games):
                print(f"{i}/{len(all_games)}; matched={sum(bool(x['match']) for x in results)}",flush=True)
    summary={'checkedAt':str(date.today()),'total':len(results),'matched':sum(bool(x['match']) for x in results),'results':results}
    (CACHE/'report.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
