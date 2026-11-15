const MODEL = "gpt-4o-mini";

const INSTRUCTIONS = `You read a photo of a restaurant receipt and return only JSON with this shape:
{
  "currencySymbol": "$",
  "items": [{ "name": "string", "quantity": 1, "priceCents": 0 }],
  "taxCents": 0,
  "tipCents": 0,
  "serviceCents": 0,
  "otherFees": [{ "label": "string", "amountCents": 0 }],
  "totalCents": null
}
Rules:
- quantity is a whole number. Default 1. A printed "2" or "2x" in front of a name is the quantity.
- priceCents is the line total in cents, the amount to pay for that line. If both a unit price and an extended price are printed, use the extended price.
- Join a name that wraps onto the next line into one item.
- Do not include the restaurant name, address, phone, date, server, table, thank-you, card brand, last four digits, approval code, or auth code.
- Tax, VAT, GST, tip, gratuity, service charge, and fees are not items.
- A discount or coupon is a negative otherFees amount.
- All money fields are integers in cents.
- If a line is unreadable, omit it. Do not invent items.`;

export async function readReceipt(image, env = process.env) {
  const key = typeof env?.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
  if (!key) return { status: 503, body: { error: "missing_key" } };
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return { status: 400, body: { error: "bad_image" } };
  }
  if (image.length > 4_000_000) return { status: 413, body: { error: "bad_image" } };

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INSTRUCTIONS },
          {
            role: "user",
            content: [
              { type: "text", text: "Read this receipt." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });
  } catch {
    return { status: 502, body: { error: "upstream" } };
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return { status: 401, body: { error: "rejected_key" } };
  }
  if (!upstream.ok) return { status: 502, body: { error: "upstream" } };

  try {
    const payload = await upstream.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return { status: 422, body: { error: "empty" } };
    return { status: 200, body: JSON.parse(text) };
  } catch {
    return { status: 502, body: { error: "upstream" } };
  }
}
