(() => {
  'use strict';
  const VERSION = '20261103-guide1';
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined && text !== null) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const safeURL = value => {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  };
  const safeImage = value => /^\/assets\/img\/guides\/[a-z0-9-]+\/(?:[a-z0-9-]+)\.webp$/.test(value) ? value : safeURL(value);
  const external = (text, url, className) => {
    const a = node('a', text, className); a.href = safeURL(url); a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  };
  const guideURL = id => '/jogo.html?id=' + encodeURIComponent(id);
  let searchData;
  const loadSearch = () => searchData ||= fetch('/assets/guide-search.json?v=' + VERSION).then(r => {
    if (!r.ok) throw Error('search'); return r.json();
  }).catch(error => { searchData = undefined; throw error; });

  for (const form of document.querySelectorAll('[data-guide-search]')) {
    const input = form.querySelector('input');
    const results = form.querySelector('[data-guide-matches]');
    const status = form.querySelector('[data-guide-search-status]');
    const label = g => g.name + ' — ' + g.platform;
    let request = 0;
    async function search(submit = false) {
      const current = ++request, value = norm(input.value);
      results.replaceChildren();
      if (!value) { status.textContent = 'Escreve o nome de um jogo para encontrar o seu guia.'; return; }
      status.textContent = 'A procurar…';
      try {
        const all = await loadSearch(); if (request !== current) return;
        const matches = all.filter(g => norm(label(g)).includes(value));
        const exact = matches.filter(g => norm(label(g)) === value || norm(g.name) === value);
        if (submit && (exact.length === 1 || matches.length === 1)) { location.href = guideURL((exact[0] || matches[0]).id); return; }
        status.textContent = !matches.length ? 'Não encontramos esse nome. Experimenta outra parte do título.'
          : matches.length + (matches.length === 1 ? ' guia encontrado.' : ' guias encontrados. Escolhe o jogo e a plataforma.') + (matches.length > 8 ? ' Mostramos os primeiros 8; escreve mais para reduzir a lista.' : '');
        matches.sort((a, b) => Number(norm(b.name) === value) - Number(norm(a.name) === value));
        for (const g of matches.slice(0, 8)) {
          const a = node('a', label(g)); a.href = guideURL(g.id); results.append(a);
        }
      } catch { if (request === current) status.textContent = 'Não foi possível carregar a pesquisa. Tenta novamente ou abre o catálogo.'; }
    }
    input.addEventListener('input', () => search());
    form.addEventListener('submit', event => { event.preventDefault(); search(true); });
  }

  const root = document.querySelector('[data-guide-root]');
  if (!root) return;
  const id = root.dataset.gameId || new URL(location.href).searchParams.get('id');
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    root.replaceChildren(node('h1', 'Encontra o guia do teu jogo'), node('p', 'Pesquisa acima e escolhe a plataforma para ver os dados, as imagens e as orientações.'));
    root.setAttribute('aria-busy', 'false'); return;
  }
  let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) % 32;
  fetch('/assets/guide-data/' + String(hash).padStart(2, '0') + '.json?v=' + VERSION).then(async r => {
    if (!r.ok) throw Error('network');
    const data = await r.json();
    if (!data[id]) {
      root.replaceChildren(node('h1', 'Guia não encontrado'), node('p', 'Esse jogo não está no catálogo. Usa a pesquisa acima para escolher outro título.'));
      root.setAttribute('aria-busy', 'false'); return;
    }
    render(data[id]);
  }).catch(() => {
    const message = node('p', 'Não foi possível carregar o guia. Verifica a ligação e tenta novamente.'); message.setAttribute('role', 'alert');
    const retry = node('button', 'Tentar novamente', 'btn'); retry.type = 'button'; retry.addEventListener('click', () => location.reload());
    root.replaceChildren(node('h1', 'O guia está temporariamente indisponível'), message, retry); root.setAttribute('aria-busy', 'false');
  });

  function render(g) {
    root.replaceChildren(); root.setAttribute('aria-busy', 'false');
    document.title = g.name + ' — guia, imagens e requisitos | AYU Games MOZ';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = 'Conhece ' + g.name + ' para ' + g.platform + ': imagens oficiais, informações, requisitos disponíveis e como começar.';
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://ayu-games-moz.pages.dev/jogo?id=' + encodeURIComponent(g.id);
    let lite = false;
    try { lite = localStorage.getItem('ayu-games-data-saver') === 'yes'; } catch {}
    const shots = (g.screenshots || []).filter(s => safeImage(s.thumb) && safeImage(s.full)).slice(0, 4);
    const genre = (g.genres || []).filter(Boolean).join(' · ') || (g.genre === 'Vários' ? 'Consultar a loja' : g.genre);
    const access = g.comingSoon ? 'Por lançar na fonte consultada' : g.free === true ? 'Download gratuito; verifica compras opcionais' : g.free === false ? 'Pago; confirma o preço na loja' : g.price || 'Confirmar na loja';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(g.checkedAt) ? g.checkedAt.split('-').reverse().join('/') : 'Não indicada';

    const hero = node('header', null, 'guide-hero');
    const heroCopy = node('div', null, 'guide-hero-copy');
    heroCopy.append(node('span', 'GUIA DO JOGO · ' + g.platform, 'eyebrow'), node('h1', g.name));
    heroCopy.append(node('p', g.summary || 'Conhece o jogo, vê as imagens oficiais e prepara os primeiros passos.', 'guide-lead'));
    const pills = node('div', null, 'guide-pills');
    for (const text of [g.platform, genre, g.comingSoon ? 'Por lançar' : 'Guia para começar']) pills.append(node('span', text));
    heroCopy.append(pills);
    const actions = node('div', null, 'buttons');
    actions.append(external(g.comingSoon ? 'Ver lançamento na loja ↗' : 'Abrir loja oficial ↗', g.shop, 'btn'));
    const back = node('a', '← Ver outros jogos', 'btn btn-secondary'); back.href = '/catalogo.html'; actions.append(back); heroCopy.append(actions);
    const art = node('div', null, 'guide-cover'); hero.append(heroCopy, art); root.append(hero);

    const navigation = node('nav', null, 'guide-sections'); navigation.setAttribute('aria-label', 'Neste guia');
    for (const [sectionId, text] of [['sobre-jogo','Sobre o jogo'],['imagens','Imagens'],['dados','Dados'],['como-comecar','Como começar'],['requisitos','Requisitos'],['dicas','Dicas'],['fontes','Fontes']]) {
      const a = node('a', text); a.href = '#' + sectionId; navigation.append(a);
    }
    root.append(navigation);
    const section = (sectionId, title, subtitle) => {
      const el = node('section', null, 'guide-section'); el.id = sectionId; el.append(node('h2', title));
      if (subtitle) el.append(node('p', subtitle, 'guide-muted')); root.append(el); return el;
    };
    const about = section('sobre-jogo', 'O que é ' + g.name + '?');
    if (g.summary) about.append(node('p', g.summary));
    const details = [];
    if (g.developer?.filter(Boolean).length) details.push('Desenvolvido por ' + g.developer.filter(Boolean).join(', ') + '.');
    if (genre && genre !== 'Consultar a loja') details.push('A fonte classifica o jogo em ' + genre + '.');
    if (g.systems?.length) details.push('Nesta ficha, a versão indicada é para ' + g.systems.join(', ') + '.');
    if (details.length) about.append(node('p', details.join(' ')));
    if (g.excerpt) {
      const quote = node('blockquote', g.excerpt); quote.append(external(' — Resumo da ' + (g.store || 'fonte oficial'), g.source)); about.append(quote);
    }
    if (!g.available) about.append(node('p', 'A fonte oficial não devolveu todos os dados nesta consulta. Os campos em falta ficam assinalados abaixo; confirma os detalhes na página do jogo.', 'guide-note'));
    if (g.regionalNote) about.append(node('p',g.regionalNote,'guide-note'));
    if (g.comingSoon) about.append(node('p', 'A loja indicava que o jogo ainda estava por lançar quando foi consultada. Confirma a data e a disponibilidade antes de comprar.', 'guide-note'));

    const gallery = section('imagens', 'Imagens do jogo', 'Capturas publicadas na loja ou pelo titular do jogo. Toca numa imagem para ampliar; no telemóvel, desliza para ver as outras.');
    if (g.galleryNote) gallery.append(node('p',g.galleryNote,'guide-note'));
    const control = node('label', null, 'guide-lite'); const check = node('input'); check.type = 'checkbox'; check.checked = lite; check.dataset.guideLite = '';
    control.append(check, document.createTextNode(' Poupar dados nas imagens')); gallery.append(control);
    const galleryBody = node('div'); gallery.append(galleryBody);
    const dialog = node('dialog', null, 'guide-lightbox'); dialog.setAttribute('aria-label', 'Imagens de ' + g.name);
    const bar = node('div', null, 'guide-lightbox-bar'); const caption = node('p'); caption.setAttribute('aria-live','polite');
    const close = node('button', 'Fechar ✕'); close.type = 'button'; bar.append(caption, close);
    const full = node('img'); full.decoding = 'async'; full.referrerPolicy = 'no-referrer';
    const loading = node('p', 'A ampliar a imagem…', 'guide-muted'); loading.hidden = true; loading.setAttribute('role','status');
    const fullError = node('p', 'Não foi possível abrir esta imagem. Consulta a loja oficial.'); fullError.hidden = true;
    full.addEventListener('error', () => { full.hidden = true; fullError.hidden = false; });
    const lightboxActions = node('div', null, 'guide-lightbox-actions');
    const prev = node('button', '← Anterior'), next = node('button', 'Seguinte →'); prev.type = next.type = 'button'; lightboxActions.append(prev, next);
    dialog.append(bar, full, loading, fullError, lightboxActions); root.append(dialog);
    let active = 0, opener, imageRequest = 0;
    function display(index) {
      active = (index + shots.length) % shots.length;
      full.hidden = false; fullError.hidden = true; full.alt = g.name + ' — captura oficial ' + (active + 1);
      caption.textContent = g.name + ' · ' + (active + 1) + ' de ' + shots.length;
      // Keep the cached preview visible while the larger image loads.
      full.src = shots[active].thumb; loading.hidden = false;
      const current = ++imageRequest, enlarged = new Image(); enlarged.referrerPolicy = 'no-referrer';
      enlarged.onload = () => { if (current === imageRequest && dialog.open) { full.src = enlarged.src; loading.hidden = true; } };
      enlarged.onerror = () => { if (current === imageRequest) { loading.textContent = 'Pré-visualização disponível. A imagem maior não carregou.'; } };
      loading.textContent = 'A ampliar a imagem…'; enlarged.src = shots[active].full;
    }
    function open(index, button) { opener = button; display(index); dialog.showModal(); close.focus(); }
    close.addEventListener('click', () => dialog.close());
    prev.addEventListener('click', () => display(active - 1)); next.addEventListener('click', () => display(active + 1));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { imageRequest++; full.removeAttribute('src'); if (opener?.isConnected) opener.focus({preventScroll:true}); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); display(active + (event.key === 'ArrowRight' ? 1 : -1)); }
    });
    function images() {
      art.replaceChildren(); galleryBody.replaceChildren();
      if (lite) {
        art.append(node('span', g.platform + ' · Imagens ocultas', 'guide-cover-fallback'));
        galleryBody.append(node('p', 'As imagens estão ocultas para poupar dados. O guia continua disponível.'));
        const show = node('button', 'Mostrar imagens e desactivar poupança', 'btn btn-secondary'); show.type = 'button';
        show.addEventListener('click', () => { check.checked = false; check.dispatchEvent(new Event('change')); }); galleryBody.append(show); return;
      }
      if (safeURL(g.art)) {
        const cover = node('img'); cover.src = g.art; cover.alt = 'Imagem de identificação de ' + g.name; cover.decoding = 'async'; cover.referrerPolicy = 'no-referrer'; cover.width = 460; cover.height = 260;
        cover.addEventListener('error', () => { art.replaceChildren(node('span', g.name, 'guide-cover-fallback')); }, {once:true}); art.append(cover);
      }
      if (!shots.length) {
        galleryBody.append(node('p', 'Não foi possível confirmar capturas oficiais para esta versão. Vê as imagens na página do titular.'), external('Ver imagens na fonte oficial ↗', g.source || g.shop)); return;
      }
      const rail = node('div', null, 'guide-gallery'); rail.setAttribute('aria-label', 'Capturas oficiais de ' + g.name);
      shots.forEach((shot,index) => {
        const figure = node('figure'); const button = node('button'); button.type = 'button'; button.dataset.screenshot = String(index);
        button.setAttribute('aria-label', 'Ampliar captura ' + (index + 1) + ' de ' + g.name);
        const image = node('img'); image.alt = 'Captura oficial ' + (index + 1) + ' de ' + g.name; image.loading = 'lazy'; image.decoding = 'async'; image.width = 526; image.height = 296; image.referrerPolicy = 'no-referrer'; image.src = shot.thumb;
        image.addEventListener('error', () => { button.replaceChildren(node('span','Imagem indisponível')); button.disabled = true; });
        button.append(image, node('span', 'Ampliar ↗', 'guide-zoom')); button.addEventListener('click', () => open(index, button));
        figure.append(button, node('figcaption', (shot.label || 'Captura ' + (index + 1)) + ' · ' + (g.store || 'Titular do jogo'))); rail.append(figure);
      });
      galleryBody.append(rail);
      if (shots.length < 4) galleryBody.append(node('p', 'A fonte disponibilizou ' + shots.length + (shots.length === 1 ? ' captura confirmada' : ' capturas confirmadas') + ' para esta ficha.', 'guide-muted'));
    }
    check.addEventListener('change', () => { lite = check.checked; try { localStorage.setItem('ayu-games-data-saver',lite ? 'yes' : 'no'); } catch {} images(); }); images();

    const facts = section('dados', 'Dados do jogo');
    const dl = node('dl', null, 'guide-facts');
    const values = [['Plataforma', g.platform],['Sistemas desta versão',g.systems?.join(', ')],['Categoria',genre],
      ['Desenvolvedor',g.developer?.filter(Boolean).join(', ')],['Editora',g.publisher?.join(', ')],['Loja / fonte',g.store || 'Site do titular'],
      ['Acesso',access],['Lançamento indicado',g.release],['Classificação etária',g.age && g.age !== '0' ? g.age : 'Não indicada nesta consulta'],
      ['Modos indicados',g.modes?.join(' · ') || 'Confirma os modos e a ligação à Internet na loja'],['Versão indicada',g.version],['Consulta das fontes',date]];
    for (const [title,value] of values) {
      const row = node('div'); row.append(node('dt',title), node('dd',value || 'Não indicado nesta consulta')); dl.append(row);
    }
    facts.append(dl,node('p','Preços, espaço ocupado, requisitos e disponibilidade regional podem mudar com as actualizações. Confirma a versão exacta na loja.', 'guide-muted'));
    if (g.storeTitle && norm(g.storeTitle) !== norm(g.name)) facts.append(node('p','Nome apresentado pela loja nesta consulta: ' + g.storeTitle + '.', 'guide-muted'));

    const start = section('como-comecar','Como começar',g.comingSoon ? 'Preparação para o lançamento; a instalação depende da disponibilidade oficial.' : 'Segue estes passos para obter a versão certa e preparar a primeira sessão.');
    const steps = node('ol',null,'guide-steps');
    const instructions = g.comingSoon ? [
      'Abre a página oficial e confirma a data, as plataformas e a edição anunciada.',
      'Compara os requisitos publicados com o teu equipamento antes de decidir uma compra.',
      'Se a loja disponibilizar uma lista de desejos ou aviso de lançamento, usa essa opção para acompanhar o jogo.',
      'Quando o jogo estiver disponível, regressa à loja oficial para consultar as instruções de instalação.'
    ] : [
      'Abre a loja oficial pelo botão deste guia e confirma o título, o desenvolvedor e a plataforma ' + g.platform + '.',
      g.platform === 'PC' ? 'Compara o sistema, processador, memória, placa gráfica e espaço livre do teu PC com os requisitos oficiais.' : 'Na loja do próprio telemóvel, verifica a compatibilidade, o espaço livre e as permissões pedidas pela aplicação.',
      'Confirma o preço e as compras opcionais. Instala pelo canal oficial e usa Wi-Fi para downloads grandes, se estiver disponível.',
      'No primeiro arranque, ajusta idioma, som e controlos. Se houver tutorial ou modo de treino, começa por aí antes de aumentar a dificuldade.'
    ];
    for (const text of instructions) steps.append(node('li',text)); start.append(steps);

    const requirements = section('requisitos','Requisitos e compatibilidade');
    const req = g.requirements || {};
    if (req.minimum || req.recommended) {
      const grid=node('div',null,'guide-requirements');
      for (const [key,title] of [['minimum','Mínimos indicados'],['recommended','Recomendados indicados']]) {
        const panel=node('div',null,'guide-panel');panel.append(node('h3',title),node('p',req[key] || 'Não indicados nesta consulta.'));grid.append(panel);
      }
      requirements.append(grid,node('p','Resumo dos requisitos publicados na fonte. Abre a loja para consultar a lista integral e eventuais notas de compatibilidade.','guide-muted'));
    } else {
      if (g.minimumOS) requirements.append(node('p','Sistema mínimo indicado: ' + g.minimumOS + '.'));
      requirements.append(node('p',g.platform === 'PC'
        ? 'Esta consulta não forneceu uma lista completa de requisitos de PC. Verifica o sistema operativo, CPU, GPU, RAM e armazenamento no site oficial.'
        : 'A compatibilidade varia conforme o aparelho e a versão do jogo. Abre a loja no teu dispositivo para confirmar se podes instalar e quanto espaço é necessário.'));
    }
    requirements.append(external('Confirmar requisitos e disponibilidade ↗',g.source || g.shop));

    const tips = section('dicas','Dicas para os primeiros passos','Orientações editoriais para começar; as opções concretas dependem da versão e dos modos disponíveis.');
    const list=node('ul',null,'guide-tips');
    const category=norm(genre+' '+g.genre);
    const advice = /rpg|aventura|adventure/.test(category)
      ? ['Lê os objectivos e experimenta as mecânicas básicas antes de gastar recursos de progressão.','Se houver equipamento ou habilidades, muda uma opção de cada vez para perceber o efeito.']
      : /tiro|acao|acção|action|battle|moba/.test(category)
      ? ['Ajusta a sensibilidade com pequenas alterações e experimenta os controlos numa área de treino, quando existir.','Em jogos de equipa, aprende os objectivos e as funções antes de te concentrares apenas no resultado individual.']
      : /corrida|racing|desporto|sports/.test(category)
      ? ['Começa por conhecer os controlos e as opções de assistência antes de procurar resultados mais difíceis.','Repete uma pista, prova ou exercício curto para comparar os teus ajustes.']
      : /estrateg|estratég|simula|tabuleiro|puzzle/.test(category)
      ? ['Aprende uma mecânica de cada vez e observa os recursos ou movimentos de que precisas para cumprir o objectivo.','Antes de uma decisão difícil, verifica as regras, as condições de vitória e as consequências indicadas no jogo.']
      : ['Explora os controlos e as definições antes de começar uma sessão longa.','Segue os objectivos iniciais e consulta a ajuda do próprio jogo quando surgir uma mecânica nova.'];
    for (const text of [...advice,'Se o desempenho cair, reduz primeiro os efeitos e a qualidade gráfica, quando essas opções existirem. Evita downloads em segundo plano durante sessões online.','Verifica a classificação etária, as definições de privacidade e os limites de compras antes de partilhar o dispositivo.']) list.append(node('li',text));
    tips.append(list);
    if (g.practicalGuide && /^\/(artigos|destaques)\/[a-z0-9-]+\.html$/.test(g.practicalGuide)) {
      const related=node('div',null,'guide-related');related.append(node('h3','Continua no guia prático'));
      const a=node('a','Ler o guia editorial de '+g.name+' →','btn btn-secondary');a.href=g.practicalGuide;related.append(a);tips.append(related);
    }
    const sources = section('fontes','Fontes e actualização');
    sources.append(node('p','Dados consultados em ' + date + '. As capturas são servidas pela loja ou pelo titular, a quem pertencem as imagens e marcas. A versão Mobile pode ser diferente da versão PC.'));
    sources.append(external('Consultar ' + (g.store || 'o site oficial') + ' ↗',g.source || g.shop));
    const tools=node('p');const a=node('a','Calcular dados móveis para as tuas sessões →');a.href='/ferramentas.html';tools.append(a);sources.append(tools);
  }
})();
