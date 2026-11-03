(() => {
  'use strict';
  const KEY = 'ayu-games-ads-choice-v1';
  const COOKIE = 'ayu_games_ads_choice';
  const valid = value => value === 'yes' || value === 'no';
  let memory = null;
  let loaded = false;
  let opener = null;

  function read() {
    let value;
    try { value = localStorage.getItem(KEY); } catch (_) {}
    if (valid(value)) return value;
    try {
      value = document.cookie.split(';').map(x => x.trim())
        .find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    } catch (_) {}
    if (valid(value)) return value;
    try { value = sessionStorage.getItem(KEY); } catch (_) {}
    return valid(value) ? value : memory;
  }

  function save(value) {
    if (!valid(value)) return;
    memory = value;
    try { localStorage.setItem(KEY, value); } catch (_) {}
    try { sessionStorage.setItem(KEY, value); } catch (_) {}
    try {
      document.cookie = COOKIE + '=' + value + '; Max-Age=31536000; Path=/; SameSite=Lax'
        + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (_) {}
  }

  function loadAds() {
    if (loaded || /^\/(?:fichas\/|jogo(?:\.html)?(?:$|\/)|sobre|contacto|parcerias|privacidade|termos|transparencia|404|ferramentas)/.test(location.pathname)) return;
    loaded = true;
    window.infolinks_pid = 3449077;
    window.infolinks_wsid = 0;
    const script = document.createElement('script');
    script.src = 'https://resources.infolinks.com/js/infolinks_main.js';
    script.async = true;
    document.body.appendChild(script);
  }

  function close() {
    document.querySelector('.portal-consent')?.remove();
    if (opener?.isConnected) opener.focus();
    opener = null;
  }

  function choose(value) {
    save(value);
    close();
    if (value === 'yes') loadAds();
    else if (loaded) location.reload();
  }

  function show(event) {
    if (document.querySelector('.portal-consent')) return;
    opener = event?.target instanceof HTMLElement ? event.target : null;
    const dialog = document.createElement('aside');
    dialog.className = 'portal-consent';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Privacidade e publicidade');
    dialog.setAttribute('aria-describedby', 'ayu-consent-info');
    dialog.innerHTML = '<p id="ayu-consent-info"><strong>Privacidade e publicidade</strong><br>Podemos apresentar anúncios da Infolinks mediante a tua autorização. Os guias continuam disponíveis se recusares. <a href="/privacidade.html">Política de privacidade</a>.</p>'
      + '<p class="portal-consent-hint">A tua escolha fica guardada neste navegador. Podes alterá-la no rodapé.</p>'
      + '<div><button type="button" data-consent-no>Não aceitar</button><button type="button" data-consent-yes>Aceitar anúncios</button></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-consent-no]').addEventListener('click', () => choose('no'));
    dialog.querySelector('[data-consent-yes]').addEventListener('click', () => choose('yes'));
    if (opener) dialog.querySelector('[data-consent-no]').focus();
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  document.querySelectorAll('[data-preferences-open]').forEach(button => button.addEventListener('click', show));
  window.AYUGamesPrivacy = { open: show, choice: read };
  const choice = read();
  if (choice !== null) save(choice); // Migrate cookie/session fallback to all available stores.
  if (choice === 'yes') loadAds();
  else if (choice === null) {
    // Asking once never enables advertising: navigation keeps the safe default.
    save('no');
    show();
  }
  window.addEventListener('storage', event => {
    if (event.key !== KEY || !valid(event.newValue)) return;
    save(event.newValue);
    close();
    if (event.newValue === 'yes') loadAds();
    else if (loaded) location.reload();
  });
})();
