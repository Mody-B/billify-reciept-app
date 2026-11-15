# Splitit

Split a restaurant receipt without sending the photo anywhere.

Splitit is a phone-first static site. Photograph a receipt or upload one, read the lines in the browser, fix anything that looks wrong, then drag items onto people. An item can be shared. Tax, tip, service, and any other extra are split in proportion to each person's items. All of the math is integer cents with largest-remainder rounding, so the per-person totals add up to the bill exactly.

A bad photo never blocks the split. Enter the lines by hand, or load the diner sample and practice the flow.

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

Pushes to `main` run the tests and build a fully static site. There is no server and no API key.

[GitHub Pages](https://pages.github.com/) is set up in `.github/workflows/pages.yml`. That build uses the base path `/billify-reciept-app/` and is published at https://mody-b.github.io/billify-reciept-app/. `npm run dev` serves the app at `/`.

A Vercel project name has not been chosen yet.

## Receipt reader

Recognition uses [Tesseract.js](https://github.com/naptha/tesseract.js) on the device. The image is not uploaded to a server.

The first scan downloads the English recognition files from a public CDN. After that, reading runs locally. There is no API key and no paid vision service.

Limits of the reader:

- It is set up for English text. Other languages are not loaded.
- It looks for a price at the end of a row, a leading quantity, and words such as tax, tip, service, subtotal, and total.
- Blurry, dark, skewed, crumpled, or handwritten receipts often come back incomplete or empty.
- You can edit every line, move extras into their own fields, or type the whole bill yourself.
