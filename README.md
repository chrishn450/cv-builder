# CV Builder (Payhip + Magic Link + Supabase) — Vercel-ready

Dette prosjektet gir kundene automatisk tilgang etter Payhip-kjøp via **webhook** og en **magic link**.
Kunden trenger ikke å lime inn koder.

## Hvordan det funker (flyt)
1. Kunde kjøper i Payhip
2. Payhip sender `paid` webhook til `/api/payhip-webhook`
3. Server:
   - verifiserer webhook-signatur
   - oppretter/oppdaterer kunde i Supabase
   - lager en **one-time magic token** (utløper)
   - sender e-post med lenke: `/magic.html?token=...`
4. Kunden klikker lenken
5. `/api/magic-exchange` bytter token -> session-cookie
6. Appen kaller `/api/me` for å sjekke tilgang og viser CV-builderen

---

## 1) Supabase
Kjør SQL-filen `supabase_schema.sql` i Supabase SQL editor.

Du trenger:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side, aldri eksponer i frontend)

> Merk: Denne appen bruker **egen sessions-cookie** (JWT) og ikke Supabase Auth.

---

## 2) Payhip
I Payhip:
- Settings → Developer → Webhooks
- URL: `https://<ditt-domene>/api/payhip-webhook`
- Event: `paid`

Du må også ha Payhip API key i env (se under).

Webhook-verifisering følger Payhip sin dokumentasjon:
`signature` sammenlignes med `sha256(PAYHIP_API_KEY)`.

---

## 3) E-post (Resend)
Dette repoet bruker Resend (enkel HTTP API).
Lag en konto og en API key.

Env:
- `RESEND_API_KEY`
- `EMAIL_FROM` (må være en verifisert avsender i Resend)

Hvis du vil bruke en annen provider, bytt ut `sendEmail()` i `api/_utils.js`.

---

## 4) Environment variables (Vercel)
Sett disse i Vercel → Project → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

- `PAYHIP_API_KEY`
- `PAYHIP_PRODUCT_ID` *(valgfritt men anbefalt – for å kun gi tilgang til riktig produkt)*
- `APP_BASE_URL` *(f.eks. https://cv-builder-orpin-beta.vercel.app)*

- `RESEND_API_KEY`
- `EMAIL_FROM`

- `JWT_SECRET` *(til signering av session-cookie)*

---

## 5) Lokal kjøring (valgfritt)
Dette er en statisk app + Vercel serverless endpoints.
Du kan kjøre en enkel static server lokalt og simulere API via Vercel dev (om du ønsker).
De fleste tester enklest direkte på Vercel.

---

## 6) Sikkerhet / idempotency
- Payhip kan sende samme webhook flere ganger.
- Vi lagrer `payhip_transaction_id` i `purchases` og sjekker før vi oppretter nye tokens.
- Magic token lagres som **hash** og kan brukes kun én gang.

---

## Feilsøking
- Sjekk Vercel logs for `/api/payhip-webhook`
- Sjekk at `APP_BASE_URL` stemmer med domenet der appen kjører
- Sjekk at Resend sender (API key + avsender)

