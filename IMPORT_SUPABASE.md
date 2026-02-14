# Import codes into Supabase
1) Create a Supabase project
2) In Supabase: SQL Editor -> run supabase_schema.sql
3) Table Editor -> license_codes -> Import data -> upload codes.csv (maps to column `code`)
4) In Vercel project settings, add env vars (Production):
   - SUPABASE_URL = your project URL
   - SUPABASE_SERVICE_ROLE_KEY = your service role key (KEEP SECRET, server-only)
5) Redeploy on Vercel after setting env vars
