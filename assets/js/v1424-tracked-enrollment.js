(function(){
  'use strict';

  const cfg=window.APP_CONFIG||{};
  const form=document.getElementById('trackedEnrollmentForm');
  const button=document.getElementById('enrollSubmit');
  const success=document.getElementById('enrollSuccess');
  const notice=document.getElementById('linkNotice');
  const toastEl=document.getElementById('toast');
  const params=new URLSearchParams(location.search);
  let linkReady=false;
  let resolvedLink=null;
  let formOpenedRecorded=false;

  function toast(message,type='info'){
    if(!toastEl)return;
    toastEl.textContent=message;
    toastEl.className=`show ${type}`;
    clearTimeout(toastEl._timer);
    toastEl._timer=setTimeout(()=>{toastEl.className='';},4200);
  }

  function setLoading(on){
    if(!button)return;
    button.disabled=on||!linkReady;
    button.innerHTML=on
      ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Completing Registration...</span>'
      : '<span>Complete Registration</span><i class="fa-solid fa-arrow-right"></i>';
  }

  function trackingContext(){
    const t=window.Tracking?.context?.()||{};
    return {
      ref:String(params.get('ref')||t.ref||'').trim(),
      source:String(t.source||params.get('source')||'').trim(),
      campaign:String(t.campaign||params.get('campaign')||'').trim(),
      visitor_id:String(t.visitorId||'').trim(),
      course_slug:String(params.get('course')||params.get('course_slug')||t.courseIntent||'').trim()
    };
  }

  function managerGreeting(manager){
    const raw=String(manager?.display_name||'your manager').trim();
    if(/^(sir|miss|ms\.?|mrs\.?)\s+/i.test(raw))return raw;
    const salutation=String(manager?.salutation||'').trim();
    return salutation?`${salutation} ${raw}`:raw;
  }

  function buildWhatsAppLink(payload){
    const manager=payload?.manager||{};
    const greeting=managerGreeting(manager);
    const clientId=String(payload?.client_id||'').trim();
    const course=String(payload?.course_title||'the course').trim();
    const lines=[
      manager?.display_name?`Hello ${greeting},`:'Hello,',
      `I have completed enrollment in ${course}.`,
      clientId?`Client ID: ${clientId}`:'',
      'Kindly verify and share the next step.'
    ].filter(Boolean);
    const text=encodeURIComponent(lines.join('\n'));
    const number=String(manager?.whatsapp||payload?.fallback_whatsapp||'').replace(/\D/g,'');
    return {
      href:number?`https://wa.me/${number}?text=${text}`:`https://api.whatsapp.com/send?text=${text}`,
      direct:Boolean(number),
      greeting,
      clientId
    };
  }

  function scheduleWhatsAppRedirect(target){
    if(!target?.href)return;
    const note=document.getElementById('whatsappRedirectNote');
    let seconds=2;
    if(note)note.textContent=target.direct?`Opening your manager on WhatsApp in ${seconds}s…`:`Opening WhatsApp in ${seconds}s…`;
    const timer=setInterval(()=>{
      seconds-=1;
      if(note&&seconds>0)note.textContent=target.direct?`Opening your manager on WhatsApp in ${seconds}s…`:`Opening WhatsApp in ${seconds}s…`;
      if(seconds<=0){
        clearInterval(timer);
        location.href=target.href;
      }
    },1000);
  }

  async function recordFormOpened(link){
    if(formOpenedRecorded||!link?.ref_code)return;
    try{
      const id=await window.Tracking?.record?.('form_opened',{
        course_id:link.course_id||null,
        course_slug:link.course_slug||null,
        batch_id:link.batch_id||null,
        flow:'tracked_course_enrollment'
      },link.ref_code);
      if(id)formOpenedRecorded=true;
    }catch(_){}
  }

  async function hydrateLinkDetails(attempt=0){
    const context=trackingContext();
    if(!context.ref)return false;
    try{
      let link=null;
      if(window.Tracking?.resolve)link=await window.Tracking.resolve(context.ref);
      if(!link&&window.supabase?.createClient&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY){
        const fallback=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
        const res=await fallback.rpc('resolve_tracking_link',{p_ref_code:context.ref.toLowerCase()});
        if(!res.error)link=res.data;
      }
      if(!link?.course_id||!link?.course_title)throw new Error('Course details not found.');
      if(link.course_enrollment_open===false||['cancelled','completed'].includes(String(link.course_status||'').toLowerCase()))throw new Error('Enrollment for this course is currently closed.');
      if(link.batch_id&&link.batch_enrollment_open===false)throw new Error('Enrollment for the current batch is currently closed.');

      resolvedLink=link;
      const title=String(link.course_title).trim();
      const ct=document.getElementById('enrollCourseTitle');
      if(ct)ct.textContent=title;
      const pill=document.getElementById('enrollBatchPill');
      if(pill){
        const batchLabel=link.batch_name||(link.batch_number?`BATCH ${link.batch_number}`:'COURSE REGISTRATION');
        pill.innerHTML=`COURSE ENROLLMENT <span>•</span> ${String(batchLabel).toUpperCase()}`;
      }
      document.title=`${title} Enrollment | 24K MR ZERO`;
      linkReady=true;
      if(button)button.disabled=false;
      if(notice)notice.hidden=true;
      await recordFormOpened(link);
      return true;
    }catch(error){
      const closed=/currently closed/i.test(String(error?.message||''));
      if(!closed&&attempt<2){
        setTimeout(()=>hydrateLinkDetails(attempt+1),350*(attempt+1));
      }else{
        linkReady=false;
        if(button)button.disabled=true;
        if(notice){
          notice.hidden=false;
          notice.textContent=closed?String(error.message):'Could not load this enrollment link. Please reopen the official registration link.';
        }
      }
      return false;
    }
  }

  hydrateLinkDetails();
  window.addEventListener('DOMContentLoaded',()=>hydrateLinkDetails(),{once:true});

  if(!trackingContext().ref&&notice){
    notice.hidden=false;
    notice.textContent='This enrollment page must be opened from an active 24K MR ZERO registration link.';
    if(button)button.disabled=true;
  }

  form?.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY)return toast('Enrollment service is not configured.','error');

    const data=Object.fromEntries(new FormData(form));
    if(String(data.website||'').trim())return;

    const fullName=String(data.full_name||'').trim();
    const email=String(data.email||'').trim().toLowerCase();
    const whatsapp=String(data.whatsapp||'').trim();
    const context=trackingContext();

    if(!context.ref)return toast('Please open this page using your official registration link.','error');
    if(!linkReady)return toast('Course details are still loading. Please try again in a moment.','error');
    if(fullName.length<2)return toast('Please enter your full name.','error');
    if(!/^\S+@\S+\.\S+$/.test(email))return toast('Please enter a valid email address.','error');
    if(whatsapp.replace(/\D/g,'').length<7)return toast('Please enter your active WhatsApp number with country code.','error');

    setLoading(true);
    try{
      const response=await fetch(`${cfg.SUPABASE_URL}/functions/v1/free-course-enroll`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY},
        body:JSON.stringify({
          full_name:fullName,
          email,
          whatsapp,
          ref_code:context.ref,
          visitor_id:context.visitor_id||null,
          course_slug:context.course_slug||resolvedLink?.course_slug||null,
          accepted_terms:true,
          terms_version:cfg.TERMS_VERSION||'2026-08-03',
          risk_version:cfg.RISK_VERSION||'2026-08-03',
          flow_path:'/enroll/'
        })
      });

      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Could not complete enrollment.');

      form.hidden=true;
      if(success){
        success.hidden=false;
        const copy=document.getElementById('successCopy');
        const emailCopy=document.getElementById('successEmailCopy');
        if(copy)copy.textContent=payload.requires_payment
          ? `You are enrolled in ${payload.course_title||'the course'}. Course access will unlock after payment approval.`
          : `You are enrolled in ${payload.course_title||'the course'} and your access is active.`;
        if(emailCopy)emailCopy.textContent=payload.account_created
          ? (payload.credentials_sent
              ? 'Your login email and password have been sent to your email address.'
              : payload.credentials_queued
                ? 'Your login email and password are being sent now. Please check your inbox shortly.'
                : 'Your account was created. Please contact support if the password email does not arrive.')
          : 'Your existing 24K MR ZERO account was used. Sign in with your current password.';

        const manager=payload.manager||{};
        const whatsApp=buildWhatsAppLink(payload);
        success.insertAdjacentHTML('beforeend',`
          <div class="manager-connect">
            <div class="manager-connect-head">
              <span><i class="fa-brands fa-whatsapp"></i></span>
              <div>
                <b>Continue on WhatsApp</b>
                <small id="whatsappRedirectNote">${whatsApp.direct?'Connecting you to your assigned manager…':'Opening WhatsApp with your enrollment message…'}</small>
              </div>
            </div>
            <div class="manager-details">
              <div><small>Client ID</small><b>${whatsApp.clientId||'Generated'}</b></div>
              <div><small>Assigned Manager</small><b>${manager?.display_name?whatsApp.greeting:'24K Team'}</b></div>
            </div>
            <a class="manager-whatsapp" href="${whatsApp.href}">
              <i class="fa-brands fa-whatsapp"></i>
              <span>${whatsApp.direct?'Chat with Manager':'Open WhatsApp'}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </a>
          </div>`);
        scheduleWhatsAppRedirect(whatsApp);
      }

      await window.Tracking?.record?.('signup',{
        course_id:payload.course_id||null,
        enrollment_id:payload.enrollment_id||null,
        flow:'tracked_course_enrollment'
      },context.ref).catch(()=>{});

      toast(payload.account_created?'Registration complete. Password email is on the way.':'Enrollment complete. Use your existing account password.','success');
      // Keep the tracked enrollment URL until the WhatsApp handoff completes.
    }catch(error){
      console.error(error);
      toast(error?.message||'Could not complete enrollment. Please try again.','error');
    }finally{
      setLoading(false);
    }
  });
})();