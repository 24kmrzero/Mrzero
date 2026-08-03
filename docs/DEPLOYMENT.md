# GitHub Pages Deployment — 24K Excellence

## Correct upload location
Extract the ZIP. Open the extracted folder and upload its contents directly to the root of the GitHub repository named `Mrzero`.

Do not upload the complete extracted folder as another nested folder. The repository root must visibly contain:

- `index.html`
- `login.html`
- `student-dashboard.html`
- `admin-dashboard.html`
- `admin-login.html`
- `admin.html`
- `app.css`
- `styles.css`
- `assets` folder
- `.nojekyll`

## Expected live routes

- Home: `https://24kmrzero.github.io/Mrzero/`
- Login: `https://24kmrzero.github.io/Mrzero/login.html`
- Admin Login: `https://24kmrzero.github.io/Mrzero/admin-login.html`
- Admin Dashboard: `https://24kmrzero.github.io/Mrzero/admin-dashboard.html`
- Backup Admin alias: `https://24kmrzero.github.io/Mrzero/admin.html`
- Backup Admin folder route: `https://24kmrzero.github.io/Mrzero/admin/`

GitHub Pages is case-sensitive. Do not rename `admin-dashboard.html` or change uppercase/lowercase letters.

## GitHub Pages settings
Open repository **Settings > Pages** and select deployment from the `main` branch and root `/` folder. After saving, allow GitHub Pages a short time to publish the new commit.

## Supabase configuration before live testing
Open `assets/js/config.js` and replace:

- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

Use only the public anon key in frontend code. Never put the Supabase service-role key in GitHub.
