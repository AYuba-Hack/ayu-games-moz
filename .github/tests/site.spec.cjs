const {test,expect}=require('@playwright/test');
const featured=["black-myth-wukong","star-wars-outlaws","dragon-ball-sparking-zero","god-of-war-ragnarok","assassins-creed-shadows","kingdom-come-deliverance-ii","avowed","gta-v","fortnite"];
test('homepage mostra 12 jogos e 4 guias',async({page})=>{
 await page.goto('/');
 await expect(page.locator('h1')).toContainText('Encontra o teu jogo');
 await expect(page.locator('.portal-game')).toHaveCount(12);
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
 await expect(page.locator('[data-data-result]')).toContainText('3.200 MB');
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