# Splitit

Split a restaurant receipt from a photo.

Splitit is a phone-first site. Photograph a receipt, check the lines, type the names, and drag each item onto a person. An item can be shared. Tax, tip, service, and any other extra are split in proportion to each person's items. All of the math is integer cents with largest-remainder rounding, so the totals match the bill exactly.

A bad photo never blocks the split. Type the lines by hand.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5173

To check the production build:

```bash
npm run build
npm run preview
```

## Hosting

The live site is https://mody-b.github.io/billify-reciept-app/. That host is GitHub Pages. The workflow in `.github/workflows/pages.yml` uploads only the static `dist` folder, so `POST /api/read-receipt` is rejected (HTTP 405). Photos cannot be read there.

To read photos, deploy this repo on Vercel so `api/read-receipt.js` runs, and set the server env var `OPENAI_API_KEY`. Do not prefix it with `VITE_` and do not commit a value. A Vercel project name has not been chosen yet. `npm run dev` runs the same function locally and reports a missing key when `OPENAI_API_KEY` is unset.

The function calls OpenAI `gpt-4o-mini`. The photo stays on the check screen so you can correct a line in one tap.

## Receipt reader limits

- The model is `gpt-4o-mini`. Blurry, crumpled, or handwritten receipts can still miss a line.
- The check screen is how you make the bill exact: the photo sits beside the lines, and a tap opens that line.
- Hand entry works with no key and no network.
