import { parseReceiptText, receiptFromVision, type ParsedReceipt } from "./parseReceipt";

export type Recognition = ParsedReceipt & { rawText: string };

export async function shrinkImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1600;
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
      canvas.toBlob(resolve, "image/jpeg", 0.82);
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
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(blob);
  });
}

export async function recognizeReceipt(image: Blob): Promise<Recognition> {
  const dataUrl = await blobToDataUrl(image);
  let response: Response;
  try {
    response = await fetch("/api/read-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    });
  } catch {
    throw new Error("missing_key");
  }

  if (response.status === 503) throw new Error("missing_key");
  if (!response.ok) throw new Error("unreadable");

  const body: unknown = await response.json();
  const parsed = receiptFromVision(body);
  if (!parsed) {
    const transcript =
      body && typeof body === "object" && "transcript" in body && typeof body.transcript === "string"
        ? body.transcript
        : "";
    const fromText = transcript ? parseReceiptText(transcript) : null;
    if (!fromText || fromText.items.length === 0) throw new Error("unreadable");
    return { ...fromText, rawText: transcript };
  }
  return { ...parsed, rawText: "" };
}

export function friendlyReadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "missing_key") {
    return "The receipt reader isn't set up on this copy yet. Add the lines yourself.";
  }
  return "That photo couldn't be read. Add the lines yourself.";
}
