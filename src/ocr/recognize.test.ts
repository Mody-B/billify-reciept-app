import { describe, expect, it } from "vitest";
import { classifyReadResponse, explainReadFailure } from "./recognize";

const pages = "https://mody-b.github.io/billify-reciept-app/";

describe("classifyReadResponse", () => {
  it("treats GitHub Pages HTML 405 as a missing function, not a bad photo", () => {
    expect(classifyReadResponse(405, "text/html", "")).toBe("not_deployed");
    expect(classifyReadResponse(404, "", "")).toBe("not_deployed");
  });

  it("treats a 503 from the function as a missing key", () => {
    expect(classifyReadResponse(503, "application/json", "missing_key")).toBe("missing_key");
  });

  it("keeps a real read failure distinct from a missing host", () => {
    expect(classifyReadResponse(422, "application/json", "empty")).toBe("upstream");
    expect(classifyReadResponse(200, "application/json", "")).toBeNull();
  });
});

describe("explainReadFailure", () => {
  it("names OPENROUTER_API_KEY when the key is missing", () => {
    const message = explainReadFailure("missing_key", pages);
    expect(message).toContain("OPENROUTER_API_KEY");
    expect(message).toContain("Production");
    expect(message).toContain("billsplitapp.vercel.app");
    expect(message).not.toContain("couldn't be read");
  });

  it("names the page and the deploy step when the function is absent", () => {
    const message = explainReadFailure("not_deployed", pages);
    expect(message).toContain(pages);
    expect(message).toContain("billsplitapp.vercel.app");
    expect(message).toContain("GitHub Pages");
    expect(message).not.toContain("couldn't be read");
  });
});
