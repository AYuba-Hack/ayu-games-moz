(()=>{"use strict";
const KEY="ayu-games-ads-choice-v1",COOKIE="ayu_games_ads_choice";
const allowed=v=>v==="yes"||v==="no";
function read(){
let v=null;
try{v=localStorage.getItem(KEY)}catch(e){}
if(allowed(v))return v;
try{v=document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.split("=")[1]}catch(e){}
if(allowed(v))return v;
try{v=sessionStorage.getItem(KEY)}catch(e){}
return allowed(v)?v:null;
}
function save(v){
if(!allowed(v))return;
try{localStorage.setItem(KEY,v)}catch(e){}
try{sessionStorage.setItem(KEY,v)}catch(e){}
try{document.cookie=COOKIE+"="+v+"; Max-Age=31536000; Path=/; SameSite=Lax; Secure"}catch(e){}
}
let loaded=false;
function allowedPage(){return !/^\/(?:fichas\/|sobre|contacto|privacidade|termos|transparencia|404|ferramentas)/.test(location.pathname)}
function loadAds(){
if(loaded||!allowedPage())return;
loaded=true;
window.infolinks_pid=3449077;window.infolinks_wsid=0;
const s=document.createElement("script");
s.src="https://resources.infolinks.com/js/infolinks_main.js";s.async=true;
document.body.appendChild(s);
}
function close(){document.querySelector(".portal-consent")?.remove()}
function choose(v){save(v);close();if(v==="yes")loadAds();else if(loaded)location.reload()}
function show(){
if(document.querySelector(".portal-consent"))return;
const el=document.createElement("aside");
el.className="portal-consent";
el.setAttribute("role","dialog");
el.setAttribute("aria-label","Privacidade e publicidade");
el.innerHTML='<p><strong>Privacidade e publicidade</strong><br>Podemos apresentar anúncios da Infolinks mediante a tua autorização. Se recusares, os guias continuam disponíveis. <a href="/privacidade.html">Política de privacidade</a>.</p><div><button type="button" data-consent-no>Não aceitar</button><button type="button" data-consent-yes>Aceitar anúncios</button></div>';
document.body.appendChild(el);
el.querySelector("[data-consent-no]").addEventListener("click",()=>choose("no"));
el.querySelector("[data-consent-yes]").addEventListener("click",()=>choose("yes"));
}
window.AYUGamesPrivacy={open:show,choice:read};
const choice=read();
if(choice==="yes")loadAds();
else if(choice===null){
// Por defeito os anúncios ficam recusados se a pessoa mudar de página sem escolher.
save("no");
show();
}
})();