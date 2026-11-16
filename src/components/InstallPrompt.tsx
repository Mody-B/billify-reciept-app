import { useSyncExternalStore } from "react";
import { currentOffer, dismissInstall, promptInstall, subscribeInstall } from "../pwa/install";

export function InstallPrompt() {
  const offer = useSyncExternalStore(subscribeInstall, currentOffer, currentOffer);
  if (offer.kind === "hidden") return null;

  return (
    <section className="install-prompt" data-testid="install-prompt" aria-label="Add Splitit to your home screen">
      <p>
        {offer.kind === "ios"
          ? "Add Splitit to your home screen. Tap Share, then Add to Home Screen."
          : "Add Splitit to your home screen."}
      </p>
      <div className="install-actions">
        {offer.kind === "native" ? (
          <button type="button" className="button" onClick={() => void promptInstall()}>
            Add to home screen
          </button>
        ) : null}
        <button type="button" className="text-button" onClick={dismissInstall}>
          Not now
        </button>
      </div>
    </section>
  );
}
