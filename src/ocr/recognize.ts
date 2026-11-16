import { parseReceiptText, receiptFromVision, type ParsedReceipt } from "./parseReceipt";

export type Recognition = ParsedReceipt & { rawText: string };

export type ReadFailure =
  | "not_deployed"
  | "missing_key"
  | "bad_image"
  | "rejected_key"
  | "upstream"
  | "unreadable"
  | "offline";

export async function shrinkImage(file: Blob, maxWidth = 1280, quality = 0.72): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    return blob ?? file;
  } catch {
    return file;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("bad_image"));
    reader.readAsDataURL(blob);
  });
}

async function fitForUpload(image: Blob): Promise<string> {
  let current = await shrinkImage(image);
  let dataUrl = await blobToDataUrl(current);
  let width = 960;
  let quality = 0.64;
  while (dataUrl.length > 1_200_000 && width >= 480) {
    current = await shrinkImage(current, width, quality);
    dataUrl = await blobToDataUrl(current);
    width = Math.round(width * 0.75);
    quality = Math.max(0.5, quality - 0.08);
  }
  if (!dataUrl.startsWith("data:image/") || dataUrl.length > 3_500_000) throw new Error("bad_image");
  return dataUrl;
}

export function classifyReadResponse(status: number, contentType: string, errorCode: string): ReadFailure | null {
  const json = contentType.includes("json");
  if (status === 503 || errorCode === "missing_key") return "missing_key";
  if (status === 401 || errorCode === "rejected_key") return "rejected_key";
  if (status === 413 || status === 400 || errorCode === "bad_image") return "bad_image";
  if (status === 502 || status === 422 || errorCode === "upstream" || errorCode === "empty") return "upstream";
  if (!json) return "not_deployed";
  if (status === 404 || status === 405) return "not_deployed";
  if (status >= 400) return "unreadable";
  return null;
}

export function explainReadFailure(kind: ReadFailure, pageUrl: string): string {
  const where = pageUrl || "this page";
  if (kind === "missing_key") {
    return "OPENROUTER_API_KEY is missing on the server. Add that env var in the Vercel project, then try the photo again. You can type the lines below.";
  }
  if (kind === "rejected_key") {
    return "The server's OPENROUTER_API_KEY was rejected. Check that env var in Vercel. You can type the lines below.";
  }
  if (kind === "not_deployed") {
    const hostNote = where.includes("github.io")
      ? " GitHub Pages only serves the static site, so it cannot run this function."
      : "";
    return `This site (${where}) is not running the receipt reader.${hostNote} Deploy api/read-receipt on Vercel and set the server env var OPENROUTER_API_KEY. You can type the lines below.`;
  }
  if (kind === "bad_image") return "That photo is too large to send. Try a smaller shot, or type the lines below.";
  if (kind === "upstream") return "The vision service didn't return a receipt. Type the lines below, or try the photo again.";
  if (kind === "offline") return `Couldn't reach the receipt reader from ${where}. You can type the lines below.`;
  return "That photo couldn't be read. Add the lines yourself.";
}

function pageUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin + window.location.pathname;
}

export function friendlyReadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const known: ReadFailure[] = ["not_deployed", "missing_key", "bad_image", "rejected_key", "upstream", "unreadable", "offline"];
  const kind = known.find((entry) => entry === message) ?? "unreadable";
  return explainReadFailure(kind, pageUrl());
}

export async function recognizeReceipt(image: Blob): Promise<Recognition> {
  const dataUrl = await fitForUpload(image);
  let response: Response;
  try {
    response = await fetch("/api/read-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
  } catch {
    throw new Error("offline");
  }

  const contentType = response.headers.get("content-type") ?? "";
  let payload: unknown = null;
  let errorCode = "";
  if (contentType.includes("json")) {
    payload = await response.json();
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
      errorCode = payload.error;
    }
  }

  const failure = classifyReadResponse(response.status, contentType, errorCode);
  if (failure) throw new Error(failure);

  const parsed = receiptFromVision(payload);
  if (!parsed) {
    const transcript =
      payload && typeof payload === "object" && "transcript" in payload && typeof payload.transcript === "string"
        ? payload.transcript
        : "";
    const fromText = transcript ? parseReceiptText(transcript) : null;
    if (!fromText || fromText.items.length === 0) throw new Error("unreadable");
    return { ...fromText, rawText: transcript };
  }
  return { ...parsed, rawText: "" };
}
