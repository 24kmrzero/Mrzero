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

  document.addEventListener('panel:open', function (event) {
    if (event && event.detail && event.detail.key) setMobileActive(event.detail.key);
  });

  document.addEventListener('DOMContentLoaded', function () {
    setMobileActive('dashboard');
  });
})();
