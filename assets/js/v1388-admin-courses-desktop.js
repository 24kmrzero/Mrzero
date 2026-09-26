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


  const fmtMoney=(v,c='USD')=>{
    const n=Number(v||0);
    if(!Number.isFinite(n))return '—';
    if(n===0)return 'FREE';
    const code=String(c||'USD').toUpperCase();
    const sym=code==='USD'?'
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

    const cards=document.getElementById('adminCourseCardsDesktop');
    if(cards){
      cards.innerHTML=courses.length?courses.map(course=>{
        const next=nextSessionFor(course.id,sessions);
        const price=fmtMoney(course.discount_price||course.price,course.currency);
        const regular=Number(course.discount_price||0)>0&&Number(course.price||0)>Number(course.discount_price||0)?fmtMoney(course.price,course.currency):'';
        const free=Number(course.discount_price||course.price||0)===0;
        const thumb=course.thumbnail_url
          ? '<div class="admin-course-card-media"><img src="'+esc(course.thumbnail_url)+'" alt="'+esc(course.title||'Course')+'" loading="lazy"></div>'
          : '<div class="admin-course-card-media placeholder"><i class="fa-solid fa-graduation-cap"></i></div>';
        return '<article class="admin-course-card '+(free?'free':'paid')+'">'+
          thumb+
          '<div class="admin-course-card-body">'+
            '<div class="admin-course-card-top">'+
              '<div><span class="admin-course-card-type">'+(free?'FREE COURSE':'PAID COURSE')+'</span><h3>'+esc(course.title||'Untitled Course')+'</h3></div>'+
              '<span class="admin-course-card-status">'+esc(statusLabel(course.status))+'</span>'+
            '</div>'+
            '<p>'+esc(course.short_description||course.description||'No course description added.')+'</p>'+
            '<div class="admin-course-card-metrics">'+
              '<div><small>PRICE</small><b>'+esc(price)+'</b>'+(regular?'<em>'+esc(regular)+'</em>':'')+'</div>'+
              '<div><small>NEXT CLASS</small><b>'+(next?esc(next.title||'Upcoming Class'):'No upcoming class')+'</b><em>'+(next?esc(fmtDate(next.starts_at)):'Schedule not added')+'</em></div>'+
            '</div>'+
            '<div class="admin-course-card-meta">'+
              '<span><i class="fa-brands fa-whatsapp"></i> WhatsApp Community</span>'+
              '<span class="'+(course.is_published!==false?'ok':'muted')+'"><i class="fa-solid '+(course.is_published!==false?'fa-circle-check':'fa-circle-minus')+'"></i> '+(course.is_published!==false?'Published':'Hidden')+'</span>'+
            '</div>'+
            '<div class="admin-course-card-actions">'+
              '<button class="app-btn small outline" data-edit="course" data-id="'+esc(course.id)+'"><i class="fa-regular fa-pen-to-square"></i> Edit</button>'+
              '<button class="app-btn small outline" data-course-sessions="'+esc(course.id)+'"><i class="fa-solid fa-video"></i> Sessions</button>'+
              '<button class="app-btn small danger" data-delete="course" data-id="'+esc(course.id)+'"><i class="fa-regular fa-trash-can"></i> Delete</button>'+
            '</div>'+
          '</div>'+
        '</article>';
      }).join(''):'<div class="admin-course-card-empty"><i class="fa-solid fa-graduation-cap"></i><b>No courses created</b><small>Add your first course to begin.</small></div>';
    }

    const table=panel.querySelector('.table-scroll');
    if(table)table.classList.add('admin-course-table-wrap');
    panel.querySelectorAll('#coursesBody tr').forEach(row=>{
      row.classList.add('admin-course-row');
      const id=row.querySelector('[data-edit="course"][data-id]')?.dataset.id||'';
      const course=courses.find(c=>String(c.id)===String(id));
      if(course){
        row.dataset.courseType=String(course.course_type||'paid').toLowerCase();
        row.dataset.courseStatus=String(course.status||'active').toLowerCase();
      }
      const cells=row.children;
      if(cells?.[3])cells[3].classList.add('admin-course-next-class');
      if(cells?.[4])cells[4].classList.add('admin-course-access-cell');
      if(cells?.[5]&&!cells[5].querySelector('.admin-course-published')){
        const yes=String(cells[5].textContent||'').trim().toLowerCase()==='yes';
        cells[5].innerHTML='<span class="admin-course-published '+(yes?'yes':'no')+'"><i class="fa-solid '+(yes?'fa-circle-check':'fa-circle-minus')+'"></i> '+(yes?'Published':'Hidden')+'</span>';
      }
    });
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
})();:code==='PKR'?'Rs ':code==='USDT'?'₮ ':'';
    return sym+n.toLocaleString('en-US',{maximumFractionDigits:2});
  };
  const fmtDate=v=>{
    const d=v?new Date(v):null;
    if(!d||Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(d);
  };
  const nextSessionFor=(courseId,sessions)=>{
    const now=Date.now()-5*60*1000;
    return (sessions||[]).filter(x=>String(x.course_id)===String(courseId)&&!['cancelled','completed'].includes(String(x.status||'').toLowerCase())&&new Date(x.starts_at||0).getTime()>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at))[0]||null;
  };
  const statusLabel=v=>String(v||'active').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());

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
    panel.querySelectorAll('#coursesBody tr').forEach(row=>{
      row.classList.add('admin-course-row');
      const id=row.querySelector('[data-edit="course"][data-id]')?.dataset.id||'';
      const course=courses.find(c=>String(c.id)===String(id));
      if(course){
        row.dataset.courseType=String(course.course_type||'paid').toLowerCase();
        row.dataset.courseStatus=String(course.status||'active').toLowerCase();
      }
      const cells=row.children;
      if(cells?.[3])cells[3].classList.add('admin-course-next-class');
      if(cells?.[4])cells[4].classList.add('admin-course-access-cell');
      if(cells?.[5]&&!cells[5].querySelector('.admin-course-published')){
        const yes=String(cells[5].textContent||'').trim().toLowerCase()==='yes';
        cells[5].innerHTML='<span class="admin-course-published '+(yes?'yes':'no')+'"><i class="fa-solid '+(yes?'fa-circle-check':'fa-circle-minus')+'"></i> '+(yes?'Published':'Hidden')+'</span>';
      }
    });
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