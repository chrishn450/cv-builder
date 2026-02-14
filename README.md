# Nurse CV Studio — One-time codes (NO Supabase)

This build uses **Vercel KV** (Upstash Redis under the hood) to store one-time codes.
When a code is redeemed, it is marked as used and cannot be redeemed again.

## What you get
- `codes.csv` with 10,000 unique codes (format XXXX-XXXX-XXXX-XXXX)
- `/api/seed` endpoint to import codes into KV (run once)
- `/api/redeem` endpoint to redeem a code (atomic check+set via Lua)
- Frontend unlock UI that redeems codes and stores unlock in localStorage

## 1) Create / connect Vercel KV
In Vercel:
1. Project → Storage → Create → **KV**
2. Attach it to this project
3. Vercel will add env vars automatically (Production):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN` (optional)

Redeploy after attaching KV.

## 2) Seed the 10,000 codes (run once)
This project includes `api/seed.js`. For safety it requires an env var `SEED_SECRET`.

### Set env var in Vercel
Add in Vercel → Environment Variables (Production):
- `SEED_SECRET` = choose a long random string

Redeploy.

### Call the seed endpoint
Option A (recommended): Use curl from your computer:

curl -X POST "https://YOUR_DOMAIN/api/seed" \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_SEED_SECRET","codes":["ABCD-EFGH-IJKL-MNOP","...."]}'

For 10,000 codes, don't paste them by hand. Use the included helper script below.

## 3) Helper script to seed from codes.csv
Use Node 18+ locally (or any JS runtime) and run:

node seed_from_csv.mjs https://YOUR_DOMAIN/api/seed YOUR_SEED_SECRET codes.csv

## 4) Redeem in the app
User enters code → app POSTs to `/api/redeem`.
- Invalid: "Ugyldig kode"
- Used: "Code already used"
- Success: unlocks

## Security notes
- Keep `KV_REST_API_TOKEN` secret (server-only).
- Keep `SEED_SECRET` secret. After seeding, you may remove/disable `/api/seed`.
