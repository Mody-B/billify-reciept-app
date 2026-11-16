import { describe, expect, it } from "vitest";
import { offerFor } from "./install";

describe("home screen offer", () => {
  it("stays quiet when Splitit is already installed or the prompt was declined", () => {
    expect(offerFor({ standalone: true, dismissed: false, canPrompt: true, ios: true })).toEqual({ kind: "hidden" });
    expect(offerFor({ standalone: false, dismissed: true, canPrompt: true, ios: true })).toEqual({ kind: "hidden" });
  });

  it("uses the browser install prompt when the page can be installed", () => {
    expect(offerFor({ standalone: false, dismissed: false, canPrompt: true, ios: false })).toEqual({ kind: "native" });
  });

  it("explains Share on iPhone when the browser has no install event", () => {
    expect(offerFor({ standalone: false, dismissed: false, canPrompt: false, ios: true })).toEqual({ kind: "ios" });
    expect(offerFor({ standalone: false, dismissed: false, canPrompt: false, ios: false })).toEqual({ kind: "hidden" });
  });
});
