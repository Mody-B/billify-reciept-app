import { createWorker, PSM, type Worker } from "tesseract.js";
import { parseReceipt, parseReceiptText, type ParsedReceipt } from "./parseReceipt";

export type Recognition = ParsedReceipt & { rawText: string };

type ProgressListener = (progress: number, status: string) => void;

let workerPromise: Promise<Worker> | null = null;
let progressListener: ProgressListener | null = null;

function logger(message: { status?: string; progress?: number }) {
  if (!progressListener || typeof message.progress !== "number") return;
  progressListener(message.progress, message.status ?? "");
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    const created = createWorker("eng", 1, { logger });
    workerPromise = created;
    try {
      return await created;
    } catch (error) {
      workerPromise = null;
      throw error;
    }
  }
  return workerPromise;
}

async function resetWorker(): Promise<void> {
  const pending = workerPromise;
  workerPromise = null;
  if (!pending) return;
  try {
    const worker = await pending;
    await worker.terminate();
  } catch {
    // The failed worker is already unusable.
  }
}

export async function preprocessImage(file: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1800;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    for (let index = 0; index < pixels.length; index += 4) {
      let tone = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
      tone = (tone - 128) * 1.4 + 128;
      const next = Math.max(0, Math.min(255, tone));
      pixels[index] = next;
      pixels[index + 1] = next;
      pixels[index + 2] = next;
    }
    context.putImageData(image, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function recognizeReceipt(
  image: Blob,
  onProgress?: ProgressListener,
): Promise<Recognition> {
  progressListener = onProgress ?? null;
  try {
    const worker = await getWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });
    const result = await worker.recognize(image);
    const words = (result.data.words ?? []).flatMap((word) => {
      if (!word.bbox) return [];
      return [
        {
          text: word.text,
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
          confidence: word.confidence,
        },
      ];
    });
    const fromWords = parseReceipt(words);
    const rawText = result.data.text ?? "";
    const parsed =
      fromWords.items.length === 0 && fromWords.totalCents == null && rawText.trim()
        ? parseReceiptText(rawText)
        : fromWords;
    return { ...parsed, rawText };
  } catch (error) {
    await resetWorker();
    throw error;
  } finally {
    progressListener = null;
  }
}

export function friendlyReadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/fetch|network|load|download|lang/i.test(message)) {
    return "The reader needs a one-time download of its language files, and that download failed. You can enter the bill by hand.";
  }
  return "That photo couldn't be read. Blurry, dark, or skewed shots often do this. Enter the bill by hand, or try another photo.";
}

export function readingLabel(status: string): string {
  const key = status.toLowerCase();
  if (key.includes("load") || key.includes("download")) return "Downloading the reader";
  if (key.includes("initial")) return "Getting the reader ready";
  if (key.includes("recogn")) return "Reading the receipt";
  return "Reading on this device";
}
