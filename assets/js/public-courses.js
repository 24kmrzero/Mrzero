(async function(){
  'use strict';
  const A=window.App;
  const home=document.getElementById('homeCoursesGrid');
  const catalogue=document.getElementById('publicCoursesGrid');
  const grids=[home,catalogue].filter(Boolean);
  if(!grids.length)return;

  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=(n,currency)=>{
    const value=Number(n||0),c=String(currency||'USD').toUpperCase();
    if(value===0)return'Free';
    if(c==='USDT')return`${value.toLocaleString()} USDT`;
    if(c==='PKR')return`PKR ${value.toLocaleString()}`;
    if(c==='USD')return`USD ${value.toLocaleString()}`;
    return`${c} ${value.toLocaleString()}`;
  };
  const empty=msg=>`<div class="public-course-loading"><i class="fa-solid fa-circle-info"></i><p>${esc(msg)}</p></div>`;
  const normalize=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const homeRank=course=>{
    const t=normalize(course.title);
    if((t.includes('basic')&&t.includes('level 1'))||t==='basic level 1 course')return 0;
    if(t==='level 2'||t==='level 2 course'||(t.includes('level 2')&&!t.includes('level 1')))return 1;
    if(t.includes('1 to 1 mentorship')||t.includes('1 1 mentorship')||t.includes('one to one mentorship'))return 2;
    return 50;
  };

  function injectStyles(){
    if(document.getElementById('v990-home-course-grid-style'))return;
    const style=document.createElement('style');style.id='v990-home-course-grid-style';style.textContent=`
      #homeCoursesGrid.v990-home-course-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:24px!important;align-items:stretch!important;width:100%!important}
      #homeCoursesGrid.v990-home-course-grid>.public-course-card{min-width:0!important;width:100%!important;height:100%!important;margin:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
      #homeCoursesGrid.v990-home-course-grid .public-course-media{flex:0 0 auto!important;min-height:190px!important}
      #homeCoursesGrid.v990-home-course-grid .big-card-body{display:flex!important;flex:1 1 auto!important;flex-direction:column!important;min-width:0!important}
      #homeCoursesGrid.v990-home-course-grid .big-card-body>p{flex:1 1 auto!important}
      #homeCoursesGrid.v990-home-course-grid .big-card-body>.btn{margin-top:auto!important;align-self:flex-start!important}
      #homeCoursesGrid.v990-home-course-grid .public-course-meta{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;flex-wrap:wrap!important}
      #homeCoursesGrid.v990-home-course-grid h3,#homeCoursesGrid.v990-home-course-grid p{overflow-wrap:anywhere!important}
      @media(max-width:980px){#homeCoursesGrid.v990-home-course-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:680px){#homeCoursesGrid.v990-home-course-grid{grid-template-columns:1fr!important;gap:16px!important}#homeCoursesGrid.v990-home-course-grid .public-course-media{min-height:170px!important}}
    `;document.head.appendChild(style);
  }

  function card(course){
    const effective=course.discount_price!=null?Number(course.discount_price):Number(course.price||0);
    const isFree=String(course.course_type||'').toLowerCase()==='free'||effective===0;
    const price=money(effective,course.currency);
    const original=course.discount_price!=null&&Number(course.price||0)>effective?`<span class="public-course-old-price">${esc(money(course.price,course.currency))}</span>`:'';
    const thumb=course.thumbnail_url?`<img src="${esc(course.thumbnail_url)}" alt="${esc(course.title)}" loading="lazy" decoding="async">`:`<div class="public-course-placeholder"><i class="fa-solid fa-graduation-cap"></i></div>`;
    const slug=encodeURIComponent(course.slug||'');
    const cta=`/sign-up/${slug?`?course=${slug}`:''}`;
    return `<article class="big-card public-course-card"><div class="public-course-media">${thumb}</div><div class="big-card-body"><div class="public-course-meta"><span>${isFree?'FREE COURSE':'PAID COURSE'}</span><strong>${original}<b>${esc(price)}</b></strong></div><h3>${esc(course.title||'Course')}</h3><p>${esc(course.description||'Structured learning with 24K Excellence.')}</p><a href="${cta}" class="btn btn-dark">${isFree?'Create Account':'View Course'} <i class="fa-solid fa-arrow-right"></i></a></div></article>`;
  }

  function selectHome(rows){
    const exact=rows.filter(c=>homeRank(c)<50).sort((a,b)=>homeRank(a)-homeRank(b));
    const used=new Set(exact.map(c=>String(c.id)));
    const rest=rows.filter(c=>!used.has(String(c.id)));
    return exact.concat(rest).slice(0,3);
  }

  function render(rows){
    if(home){
      injectStyles();
      home.classList.add('v990-home-course-grid');
      const selected=selectHome(rows);
      home.innerHTML=selected.length?selected.map(card).join(''):empty('No published courses are available right now.');
    }
    if(catalogue)catalogue.innerHTML=rows.length?rows.map(card).join(''):empty('No published courses are available right now.');
  }

  // Show a recent cached catalogue immediately, then refresh from Supabase.
  try{
    const cached=JSON.parse(sessionStorage.getItem('24k-public-courses-v990')||'null');
    if(cached&&Array.isArray(cached.rows)&&Date.now()-Number(cached.at||0)<10*60*1000)render(cached.rows);
  }catch(_){/* cache is optional */}

  if(!A?.supabase){if(!home?.children.length&&!catalogue?.children.length)grids.forEach(g=>g.innerHTML=empty('Course information is temporarily unavailable.'));return;}
  try{
    const {data,error}=await A.supabase.from('courses').select('id,title,slug,description,thumbnail_url,course_type,price,discount_price,currency,is_published,created_at').eq('is_published',true).order('created_at',{ascending:false}).limit(24);
    if(error)throw error;
    const rows=data||[];
    try{sessionStorage.setItem('24k-public-courses-v990',JSON.stringify({at:Date.now(),rows}));}catch(_){/* optional */}
    render(rows);
  }catch(error){
    console.error('Public courses load failed:',error);
    const hasRendered=grids.some(g=>g.querySelector('.public-course-card'));
    if(!hasRendered)grids.forEach(g=>g.innerHTML=empty('Current courses could not be loaded. Please try again shortly.'));
  }
})();
