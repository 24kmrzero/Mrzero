(function(){'use strict';
function unify(){
 const nav=document.querySelector('.app-nav');if(!nav)return;
 const team=nav.querySelector('[data-admin-team-manager]')||nav.querySelector('a[href*="/admin/team-manager"]');
 if(team){team.href='/admin/team-manager/';team.setAttribute('data-nav-key','team-manager');team.innerHTML='<i class="fa-solid fa-people-group"></i> Team & Links';}
 nav.querySelectorAll('a[href*="/admin/link-manager"],a[data-panel="links"]').forEach(a=>{if(a!==team)a.remove()});
}
document.addEventListener('DOMContentLoaded',unify);setTimeout(unify,400);
})();