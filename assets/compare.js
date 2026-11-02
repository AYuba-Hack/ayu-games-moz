(() => {
  'use strict';
  const form = document.querySelector('[data-compare-form]');
  if (!form) return;
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const inputs = [form.querySelector('[data-game-one]'), form.querySelector('[data-game-two]')];
  const list = form.querySelector('datalist');
  const output = document.querySelector('[data-compare-results]');
  const message = document.querySelector('[data-compare-message]');
  const submit = form.querySelector('button');
  let games = [];
  const label = game => game.name + ' — ' + game.platform;
  submit.disabled = true;
  message.textContent = 'A carregar os jogos…';

  Promise.all(['/assets/games.json?v=20261102-v5', '/assets/mobile-expanded.json?v=20261102-v5', '/assets/pc-expanded.json?v=20261102-v5'].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw Error('catalogue unavailable');
    return response.json();
  })).then(groups => {
    const seen = new Set();
    for (const game of groups.flat()) {
      const key = game.platform + ':' + norm(game.name).replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) continue;
      seen.add(key);
      games.push(game);
    }
    const fragment = document.createDocumentFragment();
    for (const game of games) {
      const option = document.createElement('option');
      option.value = label(game);
      fragment.append(option);
    }
    list.append(fragment);
    submit.disabled = false;
    message.textContent = 'Escolhe dois títulos e a respectiva plataforma.';
  }).catch(() => {
    message.textContent = 'Não foi possível carregar os jogos. Actualiza a página para tentar de novo.';
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const chosen = [];
    for (const input of inputs) {
      const value = norm(input.value);
      const exact = games.find(game => norm(label(game)) === value);
      const matches = exact ? [exact] : games.filter(game => [game.name, ...(game.aliases || [])].some(name => norm(name) === value));
      if (matches.length !== 1) {
        output.replaceChildren();
        message.textContent = matches.length > 1
          ? 'Este título existe em mais de uma plataforma. Escolhe a opção Mobile ou PC nas sugestões.'
          : 'Selecciona dois títulos que existam na lista de sugestões.';
        input.focus();
        return;
      }
      chosen.push(matches[0]);
    }
    if (chosen[0].id === chosen[1].id) {
      output.replaceChildren();
      message.textContent = 'Escolhe dois jogos diferentes.';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'mega-compare-grid';
    for (const game of chosen) {
      const card = document.createElement('article');
      card.className = 'mega-compare-card';
      const heading = document.createElement('h2');
      heading.textContent = game.name;
      card.append(heading);
      for (const [key, value] of [
        ['Plataforma', game.platform],
        ['Género', game.genre === 'Vários' ? 'Consultar a loja' : game.genre],
        ['Modelo de acesso', game.price || 'Confirmar na loja'],
        ['Descrição', game.desc || 'Consulta os detalhes, requisitos e disponibilidade na loja.']
      ]) {
        const row = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = key;
        const text = document.createElement('p');
        text.textContent = value;
        row.append(title, text);
        card.append(row);
      }
      const link = document.createElement('a');
      link.href = game.shop;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver na loja ↗';
      card.append(link);
      grid.append(card);
    }
    output.replaceChildren(grid);
    message.textContent = 'Confirma os requisitos e a disponibilidade na loja antes de instalar.';
  });
})();
