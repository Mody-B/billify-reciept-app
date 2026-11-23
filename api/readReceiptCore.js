const MODEL = "nvidia/nemotron-3.5-super-vl:free";

const INSTRUCTIONS = `You read a photo of a restaurant receipt. The receipt may be Arabic, English, or mixed. Return only JSON with this shape:
{
  "language": "ar",
  "currency": "USD",
  "currencySymbol": "$",
  "items": [{ "name": "string", "quantity": 1, "unitPriceMinor": 0, "lineTotalMinor": 0, "flagged": false }],
  "taxMinor": 0,
  "tipMinor": 0,
  "serviceMinor": 0,
  "discountMinor": 0,
  "deliveryMinor": 0,
  "otherFees": [{ "label": "string", "amountMinor": 0 }],
  "subtotalMinor": null,
  "totalMinor": null
}
Rules:
- Do not translate. Keep every item name and fee label in the original language and spelling.
- language is "ar", "en", or "mixed".
- currency is an ISO code. Recognize ل.س or ليرة سورية as SYP, ر.س as SAR, د.إ as AED, د.ك as KWD, د.أ or دينار as JOD, ج.م as EGP, ل.ل as LBP, د.ع as IQD, ر.ق as QAR, $ as USD, and € as EUR.
- Money fields are integers in minor units. USD, SAR, AED, EGP, QAR, and EUR use 2 (cents). KWD and JOD use 3 (fils). SYP and LBP use 0. 125,000 ل.س is 125000, not 125. 1.250 JOD is 1250. ١٢٫٥٠ is 12.50, never 1250.
- quantity is a whole number. Default 1. الكمية or a printed "2" or "2x" is the quantity.
- unitPriceMinor is the price of one item. lineTotalMinor is the printed line total. When they agree, lineTotalMinor equals quantity times unitPriceMinor.
- If quantity times the unit price does not equal the printed line total, set flagged to true and keep both printed numbers. Do not guess, divide, or change either number.
- Join a name that wraps onto the next line into one item.
- Do not include the restaurant name, address, phone, date, server, table, thank-you, card brand, last four digits, approval code, or auth code.
- These labels are not items: المجموع, الإجمالي, المجموع الكلي, الصافي, المطلوب, الضريبة, ضريبة القيمة المضافة, VAT, الخدمة, رسوم الخدمة, الإكرامية, التوصيل, Tax, VAT, GST, tip, gratuity, service charge.
- الكمية, السعر, and العدد are column headers, not items.
- خصم, discount, or coupon is a negative discountMinor, not an item.
- التوصيل is deliveryMinor. A service charge is serviceMinor. A tip or الإكرامية is tipMinor.
- If a line is unreadable, omit it. Do not invent items.`;

function messageText(message) {
  const content = message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("")
      .trim();
    if (text) return text;
  }
  return typeof message?.reasoning === "string" ? message.reasoning : "";
}

function parseModelJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // The model sometimes wraps the object in prose or a fence.
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // Fall through to a raw object slice.
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

const KEY_NAME = "OPENROUTER_API_KEY";

export async function readReceipt(image, env = process["env"]) {
  const source = env && typeof env === "object" ? env : process["env"];
  const raw = source[KEY_NAME];
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) return { status: 503, body: { error: "missing_key" } };
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return { status: 400, body: { error: "bad_image" } };
  }
  if (image.length > 4_000_000) return { status: 413, body: { error: "bad_image" } };

  let upstream;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mody-b.github.io/billify-reciept-app/",
        "X-Title": "Splitit",
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
    const text = messageText(payload?.choices?.[0]?.message);
    const parsed = text ? parseModelJson(text) : null;
    if (!parsed || typeof parsed !== "object") return { status: 422, body: { error: "empty" } };
    return { status: 200, body: parsed };
  } catch {
    return { status: 502, body: { error: "upstream" } };
  }
}
