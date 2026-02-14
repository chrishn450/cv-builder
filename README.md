# Nurse CV Studio (Redeem Codes)

This version uses your own one-time codes instead of calling Payhip from Vercel (avoids Cloudflare blocks).

## What you get
- `codes.csv` with 10,000 unique codes (format XXXX-XXXX-XXXX-XXXX)
- Supabase table schema: `supabase_schema.sql`
- Vercel API route: `/api/redeem` (and `/api/verify` alias)
- Frontend unlock UI that redeems codes and stores unlock in localStorage

## Setup (quick)
1) Create Supabase project
2) Run `supabase_schema.sql` in Supabase SQL editor
3) Import `codes.csv` into table `license_codes`
4) Set Vercel env vars:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
5) Redeploy

## Security note
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (server-only).
- Do NOT ship codes publicly.
