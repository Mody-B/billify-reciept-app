import { readReceipt } from "./readReceiptCore.js";

function readRaw(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function write(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

export function attachReceiptApi(middlewares) {
  middlewares.use("/api/read-receipt", async (request, response) => {
    if (request.method !== "POST") {
      write(response, 405, { error: "method" });
      return;
    }
    try {
      const raw = await readRaw(request);
      const payload = raw ? JSON.parse(raw) : {};
      const result = await readReceipt(payload.image, process.env);
      write(response, result.status, result.body);
    } catch {
      write(response, 400, { error: "bad_image" });
    }
  });
}
