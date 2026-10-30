const {test,expect}=require('@playwright/test');
const widths=[320,360,390,414,540,720,768,1024,1440];
const newPaths=["/artigos/efootball-mobile-desempenho.html","/artigos/roblox-seguranca-iniciantes.html","/artigos/jogos-leves-android.html","/artigos/counter-strike-2-melhorar-fps.html","/artigos/dota-2-primeiros-passos.html","/artigos/pubg-pc-travamentos.html"];
test('homepage compacta com jogos mobile, PC, fotografias e 12 guias',async({page})=>{
await page.goto('/');await expect(page.locator('h1')).toContainText('Joga mais.');
await expect(page.locator('.v2-game')).toHaveCount(8);
await expect(page.locator('[data-post]')).toHaveCount(12);
await expect(page.locator('.v2-game-image img')).toHaveCount(8);
await expect(page.locator('a[href="/mobile.html"]').first()).toBeVisible();
await expect(page.locator('a[href="/pc.html"]').first()).toBeVisible();
});
for(const width of widths)test('sem deslocamento horizontal '+width,async({page})=>{
await page.setViewportSize({width,height:830});await page.goto('/');
const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
expect(docWidth).toBeLessThanOrEqual(width+2);
const heroHeight=await page.locator('.v2-hero').evaluate(x=>x.getBoundingClientRect().height);
if(width<=760)expect(heroHeight).toBeLessThan(300);
if(width<=760)await expect(page.locator('[data-menu-toggle]')).toBeVisible();
});
test('filtros, busca e navegação mobile',async({page})=>{
await page.goto('/');await page.locator('.filter[data-category="Mobile"]').click();
await expect(page.locator('[data-post]:visible')).toHaveCount(5);
await page.locator('.filter[data-category="Todos"]').click();
await page.locator('[data-search]').fill('Counter-Strike');
await expect(page.locator('[data-post]:visible')).toHaveCount(1);
await page.setViewportSize({width:390,height:844});
await page.locator('[data-menu-toggle]').click();
await expect(page.locator('[data-menu]')).toBeVisible();
await page.keyboard.press('Escape');
await expect(page.locator('[data-menu]')).toBeHidden();
});
test('quatro páginas temáticas acessíveis',async({page})=>{
for(const path of ['/mobile.html','/pc.html','/mais-jogados.html','/recargas.html']){
await page.goto(path);await expect(page.locator('h1')).toHaveCount(1);
await expect(page.locator('main')).toContainText('jogo');
}
});
test('novos artigos com guias detalhados e navegação',async({page})=>{
for(const path of newPaths){await page.goto(path);
await expect(page.locator('article h1')).toHaveCount(1);
expect(await page.locator('.v2-story-content h2').count()).toBeGreaterThanOrEqual(5);
const text=await page.locator('.v2-story-content').innerText();expect(text.length).toBeGreaterThan(1600);
}
});
test('conteúdo antigo, links institucionais e publicidade preservados',async({page})=>{
await page.goto('/artigos/free-fire-android-sem-lag.html');
await expect(page.locator('article h1')).toHaveCount(1);
await page.goto('/');await expect(page.locator('footer a[href="/privacidade.html"]')).toHaveCount(1);
expect(await page.content()).toContain('infolinks_pid = 3449077');
await page.goto('/contacto.html');await expect(page.locator('a[href*="wa.me/"]')).toHaveCount(1);
await page.goto('/404.html');await expect(page.locator('h1')).toContainText('Ups!');
});