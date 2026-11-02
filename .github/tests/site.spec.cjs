const {test,expect}=require('@playwright/test');
const featured=["black-myth-wukong","star-wars-outlaws","dragon-ball-sparking-zero","god-of-war-ragnarok","assassins-creed-shadows","kingdom-come-deliverance-ii","avowed","gta-v","fortnite"];
test('homepage compacta mostra 9 jogos e 4 guias',async({page})=>{
 await page.goto('/');
 await expect(page.locator('h1')).toContainText('Encontra o teu jogo');
 await expect(page.locator('.portal-game')).toHaveCount(9);
 await expect(page.locator('[data-post]')).toHaveCount(4);
});
for(const width of [320,360,390,414,540,760,768,1024,1440]){
 test('layout sem deslocamento horizontal '+width,async({page})=>{
  await page.setViewportSize({width,height:850});await page.goto('/');
  const w=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(width+2);
  if(width<=1110)await expect(page.locator('[data-menu-toggle]')).toBeVisible();
 });
}
test('Mobile contém 20 jogos com filtro e favoritos',async({page})=>{
 await page.goto('/mobile.html');await expect(page.locator('[data-game]')).toHaveCount(20);
 await page.locator('[data-game-search]').fill('Free Fire');
 await expect(page.locator('[data-game]:visible')).toHaveCount(1);
 await page.locator('[data-game-search]').fill('');
 await page.locator('#mobile-free-fire [data-fav]').click();
 await page.locator('[data-only-favs]').check();
 await expect(page.locator('[data-game]:visible')).toHaveCount(1);
});
test('PC contém 20 títulos e 7 aventuras adicionais',async({page})=>{
 await page.goto('/pc.html');await expect(page.locator('[data-game]')).toHaveCount(27);
 await expect(page.getByText('Black Myth: Wukong').first()).toBeVisible();
});
test('fichas não-indexáveis mas acessíveis',async({page})=>{
 for(const p of ['/fichas/mobile-roblox.html','/fichas/pc-counter-strike-2.html','/fichas/pc-avowed.html']){
  await page.goto(p);
  await expect(page.locator('article h1')).toHaveCount(1);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex,follow');
 }
});
test('nove artigos de destaque',async({page})=>{
 for(const s of featured){await page.goto('/destaques/'+s+'.html');await expect(page.locator('article h1')).toHaveCount(1);}
});
test('calculadora mensal de dados',async({page})=>{
 await page.goto('/ferramentas.html');
 await page.locator('[data-mb]').fill('80');await page.locator('[data-hours]').fill('2');await page.locator('[data-days]').fill('20');
 await expect(page.locator('[data-data-result]')).toContainText(/3[.\s\u00a0\u202f]?200 MB/);
});
test('rejeitar anuncios sem perder acesso ao artigo',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.portal-consent')).toBeVisible();
 await page.locator('[data-consent-no]').click();
 await expect(page.locator('.portal-consent')).toHaveCount(0);
 await page.goto('/artigos/free-fire-android-sem-lag.html');
 await expect(page.locator('article h1')).toHaveCount(1);
});
test('guias e instituicionais',async({page})=>{
 await page.goto('/guias.html');await expect(page.locator('[data-post]')).toHaveCount(12);
 await page.goto('/privacidade.html');await expect(page.locator('h1')).toContainText('privacidade');
 await page.goto('/404.html');await expect(page.locator('h1')).toContainText('Ups');
});
test('Pesquisa global e catálogo expandido carregam os dados localmente', async ({page})=>{
 await page.goto('/catalogo.html');
 await expect(page.locator('h1')).toContainText('catálogo');
 await expect(page.locator('.mega-card')).toHaveCount(24);
 const totals=await page.locator('.mega-counter').innerText();
 expect(totals).toContain('jogos encontrados');
 await page.locator('[data-query]').fill('Wukong');
 await expect(page.locator('.mega-card')).toHaveCount(1);
 await page.goto('/mobile.html');
 await expect(page.locator('.portal-game')).toHaveCount(20);
 await expect(page.locator('.mega-card')).toHaveCount(24);
 await page.goto('/pc.html');
 await expect(page.locator('.portal-game')).toHaveCount(27);
 await expect(page.locator('.mega-card')).toHaveCount(24);
});
test('Catálogo contém mais de 200 jogos por plataforma',async({page})=>{
 const original=await (await page.request.get('/assets/games.json')).json();
 const mobi=await (await page.request.get('/assets/mobile-expanded.json')).json();
 const pc=await (await page.request.get('/assets/pc-expanded.json')).json();
 expect(mobi.length+original.filter(g=>g.platform==='Mobile').length).toBeGreaterThan(200);
 expect(pc.length+original.filter(g=>g.platform==='PC').length).toBeGreaterThan(200);
});
test('Pesquisa da homepage dirige ao catálogo',async({page})=>{
 await page.goto('/');
 await page.locator('.mega-featured-search input').fill('Minecraft');
 await page.locator('.mega-featured-search button').click();
 await expect(page).toHaveURL(/catalogo.*q=Minecraft/);
 await expect(page.locator('.mega-card').first()).toBeVisible();
 expect(await page.locator('.mega-card').count()).toBeGreaterThanOrEqual(2);
});

test('Comparador mostra os dois títulos seleccionados',async({page})=>{
 await page.goto('/comparar.html');
 await page.locator('[data-game-one]').fill('Garena Free Fire');
 await page.locator('[data-game-two]').fill('Cyberpunk 2077');
 await page.locator('[data-compare-form] button').click();
 await expect(page.locator('.mega-compare-card')).toHaveCount(2);
});
test('Catálogo permite ocultar capas para poupar dados',async({page})=>{
 await page.goto('/catalogo.html');
 await expect(page.locator('.mega-card')).toHaveCount(24);
 await page.locator('[data-lite]').check();
 await expect(page.locator('.mega-card .mega-art img')).toHaveCount(0);
 await page.reload();
 await expect(page.locator('[data-lite]')).toBeChecked();
});

for (const width of [320, 390, 768, 1440]) {
 test('catálogo e comparador cabem no ecrã '+width, async ({page}) => {
  await page.setViewportSize({width,height:850});
  for (const path of ['/catalogo.html','/mobile.html','/pc.html','/comparar.html']) {
   await page.goto(path);
   if (path !== '/comparar.html') await expect(page.locator('.mega-card').first()).toBeVisible();
   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
  }
 });
}

test('privacidade: recusa persiste em cinco páginas e depois de recarregar', async ({page}) => {
 const advertising=[];
 page.on('request', request => { if(request.url().includes('infolinks.com')) advertising.push(request.url()); });
 await page.goto('/');
 await page.locator('[data-consent-no]').click();
 for (const path of ['/catalogo.html','/mobile.html','/pc.html','/artigos/free-fire-android-sem-lag.html','/fichas/mobile-roblox.html']) {
  await page.goto(path);
  await expect(page.locator('.portal-consent')).toHaveCount(0);
  await expect(page.locator('[data-preferences-open]')).toHaveCount(1);
 }
 await page.reload();
 await expect(page.locator('.portal-consent')).toHaveCount(0);
 expect(advertising).toEqual([]);
 await page.locator('[data-preferences-open]').click();
 await expect(page.locator('.portal-consent')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('.portal-consent')).toHaveCount(0);
 await expect(page.locator('[data-preferences-open]')).toBeFocused();
});

test('privacidade: aceitação pode ser revogada sem novo aviso ao navegar', async ({page}) => {
 // Intercept the advertising script: tests must never generate paid impressions.
 await page.route('https://resources.infolinks.com/**', route => route.fulfill({contentType:'application/javascript',body:''}));
 await page.goto('/');
 await expect(page.locator('script[src*="infolinks.com"]')).toHaveCount(0);
 await page.locator('[data-consent-yes]').click();
 await expect(page.locator('script[src*="infolinks.com"]')).toHaveCount(1);
 await page.goto('/guias.html');
 await expect(page.locator('.portal-consent')).toHaveCount(0);
 await expect(page.locator('script[src*="infolinks.com"]')).toHaveCount(1);
 await page.locator('[data-preferences-open]').click();
 await page.locator('[data-consent-no]').click();
 await expect(page.locator('script[src*="infolinks.com"]')).toHaveCount(0);
 await expect(page.locator('.portal-consent')).toHaveCount(0);
});

test('privacidade: cookie mantém a escolha quando o armazenamento local está bloqueado', async ({page}) => {
 await page.addInitScript(() => {
  Storage.prototype.getItem = function(){throw new Error('storage unavailable');};
  Storage.prototype.setItem = function(){throw new Error('storage unavailable');};
 });
 await page.goto('/');
 await page.locator('[data-consent-no]').click();
 await page.goto('/catalogo.html');
 await expect(page.locator('.portal-consent')).toHaveCount(0);
 await page.reload();
 await expect(page.locator('.portal-consent')).toHaveCount(0);
});

test('privacidade: a escolha continua numa nova sessão do navegador', async ({browser,baseURL}) => {
 const first=await browser.newContext({baseURL});
 const page=await first.newPage();
 await page.goto('/');
 await page.locator('[data-consent-no]').click();
 const state=await first.storageState();
 await first.close();
 const second=await browser.newContext({baseURL,storageState:state});
 const next=await second.newPage();
 await next.goto('/');
 await expect(next.locator('.portal-consent')).toHaveCount(0);
 await second.close();
});

test('comparador distingue o mesmo jogo em Mobile e PC e limpa resultados inválidos', async ({page}) => {
 await page.goto('/comparar.html');
 await expect(page.locator('[data-compare-form] button')).toBeEnabled();
 await page.locator('[data-game-one]').fill('Roblox — Mobile');
 await page.locator('[data-game-two]').fill('Roblox — PC');
 await page.locator('[data-compare-form] button').click();
 await expect(page.locator('.mega-compare-card')).toHaveCount(2);
 await expect(page.locator('.mega-compare-card').nth(0)).toContainText('Mobile');
 await expect(page.locator('.mega-compare-card').nth(1)).toContainText('PC');
 await page.locator('[data-game-one]').fill('Roblox');
 await page.locator('[data-compare-form] button').click();
 await expect(page.locator('[data-compare-message]')).toContainText('mais de uma plataforma');
 await expect(page.locator('.mega-compare-card')).toHaveCount(0);
});

test('catálogo: mostrar mais preserva os cartões e pesquisa vazia permite recuperar', async ({page}) => {
 await page.goto('/catalogo.html');
 await expect(page.locator('.mega-card')).toHaveCount(24);
 const firstName=await page.locator('.mega-card h3').first().innerText();
 await page.locator('[data-more]').click();
 await expect(page.locator('.mega-card')).toHaveCount(48);
 await expect(page.locator('.mega-card h3').first()).toHaveText(firstName);
 await page.locator('[data-query]').fill('JOGO-QUE-NAO-EXISTE-72981');
 await expect(page.locator('.mega-empty')).toBeVisible();
 await expect(page.locator('[data-more]')).toBeHidden();
 await page.locator('[data-query]').fill('');
 await expect(page.locator('.mega-card')).toHaveCount(24);
 await expect(page.locator('.mega-empty')).toHaveCount(0);
});
