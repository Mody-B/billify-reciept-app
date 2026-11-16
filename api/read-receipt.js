import { readReceipt } from "./readReceiptCore.js";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  response.setHeader("Cache-Control", "no-store");
  response.status(result.status).json(result.body);
}

function webResult(result) {
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    const result = { status: 405, body: { error: "method" } };
    if (typeof response?.status === "function") {
      send(response, result);
      return;
    }
    return webResult(result);
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
    return webResult(result);
  }

  const result = await readReceipt(image, process["env"]);
  if (typeof response?.status === "function") {
    send(response, result);
    return;
  }
  return webResult(result);
}
