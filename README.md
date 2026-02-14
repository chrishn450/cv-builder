# CV Template Builder (Payhip Access)

Dette er en statisk CV-builder (Nurse + Engineering) som kan hostes gratis på Vercel.
Tilgang styres via Payhip **license keys** (kunden limer inn kode for å låse opp).

## 1) Sett opp Payhip
1. Lag et produkt i Payhip (Digital product).
2. Skru på **Software License Keys** for produktet (Payhip genererer unik kode per kjøp).
3. Finn **Product Secret Key** (for v2 license verification).
4. Finn product key (f.eks. https://payhip.com/b/RGsF → 'RGsF') og bruk direkte checkout:
   https://payhip.com/buy?link=RGsF

## 2) Deploy på Vercel
1. Last opp denne mappen til GitHub.
2. Import i Vercel → Deploy.
3. I Vercel: Settings → Environment Variables:
   - PRODUCT_SECRET_KEY = <din Payhip product secret key>
4. Redeploy.

## 3) Konfigurer kjøpslenker
Åpne `index.html` og sett:
- window.CV_BUY.payhipCheckoutUrl = "https://payhip.com/buy?link=DINKEY"
- window.CV_BUY.etsyListingUrl = "https://www.etsy.com/listing/..."

## 4) Etsy leveranse
På Etsy laster du opp en PDF “Access guide”:
- Link til denne nettsiden
- Instruks: kjøp via Payhip for å få lisenskode, eller (valgfritt) gi dem en rabattkupong.

## Notat
Ikke legg Payhip secret key i frontend-kode. Den ligger kun i Vercel env vars og brukes i /api/verify.
