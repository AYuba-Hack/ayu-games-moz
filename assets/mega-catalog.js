(()=>{"use strict";
const targets=[...document.querySelectorAll("[data-mega-catalog]")];
if(!targets.length)return;
const DATA=["/assets/games.json","/assets/mobile-expanded.json","/assets/pc-expanded.json"];
const pageSize=24,cache=new Map();
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const genreOf=name=>{const s=norm(name);
if(/football|futebol|soccer|efootball|nba|fifa|fc mobile|pool|ludo|golf|wwe|sports/.test(s))return "Desporto";
if(/racing|car|truck|forza|driving|moto|rally|speed|asphalt|need for speed|ride|kart/.test(s))return "Corridas";
if(/puzzle|match|blast|sudoku|word|mahjong|room|escape|solitaire|candy|tile|2048|sort/.test(s))return "Puzzle";
if(/shooter|warzone|call of duty|counter-strike|valorant|battlefield|pubg|sniper|shoot|tactical|strike/.test(s))return "Acção e tiro";
if(/strategy|civilization|empire|warcraft|clash|age of|legends|hearts of iron|total war|kingdom rush|tower defense/.test(s))return "Estratégia";
if(/rpg|quest|final fantasy|persona|genshin|witcher|elden|dragon|fallout|diablo|honkai|baldur/.test(s))return "RPG e aventura";
if(/simulator|simulation|tycoon|sims|city|farm|planet|store|building|construction/.test(s))return "Simulação";
if(/horror|resident evil|silent hill|outlast|dead by|amnesia|five nights/.test(s))return "Terror";
return "Diversos"};
const colorOf=name=>{const colors=["linear-gradient(130deg,#203651,#39516b)","linear-gradient(130deg,#263d38,#4e536a)","linear-gradient(130deg,#3d2b4f,#344965)","linear-gradient(130deg,#3f3823,#224e53)"];return colors[String(name).length%4]};
const load=async()=>{const all=await Promise.all(DATA.map(async u=>{const r=await fetch(u);if(!r.ok)throw Error(u+" "+r.status);const d=await r.json();if(!Array.isArray(d))throw Error("invalid catalog");return d;}));
const seen=new Set(),data=[];for(const item of all.flat()){const key=item.platform+":"+norm(item.name).replace(/[^a-z0-9]/g,"");if(seen.has(key))continue;seen.add(key);data.push({...item,genre:item.genre==="Vários"||!item.genre?genreOf(item.name):item.genre});}
return data;};
const e=(s)=>{const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML};
function init(el,items){const all=el.dataset.extraOnly==="true"?items.filter(g=>g.id.includes("-extra-")):items;let shown=pageSize;let platform=el.dataset.platform||"Todos";
const wrap=document.createElement("div");wrap.className="mega-panel";
wrap.innerHTML='<div class="mega-toolbar"><label class="mega-search"><span>Pesquisar jogo</span><input type="search" placeholder="Ex.: Free Fire, GTA, Minecraft..." data-query autocomplete="off"></label><label class="mega-platform"><span>Plataforma</span><select data-platform><option value="Todos">Todas</option><option value="Mobile">Mobile</option><option value="PC">PC</option></select></label><label><span>Categoria</span><select data-genre><option value="">Todas</option></select></label><label class="mega-lite"><input type="checkbox" data-lite> Poupar dados (ocultar capas)</label></div><p class="mega-counter" aria-live="polite" data-count></p><div class="mega-grid" data-cards></div><div class="mega-actions"><button type="button" data-more>Mostrar mais jogos</button></div>';
el.append(wrap);const q=wrap.querySelector("[data-query]"),p=wrap.querySelector("[data-platform]"),genre=wrap.querySelector("[data-genre]"),cards=wrap.querySelector("[data-cards]"),counter=wrap.querySelector("[data-count]"),more=wrap.querySelector("[data-more]"),lite=wrap.querySelector("[data-lite]");try{lite.checked=localStorage.getItem("ayu-games-data-saver")==="yes";}catch(e){}
p.value=platform;if(platform!=="Todos"){p.closest("label").hidden=true;}
for(const x of [...new Set(all.map(g=>g.genre))].sort((a,b)=>a.localeCompare(b,"pt"))){const option=document.createElement("option");option.value=x;option.textContent=x;genre.append(option);}
let filtered=[];
function card(g){const article=document.createElement("article");article.className="mega-card";
const top=document.createElement("div");top.className="mega-art";top.style.background=colorOf(g.name);
if(g.art&&!lite.checked){const img=document.createElement("img");img.src=g.art;img.loading="lazy";img.decoding="async";img.alt="Imagem de "+g.name;img.addEventListener("error",()=>{img.remove();const fallback=document.createElement("span");fallback.textContent=g.name;fallback.className="mega-art-title";top.append(fallback);},{once:true});top.append(img);}else{const title=document.createElement("span");title.className="mega-art-title";title.textContent=g.name;top.append(title);}
const meta=document.createElement("small");meta.textContent=g.platform+" · "+g.genre;meta.className="mega-meta";
const name=document.createElement("h3");name.textContent=g.name;
const link=document.createElement("a");link.href=g.shop|| (g.platform==="Mobile"?"https://play.google.com/store/search?q="+encodeURIComponent(g.name)+"&c=apps":"https://store.steampowered.com/search/?term="+encodeURIComponent(g.name));link.target="_blank";link.rel="noopener noreferrer";link.textContent="Ver na loja ↗";const body=document.createElement("div");body.className="mega-card-body";body.append(meta,name,link);
article.append(top,body);return article;}
function repaint(){const found=norm(q.value.trim());filtered=all.filter(g=>(platform==="Todos"||g.platform===platform)&&(!genre.value||g.genre===genre.value)&&(!found||norm(g.name+" "+g.genre).includes(found)));shown=pageSize;render();}
function render(){cards.replaceChildren(...filtered.slice(0,shown).map(card));counter.textContent=filtered.length.toLocaleString("pt-PT")+" jogos encontrados • "+Math.min(shown,filtered.length)+" apresentados";more.hidden=shown>=filtered.length;}
p.addEventListener("change",()=>{platform=p.value;repaint()});q.addEventListener("input",repaint);genre.addEventListener("change",repaint);lite.addEventListener("change",()=>{try{localStorage.setItem("ayu-games-data-saver",lite.checked?"yes":"no")}catch(e){}render()});more.addEventListener("click",()=>{shown+=pageSize;render()});const url=new URL(location.href);const term=url.searchParams.get("q");if(term)q.value=term;repaint();}
Promise.resolve().then(load).then(all=>{for(const el of targets)init(el,all);const mobi=all.filter(g=>g.platform==="Mobile").length,pc=all.filter(g=>g.platform==="PC").length;document.querySelectorAll("[data-mega-mobile]").forEach(x=>x.textContent=mobi.toLocaleString("pt-PT"));document.querySelectorAll("[data-mega-pc]").forEach(x=>x.textContent=pc.toLocaleString("pt-PT"));}).catch(()=>{targets.forEach(t=>{const p=document.createElement("p");p.className="mega-error";p.textContent="Não foi possível carregar a lista completa. Verifica a ligação e tenta actualizar a página.";t.append(p);});});
})();