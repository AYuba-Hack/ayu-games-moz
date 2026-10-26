(()=>{'use strict';
 const toggle=document.querySelector('[data-menu-toggle]'),menu=document.querySelector('[data-menu]');
 if(toggle&&menu){toggle.addEventListener('click',()=>{const open=menu.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'✕ Fechar':'☰ Menu';});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.textContent='☰ Menu';}));}
 const search=document.querySelector('[data-search]'),filters=[...document.querySelectorAll('.filter[data-category]')],cards=[...document.querySelectorAll('[data-post]')],empty=document.querySelector('[data-empty]'),counter=document.querySelector('.article-count');
 let category='Todos';const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const refresh=()=>{let visible=0;for(const card of cards){const ok=(category==='Todos'||card.dataset.category===category)&&normalize(card.dataset.search).includes(normalize(search?.value));card.hidden=!ok;if(ok)visible++;}if(empty)empty.style.display=visible?'none':'block';if(counter)counter.textContent=String(visible).padStart(2,'0')+' ARTIGOS';};
 function selectCategory(value){category=value;filters.forEach(f=>f.setAttribute('aria-pressed',String(f.dataset.category===value)));refresh();}
 filters.forEach(f=>f.addEventListener('click',()=>selectCategory(f.dataset.category)));
 document.querySelectorAll('[data-go-category]').forEach(a=>a.addEventListener('click',()=>{if(search)search.value='';selectCategory(a.dataset.goCategory);}));
 search?.addEventListener('input',refresh);
 document.querySelectorAll('[data-share]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();const url='https://wa.me/?text='+encodeURIComponent(document.title+' — '+location.href);window.open(url,'_blank','noopener,noreferrer');}));
 refresh();
})();