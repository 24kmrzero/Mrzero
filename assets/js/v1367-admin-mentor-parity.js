/* 24K MR ZERO — Admin Mentor Parity enhancer v13.67 */
(()=>{
'use strict';
let state=null;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const stamp=v=>{const d=v?new Date(v):null;if(!d||Number.isNaN(d.getTime()))return{date:'—',time:'—'};return{date:new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short',year:'numeric'}).format(d),time:new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit',hour12:true}).format(d)}};
const signalFinal=s=>Boolean(s?.closed_at)||['tp3_hit','tp4_hit','sl_hit','closed','cancelled'].includes(String(s?.status||''));
const signed=n=>{const x=Number(n||0);return (x>0?'+':'')+x.toLocaleString('en-US',{maximumFractionDigits:1})};

function ensureStats(panelId,id){
  const panel=$(panelId),hero=panel?.querySelector('.admin-content-command');if(!panel||!hero)return null;
  let box=$('#'+id);
  if(!box){box=document.createElement('div');box.id=id;box.className='admin-mentor-stats';hero.insertAdjacentElement('afterend',box)}
  return box
}
function stat(icon,label,value,note='',tone=''){
  return '<article class="admin-mentor-stat '+tone+'"><i class="fa-solid '+icon+'"></i><div><small>'+esc(label)+'</small><b>'+esc(value)+'</b>'+(note?'<em>'+esc(note)+'</em>':'')+'</div></article>'
}
function enhanceSignals(){
  if(!state)return;
  const box=$('#adminSignalStats');if(!box)return;
  const all=state.signals||[],closed=all.filter(signalFinal),countable=closed.filter(x=>x.status!=='cancelled'&&x.result_pips!==null&&x.result_pips!==undefined);
  const wins=countable.filter(x=>Number(x.result_pips)>0),net=countable.reduce((n,x)=>n+Number(x.result_pips||0),0),rate=countable.length?Math.round(wins.length/countable.length*100):0;
  box.classList.remove('hidden');
  box.innerHTML=[
    stat('fa-bolt','Active',all.filter(x=>!signalFinal(x)).length,'Live / pending'),
    stat('fa-circle-check','Closed',closed.length,'Signal history'),
    stat('fa-chart-simple','Win Rate',rate+'%',countable.length+' completed'),
    stat('fa-arrow-trend-up','Net Pips',signed(net),'Recorded result')
  ].join('');
}

function chartFilters(all){
  const pair=$('#adminChartPair'),q=$('#adminChartSearch'),sort=$('#adminChartSort');
  if(pair){
    const current=pair.value||'all',pairs=[...new Set(all.map(x=>String(x.symbol||'').toUpperCase()).filter(Boolean))].sort();
    pair.innerHTML='<option value="all">All Pairs</option>'+pairs.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
    pair.value=pairs.includes(current)?current:'all'
  }
  let out=[...all],query=String(q?.value||'').trim().toLowerCase(),pv=pair?.value||'all';
  if(query)out=out.filter(x=>(String(x.title||'')+' '+String(x.summary||'')+' '+String(x.symbol||'')).toLowerCase().includes(query));
  if(pv!=='all')out=out.filter(x=>String(x.symbol||'').toUpperCase()===pv);
  out.sort((a,b)=>new Date(a.published_at||a.created_at||0)-new Date(b.published_at||b.created_at||0));
  if((sort?.value||'new')!=='old')out.reverse();
  return out
}
function renderCharts(){
  if(!state)return;
  const all=[...(state.charts||[])],box=$('#adminChartsGrid');if(!box)return;
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),week=new Date(today);week.setDate(week.getDate()-6);
  const counts={};all.forEach(x=>{const k=String(x.symbol||'').toUpperCase();if(k)counts[k]=(counts[k]||0)+1});
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  const stats=ensureStats('#p-charts','adminChartMentorStats');
  if(stats)stats.innerHTML=[
    stat('fa-layer-group','Total Analysis',all.length,'Research library'),
    stat('fa-calendar-week','This Week',all.filter(x=>new Date(x.published_at||x.created_at||0)>=week).length,'Last 7 days'),
    stat('fa-calendar-day','Today',all.filter(x=>new Date(x.published_at||x.created_at||0)>=today).length,'Published today'),
    stat('fa-chart-line','Top Pair',top,'Most covered')
  ].join('');
  const items=chartFilters(all);
  if(!items.length){box.innerHTML='<div class="empty-state"><i class="fa-solid fa-chart-line"></i><h3>No chart analysis found</h3><p>Change the filters or publish a new analysis.</p></div>';return}
  box.innerHTML=items.map((x,i)=>{const t=stamp(x.published_at||x.created_at),symbol=String(x.symbol||'CHART').toUpperCase(),live=Boolean(x.is_published);
    return '<article class="admin-mentor-content-card '+(i%2?'cream':'white')+'">'+
      '<div class="admin-mentor-media">'+
        (x.image_url?'<img src="'+esc(x.image_url)+'" alt="'+esc(x.title||symbol)+'" loading="lazy">':'<div class="admin-mentor-placeholder"><i class="fa-solid fa-chart-line"></i><span>24K RESEARCH</span></div>')+
        '<div class="admin-mentor-media-top"><span class="gold">'+esc(symbol)+'</span>'+(x.timeframe?'<span>'+esc(x.timeframe)+'</span>':'')+'<span class="'+(live?'live':'draft')+'">'+(live?'Published':'Draft')+'</span></div>'+
        '<span class="admin-mentor-index">'+String(i+1).padStart(2,'0')+'</span>'+
      '</div>'+
      '<div class="admin-mentor-card-body"><div class="admin-mentor-card-meta"><span><i class="fa-regular fa-calendar"></i> '+esc(t.date)+'</span><span><i class="fa-regular fa-clock"></i> '+esc(t.time)+'</span></div>'+
      '<h3>'+esc(x.title||symbol+' Analysis')+'</h3><p>'+esc(x.summary||'Market analysis update.')+'</p>'+
      '<div class="admin-mentor-card-foot"><span class="admin-mentor-state '+(live?'live':'draft')+'"><i class="fa-solid '+(live?'fa-circle-check':'fa-pen')+'"></i> '+(live?'Live':'Draft')+'</span>'+
      '<div class="admin-mentor-actions">'+(x.image_url?'<a href="'+esc(x.image_url)+'" target="_blank" rel="noopener" title="View chart"><i class="fa-solid fa-expand"></i><span>View</span></a>':'')+
      '<button type="button" data-edit="chart" data-id="'+esc(x.id)+'"><i class="fa-solid fa-pen"></i><span>Edit</span></button>'+
      '<button type="button" class="danger" data-delete="chart" data-id="'+esc(x.id)+'" title="Delete"><i class="fa-regular fa-trash-can"></i></button></div></div></div></article>'
  }).join('')
}

function articleFilters(all){
  const q=$('#adminArticleSearch'),cat=$('#adminArticleCategory'),status=$('#adminArticleStatus'),sort=$('#adminArticleSort');
  if(cat){
    const current=cat.value||'all',cats=[...new Set(all.map(x=>String(x.category||'General')).filter(Boolean))].sort();
    cat.innerHTML='<option value="all">All Categories</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
    cat.value=cats.includes(current)?current:'all'
  }
  let out=[...all],query=String(q?.value||'').trim().toLowerCase(),cv=cat?.value||'all',sv=status?.value||'all';
  if(query)out=out.filter(x=>(String(x.title||'')+' '+String(x.excerpt||'')+' '+String(x.category||'')).toLowerCase().includes(query));
  if(cv!=='all')out=out.filter(x=>String(x.category||'General')===cv);
  if(sv==='published')out=out.filter(x=>Boolean(x.is_published));
  if(sv==='draft')out=out.filter(x=>!x.is_published);
  out.sort((a,b)=>new Date(a.published_at||a.created_at||0)-new Date(b.published_at||b.created_at||0));
  if((sort?.value||'new')!=='old')out.reverse();
  return out
}
function renderArticles(){
  if(!state)return;
  const all=[...(state.articles||[])],box=$('#adminArticlesGrid');if(!box)return;
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),week=new Date(today);week.setDate(week.getDate()-6);
  const published=all.filter(x=>Boolean(x.is_published)).length;
  const stats=ensureStats('#p-articles','adminArticleMentorStats');
  if(stats)stats.innerHTML=[
    stat('fa-newspaper','Total Articles',all.length,'Editorial library'),
    stat('fa-circle-check','Published',published,'Visible to users'),
    stat('fa-pen','Drafts',all.length-published,'Work in progress'),
    stat('fa-calendar-week','This Week',all.filter(x=>new Date(x.published_at||x.created_at||0)>=week).length,'Last 7 days')
  ].join('');
  const items=articleFilters(all);
  if(!items.length){box.innerHTML='<div class="empty-state"><i class="fa-solid fa-newspaper"></i><h3>No articles found</h3><p>Change the filters or create a new article.</p></div>';return}
  box.innerHTML=items.map((x,i)=>{const t=stamp(x.published_at||x.created_at),category=String(x.category||'General'),live=Boolean(x.is_published),excerpt=x.excerpt||String(x.content||'').slice(0,180)||'No excerpt added.';
    return '<article class="admin-mentor-content-card '+(i%2?'cream':'white')+'">'+
      '<div class="admin-mentor-media">'+
        (x.cover_url?'<img src="'+esc(x.cover_url)+'" alt="'+esc(x.title||category)+'" loading="lazy">':'<div class="admin-mentor-placeholder"><i class="fa-solid fa-newspaper"></i><span>24K EDITORIAL</span></div>')+
        '<div class="admin-mentor-media-top"><span class="gold">'+esc(category)+'</span><span class="'+(live?'live':'draft')+'">'+(live?'Published':'Draft')+'</span></div>'+
        '<span class="admin-mentor-index">'+String(i+1).padStart(2,'0')+'</span>'+
      '</div>'+
      '<div class="admin-mentor-card-body"><div class="admin-mentor-card-meta"><span><i class="fa-regular fa-calendar"></i> '+esc(t.date)+'</span><span><i class="fa-regular fa-clock"></i> '+esc(t.time)+'</span></div>'+
      '<h3>'+esc(x.title||'Untitled Article')+'</h3><p>'+esc(excerpt)+'</p>'+
      '<div class="admin-mentor-card-foot"><span class="admin-mentor-state '+(live?'live':'draft')+'"><i class="fa-solid '+(live?'fa-circle-check':'fa-pen')+'"></i> '+(live?'Live':'Draft')+'</span>'+
      '<div class="admin-mentor-actions"><button type="button" data-edit="article" data-id="'+esc(x.id)+'"><i class="fa-solid fa-pen"></i><span>Edit</span></button>'+
      '<button type="button" class="danger" data-delete="article" data-id="'+esc(x.id)+'" title="Delete"><i class="fa-regular fa-trash-can"></i></button></div></div></div></article>'
  }).join('')
}
function enhance(){
  if(!state)return;enhanceSignals();renderCharts();renderArticles()
}
window.addEventListener('24k:admin-base-updated',e=>{state=e.detail||state;requestAnimationFrame(enhance)});
document.addEventListener('panel:open',e=>{if(!state)return;const k=e.detail?.key;if(k==='signals')requestAnimationFrame(enhanceSignals);if(k==='charts')requestAnimationFrame(renderCharts);if(k==='articles')requestAnimationFrame(renderArticles)});
document.addEventListener('click',e=>{if(e.target.closest('[data-admin-signal-view]'))setTimeout(enhanceSignals,0)});
document.addEventListener('input',e=>{if(e.target.matches('#adminChartSearch'))renderCharts();if(e.target.matches('#adminArticleSearch'))renderArticles()});
document.addEventListener('change',e=>{if(e.target.matches('#adminChartPair,#adminChartSort'))renderCharts();if(e.target.matches('#adminArticleCategory,#adminArticleStatus,#adminArticleSort'))renderArticles()});
document.addEventListener('theme:change',()=>requestAnimationFrame(()=>document.body.offsetHeight));
})();
