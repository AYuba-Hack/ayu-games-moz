from pathlib import Path
from urllib.parse import urlsplit
from xml.sax.saxutils import escape
import sys
if len(sys.argv)!=2: raise SystemExit('Uso: python gerar_sitemap.py https://teu-blog.pages.dev')
url=sys.argv[1].rstrip('/')
u=urlsplit(url)
if u.scheme!='https' or not u.hostname: raise SystemExit('Especifica um endereço HTTPS válido.')
root=Path(__file__).resolve().parent
pages=sorted(p for p in root.rglob('*.html') if '.git' not in p.parts)
entries=[]
for p in pages:
    rel=p.relative_to(root).as_posix(); path='' if rel=='index.html' else '/'+rel
    entries.append(f'<url><loc>{escape(url+path)}</loc></url>')
xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+'\n'.join(entries)+'\n</urlset>\n'
(root/'sitemap.xml').write_text(xml,encoding='utf-8')
(root/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+url+'/sitemap.xml\n',encoding='utf-8')
print('Sitemap gerado com',len(entries),'páginas para',url)
