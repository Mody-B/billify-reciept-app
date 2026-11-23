import { describe, expect, it } from "vitest";
import { legalPage } from "./legalPath";

describe("legalPage", () => {
  it("reads privacy and terms with or without the site prefix", () => {
    expect(legalPage("/privacy", "/")).toBe("privacy");
    expect(legalPage("/terms/", "/")).toBe("terms");
    expect(legalPage("/billify-reciept-app/privacy", "/billify-reciept-app/")).toBe("privacy");
    expect(legalPage("/", "/")).toBeNull();
  });
});