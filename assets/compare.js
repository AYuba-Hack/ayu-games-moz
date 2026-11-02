(()=>{"use strict";const form=document.querySelector("[data-compare-form]");if(!form)return;
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const inputs=[form.querySelector("[data-game-one]"),form.querySelector("[data-game-two]")],datalist=form.querySelector("datalist"),out=document.querySelector("[data-compare-results]"),message=document.querySelector("[data-compare-message]");
let games=[];
Promise.all(["/assets/games.json","/assets/mobile-expanded.json","/assets/pc-expanded.json"].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error("fetch "+u);return r.json()})).then(groups=>{
const seen=new Set();for(const g of groups.flat()){const key=g.platform+":"+norm(g.name).replace(/[^a-z0-9]/g,"");if(seen.has(key))continue;seen.add(key);games.push(g);}
const fragment=document.createDocumentFragment();for(const g of games){const o=document.createElement("option");o.value=g.name;o.label=g.platform;fragment.append(o);}datalist.append(fragment);
message.textContent="Escolhe dois títulos entre "+games.length+" jogos do catálogo.";
}).catch(()=>{message.textContent="Não foi possível carregar os jogos. Actualiza a página.";});
form.addEventListener("submit",ev=>{ev.preventDefault();const chosen=inputs.map(x=>games.find(g=>norm(g.name)===norm(x.value)));if(chosen.some(x=>!x)){message.textContent="Selecciona títulos que existam na lista de sugestões.";return;}if(chosen[0].id===chosen[1].id){message.textContent="Escolhe dois jogos diferentes.";return;}
out.replaceChildren();const grid=document.createElement("div");grid.className="mega-compare-grid";for(const g of chosen){
const card=document.createElement("article");card.className="mega-compare-card";
const h=document.createElement("h2");h.textContent=g.name;card.append(h);
for(const [k,v] of [["Plataforma",g.platform],["Género",g.genre==="Vários"?"A confirmar na loja":g.genre],["Modelo de acesso",g.price||"Confirmar na loja"],["Descrição",g.desc||"Informações adicionais disponíveis na loja"]]){
const row=document.createElement("div");const label=document.createElement("strong");label.textContent=k;const text=document.createElement("p");text.textContent=v;row.append(label,text);card.append(row);}
const link=document.createElement("a");link.href=g.shop;link.target="_blank";link.rel="noopener noreferrer";link.textContent="Ver na loja ↗";card.append(link);grid.append(card);
}out.append(grid);message.textContent="Comparação editorial apresentada. Confirma os dados na loja oficial.";});
})();