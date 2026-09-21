
(function(){
'use strict';
const icons={dashboard:'fa-gauge-high',content:'fa-layer-group',courses:'fa-graduation-cap',students:'fa-users',payments:'fa-receipt',team:'fa-people-group',premium:'fa-crown',support:'fa-headset',operations:'fa-briefcase'};
const items=[
 ['dashboard','Dashboard','/admin/'],
 ['content','Content','/admin/content/'],
 ['courses','Courses','/admin/courses/'],
 ['students','Students','/admin/students/'],
 ['payments','Payments','/admin/payments/'],
 ['team','Team & Links','/admin/team-manager/'],
 ['premium','Premium','/admin/premium-access/'],
 ['support','Support','/admin/support/'],
 ['operations','Operations','/admin/operations/']
];
function activeKey(){
 const h=(location.hash||'').replace('#','');
 if(['signals','charts','articles','announcements'].includes(h))return'content';
 if(['courses','sessions'].includes(h))return'courses';
 if(['payments','methods'].includes(h))return'payments';
 if(h==='students')return'students';
 if(h==='support')return'support';
 return'dashboard';
}
function apply(){
 const nav=document.querySelector('.app-nav');if(!nav)return;
 const active=activeKey();
 nav.innerHTML=items.map(([k,l,u])=>`<a href="${u}" data-nav-key="${k}" class="${k===active?'on':''}"><i class="fa-solid ${icons[k]}"></i> ${l}${k==='payments'?'<span class="nav-count" id="pendingPaymentCount">0</span>':''}</a>`).join('');
 const title=document.querySelector('.app-title small');if(title)title.textContent='Simple control panel for daily Admin work';
}
apply();setTimeout(apply,350);setTimeout(apply,1100);
window.addEventListener('hashchange',apply);
})();
