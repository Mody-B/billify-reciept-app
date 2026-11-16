export type InstallOffer = { kind: "hidden" } | { kind: "native" } | { kind: "ios" };

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "splitit-install-dismissed";
const hidden: InstallOffer = { kind: "hidden" };
const nativeOffer: InstallOffer = { kind: "native" };
const iosOffer: InstallOffer = { kind: "ios" };

let deferred: BeforeInstallPromptEvent | null = null;
let snapshot: InstallOffer = hidden;
const listeners = new Set<() => void>();

export function offerFor(input: { standalone: boolean; dismissed: boolean; canPrompt: boolean; ios: boolean }): InstallOffer {
  if (input.standalone || input.dismissed) return hidden;
  if (input.canPrompt) return nativeOffer;
  if (input.ios) return iosOffer;
  return hidden;
}

function emit() {
  for (const listener of listeners) listener();
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function standalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function iosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

function publish() {
  const next = offerFor({
    standalone: standalone(),
    dismissed: dismissed(),
    canPrompt: deferred !== null,
    ios: iosSafari(),
  });
  if (next === snapshot) return;
  snapshot = next;
  emit();
}

export function startInstallCapture() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    publish();
  });
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  }
  publish();
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentOffer(): InstallOffer {
  return snapshot;
}

export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
  publish();
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  if (choice.outcome === "dismissed") dismissInstall();
  else publish();
}
