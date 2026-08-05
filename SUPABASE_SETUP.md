# Supabase Setup — V8

Only new upgrade SQL belongs in `supabase-final/`.

1. If `06_SIGNAL_AUTOMATION_AND_HISTORY.sql` has never completed successfully, run it once.
2. Run `07_PLATFORM_WORKFLOWS_LINKS_ACCESS_COURSES.sql` once.
3. Do not rerun older production/schema/seed/admin SQL files.

For Auth URLs, deployment, email queue and test steps, read `docs/V8_COMPLETE_SETUP.md`.
