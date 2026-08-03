# Deployment

## Static hosting

The project has no build step. Upload the entire folder to Netlify, Cloudflare Pages, GitHub Pages or normal web hosting.

Recommended production domain structure:

- `https://yourdomain.com/index.html`
- `https://yourdomain.com/login.html`
- `https://yourdomain.com/student-dashboard.html`
- `https://yourdomain.com/admin-dashboard.html`

## GitHub Pages

1. Create a repository.
2. Upload all files and folders from this package.
3. Enable Pages from the main branch/root.
4. Add the final Pages URL to Supabase Auth redirect URLs.

## Local testing

Do not double-click HTML files because browser module/storage behavior can differ. Start a local server:

```bash
python -m http.server 8080
```

Open `http://localhost:8080` and add `http://localhost:8080/**` to Supabase redirect URLs.

## Update procedure

1. Back up the live folder and database.
2. Upload changed website files.
3. Run only new migration SQL when future schema changes are supplied.
4. Repeat `docs/TEST_CHECKLIST.md`.
