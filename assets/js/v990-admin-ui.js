(function(){
  'use strict';
  if (window.__24K_V990_ADMIN_UI__) return;
  window.__24K_V990_ADMIN_UI__ = true;

  const VERSION = '9.90';
  const GOLD = '#f6bf26';
  const qs = (s,r=document) => { try { return r.querySelector(s); } catch (_) { return null; } };
  const qsa = (s,r=document) => { try { return Array.from(r.querySelectorAll(s)); } catch (_) { return []; } };
  const text = el => String(el && el.textContent || '').replace(/\s+/g,' ').trim();
  const lower = el => text(el).toLowerCase();
  const hasText = (el,needle) => lower(el).includes(String(needle).toLowerCase());
  const visible = el => !!(el && el.isConnected && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');

  function injectStyles(){
    if (document.getElementById('v990-admin-style')) return;
    const style = document.createElement('style');
    style.id = 'v990-admin-style';
    style.textContent = `
      :root{--v980-admin-sidebar:216px}
      body.v980-modal-open{overflow:hidden!important}
      .v980-admin-sidebar{box-sizing:border-box!important}
      .v980-admin-sidebar .v980-nav-label{font-size:9px!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:#777!important;font-weight:800!important;margin:17px 12px 7px!important;line-height:1.15!important}
      .v980-admin-sidebar nav>a,.v980-admin-sidebar nav>button,.v980-admin-sidebar nav>div>a,.v980-admin-sidebar nav>li>a{min-height:40px!important;padding:8px 12px!important;margin:2px 8px!important;border-radius:9px!important;font-size:12px!important;line-height:1.2!important;box-sizing:border-box!important}
      .v980-admin-sidebar nav a i,.v980-admin-sidebar nav button i{font-size:13px!important;min-width:22px!important;width:22px!important;height:22px!important;display:inline-grid!important;place-items:center!important}
      .v980-admin-sidebar .badge,.v980-admin-sidebar [class*="badge"],.v980-admin-sidebar [class*="count"]{font-size:9px!important;min-width:20px!important;height:20px!important;line-height:20px!important}
      .v980-admin-sidebar img{max-width:148px!important;max-height:70px!important;object-fit:contain!important}
      .v980-admin-sidebar>div:first-child,.v980-admin-sidebar [class*="logo"],.v980-admin-sidebar [class*="brand"]{min-height:88px!important;padding-top:10px!important;padding-bottom:10px!important;box-sizing:border-box!important}
      .v980-logo-click{cursor:pointer!important}
      .v980-empty-editor-shell{display:none!important}
      .v980-link-summary-only{grid-template-columns:minmax(0,1fr)!important}
      .v980-modal-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;background:rgba(0,0,0,.74)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important;display:flex!important;align-items:flex-start!important;justify-content:center!important;padding:54px 18px 28px!important;overflow:auto!important}
      .v980-modal-overlay[hidden]{display:none!important}
      .v980-modal-dialog{width:min(980px,calc(100vw - 32px))!important;max-height:calc(100vh - 82px)!important;background:#11110f!important;color:#f4f4f4!important;border:1px solid rgba(246,191,38,.34)!important;border-radius:16px!important;box-shadow:0 26px 90px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.025) inset!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
      html[data-theme="light"] .v980-modal-dialog{background:#fffaf0!important;color:#151515!important;border-color:#ddbd63!important}
      .v980-modal-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;padding:15px 18px!important;border-bottom:1px solid rgba(246,191,38,.18)!important;background:linear-gradient(180deg,rgba(246,191,38,.065),transparent)!important;flex:0 0 auto!important}
      .v980-modal-head h3{font-size:18px!important;line-height:1.15!important;margin:0!important;font-weight:850!important;letter-spacing:-.02em!important}
      .v980-modal-close{width:34px!important;height:34px!important;border-radius:9px!important;border:1px solid rgba(246,191,38,.26)!important;background:#171713!important;color:#f6bf26!important;font-size:19px!important;cursor:pointer!important;display:grid!important;place-items:center!important;padding:0!important}
      html[data-theme="light"] .v980-modal-close{background:#fff4d5!important;color:#6e5000!important}
      .v980-modal-body{padding:16px 18px 18px!important;overflow:auto!important;min-height:0!important}
      .v980-modal-body>form,.v980-modal-body>[data-v980-editor-source]{display:block!important;width:100%!important;max-width:none!important;margin:0!important;position:static!important;transform:none!important;opacity:1!important;visibility:visible!important;background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important}
      .v980-modal-body input,.v980-modal-body select,.v980-modal-body textarea{max-width:100%!important}
      .v980-primary-action{display:inline-flex!important;align-items:center!important;gap:7px!important;min-height:38px!important;padding:9px 14px!important;border:1px solid #f6bf26!important;border-radius:9px!important;background:linear-gradient(180deg,#ffd85a,#f6bf26)!important;color:#080808!important;font-size:12px!important;font-weight:800!important;line-height:1.1!important;font-family:inherit!important;cursor:pointer!important;box-shadow:0 9px 24px rgba(246,191,38,.18)!important}
      .v980-premium-settings-card,.v980-premium-summary-card{padding:15px 16px!important;min-height:0!important}
      .v980-premium-settings-card h2,.v980-premium-settings-card h3,.v980-premium-summary-card h2,.v980-premium-summary-card h3{margin-top:0!important;margin-bottom:5px!important}
      .v980-premium-settings-card p,.v980-premium-summary-card p{margin-top:2px!important;margin-bottom:9px!important;line-height:1.35!important}
      .v980-premium-settings-card label{margin-bottom:4px!important;font-size:11px!important}
      .v980-premium-settings-card input,.v980-premium-settings-card select{min-height:36px!important;height:36px!important;padding-top:7px!important;padding-bottom:7px!important}
      .v980-premium-settings-card textarea{min-height:64px!important}
      .v980-premium-settings-card [class*="grid"]{gap:10px 12px!important}
      .v980-premium-settings-card [class*="field"]{margin-bottom:4px!important}
      .v980-premium-settings-card button{min-height:36px!important;padding-top:8px!important;padding-bottom:8px!important}
      .v980-premium-summary-card [class*="item"],.v980-premium-summary-card>div>div{padding-top:9px!important;padding-bottom:9px!important;min-height:0!important}
      .v980-premium-top{gap:14px!important;align-items:start!important}
      .v980-premium-panel [class*="payments"]{margin-top:14px!important}
      @media (min-width:901px){
        .v980-admin-sidebar{width:var(--v980-admin-sidebar)!important;min-width:var(--v980-admin-sidebar)!important;max-width:var(--v980-admin-sidebar)!important}
        .v980-admin-shell{grid-template-columns:var(--v980-admin-sidebar) minmax(0,1fr)!important}
        .v980-admin-sidebar nav{padding-left:4px!important;padding-right:4px!important}
      }
      @media (max-width:900px){
        .v980-modal-overlay{padding:18px 10px!important;align-items:flex-start!important}
        .v980-modal-dialog{width:100%!important;max-height:calc(100vh - 36px)!important;border-radius:13px!important}
        .v980-modal-head{padding:13px 14px!important}
        .v980-modal-body{padding:13px 14px 16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function scoreSidebar(el){
    const t = lower(el);
    let s = 0;
    ['dashboard','signals','charts','articles','announcements','courses','premium access','activity logs'].forEach(k => { if(t.includes(k)) s++; });
    return s;
  }

  function getSidebar(){
    const candidates = qsa('aside').concat(qsa('[class*="sidebar"]')).filter((v,i,a)=>a.indexOf(v)===i);
    candidates.sort((a,b)=>scoreSidebar(b)-scoreSidebar(a));
    return candidates.find(x=>scoreSidebar(x)>=5) || null;
  }

  function compactSidebar(sidebar){
    if (!sidebar) return;
    sidebar.classList.add('v980-admin-sidebar');
    const parent = sidebar.parentElement;
    if (parent) parent.classList.add('v980-admin-shell');
    const cs = getComputedStyle(sidebar);
    if (cs.position === 'fixed' && sidebar.parentElement) {
      Array.from(sidebar.parentElement.children).filter(el=>el!==sidebar).forEach(main=>{
        const currentMargin = parseFloat(getComputedStyle(main).marginLeft || '0');
        if (currentMargin > 120) main.style.marginLeft = 'var(--v980-admin-sidebar)';
      });
    }
  }

  function fixLogo(sidebar){
    if (!sidebar) return;
    const img = qs('img',sidebar);
    if (!img || img.dataset.v980LogoFixed) return;
    img.dataset.v980LogoFixed = '1';
    img.classList.add('v980-logo-click');
    img.setAttribute('role','link');
    img.setAttribute('tabindex','0');
    img.setAttribute('aria-label','Open Admin Dashboard');
    const anchor = img.closest('a');
    if (anchor) anchor.setAttribute('href','/admin/');
    const go = ev => {
      if (ev.type === 'keydown' && !['Enter',' '].includes(ev.key)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      location.href = '/admin/';
    };
    img.addEventListener('click',go,true);
    img.addEventListener('keydown',go,true);
  }

  function directNavItem(el,nav){
    if(!el || !nav) return el;
    let n=el;
    while(n && n.parentElement && n.parentElement!==nav) n=n.parentElement;
    return n&&n.parentElement===nav?n:el;
  }

  function navSignature(el){
    const panel=(el.getAttribute?.('data-panel')||el.getAttribute?.('data-goto')||'').toLowerCase();
    const href=(el.getAttribute?.('href')||'').toLowerCase();
    const label=lower(el).replace(/\b\d+\b/g,'').replace(/\s+/g,' ').trim();
    return `${panel} ${href} ${label}`.trim();
  }

  const NAV_GROUPS = [
    ['Overview',[['Dashboard',['dashboard']]]],
    ['Content',[
      ['Signals',['signals']],
      ['Charts',['charts']],
      ['Articles',['articles']],
      ['Announcements',['announcements']]
    ]],
    ['Courses',[
      ['Courses',['courses']],
      ['Zoom Sessions',['sessions','zoom sessions','zoom-sessions']]
    ]],
    ['Management',[
      ['Payments',['payments']],
      ['Students',['students']],
      ['Payment Methods',['methods','payment methods','payment-methods']],
      ['Support',['support']]
    ]],
    ['Operations',[
      ['Premium Access',['premium-access','premium access']],
      ['Link Manager',['link-manager','link manager']],
      ['Admin Notifications',['admin-notifications','admin notifications']],
      ['Activity Logs',['activity-logs','activity logs']]
    ]]
  ];

  function matchesNav(el,aliases){
    const sig=navSignature(el);
    return aliases.some(alias=>{
      const key=String(alias).toLowerCase();
      const panel=(el.getAttribute?.('data-panel')||el.getAttribute?.('data-goto')||'').toLowerCase();
      if(panel===key) return true;
      if(key==='sessions' && panel==='sessions') return true;
      if(key==='methods' && panel==='methods') return true;
      return sig===key || sig.endsWith(` ${key}`) || sig.includes(` ${key} `) || lower(el).replace(/\b\d+\b/g,'').trim()===key;
    });
  }

  function reorderNav(sidebar){
    if(!sidebar) return;
    const navs=qsa('nav',sidebar).filter(n=>qsa('a,button,[role="button"]',n).length>=4);
    if(!navs.length) return;
    navs.sort((a,b)=>qsa('a,button,[role="button"]',b).length-qsa('a,button,[role="button"]',a).length);
    const nav=navs[0];
    const controls=qsa('a,button,[role="button"]',sidebar).filter(el=>el.closest('nav')&&sidebar.contains(el.closest('nav')));
    const picked=new Map();
    NAV_GROUPS.flatMap(g=>g[1]).forEach(([label,aliases])=>{
      const found=controls.find(el=>!Array.from(picked.values()).includes(el)&&matchesNav(el,aliases));
      if(found) picked.set(label,found);
    });
    if(!picked.has('Dashboard')) return;

    // Remove old visual group labels so each Admin route gets one identical sequence.
    qsa('.app-nav-label,.v980-nav-label,.v990-nav-label',sidebar).forEach(el=>el.remove());
    qsa('p',sidebar).filter(el=>['overview','content','courses','operations','management'].includes(lower(el))).forEach(el=>el.remove());

    const movedRoots=new Set();
    const pickedControls=new Set(picked.values());
    const appendLabel=label=>{
      const lab=document.createElement('div');
      lab.className='v980-nav-label v990-nav-label';
      lab.textContent=label;
      nav.appendChild(lab);
    };
    NAV_GROUPS.forEach(([group,items])=>{
      const available=items.filter(([label])=>picked.has(label));
      if(!available.length) return;
      appendLabel(group);
      available.forEach(([label])=>{
        const control=picked.get(label);
        let root=control;
        const owner=control.closest('nav');
        if(owner===nav) root=directNavItem(control,nav);
        else {
          // Most Admin entries are direct anchors. Moving the anchor preserves its listeners/data attributes.
          root=control;
        }
        if(root && !movedRoots.has(root)){nav.appendChild(root);movedRoots.add(root);}
      });
    });

    // Preserve any future/unknown Admin feature instead of deleting it, but keep it after the requested sequence.
    const leftovers=controls.filter(el=>!pickedControls.has(el) && el.isConnected && el.closest('nav'));
    if(leftovers.length){
      appendLabel('More');
      leftovers.forEach(control=>{
        const owner=control.closest('nav');
        const root=owner===nav?directNavItem(control,nav):control;
        if(root && !movedRoots.has(root) && !/website home|logout/.test(lower(root))){nav.appendChild(root);movedRoots.add(root);}
      });
    }
    nav.dataset.v990Ordered='1';
  }

  function findPanel(needles){
    const list = Array.isArray(needles)?needles:[needles];
    const heads = qsa('h1,h2,h3,.page-title,.panel-title');
    let head = heads.find(h=>list.some(n=>lower(h).includes(String(n).toLowerCase())));
    if (!head) return null;
    return head.closest('section,[data-panel],.panel,.page-panel,.admin-panel') || head.parentElement?.parentElement || head.parentElement;
  }

  function fieldSignature(el){
    const parts=[text(el)];
    qsa('input,select,textarea,button,label',el).forEach(node=>{
      parts.push(node.id||'',node.getAttribute('name')||'',node.getAttribute('placeholder')||'',node.getAttribute('aria-label')||'',node.getAttribute('data-field')||'',text(node));
    });
    return parts.join(' ').replace(/\s+/g,' ').toLowerCase();
  }

  function editorScore(el,kind){
    const sig=fieldSignature(el);
    const fields=qsa('input,select,textarea',el).length;
    if(fields<2) return -999;
    const words={
      chart:[['trading instrument',5],['chart image',5],['analysis summary',5],['full analysis',4],['timeframe',3],['category',2],['title',2]],
      article:[['article',2],['title',2],['category',2],['excerpt',4],['content',4],['cover',4],['image',2],['slug',2]],
      announcement:[['announcement',3],['title',2],['message',5],['audience',4],['priority',3],['send email',3],['publish',2]],
      link:[['link name',5],['destination',4],['reference code',5],['source',3],['campaign',4],['link active',4],['generate',2]]
    }[kind]||[];
    let score=el.tagName==='FORM'?8:0;
    words.forEach(([w,n])=>{if(sig.includes(w))score+=n;});
    if(kind==='chart' && sig.includes('search gold'))score+=4;
    if(kind==='link' && sig.includes('team performance'))score-=12;
    if(qsa('table',el).length) score-=8;
    if(text(el).length>12000) score-=4;
    return score;
  }

  function findEditorSource(panel,kind){
    if(!panel) return null;
    const pool=qsa('form,article,section,div',panel).filter(el=>el!==panel && qsa('input,select,textarea',el).length>=2);
    const ranked=pool.map(el=>({el,score:editorScore(el,kind),fields:qsa('input,select,textarea',el).length,chars:text(el).length}))
      .filter(x=>x.score>=8)
      .sort((a,b)=>b.score-a.score || a.fields-b.fields || a.chars-b.chars);
    return ranked[0]?.el || null;
  }

  function modalTitleFor(kind,mode){
    const names={chart:'Chart',article:'Article',announcement:'Announcement',link:'Link'};
    return `${mode==='edit'?'Edit':'Add'} ${names[kind]||'Item'}`;
  }

  const modalEntries = [];

  function makeModal(kind,panel,source,options={}){
    if (!panel || !source || source.dataset.v980Modalized) return null;
    source.dataset.v980Modalized='1';
    source.dataset.v980EditorSource=kind;
    const shell = source.parentElement;
    const shellParent = shell && shell.parentElement;
    let hideShell = false;
    if (shell && shell !== panel) {
      const sourceFields=qsa('input,select,textarea',source).length;
      const shellFields=qsa('input,select,textarea',shell).length;
      const shellTables=qsa('table,[class*="list"],[class*="grid"] > article',shell).length;
      hideShell = shellFields <= sourceFields + 1 && shellTables===0;
    }
    const placeholder = document.createComment(`v980-${kind}-editor-placeholder`);
    source.parentNode?.insertBefore(placeholder,source);

    const overlay=document.createElement('div');
    overlay.className='v980-modal-overlay';
    overlay.hidden=true;
    overlay.dataset.v980Modal=kind;
    overlay.innerHTML=`<div class="v980-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="v980-${kind}-title"><div class="v980-modal-head"><h3 id="v980-${kind}-title">${modalTitleFor(kind,'add')}</h3><button type="button" class="v980-modal-close" aria-label="Close">×</button></div><div class="v980-modal-body"></div></div>`;
    qs('.v980-modal-body',overlay).appendChild(source);
    document.body.appendChild(overlay);
    if(hideShell && shell && shell.isConnected) shell.classList.add('v980-empty-editor-shell');
    if(kind==='link' && hideShell && shellParent) shellParent.classList.add('v980-link-summary-only');

    const entry={kind,panel,source,overlay,placeholder,shell,mode:'add',originalDisplay:source.style.display||''};
    modalEntries.push(entry);

    function open(mode='add'){
      entry.mode=mode;
      const titleEl=qs(`#v980-${kind}-title`,overlay);
      if(titleEl) titleEl.textContent=modalTitleFor(kind,mode);
      source.hidden=false;
      source.style.display=entry.originalDisplay || '';
      source.style.visibility='visible';
      overlay.hidden=false;
      document.body.classList.add('v980-modal-open');
      setTimeout(()=>qs('input:not([type="hidden"]),select,textarea',source)?.focus({preventScroll:true}),30);
    }
    function close(){
      overlay.hidden=true;
      if(!qsa('.v980-modal-overlay:not([hidden])').length) document.body.classList.remove('v980-modal-open');
    }
    entry.open=open;entry.close=close;
    qs('.v980-modal-close',overlay)?.addEventListener('click',close);
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay) close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close();});
    return entry;
  }

  function actionText(el){return lower(el).replace(/\s+/g,' ').trim();}
  function findButtons(panel){return qsa('button,a,[role="button"]',panel);}

  function ensureLinkAddButton(entry){
    if(!entry || qs('[data-v980-add-link]',entry.panel)) return;
    const btn=document.createElement('button');
    btn.type='button';btn.className='v980-primary-action';btn.dataset.v980AddLink='1';btn.innerHTML='<span aria-hidden="true">＋</span> Add Link';
    const exportBtn=findButtons(entry.panel).find(b=>actionText(b).includes('export csv'));
    if(exportBtn && exportBtn.parentElement){exportBtn.parentElement.insertBefore(btn,exportBtn);}
    else {const head=qsa('h1,h2,h3',entry.panel)[0];(head?.parentElement||entry.panel).appendChild(btn);}
    btn.addEventListener('click',()=>{
      const clear=findButtons(entry.source).find(b=>actionText(b)==='clear');
      if(clear) clear.click(); else qs('form',entry.source)?.reset?.();
      entry.open('add');
    });
  }

  function setupModals(){
    const specs=[
      {kind:'chart',head:['charts management','charts'],add:['add chart','new chart']},
      {kind:'article',head:['articles management','articles'],add:['add article','new article']},
      {kind:'announcement',head:['announcements management','announcements'],add:['add announcement','new announcement']},
      {kind:'link',head:['link manager'],add:['add link','generate link']}
    ];
    specs.forEach(spec=>{
      if(modalEntries.some(x=>x.kind===spec.kind && x.source?.isConnected)) return;
      const panel=findPanel(spec.head); if(!panel) return;
      const source=findEditorSource(panel,spec.kind); if(!source) return;
      const entry=makeModal(spec.kind,panel,source); if(!entry) return;
      if(spec.kind==='link') ensureLinkAddButton(entry);
    });
  }

  function wireModalActions(){
    if(window.__24K_V990_MODAL_ACTIONS__)return;
    window.__24K_V990_MODAL_ACTIONS__=true;
    document.addEventListener('click',event=>{
      const btn=event.target instanceof Element ? event.target.closest('button,a,[role="button"]') : null;
      if(!btn)return;
      const t=actionText(btn);
      modalEntries.forEach(entry=>{
        if(!entry.panel?.isConnected || !entry.panel.contains(btn)) return;
        const addMatch = entry.kind==='chart' ? /(^|\s)(add|new) chart/.test(t)
          : entry.kind==='article' ? /(^|\s)(add|new) article/.test(t)
          : entry.kind==='announcement' ? /(^|\s)(add|new) announcement/.test(t)
          : /(^|\s)(add|new|generate) link/.test(t);
        if(addMatch){setTimeout(()=>entry.open('add'),0);return;}
        if(t==='edit'||t.startsWith('edit ')){setTimeout(()=>entry.open('edit'),30);return;}
        if(entry.overlay.contains(btn) && (t==='cancel'||t==='close'||t==='discard')){setTimeout(()=>entry.close(),0);}
      });
    },true);
  }


  function closeModalOnSuccess(){
    if(window.__24K_V990_SUCCESS_WATCH__)return;
    window.__24K_V990_SUCCESS_WATCH__=true;
    const successWords=/\b(saved|created|updated|published|successfully|link generated)\b/i;
    new MutationObserver(records=>{
      const open=modalEntries.find(x=>x.overlay && !x.overlay.hidden);
      if(!open)return;
      for(const rec of records){
        for(const node of rec.addedNodes){
          if(!(node instanceof Element))continue;
          const sig=text(node);
          const cls=String(node.className||'').toLowerCase();
          if(successWords.test(sig) && (cls.includes('toast')||cls.includes('alert')||cls.includes('success')||node.getAttribute('role')==='status')){
            setTimeout(()=>open.close(),450);return;
          }
        }
      }
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  function nearestCardFor(head,panel,secondNeedle){
    if(!head)return null;
    let cur=head.parentElement;
    while(cur && cur!==panel){
      if((!secondNeedle || hasText(cur,secondNeedle)) && qsa('input,select,textarea,button',cur).length>0) return cur;
      cur=cur.parentElement;
    }
    return head.parentElement;
  }

  function compactPremium(){
    const panel=findPanel(['premium market access']);
    if(!panel)return;
    panel.classList.add('v980-premium-panel');
    const heads=qsa('h1,h2,h3,h4',panel);
    const settingsHead=heads.find(h=>hasText(h,'package & trial settings'));
    const summaryHead=heads.find(h=>hasText(h,'one premium package'));
    const settings=nearestCardFor(settingsHead,panel,'save premium settings');
    const summary=nearestCardFor(summaryHead,panel,'auto lock');
    if(settings) settings.classList.add('v980-premium-settings-card');
    if(summary) summary.classList.add('v980-premium-summary-card');
    if(settings && summary){
      let a=settings,b=summary;
      while(a && a!==panel){
        b=summary;
        while(b && b!==panel){if(a.parentElement===b.parentElement){a.parentElement.classList.add('v980-premium-top');return;}b=b.parentElement;}
        a=a.parentElement;
      }
    }
  }

  function init(){
    injectStyles();
    const sidebar=getSidebar();
    compactSidebar(sidebar);
    fixLogo(sidebar);
    reorderNav(sidebar);
    setupModals();
    wireModalActions();
    closeModalOnSuccess();
    compactPremium();
  }

  let timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(init,35);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true}); else schedule();
  window.addEventListener('load',schedule,{once:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('24k:admin-base-updated',schedule);
  document.addEventListener('panel:open',schedule);
  document.addEventListener('click',()=>setTimeout(schedule,90),true);
  [220,650,1400,2600,4800].forEach(ms=>setTimeout(schedule,ms));
})();
