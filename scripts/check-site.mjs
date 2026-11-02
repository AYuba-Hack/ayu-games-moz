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
console.log('OK: '+totals.Mobile+' Mobile + '+totals.PC+' PC; unique IDs/stores, artwork/source URLs, local references and JavaScript syntax.');
