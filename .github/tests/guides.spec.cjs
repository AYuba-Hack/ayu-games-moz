const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const index=JSON.parse(fs.readFileSync(path.join(root,'assets/guide-search.json'),'utf8'));
const shard=id=>[...id].reduce((h,c)=>(h*31+c.charCodeAt(0))%32,0);
const record=id=>JSON.parse(fs.readFileSync(path.join(root,'assets/guide-data',String(shard(id)).padStart(2,'0')+'.json'),'utf8'))[id];
const image='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#204435"/></svg>';
async function stableImages(page){
 // Keep UI tests independent of third-party image hosts and avoid ad impressions.
 await page.route('**/*',route=>{
  if(route.request().resourceType()==='image')return route.fulfill({contentType:'image/svg+xml',body:image});
  if(route.request().url().includes('infolinks.com'))return route.fulfill({contentType:'application/javascript',body:''});
  return route.continue();
 });
}
test('cada cartão abre um guia com dados, requisitos, imagens e artigo relacionado',async({page})=>{
 await stableImages(page);
 await page.goto('/catalogo.html');await page.locator('[data-query]').fill('Wukong');
 await page.getByRole('link',{name:'Ver guia completo →',exact:true}).click();
 await expect(page).toHaveURL(/jogo.*id=pc-black-myth-wukong/);
 await expect(page.locator('article h1')).toHaveText('Black Myth: Wukong');
 await expect(page.locator('.guide-gallery [data-screenshot]')).toHaveCount(4);
 await expect(page.locator('#dados')).toContainText('Game Science');
 await expect(page.locator('#requisitos')).toContainText('16 GB');
 await expect(page.getByRole('link',{name:'Ler o guia editorial de Black Myth: Wukong →'})).toHaveAttribute('href','/destaques/black-myth-wukong.html');
 await expect(page.getByRole('link',{name:'Abrir loja oficial ↗',exact:true})).toHaveAttribute('href',record('pc-black-myth-wukong').shop);
});
test('galeria amplia, avança, volta, responde ao teclado e devolve o foco',async({page})=>{
 await stableImages(page);await page.goto('/jogo.html?id=mobile-free-fire');
 const first=page.locator('[data-screenshot="0"]');await expect(first).toBeVisible();
 await first.click();const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();await expect(dialog).toContainText('1 de 4');
 await page.getByRole('button',{name:'Seguinte →',exact:true}).click();await expect(dialog).toContainText('2 de 4');
 await page.keyboard.press('ArrowLeft');await expect(dialog).toContainText('1 de 4');
 await page.getByRole('button',{name:'← Anterior',exact:true}).click();await expect(dialog).toContainText('4 de 4');
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(first).toBeFocused();
});
test('pesquisa dos guias distingue Mobile e PC para o mesmo título',async({page})=>{
 await stableImages(page);await page.goto('/guias.html');
 await page.locator('[data-guide-search] input').fill('Roblox');
 await expect(page.locator('[data-guide-matches] a')).toHaveCount(2);
 await page.locator('[data-guide-search] button').click();
 await expect(page).toHaveURL(/guias/);
 await page.getByRole('link',{name:'Roblox — Mobile',exact:true}).click();
 await expect(page.locator('article h1')).toHaveText('Roblox');
 await expect(page.locator('#dados')).toContainText('Android');
 await expect(page.locator('#dados')).not.toContainText('Windows');
 await page.locator('[data-guide-search] input').fill('Roblox — PC');
 await page.locator('[data-guide-search] button').click();
 await expect(page).toHaveURL(/id=pc-roblox/);
 await expect(page.locator('.guide-hero .eyebrow')).toHaveText('GUIA DO JOGO · PC');
});
test('poupança de dados impede imagens no guia e na ficha antiga até ser desactivada',async({page})=>{
 await stableImages(page);await page.goto('/catalogo.html');
 await page.locator('[data-lite]').check();
 const images=[];page.on('request',req=>{if(req.resourceType()==='image')images.push(req.url());});
 for(const route of ['/jogo.html?id=mobile-free-fire','/fichas/pc-black-myth-wukong.html']){
  await page.goto(route);await expect(page.locator('[data-guide-root]')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('[data-guide-lite]')).toBeChecked();
  await expect(page.locator('[data-guide-root] img[src]')).toHaveCount(0);
 }
 expect(images.filter(url=>!url.endsWith('/favicon.svg'))).toEqual([]);
 await page.getByRole('button',{name:'Mostrar imagens e desactivar poupança',exact:true}).click();
 await expect(page.locator('.guide-gallery [data-screenshot]')).toHaveCount(4);
 await page.reload();await expect(page.locator('[data-guide-lite]')).not.toBeChecked();
});
test('guia ausente ou ID inválido permite recuperar pela pesquisa',async({page})=>{
 await stableImages(page);
 for(const url of ['/jogo.html','/jogo.html?id=nao-existe','/jogo.html?id=%3Cscript%3E']){
  await page.goto(url);await expect(page.locator('[data-guide-root]')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('[data-guide-search] input')).toBeVisible();
  await expect(page.locator('article h1')).toContainText(/guia|Guia/);
 }
 await page.locator('[data-guide-search] input').fill('Black Myth: Wukong');
 await page.locator('[data-guide-search] button').click();
 await expect(page.locator('article h1')).toHaveText('Black Myth: Wukong');
});
test('fonte sem dados não inventa requisitos nem repete imagens',async({page})=>{
 await stableImages(page);
 const g={...record('pc-black-myth-wukong'),available:false,screenshots:[],requirements:{minimum:'',recommended:''},developer:[],genres:[],modes:[],systems:[]};
 await page.route('**/assets/guide-data/**',route=>route.fulfill({json:{[g.id]:g}}));
 await page.goto('/jogo.html?id='+g.id);
 await expect(page.locator('#sobre-jogo')).toContainText('não devolveu todos os dados');
 await expect(page.locator('#imagens')).toContainText('Não foi possível confirmar capturas');
 await expect(page.locator('[data-screenshot]')).toHaveCount(0);
 await expect(page.locator('#requisitos')).toContainText('não forneceu uma lista completa');
});
test('erro de rede no guia tem recuperação sem encaminhar para outro jogo',async({page})=>{
 await stableImages(page);let failures=0;
 await page.route('**/assets/guide-data/**',route=>failures++===0 ? route.abort() : route.continue());
 await page.goto('/jogo.html?id=pc-black-myth-wukong');
 await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o guia');
 await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
 await expect(page.locator('article h1')).toHaveText('Black Myth: Wukong');
});
test('jogos por lançar mostram preparação e a disponibilidade da fonte',async({page})=>{
 await stableImages(page);
 const g=index.map(g=>record(g.id)).find(g=>g.comingSoon);
 expect(g).toBeTruthy();await page.goto('/jogo.html?id='+g.id);
 await expect(page.getByRole('link',{name:'Ver lançamento na loja ↗',exact:true})).toBeVisible();
 await expect(page.locator('#como-comecar')).toContainText('Quando o jogo estiver disponível');
 await expect(page.locator('#dados')).toContainText('Por lançar na fonte consultada');
});
for(const width of [320,390,768,1440]){
 test('guia Mobile e PC sem deslocamento lateral '+width,async({page})=>{
  await stableImages(page);await page.setViewportSize({width,height:850});
  for(const id of ['mobile-free-fire','pc-black-myth-wukong']){
   await page.goto('/jogo.html?id='+id);await expect(page.locator('.guide-gallery')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
   if(width<760)expect(await page.locator('.guide-gallery').evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  }
 });
}
