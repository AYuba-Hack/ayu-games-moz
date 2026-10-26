const { test, expect } = require('@playwright/test');

const widths = [320,360,375,390,414,540,720,760,768,1024,1440];
const articlePaths = [
  '/artigos/free-fire-android-sem-lag.html',
  '/artigos/pubg-mobile-reduzir-ping.html',
  '/artigos/world-of-tanks-comecar.html',
  '/artigos/recargas-seguras-jogos-mobile.html',
  '/artigos/jogos-pc-gratuitos-fontes-seguras.html',
  '/artigos/jogar-com-dados-moveis.html'
];

for(const width of widths){
 test('Home sem sobreposição ou deslocamento horizontal: '+width+'px',async ({page},testInfo)=>{
  await page.setViewportSize({width,height:850});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Joga mais.');
  await expect(page.locator('[data-post]')).toHaveCount(6);
  await expect(page.locator('img')).toHaveCount(7);
  const layout=await page.evaluate(()=>{
   const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const cards=[...document.querySelectorAll('[data-post]')];
   return {
    viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    cards:cards.map(c=>({outer:box(c),image:box(c.querySelector('img')),content:box(c.querySelector('.card-body'))})),
    images:[...document.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),
    menu:getComputedStyle(document.querySelector('[data-menu-toggle]')).display,
    nav:getComputedStyle(document.querySelector('[data-menu]')).display
   };
  });
  expect(layout.documentWidth,'Página excede a largura do ecrã').toBeLessThanOrEqual(width+2);
  for(const image of layout.images)expect(image.loaded,'Imagem quebrada: '+image.src).toBe(true);
  for(const card of layout.cards){
   expect(card.outer.left).toBeGreaterThanOrEqual(-2);
   expect(card.outer.right).toBeLessThanOrEqual(width+2);
   expect(card.image.height).toBeGreaterThan(60);
   if(width<=760){
     expect(card.content.top,'Imagem e texto sobrepostos').toBeGreaterThanOrEqual(card.image.bottom-2);
     expect(card.image.height,'Imagem demasiado alta no mobile').toBeLessThanOrEqual(122);
   }
  }
  if(width<=760){
    expect(layout.menu).not.toBe('none');
    expect(layout.nav).toBe('none');
  }
  expect(errors).toEqual([]);
  if([320,390,768,1440].includes(width)){
    await page.screenshot({path:testInfo.outputPath('home-'+width+'.png'),fullPage:true});
  }
 });
}

test('Pesquisa e filtros apresentam os artigos correctos',async ({page})=>{
 await page.goto('/');
 await page.locator('.filter[data-category="Mobile"]').click();
 await expect(page.locator('[data-post]:visible')).toHaveCount(2);
 await page.locator('.filter[data-category="Todos"]').click();
 await page.locator('[data-search]').fill('ping');
 await expect(page.locator('[data-post]:visible')).toHaveCount(1);
 await page.locator('[data-search]').fill('texto-inexistente-123');
 await expect(page.locator('[data-post]:visible')).toHaveCount(0);
 await expect(page.locator('[data-empty]')).toBeVisible();
 await page.locator('[data-search]').fill('');
 await expect(page.locator('[data-post]:visible')).toHaveCount(6);
});

test('Menu mobile abre e fecha por clique e Escape',async ({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const toggle=page.locator('[data-menu-toggle]');
 await expect(toggle).toBeVisible();
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('[data-menu]')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.click();await page.locator('[data-menu] a[href="/sobre.html"]').click();
 await expect(page).toHaveURL(/sobre/);
});

test('Os seis artigos têm conteúdo, imagens e acessibilidade básica',async ({page})=>{
 await page.setViewportSize({width:375,height:812});
 for(const path of articlePaths){
   await page.goto(path);
   await expect(page.locator('article h1')).toHaveCount(1);
   await expect(page.locator('.article-body h2')).not.toHaveCount(0);
   await expect(page.locator('.article-banner')).toHaveCount(1);
   const status=await page.evaluate(()=>({
     width:document.documentElement.scrollWidth,
     img:document.querySelector('.article-banner').naturalWidth,
     lang:document.documentElement.lang,
     alt:document.querySelector('.article-banner').getAttribute('alt')
   }));
   expect(status.width).toBeLessThanOrEqual(377);
   expect(status.img).toBeGreaterThan(0);
   expect(status.alt.length).toBeGreaterThan(12);
   expect(status.lang).toBe('pt-MZ');
 }
});

test('Rodapé, links institucionais e página 404',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('footer a[href="/privacidade.html"]')).toHaveCount(1);
 await expect(page.locator('footer a[href="/termos.html"]')).toHaveCount(1);
 await page.goto('/contacto.html');await expect(page.locator('a[href*="wa.me/"]')).toHaveCount(1);
 await page.goto('/404.html');await expect(page.locator('h1')).toContainText('Ups!');
});
