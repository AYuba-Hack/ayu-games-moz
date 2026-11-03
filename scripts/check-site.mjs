import assert from 'node:assert/strict';
import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=[];
async function walk(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||['dist','node_modules','qa-report','test-results','__pycache__'].includes(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())await walk(full);else files.push(full);
 }
}
await walk(root);
const groups=await Promise.all(['games','mobile-expanded','pc-expanded'].map(async name=>JSON.parse(await readFile(path.join(root,'assets',name+'.json'),'utf8'))));
const ids=new Set();const stores=new Set();const totals={Mobile:0,PC:0};
for(const game of groups.flat()){
 assert.ok(game.id && game.name,'ID and title required');
 assert.ok(!ids.has(game.id),'Duplicate ID: '+game.id);ids.add(game.id);
 assert.ok(game.platform in totals,'Invalid platform: '+game.id);totals[game.platform]++;
 for(const key of ['art','shop','artSource'])assert.equal(new URL(game[key]).protocol,'https:',key+': '+game.id);
 const store=game.platform+':'+game.shop;
 assert.ok(!stores.has(store),'Duplicate official store entry: '+game.id);stores.add(store);
}
assert.ok(totals.Mobile>200 && totals.PC>200,'More than 200 games per platform required');
const guideDir=path.join(root,'assets','guide-data');
const guides=new Map();
const guideShard=id=>[...id].reduce((hash,c)=>(hash*31+c.charCodeAt(0))%32,0);
for(let n=0;n<32;n++){
 const file=String(n).padStart(2,'0')+'.json';
 const raw=await readFile(path.join(guideDir,file),'utf8');
 assert.ok(Buffer.byteLength(raw)<220000,'Keep guide downloads small: '+file);
 const rows=JSON.parse(raw);
 for(const [id,g] of Object.entries(rows)){
  assert.equal(id,g.id,'Guide ID mismatch');
  assert.ok(ids.has(id)&&!guides.has(id),'Unknown or repeated guide: '+id);
  assert.equal(guideShard(id),n,'Wrong guide shard: '+id);guides.set(id,g);
  assert.equal(typeof g.available,'boolean','Source availability required: '+id);
  assert.match(g.checkedAt,/^\d{4}-\d{2}-\d{2}$/,'Source date: '+id);
  assert.equal(new URL(g.source).protocol,'https:','Official source: '+id);
  assert.ok(Array.isArray(g.screenshots)&&g.screenshots.length<=4,'Gallery size: '+id);
  assert.equal(new Set(g.screenshots.map(x=>x.full)).size,g.screenshots.length,'Repeated screenshots: '+id);
  for(const shot of g.screenshots)for(const key of ['thumb','full']){
   const url=new URL(shot[key],'https://ayu-games-moz.pages.dev');
   assert.equal(url.protocol,'https:','Unsafe screenshot URL: '+id);
   if(shot[key].startsWith('/'))await stat(path.join(root,shot[key].slice(1)));
  }
  for(const value of [g.excerpt,...Object.values(g.requirements||{})])if(value)assert.ok(!/<[^>]+>/.test(value),'Guide data must be plain text: '+id);
  if(g.practicalGuide)await stat(path.join(root,g.practicalGuide.replace(/^\//,'')));
 }
}
assert.equal(guides.size,ids.size,'Every game must have a guide');
const guideSearch=JSON.parse(await readFile(path.join(root,'assets','guide-search.json'),'utf8'));
assert.deepEqual(new Set(guideSearch.map(g=>g.id)),ids,'Search must include every guide');
for(const g of groups.flat()){
 const detail=guides.get(g.id);assert.equal(detail.name,g.name);assert.equal(detail.platform,g.platform);assert.equal(detail.shop,g.shop);
 if(detail.available&&g.shop.includes('play.google.com'))assert.equal(new URL(detail.source).searchParams.get('id'),new URL(g.shop).searchParams.get('id'),'Wrong app listing: '+g.id);
}
const manifest=JSON.parse(await readFile(path.join(guideDir,'manifest.json'),'utf8'));
assert.equal(manifest.total,guides.size);
assert.equal(manifest.available,[...guides.values()].filter(x=>x.available).length);
assert.equal(manifest.withFourImages,[...guides.values()].filter(x=>x.screenshots.length===4).length);
assert.deepEqual(new Set(manifest.unavailable),new Set([...guides.values()].filter(x=>!x.available).map(x=>x.id)));
for(const filename of files){
 if(filename.endsWith('.js')||filename.endsWith('.mjs')||filename.endsWith('.cjs'))execFileSync(process.execPath,['--check',filename]);
 if(!filename.endsWith('.html'))continue;
 const text=await readFile(filename,'utf8');
 if(text.includes('google-site-verification:'))continue;
 assert.equal((text.match(/data-preferences-open/g)||[]).length,1,'One privacy control: '+filename);
 assert.equal((text.match(/src="\/assets\/privacy\.js/g)||[]).length,1,'One consent script: '+filename);
 assert.ok(!text.includes('resources.infolinks.com'),'Advertising must be gated by consent: '+filename);
 const htmlIDs=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(htmlIDs.length,new Set(htmlIDs).size,'Duplicate HTML ID: '+filename);
 for(const match of text.matchAll(/\b(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)){
  const target=match[1].split(/[?#]/)[0];
  if(/^(https?:|mailto:|tel:|data:|\/\/)/.test(target))continue;
  const resolved=path.resolve(target.startsWith('/')?root:path.dirname(filename),target.replace(/^\//,''));
  let exists=false;
  for(const candidate of [resolved,resolved+'.html',path.join(resolved,'index.html')]){
   try{if((await stat(candidate)).isFile()){exists=true;break;}}catch{}
  }
  assert.ok(exists,'Broken local reference '+target+' in '+path.relative(root,filename));
 }
}
console.log('OK: '+totals.Mobile+' Mobile + '+totals.PC+' PC; '+guides.size+' guides, '+manifest.withFourImages+' four-image galleries, unique IDs/stores, sources, local references and JavaScript syntax.');
