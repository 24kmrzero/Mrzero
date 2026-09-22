(function () {
  'use strict';

  function setMobileActive(key) {
    document.querySelectorAll('.student-mobile-nav [data-goto]').forEach(function (button) {
      var active = button.getAttribute('data-goto') === key;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function initials(value) {
    return String(value || 'Member').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0); }).join('').toUpperCase() || 'M';
  }

  function syncClock() {
    var now=new Date();
    var dateText=now.toLocaleDateString(undefined,{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
    var timeText=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:true});
    ['topbarDate','dashboardToday'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=dateText;});
    ['topbarClock','dashboardClock'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=timeText;});
  }

  function syncDashboardIdentity(state) {
    if(!state||!state.profile)return;
    var badge=document.getElementById('dashboardAccountBadge');
    if(badge){
      var id=state.profile.client_id||'24K Member';
      var status=String(state.profile.status||'active').replaceAll('_',' ');
      badge.innerHTML='<i class="fa-solid fa-shield-halved"></i><span><b>'+String(id).replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];})+'</b><small>'+status+'</small></span>';
    }
    var emailBanner=document.getElementById('emailVerificationBanner');
    if(emailBanner){
      var verified=Boolean(state.user&&state.user.email_confirmed_at);
      emailBanner.innerHTML=verified?'':'<div class="notice warn"><i class="fa-regular fa-envelope"></i> Please verify your email address to keep your account secure.</div>';
    }
    var topNotice=document.getElementById('topNoticeCount');
    if(topNotice)topNotice.textContent=String((state.announcements||[]).length);
  }

  function syncMemberIdentity(state) {
    if (!state || !state.profile) return;
    var name = state.profile.full_name || 'Member';
    var nameEl = document.getElementById('sideMemberName');
    var avatarEl = document.getElementById('sideMemberAvatar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = initials(name);
    var welcome=document.getElementById('dashboardWelcomeName');if(welcome)welcome.textContent=name+' 👋';
    syncDashboardIdentity(state);
  }

  document.addEventListener('panel:open', function (event) {
    if (event && event.detail && event.detail.key) setMobileActive(event.detail.key);
  });

  window.addEventListener('24k:student-base-updated', function (event) {
    syncMemberIdentity(event.detail);
  });

  document.addEventListener('DOMContentLoaded', function () {
    syncClock();window.setInterval(syncClock,30000);
    setMobileActive('dashboard');
    if (window.StudentBase && window.StudentBase.state) syncMemberIdentity(window.StudentBase.state);
  });
})();
