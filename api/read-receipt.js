import { readReceipt } from "./readReceiptCore.js";

async function payloadFrom(request) {
  const body = request.body;
  if (typeof body === "string") return JSON.parse(body);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) return JSON.parse(body.toString("utf8"));
  if (body && typeof body === "object" && typeof body.image === "string") return body;
  if (typeof request.json === "function") return request.json();
  const stream = body && typeof body[Symbol.asyncIterator] === "function" ? body : request;
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(response, result) {
  response.status(result.status).json(result.body);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    const result = { status: 405, body: { error: "method" } };
    if (typeof response?.status === "function") {
      send(response, result);
      return;
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  let image = "";
  try {
    const payload = await payloadFrom(request);
    image = typeof payload?.image === "string" ? payload.image : "";
  } catch {
    const result = { status: 400, body: { error: "bad_image" } };
    if (typeof response?.status === "function") {
      send(response, result);
      return;
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await readReceipt(image, process.env);
  if (typeof response?.status === "function") {
    send(response, result);
    return;
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}
