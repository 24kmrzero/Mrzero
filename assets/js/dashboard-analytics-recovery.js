(function(){
  'use strict';
  const RANGE_DEFAULT='last_week';
  const state={users:{range:RANGE_DEFAULT,start:'',end:''},courses:{range:RANGE_DEFAULT,start:'',end:''}};
  const dayStart=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function period(target){
    const cfg=state[target],today=dayStart(new Date()); let start,end;
    if(cfg.range==='today'){start=today;end=addDays(today,1)}
    else if(cfg.range==='yesterday'){start=addDays(today,-1);end=today}
    else if(cfg.range==='last_month'){start=addDays(today,-29);end=addDays(today,1)}
    else if(cfg.range==='custom'&&cfg.start&&cfg.end){const a=new Date(cfg.start+'T00:00:00'),b=new Date(cfg.end+'T00:00:00');if(!isNaN(a)&&!isNaN(b)&&b>=a){start=a;end=addDays(b,1)}}
    if(!start||!end){start=addDays(today,-6);end=addDays(today,1)}
    const duration=end-start;return{start,end,previousStart:new Date(start-duration),previousEnd:start};
  }
  function compare(events,target){const p=period(target);let current=0,previous=0;for(const raw of events){const d=new Date(raw);if(isNaN(d))continue;if(d>=p.start&&d<p.end)current++;else if(d>=p.previousStart&&d<p.previousEnd)previous++}let change=previous?((current-previous)/previous)*100:(current?100:0);return{current,previous,change:Math.round(change*10)/10}}
  function compareEnrollments(rows,courses,target){const p=period(target);let free=0,paid=0,previous=0;const courseMap=new Map(courses.map(c=>[c.id,c]));for(const r of rows){const d=new Date(r.created_at||r.access_started_at||r.updated_at);if(isNaN(d))continue;const c=courseMap.get(r.course_id);const isFree=!!c&&(c.course_type==='free'||Number(c.discount_price??c.price??0)===0);if(d>=p.start&&d<p.end){isFree?free++:paid++}else if(d>=p.previousStart&&d<p.previousEnd)previous++}const current=free+paid;let change=previous?((current-previous)/previous)*100:(current?100:0);return{current,previous,free,paid,change:Math.round(change*10)/10}}
  function ringSegments(a,b,kind){const C=301.593,total=a+b,p1=total?a/total:0,p2=total?b/total:0,l1=p1*C,l2=p2*C,g1=l1>8&&l2>0?3.2:0,g2=l2>8&&l1>0?3.2:0,d1=Math.max(0,l1-g1),d2=Math.max(0,l2-g2),off=-(l1+(g1?.8:0));const ids=kind==='users'?['gold','blue']:['orange','green'];return{total,p1,p2,svg:`<svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="48"/><circle cx="60" cy="60" r="48" stroke="url(#${kind}-${ids[0]})" stroke-dasharray="${d1.toFixed(2)} ${(C-d1).toFixed(2)}"/><circle cx="60" cy="60" r="48" stroke="url(#${kind}-${ids[1]})" stroke-dasharray="${d2.toFixed(2)} ${(C-d2).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/><defs><linearGradient id="${kind}-gold"><stop stop-color="#ffd84a"/><stop offset="1" stop-color="#ef8f1b"/></linearGradient><linearGradient id="${kind}-blue"><stop stop-color="#88a6ff"/><stop offset="1" stop-color="#6d50c9"/></linearGradient><linearGradient id="${kind}-orange"><stop stop-color="#ffd76c"/><stop offset="1" stop-color="#d77b2b"/></linearGradient><linearGradient id="${kind}-green"><stop stop-color="#74e49b"/><stop offset="1" stop-color="#159b8b"/></linearGradient></defs></svg>`}}
  function labelFor(range){return range==='today'?'today':range==='yesterday'?'yesterday':range==='last_month'?'last 30 days':range==='custom'?'selected period':'last 7 days'}
  function compareLabel(range){return range==='today'?'vs yesterday':range==='yesterday'?'vs previous day':range==='last_month'?'vs previous 30 days':range==='custom'?'vs previous same period':'vs previous 7 days'}
  function filters(target){return ['today','yesterday','last_week','last_month','custom'].map(r=>`<button data-v933-range="${r}" data-target="${target}" class="${state[target].range===r?'active':''}">${r==='last_week'?'Last Week':r==='last_month'?'Last Month':r==='custom'?'Custom Date':r[0].toUpperCase()+r.slice(1)}</button>`).join('')}
  function custom(target){const s=state[target];return `<div class="v933-custom ${s.range==='custom'?'':'hidden'}"><input type="date" data-v933-date="start" data-target="${target}" value="${esc(s.start)}"><input type="date" data-v933-date="end" data-target="${target}" value="${esc(s.end)}"></div>`}
  function changeMarkup(x){const tone=x.change>0?'positive':x.change<0?'negative':'neutral';return `<span class="v933-change ${tone}">${x.change>0?'+':''}${x.change}%</span>`}
  function usersCard(users){const x=compare(users,'users'),ring=ringSegments(x.current,x.previous,'users'),pct=Math.round(ring.p1*100);return `<section class="analytics-card v933-recovery"><div class="v933-analytics-head"><div><span class="eyebrow">USERS</span><h3>👥 User Growth</h3><p>New student registrations · ${labelFor(state.users.range)}</p></div><div class="v933-analytics-total"><b>${x.current}</b><small>Total</small></div></div><div class="v933-filter-row">${filters('users')}</div>${custom('users')}<div class="v933-chart-surface"><div class="v933-donut">${ring.svg}<div class="v933-donut-center"><b>${x.current}</b><span>Current Users</span><small>${pct}%</small></div></div><div class="v933-legend"><div class="v933-legend-row"><span class="v933-swatch gold"></span><span>Selected period</span><b>${x.current}</b><small>${pct}%</small></div><div class="v933-legend-row"><span class="v933-swatch blue"></span><span>Previous period</span><b>${x.previous}</b><small>${Math.round(ring.p2*100)}%</small></div></div></div><div class="v933-performance">${changeMarkup(x)}<span>${compareLabel(state.users.range)}</span><small>Previous: ${x.previous}</small></div></section>`}
  function coursesCard(rows,courses){const x=compareEnrollments(rows,courses,'courses'),ring=ringSegments(x.free,x.paid,'courses'),freePct=Math.round(ring.p1*100),paidPct=Math.round(ring.p2*100);return `<section class="analytics-card v933-recovery"><div class="v933-analytics-head"><div><span class="eyebrow">COURSES</span><h3>🎓 Course Enrollments</h3><p>Free and paid enrollments · ${labelFor(state.courses.range)}</p></div><div class="v933-analytics-total"><b>${x.current}</b><small>Total</small></div></div><div class="v933-filter-row">${filters('courses')}</div>${custom('courses')}<div class="v933-chart-surface"><div class="v933-donut">${ring.svg}<div class="v933-donut-center"><b>${x.current}</b><span>Current Enrollments</span><small>${paidPct}% paid</small></div></div><div class="v933-legend"><div class="v933-legend-row"><span class="v933-swatch orange"></span><span>Free enrollments</span><b>${x.free}</b><small>${freePct}%</small></div><div class="v933-legend-row"><span class="v933-swatch green"></span><span>Paid enrollments</span><b>${x.paid}</b><small>${paidPct}%</small></div></div></div><div class="v933-performance">${changeMarkup(x)}<span>${compareLabel(state.courses.range)} · total enrollments</span><small>Free: ${x.free} · Paid: ${x.paid}</small></div></section>`}
  async function loadData(){
    const app=window.App;if(!app||!app.supabase) return null;
    try{
      const [profiles,enrollments,courses]=await Promise.all([
        app.supabase.from('profiles').select('id,role,created_at').eq('role','student'),
        app.supabase.from('enrollments').select('course_id,created_at,access_started_at,updated_at'),
        app.supabase.from('courses').select('id,course_type,price,discount_price')
      ]);
      return{users:(profiles.data||[]).map(x=>x.created_at).filter(Boolean),enrollments:enrollments.data||[],courses:courses.data||[]};
    }catch(e){console.error('V9.33 analytics data load failed',e);return null}
  }
  let cached=null;
  async function render(){const root=document.getElementById('dashboardAnalytics');if(!root)return;cached=await loadData()||cached;if(!cached)return;root.innerHTML=usersCard(cached.users)+coursesCard(cached.enrollments,cached.courses)}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-v933-range]');if(!b)return;const t=b.dataset.target,r=b.dataset.v933Range;if(!state[t])return;state[t].range=r;if(r==='custom'&&(!state[t].start||!state[t].end)){const now=new Date(),fmt=d=>d.toISOString().slice(0,10);state[t].end=fmt(now);state[t].start=fmt(addDays(now,-6))}render()});
  document.addEventListener('change',e=>{const i=e.target.closest('[data-v933-date]');if(!i)return;const t=i.dataset.target;if(!state[t])return;state[t][i.dataset.v933Date]=i.value;state[t].range='custom';render()});
  async function boot(){for(let i=0;i<50&&!window.App?.supabase;i++)await new Promise(r=>setTimeout(r,100));await render();setTimeout(()=>{const r=document.getElementById('dashboardAnalytics');if(r&&!r.children.length)render()},1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
