# GitHub Pages Deployment — 24K Excellence V8

## Correct upload location

Extract the ZIP, open the extracted folder, and upload its contents directly to the root of the GitHub repository named `Mrzero`.

Do not upload the complete extracted folder as another nested folder. The repository root must visibly contain:

- `index.html`
- `login.html`
- `check-email.html`
- `student-dashboard.html`
- `admin-dashboard.html`
- `admin-login.html`
- `admin.html`
- `app.css`
- `styles.css`
- `assets/`
- `sign-in/`, `sign-up/`, `free-course/`, `courses/`, `charts/`, `articles/`
- `.nojekyll`

## Expected live routes

- Home: `https://24kmrzero.github.io/Mrzero/`
- Courses: `https://24kmrzero.github.io/Mrzero/courses/`
- Sign in: `https://24kmrzero.github.io/Mrzero/sign-in/`
- Sign up: `https://24kmrzero.github.io/Mrzero/sign-up/`
- Free course: `https://24kmrzero.github.io/Mrzero/free-course/?course=COURSE-SLUG`
- Charts: `https://24kmrzero.github.io/Mrzero/charts/`
- Articles: `https://24kmrzero.github.io/Mrzero/articles/`
- Admin Login: `https://24kmrzero.github.io/Mrzero/admin-login.html`
- Admin Dashboard: `https://24kmrzero.github.io/Mrzero/admin-dashboard.html`
- Admin aliases: `https://24kmrzero.github.io/Mrzero/admin.html` and `/admin/`

GitHub Pages is case-sensitive. Do not rename `admin-dashboard.html` or change uppercase/lowercase letters.

## GitHub Pages settings

Open repository **Settings → Pages** and select deployment from the `main` branch and root `/` folder. After saving, wait for the Pages deployment to complete and then hard-refresh with `Ctrl + F5`.

## Supabase configuration

`assets/js/config.js` is already configured for project:

`https://jsmthmmkafgvzzcjjihp.supabase.co`

It contains only the browser-safe publishable key. Never put a Supabase secret/service-role key in GitHub or frontend JavaScript.

## Supabase Auth URLs

Set:

- Site URL: `https://24kmrzero.github.io/Mrzero/`
- Redirect URL: `https://24kmrzero.github.io/Mrzero/**`
