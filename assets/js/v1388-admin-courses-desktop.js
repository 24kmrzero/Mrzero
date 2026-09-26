/* 24K MR ZERO — Admin Courses premium desktop summary v13.88 */
(()=>{
  'use strict';
  const desktop=()=>window.matchMedia&&window.matchMedia('(min-width: 901px)').matches;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function nextUpcomingSessions(sessions){
    const now=Date.now()-5*60*1000;
    return (sessions||[]).filter(s=>{
      const status=String(s?.status||'').toLowerCase();
      const t=new Date(s?.starts_at||0).getTime();
      return Number.isFinite(t)&&t>=now&&!['cancelled','completed'].includes(status);
    });
  }

  function render(state){
    if(!desktop())return;
    const box=document.getElementById('adminCourseStatsDesktop');
    const panel=document.getElementById('p-courses');
    if(!box||!panel||!state)return;

    const courses=state.courses||[];
    const sessions=state.sessions||[];
    const published=courses.filter(c=>c?.is_published!==false).length;
    const enrollment=courses.filter(c=>c?.enrollment_open!==false).length;
    const upcoming=nextUpcomingSessions(sessions).length;

    const cards=[
      ['fa-layer-group','TOTAL COURSES',courses.length,'Course library','gold'],
      ['fa-circle-check','PUBLISHED',published,'Visible to students','green'],
      ['fa-door-open','ENROLLMENT OPEN',enrollment,'Accepting students','blue'],
      ['fa-video','UPCOMING CLASSES',upcoming,'Scheduled live sessions','violet']
    ];

    box.innerHTML=cards.map(([icon,label,value,note,tone])=>
      '<article class="admin-course-stat '+tone+'">'+
        '<span><i class="fa-solid '+icon+'"></i></span>'+
        '<div><small>'+esc(label)+'</small><b>'+esc(value)+'</b><em>'+esc(note)+'</em></div>'+
      '</article>'
    ).join('');

    const table=panel.querySelector('.table-scroll');
    if(table)table.classList.add('admin-course-table-wrap');
    panel.querySelectorAll('#coursesBody tr').forEach(row=>row.classList.add('admin-course-row'));
  }

  function sync(){
    const state=window.AdminBase?.state;
    if(state)render(state);
  }

  window.addEventListener('24k:admin-base-updated',e=>requestAnimationFrame(()=>render(e.detail||window.AdminBase?.state)));
  document.addEventListener('panel:open',e=>{
    if(e.detail?.key==='courses')requestAnimationFrame(sync);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,60),{once:true});
  else setTimeout(sync,60);
  window.matchMedia?.('(min-width: 901px)')?.addEventListener?.('change',sync);
})();