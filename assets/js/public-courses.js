(async function(){
  'use strict';
  const A=window.App;
  const grids=[document.getElementById('homeCoursesGrid'),document.getElementById('publicCoursesGrid')].filter(Boolean);
  if(!grids.length) return;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=(n,currency)=>{
    const value=Number(n||0); const c=String(currency||'PKR').toUpperCase();
    if(value===0) return 'Free';
    if(c==='USDT') return `${value.toLocaleString()} USDT`;
    if(c==='PKR') return `PKR ${value.toLocaleString()}`;
    return `${c} ${value.toLocaleString()}`;
  };
  const empty=(msg)=>`<div class="public-course-loading"><i class="fa-solid fa-circle-info"></i><p>${esc(msg)}</p></div>`;
  if(!A?.supabase){grids.forEach(g=>g.innerHTML=empty('Course information is temporarily unavailable. Please use Student Login or try again shortly.'));return;}
  try{
    const {data,error}=await A.supabase.from('courses').select('id,title,slug,description,thumbnail_url,course_type,price,discount_price,currency,is_published,created_at').eq('is_published',true).order('created_at',{ascending:false}).limit(12);
    if(error) throw error;
    const rows=data||[];
    if(!rows.length){grids.forEach(g=>g.innerHTML=empty('No published courses are available right now.'));return;}
    const cards=rows.map(course=>{
      const effective=course.discount_price!=null?Number(course.discount_price):Number(course.price||0);
      const isFree=String(course.course_type||'').toLowerCase()==='free'||effective===0;
      const price=money(effective,course.currency);
      const original=course.discount_price!=null&&Number(course.price||0)>effective?`<span class="public-course-old-price">${esc(money(course.price,course.currency))}</span>`:'';
      const thumb=course.thumbnail_url?`<img src="${esc(course.thumbnail_url)}" alt="${esc(course.title)}" loading="lazy" decoding="async">`:`<div class="public-course-placeholder"><i class="fa-solid fa-graduation-cap"></i></div>`;
      const slug=encodeURIComponent(course.slug||'');
      const cta=isFree?`/sign-up/${slug?`?course=${slug}`:''}`:`/sign-up/${slug?`?course=${slug}`:''}`;
      return `<article class="big-card public-course-card"><div class="public-course-media">${thumb}</div><div class="big-card-body"><div class="public-course-meta"><span>${isFree?'FREE COURSE':'PAID COURSE'}</span><strong>${original}<b>${esc(price)}</b></strong></div><h3>${esc(course.title||'Course')}</h3><p>${esc(course.description||'Structured learning with 24K Excellence.')}</p><a href="${cta}" class="btn btn-dark">${isFree?'Create Account':'View Course'} <i class="fa-solid fa-arrow-right"></i></a></div></article>`;
    }).join('');
    grids.forEach(g=>g.innerHTML=cards);
  }catch(error){
    console.error('Public courses load failed:',error);
    grids.forEach(g=>g.innerHTML=empty('Current courses could not be loaded. Please try again shortly.'));
  }
})();
