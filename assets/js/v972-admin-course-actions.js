(function(){
  'use strict';
  if (window.__24K_V972_COURSE_FIX__) return;
  window.__24K_V972_COURSE_FIX__ = true;

  const A = window.App;
  const Base = window.AdminBase;
  if (!A || !Base || !A.supabase) return;

  const esc = value => A.escapeHtml ? A.escapeHtml(value ?? '') : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = () => Base.state || {courses:[],sessions:[]};
  const uid = () => (typeof A.uid === 'function' ? A.uid() : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())));

  function toast(message, tone='info') {
    if (typeof A.toast === 'function') A.toast(message, tone, 5200);
  }

  function slugify(value){
    return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100);
  }

  function pktLocal(iso){
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  function pktIso(local){
    const m = String(local||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) throw new Error('Please enter a valid Pakistan date and time for every class.');
    const [,y,mo,d,h,mi] = m;
    return new Date(Date.UTC(Number(y),Number(mo)-1,Number(d),Number(h)-5,Number(mi),0)).toISOString();
  }

  function sessionTemplate(session={}, index=0){
    const no = index + 1;
    const existingStatus = String(session.status || 'upcoming');
    return `<article class="course-session-row" data-course-session-row data-existing-status="${esc(existingStatus)}">
      <input type="hidden" data-session-field="id" value="${esc(session.id || '')}">
      <div class="course-session-row-head"><b>Class ${no}</b><button type="button" class="app-btn small danger session-remove-btn" data-remove-course-session title="Remove this class"><i class="fa-solid fa-trash"></i> Remove</button></div>
      <div class="form-grid compact-session-grid">
        <div class="form-field"><label>Class Title / Number</label><input data-session-field="title" value="${esc(session.title || `Class ${no}`)}" placeholder="Class ${no}" required></div>
        <div class="form-field"><label>Date & Time (Pakistan Time)</label><input type="datetime-local" data-session-field="starts_at" value="${esc(pktLocal(session.starts_at))}" required></div>
        <div class="form-field full"><label>Heading & What Students Will Learn</label><textarea data-session-field="topic" required placeholder="What students will learn in this class">${esc(session.topic || '')}</textarea></div>
        <div class="form-field"><label>Duration Minutes</label><input type="number" min="15" data-session-field="duration_minutes" value="${esc(session.duration_minutes || 90)}" required></div>
        <input type="hidden" data-session-field="meet_url" value="https://www.24kmrzero.com/">
        <div class="form-field"><label>Zoom Access</label><div class="notice info compact-notice">Zoom link is shared manually in the WhatsApp Community.</div></div>
      </div>
    </article>`;
  }

  function renderSessionRows(rows){
    const editor = document.getElementById('courseSessionEditor');
    if (!editor) return;
    const list = rows && rows.length ? rows : [{}];
    editor.innerHTML = list.map(sessionTemplate).join('');
    renumberSessions();
  }

  function renumberSessions(){
    document.querySelectorAll('#courseSessionEditor [data-course-session-row]').forEach((row,index)=>{
      const no = index + 1;
      const head = row.querySelector('.course-session-row-head b');
      if (head) head.textContent = `Class ${no}`;
      const title = row.querySelector('[data-session-field="title"]');
      if (title && (!title.value.trim() || /^Class\s+\d+$/i.test(title.value.trim()))) title.value = `Class ${no}`;
    });
  }

  function setPreview(url){
    const wrap=document.getElementById('courseThumbnailPreview');
    const img=document.getElementById('courseThumbnailPreviewImage');
    const label=document.getElementById('courseThumbnailPreviewLabel');
    if (!wrap || !img) return;
    if (url){img.src=url;wrap.style.display='flex';if(label)label.textContent='Current thumbnail';}
    else {img.removeAttribute('src');wrap.style.display='none';}
  }

  function openModal(){
    const box = document.getElementById('courseFormBox');
    if (!box) return;
    box.classList.add('open');
    box.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
  }

  function closeModal(){
    const box = document.getElementById('courseFormBox');
    if (!box) return;
    box.classList.remove('open');
    box.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }

  function resetCourseForm(){
    const f=document.getElementById('courseForm');
    if (!f) return;
    f.reset();
    if (f.elements.id) f.elements.id.value='';
    if (f.elements.existing_thumbnail_url) f.elements.existing_thumbnail_url.value='';
    if (f.elements.instructor_name) f.elements.instructor_name.value='Malik Zameer';
    if (f.elements.course_type) f.elements.course_type.value='paid';
    if (f.elements.price) f.elements.price.value='0';
    if (f.elements.currency) f.elements.currency.value='PKR';
    if (f.elements.enrollment_open) f.elements.enrollment_open.checked=true;
    if (f.elements.is_published) f.elements.is_published.checked=true;
    if (f.elements.thumbnail) f.elements.thumbnail.value='';
    setPreview('');
    renderSessionRows([{}]);
    const title=document.getElementById('courseFormTitle');
    if(title) title.textContent='Add Course';
  }

  function openCourse(id, focusSessions=false){
    const course=state().courses?.find(c=>String(c.id)===String(id));
    const f=document.getElementById('courseForm');
    if (!course || !f) return toast('Course could not be found. Please refresh the page.','error');
    f.reset();
    const values={
      id:course.id, title:course.title||'', instructor_name:course.instructor_name||'Malik Zameer',
      short_description:course.short_description||course.description||'', course_type:course.course_type || (Number(course.price||0)===0?'free':'paid'),
      price:course.price??0, discount_price:course.discount_price??'', currency:course.currency||'PKR',
      slug:course.slug||slugify(course.title), description:course.description||'', access_days:course.access_days??'',
      existing_thumbnail_url:course.thumbnail_url||''
    };
    Object.entries(values).forEach(([key,val])=>{ if(f.elements[key]) f.elements[key].value=val??''; });
    if(f.elements.enrollment_open) f.elements.enrollment_open.checked=course.enrollment_open!==false;
    if(f.elements.is_published) f.elements.is_published.checked=course.is_published!==false;
    if(f.elements.thumbnail) f.elements.thumbnail.value='';
    setPreview(course.thumbnail_url||'');
    const rows=(state().sessions||[]).filter(s=>String(s.course_id)===String(id)).sort((a,b)=>Number(a.session_number||0)-Number(b.session_number||0));
    renderSessionRows(rows.length?rows:[{}]);
    const title=document.getElementById('courseFormTitle');
    if(title) title.textContent=focusSessions?`Manage Sessions — ${course.title}`:'Edit Course';
    openModal();
    if(focusSessions){setTimeout(()=>document.getElementById('courseSessionEditor')?.scrollIntoView({behavior:'smooth',block:'center'}),80);}
  }

  function collectSessions(){
    return [...document.querySelectorAll('#courseSessionEditor [data-course-session-row]')].map((row,index)=>{
      const get = name => row.querySelector(`[data-session-field="${name}"]`)?.value ?? '';
      const title=String(get('title')).trim();
      const topic=String(get('topic')).trim();
      const starts=String(get('starts_at')).trim();
      const duration=Number(get('duration_minutes')||90);
      if(!title) throw new Error(`Class ${index+1}: title is required.`);
      if(!topic) throw new Error(`Class ${index+1}: heading / learning details are required.`);
      if(!starts) throw new Error(`Class ${index+1}: date and time are required.`);
      if(!Number.isFinite(duration)||duration<15) throw new Error(`Class ${index+1}: duration must be at least 15 minutes.`);
      return {id:String(get('id')).trim()||null,session_number:index+1,title,topic,starts_at:pktIso(starts),duration_minutes:duration,status:row.dataset.existingStatus||'upcoming',meet_url:'https://www.24kmrzero.com/'};
    });
  }

  function payloadFromForm(f){
    const title=String(f.elements.title?.value||'').trim();
    const caption=String(f.elements.short_description?.value||'').trim();
    if(!title) throw new Error('Course heading is required.');
    if(!caption) throw new Error('Short caption is required.');
    const type=String(f.elements.course_type?.value||'paid').toLowerCase();
    const regular=type==='free'?0:Number(f.elements.price?.value||0);
    if(type==='paid'&&(!Number.isFinite(regular)||regular<=0)) throw new Error('Paid course price must be greater than zero.');
    let discount=f.elements.discount_price?.value===''||type==='free'?null:Number(f.elements.discount_price.value);
    if(discount!==null&&(!Number.isFinite(discount)||discount<0||discount>regular)) throw new Error('Discount price must be between zero and the regular price.');
    const existingId=String(f.elements.id?.value||'').trim();
    return {
      id:existingId||null,title,slug:slugify(f.elements.slug?.value||title),short_description:caption,description:caption,
      instructor_name:'Malik Zameer',course_type:type,price:regular,discount_price:discount,
      currency:['PKR','USDT'].includes(String(f.elements.currency?.value||'PKR').toUpperCase())?String(f.elements.currency.value).toUpperCase():'PKR',
      status:'active',enrollment_open:Boolean(f.elements.enrollment_open?.checked),thumbnail_url:String(f.elements.existing_thumbnail_url?.value||'').trim()||null,
      is_published:Boolean(f.elements.is_published?.checked),publish_at:null,unpublish_at:null,featured:false
    };
  }

  async function directSave(coursePayload,sessions){
    const sb=A.supabase;
    const courseId=coursePayload.id||uid();
    const starts=sessions.map(s=>new Date(s.starts_at)).filter(d=>!Number.isNaN(d.getTime())).sort((a,b)=>a-b);
    const dbCourse={...coursePayload,id:courseId,description:coursePayload.short_description,start_date:starts[0]?starts[0].toISOString().slice(0,10):null,end_date:starts.length?starts[starts.length-1].toISOString().slice(0,10):null};
    delete dbCourse.publish_at;delete dbCourse.unpublish_at;delete dbCourse.featured;
    let courseResult;
    if(coursePayload.id) courseResult=await sb.from('courses').update(dbCourse).eq('id',courseId);
    else courseResult=await sb.from('courses').insert(dbCourse);
    if(courseResult.error) throw courseResult.error;
    const existing=(state().sessions||[]).filter(s=>String(s.course_id)===String(courseId));
    const keep=[];
    for(const s of sessions){
      const row={course_id:courseId,session_number:s.session_number,title:s.title,topic:s.topic,starts_at:s.starts_at,duration_minutes:s.duration_minutes,status:s.id?s.status:'upcoming'};
      if(s.id){const r=await sb.from('course_sessions').update(row).eq('id',s.id);if(r.error)throw r.error;keep.push(s.id);}
      else {const r=await sb.from('course_sessions').insert(row).select('id').single();if(r.error)throw r.error;keep.push(r.data.id);}
    }
    const removed=existing.filter(s=>!keep.includes(s.id));
    for(const s of removed){const r=await sb.from('course_sessions').delete().eq('id',s.id);if(r.error)throw r.error;}
    try{await sb.rpc('refresh_course_statuses_from_schedule');}catch{}
    return {course_id:courseId,sessions_saved:sessions.length};
  }

  function publicStoragePath(url){
    if(!url)return'';
    try{const u=new URL(url);const marker='/storage/v1/object/public/content-assets/';const idx=u.pathname.indexOf(marker);return idx>=0?decodeURIComponent(u.pathname.slice(idx+marker.length)):'';}catch{return'';}
  }

  async function uploadThumbnail(courseId,file,oldUrl){
    if(!file)return oldUrl||null;
    if(!/^image\/(png|jpeg|webp)$/i.test(file.type||''))throw new Error('Course thumbnail must be PNG, JPG or WEBP.');
    if(file.size>8*1024*1024)throw new Error('Course thumbnail must be 8 MB or smaller.');
    const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
    const path=`courses/${courseId}/${Date.now()}-${uid().replace(/-/g,'').slice(0,10)}.${ext}`;
    const up=await A.supabase.storage.from('content-assets').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
    if(up.error)throw up.error;
    const pub=A.supabase.storage.from('content-assets').getPublicUrl(path).data.publicUrl;
    const saved=await A.supabase.from('courses').update({thumbnail_url:pub}).eq('id',courseId);
    if(saved.error){await A.supabase.storage.from('content-assets').remove([path]);throw saved.error;}
    const oldPath=publicStoragePath(oldUrl);
    if(oldPath&&oldPath!==path) A.supabase.storage.from('content-assets').remove([oldPath]).catch(()=>{});
    return pub;
  }

  async function saveCourse(event){
    event.preventDefault();
    event.stopImmediatePropagation();
    const f=document.getElementById('courseForm');
    if(!f)return;
    const button=f.querySelector('button[type="submit"]');
    const oldText=button?.innerHTML;
    if(button){button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Saving...';}
    try{
      const payload=payloadFromForm(f);
      const sessions=collectSessions();
      if(!sessions.length)throw new Error('Add at least one class session.');
      let result=null;
      const rpc=await A.supabase.rpc('admin_save_course_with_sessions_v2',{p_course:payload,p_sessions:sessions.map(s=>({...s,status:s.id?s.status:'upcoming'}))});
      if(rpc.error){
        console.warn('[V9.71] Course RPC save failed; using direct admin fallback.',rpc.error);
        result=await directSave(payload,sessions);
      } else result=rpc.data;
      const courseId=String(result?.course_id||payload.id||'');
      if(!courseId)throw new Error('Course save returned no course ID.');
      const file=f.elements.thumbnail?.files?.[0]||null;
      if(file)await uploadThumbnail(courseId,file,payload.thumbnail_url);
      await Base.reload();
      decorateCourseRows();
      closeModal();
      resetCourseForm();
      toast(`Course and ${sessions.length} session${sessions.length===1?'':'s'} saved successfully.`,'success');
    }catch(error){
      console.error('[V9.71] Course save error',error);
      toast(typeof A.friendlyError==='function'?A.friendlyError(error,'Could not save course.'):String(error?.message||error),'error');
    }finally{if(button){button.disabled=false;button.innerHTML=oldText||'Save Course & All Sessions';}}
  }

  function confirmDelete(message){
    // Do not depend on App.confirmAction here. Older builds return a boolean while
    // some builds return an object, which made the Delete button silently stop.
    // Native confirmation is intentionally used for this destructive action so the
    // click -> confirmation -> delete path is deterministic on every deployed build.
    return window.confirm(message);
  }

  async function removePaymentReceipts(paths){
    const clean=[...new Set((paths||[]).map(v=>String(v||'').trim()).filter(Boolean))];
    if(!clean.length)return;
    try{await A.supabase.storage.from('payment-receipts').remove(clean);}catch(error){console.warn('[V9.72] Could not remove one or more old payment receipt objects.',error);}
  }

  async function forceDeleteCourseWithLinkedRecords(id){
    const sb=A.supabase;

    // payments.course_id uses ON DELETE RESTRICT in the production schema.
    // Fetch receipt paths first, then remove enrollment/payment rows explicitly
    // only after the admin accepts the second permanent-delete warning.
    const payments=await sb.from('payments').select('id,receipt_path').eq('course_id',id);
    if(payments.error)throw payments.error;

    const enrollments=await sb.from('enrollments').delete().eq('course_id',id);
    if(enrollments.error)throw enrollments.error;

    if(payments.data?.length){
      const paymentDelete=await sb.from('payments').delete().eq('course_id',id);
      if(paymentDelete.error)throw paymentDelete.error;
    }

    // All normal course children (sessions, links, resources, modules, lessons,
    // progress, course notifications) are defined with cascading course FKs.
    const courseDelete=await sb.from('courses').delete().eq('id',id).select('id');
    if(courseDelete.error)throw courseDelete.error;
    if(!courseDelete.data?.length)throw new Error('Course was not deleted. Please confirm the logged-in account still has Admin access.');

    await removePaymentReceipts((payments.data||[]).map(p=>p.receipt_path));
    return {payments:(payments.data||[]).length};
  }

  async function deleteCourse(id,button){
    const course=state().courses?.find(c=>String(c.id)===String(id));
    if(!course)return toast('Course could not be found. Please refresh the page.','error');

    const confirmed=confirmDelete(`Delete “${course.title}”?\n\nThis will permanently remove the course and its classes. This action cannot be undone.`);
    if(!confirmed)return;

    const old=button?.innerHTML;
    if(button){button.disabled=true;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';}
    try{
      // First use the normal cascade. This preserves payment history and is enough
      // for courses that have never had a payment.
      let res=await A.supabase.from('courses').delete().eq('id',id).select('id');

      if(res.error){
        const code=String(res.error.code||'');
        const detail=`${res.error.message||''} ${res.error.details||''} ${res.error.hint||''}`.toLowerCase();
        const foreignKeyBlocked=code==='23503'||detail.includes('foreign key')||detail.includes('still referenced')||detail.includes('payments');
        if(!foreignKeyBlocked)throw res.error;

        const hardConfirmed=confirmDelete(`“${course.title}” has linked enrollment/payment history, so the database protected it from a normal delete.\n\nIf you continue, the course AND its linked enrollment/payment records will be permanently deleted.\n\nContinue permanent delete?`);
        if(!hardConfirmed){toast('Course was not deleted.','info');return;}
        await forceDeleteCourseWithLinkedRecords(id);
      }else if(!res.data?.length){
        throw new Error('Course was not deleted. Please confirm the logged-in account still has Admin access.');
      }

      const oldPath=publicStoragePath(course.thumbnail_url);
      if(oldPath)A.supabase.storage.from('content-assets').remove([oldPath]).catch(()=>{});
      await Base.reload();
      decorateCourseRows();
      toast('Course deleted successfully.','success');
    }catch(error){
      console.error('[V9.72] Course delete error',error);
      const friendly=typeof A.friendlyError==='function'?A.friendlyError(error,'Could not delete course.'):String(error?.message||error);
      toast(friendly,'error');
      // Make sure delete failures are never silent, even if the toast layer is broken.
      setTimeout(()=>{if(!document.querySelector('.toast,.app-toast,[role="status"]'))window.alert(`Could not delete course.\n\n${friendly}`);},80);
    }finally{if(button){button.disabled=false;button.innerHTML=old||'Delete';}}
  }

  function decorateCourseRows(){
    const body=document.getElementById('coursesBody');
    if(!body)return;
    [...body.querySelectorAll('tr')].forEach(row=>{
      const edit=row.querySelector('[data-edit="course"][data-id]');
      if(!edit)return;
      const id=edit.dataset.id;
      const sessions=row.querySelector('[data-goto="sessions"], [data-course-sessions]');
      if(sessions){sessions.removeAttribute('data-goto');sessions.dataset.courseSessions=id;sessions.setAttribute('aria-label','Manage sessions for this course');}
      const del=row.querySelector('[data-delete="course"]');
      if(del)del.dataset.id=id;
    });
  }

  function handleClick(event){
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;
    const add=target.closest('[data-toggle-form="courseFormBox"]');
    if(add){event.preventDefault();event.stopImmediatePropagation();resetCourseForm();openModal();return;}
    const edit=target.closest('[data-edit="course"]');
    if(edit){event.preventDefault();event.stopImmediatePropagation();openCourse(edit.dataset.id,false);return;}
    const sessions=target.closest('[data-course-sessions], #coursesBody [data-goto="sessions"]');
    if(sessions){event.preventDefault();event.stopImmediatePropagation();const id=sessions.dataset.courseSessions||sessions.closest('tr')?.querySelector('[data-edit="course"]')?.dataset.id;if(id)openCourse(id,true);return;}
    const del=target.closest('[data-delete="course"]');
    if(del){event.preventDefault();event.stopImmediatePropagation();deleteCourse(del.dataset.id,del);return;}
    const addSession=target.closest('#addCourseSessionBtn');
    if(addSession){event.preventDefault();event.stopImmediatePropagation();const editor=document.getElementById('courseSessionEditor');if(editor){const count=editor.querySelectorAll('[data-course-session-row]').length;editor.insertAdjacentHTML('beforeend',sessionTemplate({},count));renumberSessions();}return;}
    const remove=target.closest('[data-remove-course-session]');
    if(remove&&remove.closest('#courseFormBox')){event.preventDefault();event.stopImmediatePropagation();const rows=document.querySelectorAll('#courseSessionEditor [data-course-session-row]');if(rows.length<=1)return toast('A course needs at least one class session.','warning');remove.closest('[data-course-session-row]')?.remove();renumberSessions();return;}
    const cancel=target.closest('[data-cancel-form="courseFormBox"], #courseFormBox .modal-close');
    if(cancel){event.preventDefault();event.stopImmediatePropagation();closeModal();return;}
  }

  window.addEventListener('click',handleClick,true);
  const form=document.getElementById('courseForm');
  if(form)form.addEventListener('submit',saveCourse,true);
  document.getElementById('courseFormBox')?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeModal();});

  const body=document.getElementById('coursesBody');
  if(body){new MutationObserver(decorateCourseRows).observe(body,{childList:true,subtree:true});decorateCourseRows();}
  window.addEventListener('24k:admin-base-updated',()=>setTimeout(decorateCourseRows,0));
})();
