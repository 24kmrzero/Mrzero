(function(){
"use strict";
if(window.__z24Sep01Booted) return;
window.__z24Sep01Booted=true;

const route=(document.body&&document.body.dataset.z24CleanRoute)||(
  /(^|\/)admin(\/|$)/i.test(location.pathname)?"admin":
  /(^|\/)student(\/|$)/i.test(location.pathname)?"student":"public"
);
const HOME="/";
const DASH=route==="student"?"/student/":route==="admin"?"/admin/":HOME;
const finalStatuses=new Set([
  "tp3_hit","tp4_hit","sl_hit","breakeven_hit","closed","manually_closed",
  "manual_close","cancelled","canceled","completed"
]);
let signalView="active";
let signalRows=[];
let signalChannel=null;
let signalRefreshTimer=null;
let accessModal=null;
let movedAccessNode=null;
let movedPlaceholder=null;
let observerTimer=null;

function all(sel,root=document){try{return Array.from(root.querySelectorAll(sel));}catch(_){return[];}}
function text(v){return String(v||"").replace(/\s+/g," ").trim();}
function norm(v){return text(v).toLowerCase();}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function isShown(el){
  if(!el||!el.isConnected) return false;
  const s=getComputedStyle(el);
  return s.display!=="none"&&s.visibility!=="hidden"&&el.getClientRects().length>0;
}
function closestByText(label,root=document){
  const n=norm(label);
  return all("button,a,[role=button]",root).find(el=>norm(el.textContent)===n)||
         all("button,a,[role=button]",root).find(el=>norm(el.textContent).includes(n));
}
function safeClick(el){try{el&&el.click();return !!el;}catch(_){return false;}}

/* ---------- 1. Contextual logo + /index repair ---------- */
function patchLinks(){
  all("a[href]").forEach(a=>{
    const raw=(a.getAttribute("href")||"").trim();
    if(/^(?:https?:\/\/[^/]+)?\/index(?:\.html)?(?:[?#].*)?$/i.test(raw) ||
       /^index(?:\.html)?(?:[?#].*)?$/i.test(raw)){
      a.setAttribute("href",HOME);
    }
  });

  const candidates=new Set();
  all("a").forEach(a=>{
    if(a.matches(".brand,.logo,.navbar-brand,.site-logo,.sidebar-logo,[class*=brand],[class*=logo]") ||
       a.querySelector('img[src*="logo" i],img[alt*="24k" i],img[alt*="zero" i],img[alt*="logo" i]')){
      candidates.add(a);
    }
  });
  all(".brand,.logo,.site-logo,.sidebar-logo,.app-side-brand,.side-top,[class*=brand],[class*=logo]").forEach(el=>{
    const a=el.closest("a")||el.querySelector("a");
    if(a) candidates.add(a);
    else if(el.querySelector("img")){
      el.setAttribute("role","link");
      el.setAttribute("tabindex","0");
      el.classList.add("z24-logo-clickable");
      if(!el.dataset.z24LogoBound){
        el.dataset.z24LogoBound="1";
        const go=e=>{
          if(e.type==="keydown"&&!["Enter"," "].includes(e.key)) return;
          e.preventDefault(); location.href=DASH;
        };
        el.addEventListener("click",go);
        el.addEventListener("keydown",go);
      }
    }
  });
  candidates.forEach(a=>{
    a.href=DASH;
    a.setAttribute("href",DASH);
    a.dataset.z24LogoRoute=route;
  });
}

/* ---------- Supabase client ---------- */
function getClient(){
  const direct=[
    window.__z24LastSupabaseClient,window.sb,window.supabaseClient,
    window.studentSupabase,window._supabase,window.db
  ];
  const captured=(window.__z24SupabaseClients||[]).slice().reverse();
  for(const c of direct.concat(captured)){
    if(c&&typeof c.from==="function"&&typeof c.channel==="function") return c;
  }
  return null;
}

/* ---------- 2. Paid / Broker access modal ---------- */
function ensureModal(){
  if(accessModal) return accessModal;
  const wrap=document.createElement("div");
  wrap.className="z24-access-modal";
  wrap.setAttribute("aria-hidden","true");
  wrap.innerHTML=`
    <div class="z24-access-backdrop" data-z24-close></div>
    <section class="z24-access-sheet" role="dialog" aria-modal="true" aria-labelledby="z24AccessTitle">
      <header class="z24-access-head">
        <button type="button" class="z24-icon-btn" data-z24-back aria-label="Back">←</button>
        <div class="z24-access-titlebox">
          <div class="z24-eyebrow">PREMIUM MARKET ACCESS</div>
          <h2 id="z24AccessTitle">Access</h2>
          <div class="z24-flowline" id="z24FlowLine"></div>
        </div>
        <button type="button" class="z24-icon-btn" data-z24-close aria-label="Close">×</button>
      </header>
      <div class="z24-access-body"></div>
      <footer class="z24-access-foot">
        <button type="button" class="z24-btn z24-btn-ghost" data-z24-footer-back>Back</button>
        <button type="button" class="z24-btn z24-btn-main" data-z24-next>Next</button>
        <button type="button" class="z24-btn z24-btn-main" data-z24-submit>Submit</button>
      </footer>
    </section>`;
  document.body.appendChild(wrap);

  wrap.addEventListener("click",e=>{
    if(e.target.closest("[data-z24-close]")) return closeModal();
    if(e.target.closest("[data-z24-back],[data-z24-footer-back]")) return delegateModal("back");
    if(e.target.closest("[data-z24-next]")) return delegateModal("next");
    if(e.target.closest("[data-z24-submit]")) return delegateModal("submit");
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&wrap.classList.contains("open")) closeModal();
  });
  accessModal=wrap;
  return wrap;
}
function delegateModal(action){
  if(!accessModal) return;
  const body=accessModal.querySelector(".z24-access-body");
  const buttons=all("button,a,[role=button]",body).filter(isShown);
  if(action==="back"){
    const b=buttons.find(x=>/^(back|previous|go back)$/i.test(text(x.textContent)));
    if(b) return safeClick(b);
    return closeModal();
  }
  if(action==="next"){
    const b=buttons.find(x=>/(next|continue|proceed|select|start payment)/i.test(text(x.textContent)));
    if(b) return safeClick(b);
    const first=buttons.find(x=>!/(close|cancel|back|previous)/i.test(text(x.textContent)));
    if(first) return safeClick(first);
    return;
  }
  const form=all("form",body).find(isShown);
  if(form&&typeof form.requestSubmit==="function"){
    const submit=all('button[type="submit"],input[type="submit"]',form).find(isShown);
    if(submit) return form.requestSubmit(submit);
  }
  const b=buttons.find(x=>/(submit|send for approval|pay now|confirm|complete|continue)/i.test(text(x.textContent)));
  if(b) safeClick(b);
}
function closeModal(){
  if(!accessModal) return;
  if(movedAccessNode&&movedPlaceholder&&movedPlaceholder.parentNode){
    movedPlaceholder.parentNode.insertBefore(movedAccessNode,movedPlaceholder);
    movedPlaceholder.remove();
  }
  movedAccessNode=null;movedPlaceholder=null;
  accessModal.classList.remove("open");
  accessModal.setAttribute("aria-hidden","true");
  document.documentElement.classList.remove("z24-modal-open");
}
function scoreAccessCandidate(el,type,trigger){
  if(!el||el===trigger||el.contains(trigger)||trigger.contains(el)) return -1;
  const t=norm(el.textContent);
  if(t.length<30) return -1;
  const keys=type==="paid"
    ?["pkr","usdt","payment","bank","trc20","renew","pending","approved","package"]
    :["exness","xm","dprime","broker","partner","new account","existing","deposit","trading account","proof"];
  let score=keys.reduce((n,k)=>n+(t.includes(k)?1:0),0);
  if(type==="paid"&&score<2) return -1;
  if(type==="free"&&score<3) return -1;
  if(el.matches("form")) score+=3;
  if(el.querySelector("form")) score+=2;
  if(!isShown(el)) score+=0.25; // hidden inline flows are ideal modal candidates
  return score-(Math.min(t.length,5000)/5000);
}
function findAccessContent(trigger,type){
  const scope=trigger.closest("section,.panel,[data-panel],main")||document;
  const candidates=all("form,section,div,article",scope);
  let best=null,bestScore=-1;
  for(const el of candidates){
    const s=scoreAccessCandidate(el,type,trigger);
    if(s>bestScore){bestScore=s;best=el;}
  }
  return best;
}
function makeFallback(type,trigger){
  const box=document.createElement("div");
  box.className="z24-access-fallback";
  if(type==="paid"){
    const pageText=text((trigger.closest("section,.panel,main")||document.body).textContent);
    const pkr=(pageText.match(/PKR\s*[\d,.]+|[\d,.]+\s*PKR/i)||["PKR price shown in your package"])[0];
    const usdt=(pageText.match(/(?:USDT\s*)?[\d,.]+\s*USDT|USDT\s*[\d,.]+/i)||["USDT price shown in your package"])[0];
    box.innerHTML=`<div class="z24-mini-grid">
      <div><small>PACKAGE</small><b>Premium Market Access</b></div>
      <div><small>RENEWAL</small><b>30 Days</b></div>
      <div><small>LOCAL BANK</small><b>${esc(pkr)}</b></div>
      <div><small>USDT</small><b>${esc(usdt)}</b></div>
    </div><p class="z24-muted">Choose your payment method and continue with the existing secure payment flow.</p>
    <div class="z24-fallback-actions">
      <button type="button" class="z24-btn z24-btn-main" data-z24-delegate="Local Bank">Local Bank / PKR</button>
      <button type="button" class="z24-btn z24-btn-main" data-z24-delegate="USDT">USDT TRC20</button>
    </div>`;
  }else{
    box.innerHTML=`<div class="z24-step-copy"><b>1. Select Broker</b><span>Exness · XM · DPrime</span></div>
      <div class="z24-broker-grid">
        <button class="z24-choice" data-z24-delegate="Exness">Exness</button>
        <button class="z24-choice" data-z24-delegate="XM">XM</button>
        <button class="z24-choice" data-z24-delegate="DPrime">DPrime</button>
      </div>
      <div class="z24-step-copy"><b>2. Account Option</b><span>Create New Account or Existing IB / Partner Shift</span></div>
      <div class="z24-broker-grid">
        <button class="z24-choice" data-z24-delegate="Create New Account">Create New Account</button>
        <button class="z24-choice" data-z24-delegate="Existing">Existing IB / Partner Shift</button>
      </div>
      <p class="z24-muted">After selection, your existing verification form will open for trading account number, deposit amount and proof upload.</p>`;
  }
  box.addEventListener("click",e=>{
    const b=e.target.closest("[data-z24-delegate]");
    if(!b) return;
    const needle=norm(b.dataset.z24Delegate);
    const original=all("button,a,[role=button]",document).find(x=>
      !accessModal.contains(x)&&norm(x.textContent).includes(needle)
    );
    if(original){
      safeClick(original);
      setTimeout(()=>openAccess(trigger,type,true),30);
    }
  });
  return box;
}
function openAccess(trigger,type,rescan){
  const modal=ensureModal();
  const title=modal.querySelector("#z24AccessTitle");
  const line=modal.querySelector("#z24FlowLine");
  title.textContent=type==="paid"?"Paid Access":"Free Access via IB / Broker";
  line.textContent=type==="paid"
    ?"Package → Payment Method → Instructions / Status"
    :"Broker → Account Type → Verification → Admin Approval";
  modal.dataset.mode=type;

  // Return any previous moved node before opening another flow.
  if(movedAccessNode&&movedPlaceholder&&movedPlaceholder.parentNode){
    movedPlaceholder.parentNode.insertBefore(movedAccessNode,movedPlaceholder);
    movedPlaceholder.remove();
    movedAccessNode=null;movedPlaceholder=null;
  }

  const body=modal.querySelector(".z24-access-body");
  body.innerHTML="";
  const node=findAccessContent(trigger,type);
  if(node){
    movedPlaceholder=document.createComment("z24-access-return");
    node.parentNode.insertBefore(movedPlaceholder,node);
    movedAccessNode=node;
    node.classList.add("z24-modalized-content");
    body.appendChild(node);
  }else{
    body.appendChild(makeFallback(type,trigger));
    if(!rescan){
      // Let the old inline handler lazy-render its real content, then move it.
      setTimeout(()=>{
        const lazy=findAccessContent(trigger,type);
        if(lazy&&!modal.contains(lazy)) openAccess(trigger,type,true);
      },120);
    }
  }

  const submit=modal.querySelector("[data-z24-submit]");
  const next=modal.querySelector("[data-z24-next]");
  submit.style.display=type==="free"?"":"";
  next.style.display="";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.documentElement.classList.add("z24-modal-open");
}
function patchAccess(){
  if(route!=="student") return;
  const candidates=all("button,a,[role=button],article,div").filter(el=>{
    const t=norm(el.textContent);
    return (t==="paid access"||t==="free access via ib / broker"||
      (t.startsWith("paid access")&&t.length<100)||
      (t.startsWith("free access via ib / broker")&&t.length<170));
  });
  const bound=new Set();
  candidates.forEach(raw=>{
    const t=norm(raw.textContent);
    const type=t.includes("free access")?"free":"paid";
    const el=raw.closest("button,a,[role=button]")||raw;
    if(bound.has(el)||el.dataset.z24AccessBound) return;
    bound.add(el);
    el.dataset.z24AccessBound=type;
    el.classList.add("z24-access-trigger");
    el.removeAttribute("disabled");
    el.setAttribute("aria-disabled","false");
    el.style.pointerEvents="auto";
    el.addEventListener("click",function(){
      // Bubble phase intentionally lets the current inline/lazy handler run first.
      setTimeout(()=>openAccess(el,type,false),0);
    });
  });
}

/* ---------- 3/4. Signal History + true realtime ---------- */
function signalFinal(s){
  const st=norm(s&&s.status).replace(/\s+/g,"_");
  return !!(s&&s.closed_at)||finalStatuses.has(st)||
    (st.includes("cancel"))||st==="sl"||st==="be";
}
function formatDate(v){
  if(!v) return "—";
  const d=new Date(v);
  if(Number.isNaN(+d)) return "—";
  return d.toLocaleString([], {month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function entryText(s){
  if(s.entry_from==null&&s.entry_to==null) return "—";
  if(s.entry_to==null||String(s.entry_from)===String(s.entry_to)) return String(s.entry_from??s.entry_to);
  return `${s.entry_from} – ${s.entry_to}`;
}
function valueForHeader(h,s){
  const k=norm(h);
  if(k.includes("date")||k.includes("time")) return formatDate(signalView==="history"?(s.closed_at||s.updated_at||s.published_at):s.published_at);
  if(k.includes("symbol")||k.includes("pair")) return s.symbol||"—";
  if(k.includes("direction")||k==="side") return s.direction||"—";
  if(k.includes("type")||k.includes("order")) return s.order_type||s.signal_type||"Market";
  if(k.includes("entry")) return entryText(s);
  if(k==="sl"||k.includes("stop")) return s.stop_loss??"—";
  if(k.includes("tp1")) return s.take_profit_1??"—";
  if(k.includes("tp2")) return s.take_profit_2??"—";
  if(k.includes("tp3")) return s.take_profit_3??"—";
  if(k.includes("tp4")) return s.take_profit_4??"—";
  if(k.includes("result")||k.includes("pip")) return s.result_pips==null?"—":`${Number(s.result_pips)>0?"+":""}${s.result_pips} Pips`;
  if(k.includes("status")) return text((s.status||"active").replace(/_/g," "));
  return "—";
}
function signalsSection(){
  const headings=all("h1,h2,h3,h4,.panel-title,.section-title");
  const h=headings.find(x=>/trading signals|signals/i.test(text(x.textContent)));
  return h?(h.closest("section,.panel,[data-panel],main")||h.parentElement):null;
}
function updateSignalTabUI(){
  const section=signalsSection()||document;
  all("button,a,[role=button]",section).forEach(b=>{
    const t=norm(b.textContent);
    if(t==="active"||t==="active signals"){
      b.classList.toggle("active",signalView==="active");
      b.classList.toggle("on",signalView==="active");
      b.setAttribute("aria-selected",String(signalView==="active"));
    }else if(t==="history"||t==="signal history"){
      b.classList.toggle("active",signalView==="history");
      b.classList.toggle("on",signalView==="history");
      b.setAttribute("aria-selected",String(signalView==="history"));
    }
  });
}
function renderSignalRows(){
  const section=signalsSection();
  if(!section) return false;
  const filtered=signalRows.filter(s=>signalView==="history"?signalFinal(s):!signalFinal(s));
  const table=section.querySelector("table");
  if(table){
    let tbody=table.querySelector("tbody");
    if(!tbody){tbody=document.createElement("tbody");table.appendChild(tbody);}
    const headers=all("thead th",table).map(x=>text(x.textContent));
    if(headers.length){
      tbody.innerHTML=filtered.map(s=>`<tr data-z24-signal-id="${esc(s.id)}">${headers.map(h=>{
        const v=valueForHeader(h,s);
        const kl=norm(h);
        const cls=kl.includes("direction")?` z24-${norm(s.direction)}`:kl.includes("status")?" z24-status":"";
        return `<td class="${cls.trim()}">${esc(v)}</td>`;
      }).join("")}</tr>`).join("") || `<tr><td colspan="${headers.length}" class="z24-empty">${signalView==="history"?"No signal history yet.":"No active signals right now."}</td></tr>`;
      table.dataset.z24Realtime="1";
      return true;
    }
  }
  let host=section.querySelector("[data-z24-signal-host]");
  if(!host){
    host=document.createElement("div");host.dataset.z24SignalHost="1";host.className="z24-signal-cards";
    section.appendChild(host);
  }
  host.innerHTML=filtered.map(s=>`<article class="z24-signal-card">
    <div class="z24-signal-card-top"><b>${esc(s.symbol||"Signal")}</b><span class="z24-${norm(s.direction)}">${esc(s.direction||"")}</span></div>
    <div class="z24-signal-values"><span><small>Entry</small>${esc(entryText(s))}</span><span><small>SL</small>${esc(s.stop_loss??"—")}</span><span><small>Status</small>${esc(text((s.status||"active").replace(/_/g," ")))}</span></div>
  </article>`).join("") || `<div class="z24-empty">${signalView==="history"?"No signal history yet.":"No active signals right now."}</div>`;
  return true;
}
function updateMetric(label,value){
  const section=signalsSection()||document;
  const labelEl=all("small,span,p,div",section).find(el=>norm(el.textContent)===norm(label));
  if(!labelEl) return;
  const card=labelEl.closest("[class*=card],[class*=stat],[class*=kpi],article,div");
  if(!card) return;
  const number=all("b,strong,h2,h3,h4,.value,.number",card).find(el=>/^-?\d/.test(text(el.textContent)));
  if(number) number.textContent=String(value);
}
function updateSignalMetrics(){
  updateMetric("Active Signals",signalRows.filter(s=>!signalFinal(s)).length);
  const pending=signalRows.filter(s=>!signalFinal(s)&&/pending|limit|stop/i.test(String(s.status||""))).length;
  updateMetric("Pending",pending);
}
async function loadSignals(){
  const client=getClient();
  if(!client) return false;
  try{
    const {data,error}=await client.from("signals").select("*").eq("is_published",true).order("published_at",{ascending:false}).limit(150);
    if(error) throw error;
    signalRows=Array.isArray(data)?data:[];
    updateSignalMetrics();
    updateSignalTabUI();
    renderSignalRows();
    return true;
  }catch(err){
    console.warn("24K signal refresh:",err&&err.message||err);
    return false;
  }
}
function activateSignalView(view){
  signalView=view;
  updateSignalTabUI();
  if(!signalRows.length) loadSignals(); else renderSignalRows();
}
function patchSignalTabs(){
  if(route!=="student") return;
  const section=signalsSection()||document;
  all("button,a,[role=button]",section).forEach(b=>{
    const t=norm(b.textContent);
    let v=null;
    if(t==="history"||t==="signal history") v="history";
    if(t==="active"||t==="active signals") v="active";
    if(!v||b.dataset.z24SignalTab) return;
    b.dataset.z24SignalTab=v;
    b.addEventListener("click",function(e){
      const client=getClient();
      if(client){
        e.preventDefault();
        e.stopPropagation();
        activateSignalView(v);
      }else{
        setTimeout(()=>{
          signalView=v;updateSignalTabUI();
          // Fallback for already rendered rows if client discovery is delayed.
          all("tbody tr,.signal-row,.signal-card",section).forEach(r=>{
            const isFinal=/tp3|tp4|sl hit|breakeven|closed|cancel/i.test(norm(r.textContent));
            r.style.display=(v==="history"?isFinal:!isFinal)?"":"none";
          });
        },0);
      }
    },true);
  });
}
function realtimeRefresh(){
  clearTimeout(signalRefreshTimer);
  signalRefreshTimer=setTimeout(async()=>{
    const ok=await loadSignals();
    // Also nudge any existing dashboard widgets/hooks.
    ["refreshSignals","loadSignals","loadStudentSignals","loadLatestSignal"].forEach(n=>{
      if(typeof window[n]==="function"){
        try{window[n]();}catch(_){}
      }
    });
    document.dispatchEvent(new CustomEvent("24k:signals-updated",{detail:{realtime:true,loaded:ok}}));
  },90);
}
function initSignalRealtime(){
  if(route!=="student"||signalChannel) return;
  const client=getClient();
  if(!client) return;
  try{
    signalChannel=client.channel("24k-zero-signals-"+Math.random().toString(36).slice(2,8))
      .on("postgres_changes",{event:"*",schema:"public",table:"signals"},realtimeRefresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"signal_updates"},realtimeRefresh)
      .subscribe(status=>{
        if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
          try{client.removeChannel(signalChannel);}catch(_){}
          signalChannel=null;
          setTimeout(initSignalRealtime,1200);
        }
      });
    window.addEventListener("online",()=>{if(!signalChannel)initSignalRealtime();},{passive:true});
    loadSignals();
  }catch(err){
    signalChannel=null;
    setTimeout(initSignalRealtime,1500);
  }
}

/* ---------- 5. App-like mobile shell ---------- */
function buildMobileNav(){
  if(route!=="student"||matchMedia("(min-width: 781px)").matches) return;
  if(document.querySelector(".z24-mobile-nav")) return;
  const existing=all("nav a,aside a,[data-panel]").filter(a=>{
    const t=norm(a.textContent);
    return ["dashboard","courses","signals","updates","profile"].some(x=>t===x||t.startsWith(x+" "));
  });
  const wanted=["dashboard","courses","signals","updates","profile"];
  const chosen=[];
  wanted.forEach(name=>{
    const a=existing.find(x=>norm(x.textContent)===name||norm(x.textContent).startsWith(name+" "));
    if(a) chosen.push([name,a]);
  });
  if(chosen.length<3) return;
  const nav=document.createElement("nav");
  nav.className="z24-mobile-nav";
  nav.setAttribute("aria-label","Student navigation");
  const icons={dashboard:"⌂",courses:"▤",signals:"↗",updates:"●",profile:"◎"};
  chosen.forEach(([name,original])=>{
    const b=document.createElement("button");
    b.type="button";b.dataset.z24Mobile=name;
    b.innerHTML=`<span>${icons[name]||"•"}</span><small>${name[0].toUpperCase()+name.slice(1)}</small>`;
    b.addEventListener("click",()=>{
      safeClick(original);
      all("button",nav).forEach(x=>x.classList.toggle("active",x===b));
      window.scrollTo({top:0,behavior:"smooth"});
    });
    nav.appendChild(b);
  });
  document.body.appendChild(nav);
  document.body.classList.add("z24-mobile-enhanced");
}

/* ---------- Boot / rerender safety ---------- */
function bootPass(){
  patchLinks();
  patchAccess();
  patchSignalTabs();
  buildMobileNav();
  initSignalRealtime();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bootPass,{once:true});
else bootPass();

const mo=new MutationObserver(function(){
  clearTimeout(observerTimer);
  observerTimer=setTimeout(bootPass,120);
});
mo.observe(document.documentElement,{subtree:true,childList:true});

setTimeout(bootPass,350);
setTimeout(bootPass,1200);
})();