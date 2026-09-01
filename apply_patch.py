#!/usr/bin/env python3
from pathlib import Path
import re, sys, shutil

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd().resolve()
PATCH = Path(__file__).resolve().parent
JS_REL = 'assets/js/24k-zero-sep01-patch.js'
CSS_REL = 'assets/css/24k-zero-sep01-patch.css'
SKIP = {'node_modules','.git','dist','vendor','.next','build'}

if not any((ROOT/x).exists() for x in ['index.html','student','student-dashboard.html','admin','admin-dashboard.html']):
    print('ERROR: Run this patch from the 24K Zero project root (or pass project root path).')
    sys.exit(2)

for rel in [JS_REL,CSS_REL]:
    src=PATCH/rel; dst=ROOT/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)

sql_src=PATCH/'supabase/24K_ZERO_SEP01_COURSES.sql'
sql_dst=ROOT/'supabase/24K_ZERO_SEP01_COURSES.sql'; sql_dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(sql_src,sql_dst)

changed=[]

def should_skip(p):
    return bool(SKIP.intersection(p.parts)) or p.resolve() == (ROOT/JS_REL).resolve()

# Repair the brokerAccessMeta temporal-dead-zone error in both inline and external JS.
# We initialize it at the beginning of the same script scope, then turn the later
# const/let declaration into an assignment. This is safe for classic scripts and modules.
def fix_broker_tdz(s):
    if 'brokerAccessMeta' not in s:
        return s
    decl = re.search(r'\b(?:const|let)\s+brokerAccessMeta\s*=\s*', s)
    if not decl:
        return s
    s = s[:decl.start()] + 'brokerAccessMeta = ' + s[decl.end():]
    # Avoid duplicating our initializer on re-runs.
    marker='/* 24K_ZERO_BROKER_META_TDZ_FIX */'
    if marker not in s:
        prefix = marker + '\nvar brokerAccessMeta = {};\n'
        # Preserve an initial shebang / use-strict directive where practical.
        m = re.match(r'^(\s*["\']use strict["\'];?\s*)', s)
        if m:
            s = s[:m.end()] + '\n' + prefix + s[m.end():]
        else:
            s = prefix + s
    return s

for p in ROOT.rglob('*.js'):
    if should_skip(p): continue
    try: s=p.read_text(encoding='utf-8',errors='ignore')
    except Exception: continue
    orig=s
    s=fix_broker_tdz(s)
    # Fix hard-coded public /index navigation without touching ordinary index.html asset names.
    s=re.sub(r'(["\'])https?://(www\.)?24kmrzero\.com/index(?:\.html)?([#?][^"\']*)?\1',
             lambda m: m.group(1)+'https://24kmrzero.com/'+(m.group(3) or '')+m.group(1), s, flags=re.I)
    if s!=orig:
        p.write_text(s,encoding='utf-8'); changed.append(str(p.relative_to(ROOT)))

for p in ROOT.rglob('*.html'):
    if should_skip(p): continue
    try: s=p.read_text(encoding='utf-8',errors='ignore')
    except Exception: continue
    orig=s
    # Fix href/action targets that explicitly point to /index or /index.html.
    s=re.sub(r'((?:href|action)\s*=\s*["\'])/?index(?:\.html)?([#?][^"\']*)?(["\'])',
             lambda m: m.group(1)+'/'+(m.group(2) or '')+m.group(3), s, flags=re.I)
    s=fix_broker_tdz(s)
    if '24k-zero-sep01-patch.css' not in s:
        tag=f'<link rel="stylesheet" href="/{CSS_REL}">'
        s=s.replace('</head>',tag+'\n</head>',1) if '</head>' in s else tag+'\n'+s
    if '24k-zero-sep01-patch.js' not in s:
        tag=f'<script defer src="/{JS_REL}"></script>'
        s=s.replace('</body>',tag+'\n</body>',1) if '</body>' in s else s+'\n'+tag
    if s!=orig:
        p.write_text(s,encoding='utf-8'); changed.append(str(p.relative_to(ROOT)))

print('24K Zero Sep01 patch applied.')
print('Changed source files:', len(changed))
for x in sorted(set(changed)): print(' -',x)
print('Run Supabase SQL separately: supabase/24K_ZERO_SEP01_COURSES.sql')
