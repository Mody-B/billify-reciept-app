# Splitit

Split a restaurant receipt without sending the photo anywhere.

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

Pushes to `main` run the tests and build the site. [GitHub Pages](https://pages.github.com/) is set up in `.github/workflows/pages.yml` and publishes to https://mody-b.github.io/billify-reciept-app/ when Pages is enabled. That build uses the base path `/billify-reciept-app/`. `npm run dev` serves the app at `/`.

The receipt reader is a Vercel function, `api/read-receipt.js`. It calls OpenAI `gpt-4o-mini` and reads the key from the server environment variable `OPENAI_API_KEY`. Put that variable in the Vercel project settings. Do not prefix it with `VITE_` and do not commit a value. Without the key, or if a photo cannot be read, type the items by hand. The photo stays on the check screen so you can correct a line in one tap.

A Vercel project name has not been chosen yet.

## Receipt reader limits

- The model is `gpt-4o-mini`. Blurry, crumpled, or handwritten receipts can still miss a line.
- The check screen is how you make the bill exact: the photo sits beside the lines, and a tap opens that line.
- Hand entry works with no key and no network.
