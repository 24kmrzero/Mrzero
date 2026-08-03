/* ===================================================================
   24K EXCELLENCE — main script
   =================================================================== */

/* ---------- Supabase config (fill these in later) ---------- */
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

/* ---------- Mobile nav ---------- */
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
  navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navMenu.classList.remove('open')));
}

/* ---------- Scroll reveal ---------- */
const revealItems = document.querySelectorAll('.reveal');
if (revealItems.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  revealItems.forEach(el => io.observe(el));
}

/* ---------- Animated counters (hero stats) ---------- */
document.querySelectorAll('.stats-box b').forEach(el => {
  const raw = el.textContent.trim();
  const num = parseFloat(raw.replace(/[^\d.]/g, ''));
  if (isNaN(num)) return;
  const prefix = raw.slice(0, raw.indexOf(raw.match(/[\d.]/)));
  const suffix = raw.slice(raw.search(/[\d.]/) + String(num).length);
  const decimals = (String(num).split('.')[1] || '').length;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      let start = null;
      const dur = 1400;
      const step = t => {
        if (!start) start = t;
        const p = Math.min((t - start) / dur, 1);
        const val = (num * (1 - Math.pow(1 - p, 3)));
        el.textContent = prefix + val.toLocaleString('en-US', {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals
        }) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  obs.observe(el);
});


/* ---------- Sticky nav shadow, scroll progress, back-to-top ---------- */
const navEl = document.querySelector('.nav');
const progressEl = document.getElementById('progress');
const toTopEl = document.getElementById('totop');
function onScroll(){
  const y = window.scrollY || document.documentElement.scrollTop;
  if (navEl) navEl.classList.toggle('stuck', y > 12);
  if (progressEl){
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progressEl.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  }
  if (toTopEl) toTopEl.classList.toggle('show', y > 620);
}
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();
if (toTopEl) toTopEl.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

/* ---------- Subtle parallax on hero mentor photo ---------- */
const shot = document.querySelector('.mentor-shot');
if (shot && window.matchMedia('(pointer:fine)').matches){
  const hero = document.querySelector('.hero');
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    shot.style.transform = `perspective(1100px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    shot.style.animation = 'none';
  });
  hero.addEventListener('mouseleave', () => {
    shot.style.transform = '';
    shot.style.animation = '';
  });
}

/* ---------- Toast ---------- */
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ---------- Enquiry form ---------- */
const enquiryForm = document.getElementById('enquiryForm');
if (enquiryForm) {
  enquiryForm.addEventListener('submit', e => {
    e.preventDefault();
    // TODO: send to Supabase table `enquiries`
    enquiryForm.reset();
    alert('Thank you! Your enquiry has been received. Our team will contact you shortly.');
  });
}

/* ---------- Dashboard: sidebar panels ---------- */
const sideLinks = document.querySelectorAll('.side-nav a[data-panel]');
if (sideLinks.length) {
  const openPanel = key => {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    sideLinks.forEach(l => l.classList.remove('on'));
    const panel = document.getElementById('p-' + key);
    const link = document.querySelector('.side-nav a[data-panel="' + key + '"]');
    if (panel) panel.classList.add('on');
    if (link) link.classList.add('on');
    document.querySelector('.dash-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('side')?.classList.remove('open');
  };

  sideLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      openPanel(link.dataset.panel);
    });
  });

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openPanel(btn.dataset.goto);
    });
  });
}

/* ---------- Dashboard: mobile sidebar ---------- */
const burger = document.getElementById('burger');
if (burger) burger.addEventListener('click', () => document.getElementById('side')?.classList.toggle('open'));

/* ---------- Charts panel ---------- */
document.querySelectorAll('.chip-btn[data-sym]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip-btn[data-sym]').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const frame = document.getElementById('tvChart');
    if (frame) {
      frame.src = 'https://s.tradingview.com/widgetembed/?symbol=' +
        encodeURIComponent(btn.dataset.sym) +
        '&interval=60&theme=dark&style=1&hidesidetoolbar=0&withdateranges=1&timezone=Asia%2FKarachi';
    }
  });
});

/* ---------- Dashboard forms ---------- */
['profileForm', 'settingsForm'].forEach(id => {
  const f = document.getElementById(id);
  if (f) f.addEventListener('submit', e => { e.preventDefault(); toast('Saved successfully.'); });
});

/* ---------- Smooth anchor scroll ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ===================================================================
   SUPABASE HOOKS — uncomment once you add your credentials
   =================================================================== */
/*
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function login(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}
export async function getCourses() {
  return supabase.from('courses').select('*').eq('status', 'published');
}
export async function getMyEnrollments(studentId) {
  return supabase.from('enrollments').select('*, courses(*)').eq('student_id', studentId);
}
export async function saveEnquiry(payload) {
  return supabase.from('enquiries').insert([payload]);
}
export async function getTestimonials() {
  return supabase.from('testimonials').select('*').eq('is_published', true);
}
*/
